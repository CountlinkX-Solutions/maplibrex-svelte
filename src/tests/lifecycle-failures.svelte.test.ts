import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { StyleSpecification } from 'maplibre-gl';
import MapLibre from '#lib/components/MapLibre.svelte';
import StatusStack from './fixtures/StatusStack.svelte';
import {
	WAIT,
	captureConsoleErrors,
	captureUncaughtErrors,
	createMapErrorLog,
	createStateLog,
	failingStyleUrl,
	settle,
	withoutWebGL
} from './fixtures/lifecycle.js';

/**
 * Issues #2 and #3: failures the consumer must be able to see and handle.
 */

const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

async function mountWithoutWebGL({ withFallback = false } = {}) {
	withoutWebGL();
	const uncaught = captureUncaughtErrors();
	const errors = createMapErrorLog();
	const state = createStateLog();

	const screen = await render(StatusStack, {
		mapStyle: emptyStyle,
		withFallback,
		onerror: errors.onerror,
		onstate: state.onstate
	});
	await settle();

	return { screen, uncaught, errors, state };
}

describe('failure paths (#2, #3)', () => {
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

	// Failed before the fix: on maplibre-gl 6.19 the Map constructor throws
	// GPUInitializationError; it escaped the creation effect in MapLibre.svelte
	// as an uncaught error (render resolved), `onerror` was never called, and
	// the container was left empty.
	it('reports WebGL being unavailable through onerror instead of throwing', async () => {
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

	it('reports WebGL being unavailable once', async () => {
		const { errors } = await mountWithoutWebGL();

		expect(errors.errors).toHaveLength(1);
		expect(errors.errors[0]).toMatchObject({ name: 'GPUInitializationError' });
	});

	it('sets the status to error, with the error, when the map cannot be created', async () => {
		const { state, uncaught } = await mountWithoutWebGL();

		expect(state.current).toMatchObject({ status: 'error', ready: false, map: null });
		expect(state.current.error).toMatchObject({ name: 'GPUInitializationError' });
		expect(state.current.error?.message).toContain('WebGL');
		expect(uncaught.messages()).toEqual([]);
	});

	it('writes the error to the console when nothing handles errors', async () => {
		withoutWebGL();
		const uncaught = captureUncaughtErrors();
		const log = captureConsoleErrors();

		await render(MapLibre, { mapStyle: emptyStyle, style: 'width: 200px; height: 200px' });
		await settle();

		expect(log.messages()).toContainEqual(expect.stringContaining('GPUInitializationError'));
		expect(uncaught.messages()).toEqual([]);
	});

	it('renders the fallback in place of the map when it cannot be created', async () => {
		const { screen, uncaught } = await mountWithoutWebGL({ withFallback: true });

		const container = screen.container.querySelector('[data-maplibrex="map"]');
		const fallback = container?.querySelector('[data-testid="fallback"]');
		expect(fallback?.textContent).toContain('WebGL');
		expect(container?.querySelector('canvas')).toBeNull();
		expect(uncaught.messages()).toEqual([]);
	});

	it('leaves the container empty without a fallback', async () => {
		const { screen, uncaught } = await mountWithoutWebGL();

		const container = screen.container.querySelector('[data-maplibrex="map"]');
		expect(container).not.toBeNull();
		expect(container?.children).toHaveLength(0);
		expect(uncaught.messages()).toEqual([]);
	});

	it('does not render the fallback when the map is created', async () => {
		const state = createStateLog();
		const screen = await render(StatusStack, {
			mapStyle: emptyStyle,
			withFallback: true,
			onstate: state.onstate
		});

		await vi.waitFor(() => expect(state.current.status).toBe('ready'), WAIT);

		expect(screen.container.querySelector('[data-testid="fallback"]')).toBeNull();
		expect(screen.container.querySelector('canvas')).not.toBeNull();
	});

	// The fallback stands in for a map that does not exist. A style that fails
	// leaves a working map that a new `mapStyle` can recover.
	it('does not render the fallback when a style fails to load', async () => {
		const state = createStateLog();
		const errors = createMapErrorLog();
		const screen = await render(StatusStack, {
			mapStyle: failingStyleUrl('style unavailable'),
			withFallback: true,
			onerror: errors.onerror,
			onstate: state.onstate
		});

		await vi.waitFor(() => expect(state.current.status).toBe('error'), WAIT);

		expect(screen.container.querySelector('[data-testid="fallback"]')).toBeNull();
	});

	it('unmounts without throwing when the map could not be created', async () => {
		const { screen, uncaught } = await mountWithoutWebGL({ withFallback: true });

		await uncaught.attempt(() => screen.unmount());
		await settle();

		expect(uncaught.messages()).toEqual([]);
	});
});
