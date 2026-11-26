import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import AttachedLayerStack from './fixtures/AttachedLayerStack.svelte';
import {
	WAIT,
	captureUncaughtErrors,
	createMapErrorLog,
	readStyle,
	settle
} from './fixtures/lifecycle.js';

/**
 * Issue #14 (audit D2): a layer that names its source with `source="id"`
 * behaves like one nested in the source.
 */

type Scenario = 'after' | 'before' | 'together';

async function mountAttached(scenario: Scenario) {
	let map: MapLibreMap | null = null;
	const errors = createMapErrorLog();

	const initialProps = {
		scenario,
		tolerance: 0.375,
		show: true,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		},
		onerror: errors.onerror
	};

	const screen = await render(AttachedLayerStack, initialProps);
	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);
	await settle();

	const rerender = async (next: Partial<typeof initialProps>) => {
		await screen.rerender({ ...initialProps, ...next });
		await settle();
	};

	return { screen, rerender, errors, map: map as unknown as MapLibreMap };
}

const BOTH = { sources: ['s'], layers: ['attached'] };

describe('layers attached with source="id" (#14)', () => {
	// Expected to fail until #14 is fixed; remove `.fails` then. The recreate
	// removes every layer on the source, and only nested layers re-add.
	it.fails('survive a source recreate', async () => {
		const { map, rerender } = await mountAttached('after');
		const before = map.getSource('s');
		expect(readStyle(map, BOTH)).toMatchObject(BOTH);

		await rerender({ tolerance: 0.5 });

		// The new tolerance has no setter, so the source must have been recreated.
		expect(map.getSource('s')).not.toBe(before);
		expect(readStyle(map, BOTH)).toMatchObject(BOTH);
	});

	// Expected to fail until #14 is fixed; remove `.fails` then. The source is
	// removed first and MapLibre refuses ("Source "s" cannot be removed while
	// layer "attached" is using it."), so it stays; mounting again then throws
	// "Source "s" already exists." out of the source's effect, uncaught.
	it.fails(
		'leave no orphan source when unmounted with it, and remount without throwing',
		async () => {
			const uncaught = captureUncaughtErrors();
			const { screen, map, rerender } = await mountAttached('together');

			try {
				expect(readStyle(map, BOTH)).toMatchObject(BOTH);

				await uncaught.attempt(() => rerender({ show: false }));
				expect(readStyle(map, BOTH)).toMatchObject({ sources: [], layers: [] });

				await uncaught.attempt(() => rerender({ show: true }));
				expect(uncaught.messages()).toEqual([]);
				expect(readStyle(map, BOTH)).toMatchObject(BOTH);
			} finally {
				await uncaught.attempt(() => screen.unmount());
			}
		}
	);

	// Expected to fail until #14 is fixed; remove `.fails` then. MapLibre
	// refuses the layer ("layers.attached: source "s" not found") and nothing
	// adds it again once the source exists.
	it.fails('appear once their source mounts when declared before it', async () => {
		const { map } = await mountAttached('before');

		expect(readStyle(map, BOTH)).toMatchObject(BOTH);
	});
});
