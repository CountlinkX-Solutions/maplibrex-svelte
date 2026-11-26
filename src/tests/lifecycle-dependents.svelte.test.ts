import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import DependentStack from './fixtures/DependentStack.svelte';
import TwoMapsStack from './fixtures/TwoMapsStack.svelte';
import {
	WAIT,
	captureUncaughtErrors,
	createMapErrorLog,
	flatDemTiles,
	layerOrder,
	readStyle,
	settle
} from './fixtures/lifecycle.js';

/**
 * Issues #13 and #14 beyond layers: terrain and feature state need their
 * source in the style, whenever it mounts, whatever its id, and after it is
 * recreated. And each map keeps its own registry.
 */

type Toggles = { showSource?: boolean; suffix?: string; revision?: number };

async function mountDependents(scenario: 'late-source' | 'nested', props: Toggles = {}) {
	let map: MapLibreMap | null = null;
	const errors = createMapErrorLog();

	const initialProps = {
		scenario,
		demTiles: flatDemTiles(),
		...props,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		},
		onerror: errors.onerror
	};

	const screen = await render(DependentStack, initialProps);
	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);
	await settle();

	let current: Toggles = {};
	const rerender = async (next: Toggles) => {
		current = { ...current, ...next };
		await screen.rerender({ ...initialProps, ...current });
		await settle();
	};

	return { screen, rerender, errors, map: map as unknown as MapLibreMap };
}

describe('terrain and feature state', () => {
	it('wait for a source that mounts later, and leave with it', async () => {
		const uncaught = captureUncaughtErrors();
		const { screen, rerender, errors, map } = await mountDependents('late-source', {
			showSource: false
		});
		const target = { source: 'pts', id: 1 };

		try {
			expect(readStyle(map, { featureStates: [target] })).toMatchObject({
				terrain: null,
				featureState: { 'pts/1': null }
			});

			await uncaught.attempt(() => rerender({ showSource: true }));
			expect(readStyle(map, { sources: ['dem', 'pts'], featureStates: [target] })).toMatchObject({
				sources: ['dem', 'pts'],
				terrain: 'dem',
				featureState: { 'pts/1': { hover: true } }
			});

			await uncaught.attempt(() => rerender({ showSource: false }));
			expect(readStyle(map, { sources: ['dem', 'pts'] })).toMatchObject({
				sources: [],
				terrain: null
			});

			expect(uncaught.messages()).toEqual([]);
			expect(errors.messages()).toEqual([]);
		} finally {
			await uncaught.attempt(() => screen.unmount());
		}
	});

	it('follow their source when its id changes', async () => {
		const uncaught = captureUncaughtErrors();
		const { screen, rerender, errors, map } = await mountDependents('nested');

		try {
			await uncaught.attempt(() => rerender({ suffix: '-2' }));

			expect(
				readStyle(map, {
					sources: ['dem', 'pts', 'dem-2', 'pts-2'],
					featureStates: [{ source: 'pts-2', id: 1 }]
				})
			).toMatchObject({
				sources: ['dem-2', 'pts-2'],
				terrain: 'dem-2',
				featureState: { 'pts-2/1': { hover: true } }
			});
			expect(uncaught.messages()).toEqual([]);
			expect(errors.messages()).toEqual([]);
		} finally {
			await uncaught.attempt(() => screen.unmount());
		}
	});

	it('are applied again when their source is recreated', async () => {
		const uncaught = captureUncaughtErrors();
		const { screen, rerender, errors, map } = await mountDependents('nested');
		const before = { dem: map.getSource('dem'), pts: map.getSource('pts') };

		try {
			await uncaught.attempt(() => rerender({ revision: 1 }));

			// Neither change has a setter, so both sources must have been recreated.
			expect(map.getSource('dem')).not.toBe(before.dem);
			expect(map.getSource('pts')).not.toBe(before.pts);
			expect(readStyle(map, { featureStates: [{ source: 'pts', id: 1 }] })).toMatchObject({
				terrain: 'dem',
				featureState: { 'pts/1': { hover: true } }
			});
			expect(uncaught.messages()).toEqual([]);
			expect(errors.messages()).toEqual([]);
		} finally {
			await uncaught.attempt(() => screen.unmount());
		}
	});
});

describe('two maps on one page', () => {
	it('keep their own sources, layers and order', async () => {
		let maps: [MapLibreMap, MapLibreMap] | null = null;
		const props = {
			showFirstSource: true,
			onmapsready: (first: MapLibreMap, second: MapLibreMap) => {
				maps = [first, second];
			}
		};

		const screen = await render(TwoMapsStack, props);
		await vi.waitFor(() => expect(maps).not.toBeNull(), WAIT);
		await settle();
		const [first, second] = maps as unknown as [MapLibreMap, MapLibreMap];
		const ids = ['a', 'dots', 'b'];

		expect(layerOrder(first, ids)).toEqual(['a', 'dots', 'b']);
		expect(layerOrder(second, ids)).toEqual(['b', 'dots', 'a']);

		await screen.rerender({ ...props, showFirstSource: false });
		await settle();
		expect(readStyle(first, { sources: ['s'], layers: ids })).toMatchObject({
			sources: [],
			layers: ['a', 'b']
		});
		expect(readStyle(second, { sources: ['s'], layers: ids })).toMatchObject({
			sources: ['s'],
			layers: ['b', 'dots', 'a']
		});

		await screen.rerender({ ...props, showFirstSource: true });
		await settle();
		expect(layerOrder(first, ids)).toEqual(['a', 'dots', 'b']);
	});
});
