import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import SwapStack from './fixtures/SwapStack.svelte';
import {
	WAIT,
	captureUncaughtErrors,
	createEpochProbe,
	createMapErrorLog,
	deferredStyleUrl,
	flatDemTiles,
	layerOrder,
	readStyle,
	settle,
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

async function mountSwapStack(
	props: { demTiles?: string[]; mapStyle?: StyleSpecification | string } = {}
) {
	let map: MapLibreMap | null = null;
	const probe = createEpochProbe();
	const errors = createMapErrorLog();

	const initialProps = {
		mapStyle: styleA as StyleSpecification | string,
		showExtra: false,
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

	// Before the registry, the nested layer re-added before its source, MapLibre
	// refused it ("layers.points-circle: source "points" not found") and nothing
	// added it again.
	it('brings back a layer nested in a source', async () => {
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

	it('brings the layers back in markup order, above the new basemap', async () => {
		const { map, rerender, probe, errors } = await mountSwapStack();
		const layers = ['base-a', 'base-b', 'top-level', 'points-circle'];
		expect(layerOrder(map, layers)).toEqual(['base-a', 'top-level', 'points-circle']);

		await swapStyle(rerender, probe, styleB);

		expect(layerOrder(map, layers)).toEqual(['base-b', 'top-level', 'points-circle']);
		expect(errors.messages()).toEqual([]);
	});

	// Before the registry, FeatureState re-applied before its source existed
	// ("The source 'points' does not exist in the map's style."), so the
	// recreated source had no state.
	it('keeps feature state applied', async () => {
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

	// Before the registry, Terrain called `setTerrain` before its source was
	// back, which threw "cannot load terrain, because there exists no source
	// with ID: dem" out of its effect, uncaught, and stopped the flush.
	it('re-applies terrain nested in a raster-dem source without throwing', async () => {
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

	// MapLibre diffs a new style into the old one when it can and rebuilds it
	// from scratch when it cannot; 6.19 also rebuilds after a WebGL context
	// loss. A rebuild is forced here because which changes the diff handles
	// varies between releases. Whoever calls `setStyle`, the tree comes back.
	it('brings everything back when the style is rebuilt rather than diffed', async () => {
		const uncaught = captureUncaughtErrors();
		const { screen, map, probe, errors } = await mountSwapStack({ demTiles: flatDemTiles() });
		let rebuilt = false;
		map.on('styledataloading', () => {
			rebuilt = true;
		});
		const before = probe.epoch;

		try {
			map.setStyle(styleB, { diff: false });
			await vi.waitFor(() => expect(probe.epoch).toBeGreaterThan(before), WAIT);
			await settle();

			expect(rebuilt).toBe(true);
			expect(
				readStyle(map, {
					sources: ['points', 'dem'],
					layers: ['base-a', 'base-b', 'top-level', 'points-circle'],
					featureStates: [{ source: 'points', id: 1 }]
				})
			).toEqual({
				sources: ['points', 'dem'],
				layers: ['base-b', 'top-level', 'points-circle'],
				terrain: 'dem',
				featureState: { 'points/1': { hover: true } }
			});
			expect(uncaught.messages()).toEqual([]);
			expect(errors.messages()).toEqual([]);
		} finally {
			await uncaught.attempt(() => screen.unmount());
		}
	});

	it('brings back a layer that mounted while a style URL was loading', async () => {
		const { map, rerender, probe, errors } = await mountSwapStack();
		const next = deferredStyleUrl();
		const before = probe.epoch;
		const layers = ['base-a', 'base-b', 'top-level', 'extra', 'points-circle'];

		await rerender({ mapStyle: next.url });
		await settle();
		await rerender({ mapStyle: next.url, showExtra: true });
		await settle();
		// The old style is still up while the new one is fetched.
		expect(layerOrder(map, layers)).toEqual(['base-a', 'top-level', 'extra', 'points-circle']);

		next.resolve(styleB);
		await vi.waitFor(() => expect(probe.epoch).toBeGreaterThan(before), WAIT);
		await settle();

		expect(layerOrder(map, layers)).toEqual(['base-b', 'top-level', 'extra', 'points-circle']);
		expect(errors.messages()).toEqual([]);
	});
});
