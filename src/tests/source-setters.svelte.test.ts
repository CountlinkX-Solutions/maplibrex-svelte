import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type {
	CanvasSource,
	GeoJSONSource,
	ImageSource,
	LayerSpecification,
	Map as MapLibreMap,
	RasterTileSource
} from 'maplibre-gl';
import SourceUpdateStack from './fixtures/SourceUpdateStack.svelte';
import type { AnySourceSpecification } from '#lib/internal/source.js';
import {
	WAIT,
	createMapErrorLog,
	flatDemTiles,
	layerOrder,
	pngUrl,
	settle,
	tileJsonUrl
} from './fixtures/lifecycle.js';

/**
 * Issue #21: a source option that MapLibre has a setter for is changed
 * through it. The source and its layers stay in the style, where they were,
 * instead of being removed and added again.
 */

const LAYERS = ['below', 'subject-layer', 'above'];

async function mountSource(spec: AnySourceSpecification, layerType: LayerSpecification['type']) {
	let map: MapLibreMap | null = null;
	const errors = createMapErrorLog();
	const props = {
		spec,
		layerType,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		},
		onerror: errors.onerror
	};

	const screen = await render(SourceUpdateStack, props);
	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);
	const instance = map as unknown as MapLibreMap;
	expect(layerOrder(instance, LAYERS)).toEqual(LAYERS);

	// What would take the source or its layer out of the style and back in.
	const calls = {
		removeSource: vi.spyOn(instance, 'removeSource'),
		addSource: vi.spyOn(instance, 'addSource'),
		removeLayer: vi.spyOn(instance, 'removeLayer'),
		addLayer: vi.spyOn(instance, 'addLayer')
	};

	const update = async (next: AnySourceSpecification) => {
		await screen.rerender({ ...props, spec: next });
		await settle();
	};

	return { map: instance, update, errors, calls };
}

function expectKeptInPlace(
	map: MapLibreMap,
	calls: Awaited<ReturnType<typeof mountSource>>['calls']
): void {
	for (const spy of Object.values(calls)) expect(spy).not.toHaveBeenCalled();
	expect(layerOrder(map, LAYERS)).toEqual(LAYERS);
}

const cornersA: [[number, number], [number, number], [number, number], [number, number]] = [
	[-10, 10],
	[10, 10],
	[10, -10],
	[-10, -10]
];
const cornersB: typeof cornersA = [
	[-20, 20],
	[20, 20],
	[20, -20],
	[-20, -20]
];

describe('source setters (#21)', () => {
	it('changes the tiles of a raster source in place, keeping its layer in order', async () => {
		const tilesA = flatDemTiles();
		const tilesB = flatDemTiles();
		const { map, update, errors, calls } = await mountSource(
			{ type: 'raster', tiles: tilesA, tileSize: 256 },
			'raster'
		);

		await update({ type: 'raster', tiles: tilesB, tileSize: 256 });

		expectKeptInPlace(map, calls);
		expect((map.getSource('subject') as RasterTileSource).tiles).toEqual(tilesB);
		expect(map.getStyle().sources.subject).toMatchObject({ tiles: tilesB });
		expect(errors.messages()).toEqual([]);
	});

	it('changes the TileJSON url of a raster source in place', async () => {
		const tilesB = flatDemTiles();
		const { map, update, errors, calls } = await mountSource(
			{ type: 'raster', url: tileJsonUrl(flatDemTiles()), tileSize: 256 },
			'raster'
		);
		const urlB = tileJsonUrl(tilesB);

		await update({ type: 'raster', url: urlB, tileSize: 256 });

		expectKeptInPlace(map, calls);
		await vi.waitFor(
			() => expect((map.getSource('subject') as RasterTileSource).tiles).toEqual(tilesB),
			WAIT
		);
		expect(map.getStyle().sources.subject).toMatchObject({ url: urlB });
		expect(errors.messages()).toEqual([]);
	});

	it('changes the cluster options of a geojson source in place', async () => {
		const data = { type: 'FeatureCollection' as const, features: [] };
		const { map, update, errors, calls } = await mountSource({ type: 'geojson', data }, 'circle');

		await update({ type: 'geojson', data, cluster: true, clusterRadius: 30 });

		expectKeptInPlace(map, calls);
		expect((map.getSource('subject') as GeoJSONSource).getClusterOptions()).toMatchObject({
			cluster: true,
			clusterRadius: 30
		});
		expect(errors.messages()).toEqual([]);
	});

	it('moves an image source in place', async () => {
		const url = pngUrl();
		const { map, update, errors, calls } = await mountSource(
			{ type: 'image', url, coordinates: cornersA },
			'raster'
		);

		await update({ type: 'image', url, coordinates: cornersB });

		expectKeptInPlace(map, calls);
		expect((map.getSource('subject') as ImageSource).coordinates).toEqual(cornersB);
		expect(errors.messages()).toEqual([]);
	});

	it('changes the image of an image source in place', async () => {
		const { map, update, errors, calls } = await mountSource(
			{ type: 'image', url: pngUrl(), coordinates: cornersA },
			'raster'
		);
		const next = pngUrl();

		await update({ type: 'image', url: next, coordinates: cornersB });

		expectKeptInPlace(map, calls);
		expect(map.getStyle().sources.subject).toMatchObject({ url: next });
		await vi.waitFor(
			() => expect((map.getSource('subject') as ImageSource).coordinates).toEqual(cornersB),
			WAIT
		);
		expect(errors.messages()).toEqual([]);
	});

	it('moves a canvas source in place', async () => {
		const canvas = document.createElement('canvas');
		canvas.width = 16;
		canvas.height = 16;
		const { map, update, errors, calls } = await mountSource(
			{ type: 'canvas', canvas, coordinates: cornersA, animate: false },
			'raster'
		);

		await update({ type: 'canvas', canvas, coordinates: cornersB, animate: false });

		expectKeptInPlace(map, calls);
		expect((map.getSource('subject') as CanvasSource).coordinates).toEqual(cornersB);
		expect(errors.messages()).toEqual([]);
	});

	// Control: an option no setter covers still recreates the source, and the
	// registry puts its layer back where it was.
	it('still recreates a raster source for an option with no setter', async () => {
		const tiles = flatDemTiles();
		const { map, update, errors, calls } = await mountSource(
			{ type: 'raster', tiles, tileSize: 256 },
			'raster'
		);

		await update({ type: 'raster', tiles, tileSize: 512 });

		expect(calls.removeSource).toHaveBeenCalledWith('subject');
		expect(layerOrder(map, LAYERS)).toEqual(LAYERS);
		expect(map.getStyle().sources.subject).toMatchObject({ tileSize: 512 });
		expect(errors.messages()).toEqual([]);
	});
});
