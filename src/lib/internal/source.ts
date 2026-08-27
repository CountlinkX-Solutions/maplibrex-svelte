import type { SourceSpecification } from 'maplibre-gl';
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
	previous: SourceSpecification | undefined,
	next: SourceSpecification
): SourceUpdatePlan {
	if (previous === undefined) return { kind: 'create' };
	if (previous.type !== next.type) return { kind: 'recreate' };
	if (deepEqual(previous, next)) return { kind: 'noop' };

	if (previous.type === 'geojson' && next.type === 'geojson') {
		const withoutData = { ...previous, data: null };
		const nextWithoutData = { ...next, data: null };

		if (deepEqual(withoutData, nextWithoutData) && next.data !== undefined) {
			return { kind: 'set-data', data: next.data };
		}
	}

	return { kind: 'recreate' };
}
