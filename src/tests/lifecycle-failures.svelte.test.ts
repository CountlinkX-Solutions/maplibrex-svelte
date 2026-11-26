import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { StyleSpecification } from 'maplibre-gl';
import MapLibre from '#lib/components/MapLibre.svelte';
import {
	WAIT,
	captureUncaughtErrors,
	createMapErrorLog,
	failingStyleUrl,
	settle,
	withoutWebGL
} from './fixtures/lifecycle.js';

/**
 * Issues #2 and #3: failures the consumer must be able to see and handle.
 */

const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

describe('failure paths (#2, #3)', () => {
	// Passes: the map's `error` event already reaches `onerror` (the audit says
	// the same). What #3 still lacks is a status: `load` never fires, so a
	// consumer cannot tell a failed map from one still loading.
	it('reports a style that fails to load through onerror', async () => {
		const errors = createMapErrorLog();

		await render(MapLibre, {
			mapStyle: failingStyleUrl('style unavailable'),
			onerror: errors.onerror,
			style: 'width: 200px; height: 200px'
		});

		await vi.waitFor(
			() => expect(errors.messages()).toContainEqual(expect.stringContaining('style unavailable')),
			WAIT
		);
	});

	// Expected to fail until #2 is fixed; remove `.fails` then. On maplibre-gl
	// 6.19 the Map constructor throws GPUInitializationError: it escapes the
	// creation effect in MapLibre.svelte as an uncaught error (render resolves),
	// `onerror` is never called, and the container is left empty. On 6.0 the
	// constructor fires the error before any listener exists, so `onerror` misses
	// it too, the map has no painter, and unmounting throws "Cannot read
	// properties of undefined (reading 'destroy')".
	it.fails('reports WebGL being unavailable through onerror instead of throwing', async () => {
		withoutWebGL();
		const uncaught = captureUncaughtErrors();
		const errors = createMapErrorLog();
		let unmount = () => {};

		try {
			await uncaught.attempt(async () => {
				const screen = await render(MapLibre, {
					mapStyle: emptyStyle,
					onerror: errors.onerror,
					style: 'width: 200px; height: 200px'
				});
				unmount = () => screen.unmount();
			});
			await settle();

			expect(uncaught.messages()).toEqual([]);
			expect(errors.messages()).toContainEqual(expect.stringContaining('WebGL'));
		} finally {
			await uncaught.attempt(() => unmount());
		}
	});
});
