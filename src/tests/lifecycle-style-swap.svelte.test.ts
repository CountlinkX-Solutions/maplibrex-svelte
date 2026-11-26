import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import SwapStack from './fixtures/SwapStack.svelte';
import {
	WAIT,
	captureUncaughtErrors,
	createEpochProbe,
	createMapErrorLog,
	flatDemTiles,
	readStyle,
	swapStyle
} from './fixtures/lifecycle.js';

/**
 * Issue #13 (audit D1): after `mapStyle` changes, everything the component
 * tree declares must be back in the new style.
 */

const styleA: StyleSpecification = {
	version: 8,
	sources: {},
	layers: [{ id: 'base-a', type: 'background', paint: { 'background-color': '#ffffff' } }]
};

const styleB: StyleSpecification = {
	version: 8,
	sources: {},
	layers: [{ id: 'base-b', type: 'background', paint: { 'background-color': '#000000' } }]
};

async function mountSwapStack(props: { demTiles?: string[] } = {}) {
	let map: MapLibreMap | null = null;
	const probe = createEpochProbe();
	const errors = createMapErrorLog();

	const initialProps = {
		mapStyle: styleA as StyleSpecification | string,
		...props,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		},
		onerror: errors.onerror,
		onepoch: probe.onepoch
	};

	const screen = await render(SwapStack, initialProps);
	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);

	const rerender = (next: Partial<typeof initialProps>) =>
		screen.rerender({ ...initialProps, ...next });

	return { screen, rerender, probe, errors, map: map as unknown as MapLibreMap };
}

describe('style swap (#13)', () => {
	// Control: shows the helper sees a completed swap when the library gets it
	// right, so the failures below are about the library and not the helper.
	it('brings back a top-level layer', async () => {
		const { map, rerender, probe } = await mountSwapStack();

		await swapStyle(rerender, probe, styleB);

		expect(map.getLayer('base-b')).toBeDefined();
		expect(map.getLayer('top-level')).toBeDefined();
	});

	// Expected to fail until #13 is fixed; remove `.fails` then. The nested layer
	// re-adds before its source, MapLibre refuses it ("layers.points-circle:
	// source "points" not found") and nothing adds it again.
	it.fails('brings back a layer nested in a source', async () => {
		const { map, rerender, probe } = await mountSwapStack();
		expect(readStyle(map, { sources: ['points'], layers: ['points-circle'] })).toMatchObject({
			sources: ['points'],
			layers: ['points-circle']
		});

		await swapStyle(rerender, probe, styleB);

		expect(readStyle(map, { sources: ['points'], layers: ['points-circle'] })).toMatchObject({
			sources: ['points'],
			layers: ['points-circle']
		});
	});

	// Expected to fail until #13 is fixed; remove `.fails` then. FeatureState
	// re-applies before its source exists ("The source 'points' does not exist
	// in the map's style."), so the recreated source has no state.
	it.fails('keeps feature state applied', async () => {
		const { map, rerender, probe } = await mountSwapStack();
		const target = { source: 'points', id: 1 };
		expect(readStyle(map, { featureStates: [target] }).featureState).toEqual({
			'points/1': { hover: true }
		});

		await swapStyle(rerender, probe, styleB);

		expect(readStyle(map, { featureStates: [target] }).featureState).toEqual({
			'points/1': { hover: true }
		});
	});

	// Expected to fail until #13 is fixed; remove `.fails` then. Terrain calls
	// `setTerrain` before its source is back, which throws "cannot load terrain,
	// because there exists no source with ID: dem" out of its effect, uncaught.
	// The throw also stops the flush, so the dem source is not re-added either.
	it.fails('re-applies terrain nested in a raster-dem source without throwing', async () => {
		const uncaught = captureUncaughtErrors();
		const { screen, map, rerender, probe } = await mountSwapStack({ demTiles: flatDemTiles() });

		try {
			expect(readStyle(map, {}).terrain).toBe('dem');

			await uncaught.attempt(() => swapStyle(rerender, probe, styleB));

			expect(uncaught.messages()).toEqual([]);
			expect(readStyle(map, { sources: ['dem'] })).toMatchObject({
				sources: ['dem'],
				terrain: 'dem'
			});
		} finally {
			await uncaught.attempt(() => screen.unmount());
		}
	});
});
