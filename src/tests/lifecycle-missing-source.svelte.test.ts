import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import MissingSourceStack from './fixtures/MissingSourceStack.svelte';
import { WAIT, createMapErrorLog, settle } from './fixtures/lifecycle.js';

/**
 * Issue #55: a layer, terrain or feature state that waits for a source no
 * component provides is reported once through the map's `error` event, and
 * keeps waiting. The check runs once Svelte has finished the update in which
 * the style became usable, or in which the entry mounted, so a source that
 * mounts or is added by hand within that update is not reported.
 */

const swappedStyle: StyleSpecification = {
	version: 8,
	sources: {},
	layers: [{ id: 'swapped', type: 'background', paint: { 'background-opacity': 0 } }]
};

const emptyCollection = {
	type: 'geojson' as const,
	data: { type: 'FeatureCollection' as const, features: [] }
};

type Props = {
	mapStyle?: StyleSpecification;
	layerSource?: string;
	sourceOnReady?: boolean;
	laterSource?: string;
	showPair?: boolean;
	terrainSource?: string;
	onload?: (event: { target: MapLibreMap }) => void;
};

async function mountMissing(props: Props) {
	let map: MapLibreMap | null = null;
	const errors = createMapErrorLog();

	let current = {
		...props,
		onerror: errors.onerror,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		}
	};
	const screen = await render(MissingSourceStack, current);
	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);
	await settle();

	const rerender = async (next: Partial<Props>) => {
		current = { ...current, ...next };
		await screen.rerender(current);
		await settle();
	};

	return { screen, rerender, errors, map: map as unknown as MapLibreMap };
}

describe('an entry waiting for a source nothing provides (#55)', () => {
	it('is reported once, keeps waiting, and is applied when the app adds the source', async () => {
		const { map, rerender, errors } = await mountMissing({ layerSource: 'typo' });

		expect(errors.messages()).toEqual([expect.stringMatching(/Layer "waiting" .*source "typo"/)]);

		// Another style load checks again, and does not repeat the report.
		await rerender({ mapStyle: swappedStyle });
		await vi.waitFor(() => expect(map.getLayer('swapped')).toBeDefined(), WAIT);
		await settle();
		expect(errors.messages()).toHaveLength(1);

		map.addSource('typo', emptyCollection);
		await vi.waitFor(() => expect(map.getLayer('waiting')?.source).toBe('typo'), WAIT);
		expect(errors.messages()).toHaveLength(1);
	});

	it('is reported for terrain too', async () => {
		const { errors } = await mountMissing({ terrainSource: 'no-dem' });

		expect(errors.messages()).toEqual([expect.stringMatching(/<Terrain> .*source "no-dem"/)]);
	});

	it('is reported for a layer that mounts after the style loaded', async () => {
		const { rerender, errors } = await mountMissing({});
		expect(errors.messages()).toEqual([]);

		await rerender({ laterSource: 'typo-later' });

		expect(errors.messages()).toEqual([
			expect.stringMatching(/Layer "later" .*source "typo-later"/)
		]);
	});

	it('is not reported when the app adds the source in onload', async () => {
		const { map, errors } = await mountMissing({
			layerSource: 'manual',
			onload: (event) => event.target.addSource('manual', emptyCollection)
		});

		await vi.waitFor(() => expect(map.getLayer('waiting')?.source).toBe('manual'), WAIT);
		expect(errors.messages()).toEqual([]);
	});

	it('is not reported when its source component mounts in the update that made the map ready', async () => {
		const { map, errors } = await mountMissing({ layerSource: 'late', sourceOnReady: true });

		await vi.waitFor(() => expect(map.getLayer('waiting')?.source).toBe('late'), WAIT);
		expect(errors.messages()).toEqual([]);
	});

	it('is not reported when it mounts just before its source in the same update', async () => {
		const { map, rerender, errors } = await mountMissing({});

		await rerender({ showPair: true });

		await vi.waitFor(() => expect(map.getLayer('pair-layer')?.source).toBe('pair'), WAIT);
		expect(errors.messages()).toEqual([]);
	});
});
