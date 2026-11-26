import type {
	CanvasSourceSpecification,
	GeoJSONSourceSpecification,
	SourceSpecification
} from 'maplibre-gl';

/**
 * Canvas sources sit outside the style specification union because they are
 * runtime-only, but `map.addSource` accepts them all the same.
 */
export type AnySourceSpecification = SourceSpecification | CanvasSourceSpecification;
import { deepEqual } from './deep-equal.js';

export type SourceUpdatePlan =
	| { kind: 'noop' }
	| { kind: 'create' }
	| { kind: 'recreate' }
	| { kind: 'set-data'; data: NonNullable<unknown> };

/**
 * Decides how to move a source from one specification to the next.
 *
 * GeoJSON data changes are the hot path of any real map, and `setData` keeps
 * the source alive; recreating it would force every dependent layer to be
 * torn down and re-added. Every other change still needs a full recreate,
 * because MapLibre exposes no setter for the remaining source options.
 */
export function planSourceUpdate(
	previous: AnySourceSpecification | undefined,
	next: AnySourceSpecification
): SourceUpdatePlan {
	if (previous === undefined) return { kind: 'create' };
	if (previous.type !== next.type) return { kind: 'recreate' };

	if (previous.type === 'geojson' && next.type === 'geojson') {
		return planGeoJSONUpdate(previous, next);
	}

	return deepEqual(previous, next) ? { kind: 'noop' } : { kind: 'recreate' };
}

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

	if (!deepEqual(previousOptions, nextOptions)) return { kind: 'recreate' };
	if (previousData === nextData) return { kind: 'noop' };
	if (nextData === undefined) return { kind: 'recreate' };

	return { kind: 'set-data', data: nextData };
}
