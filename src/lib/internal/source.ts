import type {
	CanvasSourceSpecification,
	GeoJSONSourceSpecification,
	ImageSourceSpecification,
	SourceSpecification
} from 'maplibre-gl';
import { deepEqual } from './deep-equal.js';

/**
 * Canvas sources sit outside the style specification union because they are
 * runtime-only, but `map.addSource` accepts them all the same.
 */
export type AnySourceSpecification = SourceSpecification | CanvasSourceSpecification;

type Corners = ImageSourceSpecification['coordinates'];

/** What `GeoJSONSource.setClusterOptions` takes. */
export type ClusterOptions = {
	cluster: boolean;
	clusterRadius?: number;
	clusterMaxZoom?: number;
};

/**
 * One MapLibre call that takes a source from one specification to the next,
 * or a recreate when no single setter does:
 *
 * - `set-data`: `GeoJSONSource.setData`.
 * - `set-cluster-options`: `GeoJSONSource.setClusterOptions`.
 * - `set-tiles`, `set-url`: `setTiles` and `setUrl` on vector, raster and
 *   raster-dem sources.
 * - `set-coordinates`: `setCoordinates` on image, video and canvas sources.
 * - `update-image`: `ImageSource.updateImage`, with the corners when they
 *   changed too.
 */
export type SourceUpdatePlan =
	| { kind: 'noop' }
	| { kind: 'create' }
	| { kind: 'recreate' }
	| { kind: 'set-data'; data: NonNullable<unknown> }
	| { kind: 'set-cluster-options'; options: ClusterOptions }
	| { kind: 'set-tiles'; tiles: string[] }
	| { kind: 'set-url'; url: string }
	| { kind: 'set-coordinates'; coordinates: Corners }
	| { kind: 'update-image'; url: string; coordinates?: Corners };

const NOOP: SourceUpdatePlan = { kind: 'noop' };
const RECREATE: SourceUpdatePlan = { kind: 'recreate' };

/**
 * Decides how to move a source from one specification to the next.
 *
 * A recreate removes the source and every layer that reads it, then adds
 * them back: their tiles are dropped and loaded again. MapLibre has setters
 * for the options that change most at runtime, which keep the source and its
 * layers, so a change that exactly one setter covers goes through it. A
 * change that takes two setters is recreated rather than chained, since
 * MapLibre's tile sources do not expect a second reload to start while the
 * first is in flight.
 */
export function planSourceUpdate(
	previous: AnySourceSpecification | undefined,
	next: AnySourceSpecification
): SourceUpdatePlan {
	if (previous === undefined) return { kind: 'create' };
	if (previous.type !== next.type) return RECREATE;

	switch (next.type) {
		case 'geojson':
			return planGeoJSONUpdate(previous as GeoJSONSourceSpecification, next);
		case 'vector':
		case 'raster':
		case 'raster-dem':
			return planTiledUpdate(previous as TiledSpecification, next);
		case 'image':
			return planImageUpdate(previous as ImageSourceSpecification, next);
		case 'video':
		case 'canvas':
			return planCornersUpdate(previous as CornersSpecification, next);
		default:
			return deepEqual(previous, next) ? NOOP : RECREATE;
	}
}

/** Splits `keys` out of `spec`, returning them and everything else. */
function split<T extends object, K extends string>(
	spec: T,
	keys: readonly K[]
): [Partial<Record<K, unknown>>, Record<string, unknown>] {
	const picked: Partial<Record<K, unknown>> = {};
	const rest: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(spec)) {
		if ((keys as readonly string[]).includes(key)) picked[key as K] = value;
		else rest[key] = value;
	}
	return [picked, rest];
}

const CLUSTER_KEYS = ['cluster', 'clusterRadius', 'clusterMaxZoom'] as const;

/**
 * GeoJSON data is compared by reference, never walked: a collection can be
 * large, and a deep comparison would traverse it on every prop change. A new
 * reference means new data and costs one `setData`, even when it is equal.
 * The other options are small, so they keep the structural comparison.
 *
 * The flip side is that data mutated in place keeps its reference and never
 * reaches the map, so consumers replace it instead.
 */
function planGeoJSONUpdate(
	previous: GeoJSONSourceSpecification,
	next: GeoJSONSourceSpecification
): SourceUpdatePlan {
	const { data: previousData, ...previousOptions } = previous;
	const { data: nextData, ...nextOptions } = next;
	const [previousCluster, previousRest] = split(previousOptions, CLUSTER_KEYS);
	const [nextCluster, nextRest] = split(nextOptions, CLUSTER_KEYS);

	if (!deepEqual(previousRest, nextRest)) return RECREATE;

	const dataChanged = previousData !== nextData;
	const clusterChanged = !deepEqual(previousCluster, nextCluster);

	if (!dataChanged && !clusterChanged) return NOOP;
	if (dataChanged && clusterChanged) return RECREATE;

	if (dataChanged) {
		if (nextData === undefined) return RECREATE;
		return { kind: 'set-data', data: nextData };
	}

	// The setter leaves a value it is not given as it was, and the default
	// MapLibre would go back to depends on `maxzoom`, so unsetting one is a
	// recreate.
	const unset = (['clusterRadius', 'clusterMaxZoom'] as const).some(
		(key) => previous[key] !== undefined && next[key] === undefined
	);
	if (unset) return RECREATE;

	return {
		kind: 'set-cluster-options',
		options: {
			cluster: next.cluster ?? false,
			...(next.clusterRadius !== undefined ? { clusterRadius: next.clusterRadius } : {}),
			...(next.clusterMaxZoom !== undefined ? { clusterMaxZoom: next.clusterMaxZoom } : {})
		}
	};
}

type TiledSpecification = Extract<
	SourceSpecification,
	{ type: 'vector' | 'raster' | 'raster-dem' }
>;

function planTiledUpdate(previous: TiledSpecification, next: TiledSpecification): SourceUpdatePlan {
	const [, previousRest] = split(previous, ['tiles', 'url'] as const);
	const [, nextRest] = split(next, ['tiles', 'url'] as const);
	if (!deepEqual(previousRest, nextRest)) return RECREATE;

	const tilesChanged = !deepEqual(previous.tiles, next.tiles);
	const urlChanged = previous.url !== next.url;

	if (!tilesChanged && !urlChanged) return NOOP;
	if (tilesChanged && urlChanged) return RECREATE;
	if (tilesChanged) return next.tiles ? { kind: 'set-tiles', tiles: next.tiles } : RECREATE;
	return next.url !== undefined ? { kind: 'set-url', url: next.url } : RECREATE;
}

function planImageUpdate(
	previous: ImageSourceSpecification,
	next: ImageSourceSpecification
): SourceUpdatePlan {
	const [, previousRest] = split(previous, ['url', 'coordinates'] as const);
	const [, nextRest] = split(next, ['url', 'coordinates'] as const);
	if (!deepEqual(previousRest, nextRest)) return RECREATE;

	const urlChanged = previous.url !== next.url;
	const cornersChanged = !deepEqual(previous.coordinates, next.coordinates);

	if (!urlChanged) return cornersChanged ? setCorners(next.coordinates) : NOOP;
	if (next.url === undefined) return RECREATE;

	return {
		kind: 'update-image',
		url: next.url,
		...(cornersChanged ? { coordinates: next.coordinates } : {})
	};
}

type CornersSpecification = Extract<AnySourceSpecification, { type: 'video' | 'canvas' }>;

function planCornersUpdate(
	previous: CornersSpecification,
	next: CornersSpecification
): SourceUpdatePlan {
	const { coordinates: previousCorners, ...previousRest } = previous;
	const { coordinates: nextCorners, ...nextRest } = next;

	if (!deepEqual(previousRest, nextRest)) return RECREATE;
	return deepEqual(previousCorners, nextCorners) ? NOOP : setCorners(nextCorners);
}

function setCorners(coordinates: Corners): SourceUpdatePlan {
	return { kind: 'set-coordinates', coordinates };
}
