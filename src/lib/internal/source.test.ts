import { describe, expect, it } from 'vitest';
import type {
	CanvasSourceSpecification,
	GeoJSONSourceSpecification,
	ImageSourceSpecification,
	SourceSpecification,
	VideoSourceSpecification
} from 'maplibre-gl';
import { planSourceUpdate } from './source.js';

const empty: GeoJSONSourceSpecification = {
	type: 'geojson',
	data: { type: 'FeatureCollection', features: [] }
};

describe('planSourceUpdate', () => {
	it('plans nothing when the specification is unchanged', () => {
		expect(planSourceUpdate(empty, { ...empty })).toEqual({ kind: 'noop' });
	});

	it('plans a data-only update when just the geojson data changed', () => {
		const next: GeoJSONSourceSpecification = {
			type: 'geojson',
			data: 'https://example.com/features.geojson'
		};

		expect(planSourceUpdate(empty, next)).toEqual({
			kind: 'set-data',
			data: 'https://example.com/features.geojson'
		});
	});

	it('plans a recreate when a geojson option with no setter changed', () => {
		expect(planSourceUpdate(empty, { ...empty, buffer: 64 })).toEqual({ kind: 'recreate' });
	});

	it('plans a recreate when the source type changed', () => {
		const raster: SourceSpecification = {
			type: 'raster',
			tiles: ['https://example.com/{z}/{x}/{y}.png']
		};

		expect(planSourceUpdate(empty, raster)).toEqual({ kind: 'recreate' });
	});

	it('plans a recreate for a non-geojson source whose option with no setter changed', () => {
		const before: SourceSpecification = {
			type: 'raster',
			tiles: ['https://a.example/{z}/{x}/{y}.png']
		};
		const after: SourceSpecification = {
			type: 'raster',
			tiles: ['https://a.example/{z}/{x}/{y}.png'],
			tileSize: 256
		};

		expect(planSourceUpdate(before, after)).toEqual({ kind: 'recreate' });
	});

	it('plans a create when there is no previous specification', () => {
		expect(planSourceUpdate(undefined, empty)).toEqual({ kind: 'create' });
	});
});

/**
 * Issue #9: GeoJSON data is compared by reference, never walked. A new
 * reference means new data, even when it is structurally equal; the same
 * reference means no data change, even when it was mutated in place.
 */
describe('planSourceUpdate for geojson data', () => {
	type Data = GeoJSONSourceSpecification['data'];

	/** Data that throws as soon as anything reads inside it. */
	function unreadable(): Data {
		const fail = () => {
			throw new Error('the data was read to compare it');
		};
		return new Proxy({} as Exclude<Data, string>, {
			get: fail,
			has: fail,
			ownKeys: fail,
			getOwnPropertyDescriptor: fail
		});
	}

	it('plans a data update for a new reference, even when it is structurally equal', () => {
		const next: GeoJSONSourceSpecification = {
			type: 'geojson',
			data: { type: 'FeatureCollection', features: [] }
		};

		expect(planSourceUpdate(empty, next)).toEqual({ kind: 'set-data', data: next.data });
	});

	it('plans nothing when the data keeps its reference', () => {
		expect(planSourceUpdate(empty, { type: 'geojson', data: empty.data })).toEqual({
			kind: 'noop'
		});
	});

	it('plans a recreate, not a data update, when another option changes and data keeps its reference', () => {
		expect(planSourceUpdate(empty, { type: 'geojson', data: empty.data, maxzoom: 12 })).toEqual({
			kind: 'recreate'
		});
	});

	it('never reads inside the data to compare it', () => {
		const next: GeoJSONSourceSpecification = { type: 'geojson', data: unreadable() };
		const plan = planSourceUpdate({ type: 'geojson', data: unreadable() }, next);

		expect(plan.kind).toBe('set-data');
		expect(plan.kind === 'set-data' && plan.data === next.data).toBe(true);
	});

	it('still compares the other options structurally', () => {
		const sum = () => ({ total: ['+', ['get', 'count']] as ['+', ['get', string]] });

		expect(
			planSourceUpdate(
				{ ...empty, cluster: true, clusterProperties: sum() },
				{ ...empty, cluster: true, clusterProperties: sum() }
			)
		).toEqual({ kind: 'noop' });
	});
});

/**
 * Issue #21: MapLibre has setters for some source options. A change that one
 * setter covers on its own goes through it, and keeps the source and every
 * layer that reads it; anything else still recreates the source.
 */
describe('planSourceUpdate for tiled sources', () => {
	const tilesA = ['https://a.example/{z}/{x}/{y}.png'];
	const tilesB = ['https://b.example/{z}/{x}/{y}.png'];

	it.each(['raster', 'raster-dem', 'vector'] as const)(
		'plans setTiles when only the tiles of a %s source changed',
		(type) => {
			expect(
				planSourceUpdate({ type, tiles: tilesA, maxzoom: 14 }, { type, tiles: tilesB, maxzoom: 14 })
			).toEqual({ kind: 'set-tiles', tiles: tilesB });
		}
	);

	it.each(['raster', 'raster-dem', 'vector'] as const)(
		'plans setUrl when only the TileJSON url of a %s source changed',
		(type) => {
			expect(
				planSourceUpdate(
					{ type, url: 'https://a.example/tiles.json' },
					{ type, url: 'https://b.example/tiles.json' }
				)
			).toEqual({ kind: 'set-url', url: 'https://b.example/tiles.json' });
		}
	);

	it('plans nothing for tiles that are equal but a new array', () => {
		expect(
			planSourceUpdate({ type: 'raster', tiles: tilesA }, { type: 'raster', tiles: [...tilesA] })
		).toEqual({ kind: 'noop' });
	});

	it('plans a recreate when the tiles and the url both changed', () => {
		expect(
			planSourceUpdate(
				{ type: 'vector', url: 'https://a.example/tiles.json', tiles: tilesA },
				{ type: 'vector', url: 'https://b.example/tiles.json', tiles: tilesB }
			)
		).toEqual({ kind: 'recreate' });
	});

	it('plans a recreate when the tiles are removed', () => {
		expect(
			planSourceUpdate(
				{ type: 'vector', url: 'https://a.example/tiles.json', tiles: tilesA },
				{ type: 'vector', url: 'https://a.example/tiles.json' }
			)
		).toEqual({ kind: 'recreate' });
	});

	it('plans a recreate when the url is removed', () => {
		expect(
			planSourceUpdate(
				{ type: 'raster', url: 'https://a.example/tiles.json', tiles: tilesA },
				{ type: 'raster', tiles: tilesA }
			)
		).toEqual({ kind: 'recreate' });
	});

	it('plans a recreate when the tiles changed along with an option with no setter', () => {
		expect(
			planSourceUpdate(
				{ type: 'raster-dem', tiles: tilesA, encoding: 'mapbox' },
				{ type: 'raster-dem', tiles: tilesB, encoding: 'terrarium' }
			)
		).toEqual({ kind: 'recreate' });
	});
});

describe('planSourceUpdate for geojson cluster options', () => {
	it('plans setClusterOptions when clustering is turned on', () => {
		expect(planSourceUpdate(empty, { ...empty, cluster: true })).toEqual({
			kind: 'set-cluster-options',
			options: { cluster: true }
		});
	});

	it('plans setClusterOptions that turns clustering off when cluster is unset', () => {
		expect(
			planSourceUpdate(
				{ ...empty, cluster: true, clusterRadius: 40 },
				{ ...empty, clusterRadius: 40 }
			)
		).toEqual({ kind: 'set-cluster-options', options: { cluster: false, clusterRadius: 40 } });
	});

	it('plans setClusterOptions with every cluster option when one of them changed', () => {
		expect(
			planSourceUpdate(
				{ ...empty, cluster: true, clusterRadius: 40, clusterMaxZoom: 10 },
				{ ...empty, cluster: true, clusterRadius: 80, clusterMaxZoom: 10 }
			)
		).toEqual({
			kind: 'set-cluster-options',
			options: { cluster: true, clusterRadius: 80, clusterMaxZoom: 10 }
		});
	});

	// MapLibre's setter leaves an omitted value as it was, and the default it
	// would go back to depends on other options.
	it.each(['clusterRadius', 'clusterMaxZoom'] as const)(
		'plans a recreate when %s is unset',
		(name) => {
			expect(
				planSourceUpdate({ ...empty, cluster: true, [name]: 10 }, { ...empty, cluster: true })
			).toEqual({ kind: 'recreate' });
		}
	);

	it('plans a recreate when a cluster option the setter does not cover changed', () => {
		expect(
			planSourceUpdate(
				{ ...empty, cluster: true, clusterMinPoints: 2 },
				{ ...empty, cluster: true, clusterMinPoints: 5 }
			)
		).toEqual({ kind: 'recreate' });
	});

	it('plans a recreate when the data is removed', () => {
		expect(planSourceUpdate(empty, { type: 'geojson' } as GeoJSONSourceSpecification)).toEqual({
			kind: 'recreate'
		});
	});

	it('plans a recreate when the data and a cluster option changed together', () => {
		expect(
			planSourceUpdate(empty, {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] },
				cluster: true
			})
		).toEqual({ kind: 'recreate' });
	});
});

describe('planSourceUpdate for image, video and canvas sources', () => {
	const cornersA: ImageSourceSpecification['coordinates'] = [
		[0, 1],
		[1, 1],
		[1, 0],
		[0, 0]
	];
	const cornersB: ImageSourceSpecification['coordinates'] = [
		[0, 2],
		[2, 2],
		[2, 0],
		[0, 0]
	];

	const image = (url: string | undefined, coordinates = cornersA): ImageSourceSpecification => ({
		type: 'image',
		...(url !== undefined ? { url } : {}),
		coordinates
	});

	it('plans setCoordinates when only the corners of an image changed', () => {
		expect(planSourceUpdate(image('/a.png'), image('/a.png', cornersB))).toEqual({
			kind: 'set-coordinates',
			coordinates: cornersB
		});
	});

	it('plans updateImage when only the url of an image changed', () => {
		expect(planSourceUpdate(image('/a.png'), image('/b.png'))).toEqual({
			kind: 'update-image',
			url: '/b.png'
		});
	});

	it('plans one updateImage when the url and the corners of an image changed', () => {
		expect(planSourceUpdate(image('/a.png'), image('/b.png', cornersB))).toEqual({
			kind: 'update-image',
			url: '/b.png',
			coordinates: cornersB
		});
	});

	it('plans nothing for an image whose url and corners are unchanged', () => {
		expect(planSourceUpdate(image('/a.png'), image('/a.png', [...cornersA]))).toEqual({
			kind: 'noop'
		});
	});

	it('plans nothing for a video whose corners are equal but a new array', () => {
		expect(
			planSourceUpdate(
				{ type: 'video', urls: ['/a.mp4'], coordinates: cornersA },
				{ type: 'video', urls: ['/a.mp4'], coordinates: [...cornersA] }
			)
		).toEqual({ kind: 'noop' });
	});

	it('plans a recreate when the url of an image is removed', () => {
		expect(planSourceUpdate(image('/a.png'), image(undefined))).toEqual({ kind: 'recreate' });
	});

	it('plans setCoordinates when only the corners of a video changed', () => {
		const video = (coordinates: VideoSourceSpecification['coordinates']) =>
			({ type: 'video', urls: ['/a.mp4'], coordinates }) satisfies VideoSourceSpecification;

		expect(planSourceUpdate(video(cornersA), video(cornersB))).toEqual({
			kind: 'set-coordinates',
			coordinates: cornersB
		});
	});

	it('plans a recreate when the urls of a video changed', () => {
		expect(
			planSourceUpdate(
				{ type: 'video', urls: ['/a.mp4'], coordinates: cornersA },
				{ type: 'video', urls: ['/b.mp4'], coordinates: cornersA }
			)
		).toEqual({ kind: 'recreate' });
	});

	it('plans setCoordinates when only the corners of a canvas changed', () => {
		const canvas = (coordinates: CanvasSourceSpecification['coordinates']) =>
			({ type: 'canvas', canvas: 'paint', coordinates }) satisfies CanvasSourceSpecification;

		expect(planSourceUpdate(canvas(cornersA), canvas(cornersB))).toEqual({
			kind: 'set-coordinates',
			coordinates: cornersB
		});
	});

	it('plans a recreate when a canvas option other than the corners changed', () => {
		expect(
			planSourceUpdate(
				{ type: 'canvas', canvas: 'paint', coordinates: cornersA },
				{ type: 'canvas', canvas: 'paint', coordinates: cornersA, animate: false }
			)
		).toEqual({ kind: 'recreate' });
	});

	it('plans a recreate when the corners and another canvas option changed', () => {
		expect(
			planSourceUpdate(
				{ type: 'canvas', canvas: 'paint', coordinates: cornersA },
				{ type: 'canvas', canvas: 'other', coordinates: cornersB }
			)
		).toEqual({ kind: 'recreate' });
	});
});

describe('planSourceUpdate for a source type it knows no setter of', () => {
	const custom = (option: number) =>
		({ type: 'custom-tiles', option }) as unknown as SourceSpecification;

	it('plans nothing when the specification is structurally equal', () => {
		expect(planSourceUpdate(custom(1), custom(1))).toEqual({ kind: 'noop' });
	});

	it('plans a recreate when anything changed', () => {
		expect(planSourceUpdate(custom(1), custom(2))).toEqual({ kind: 'recreate' });
	});
});
