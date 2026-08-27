import type { LngLatLike } from 'maplibre-gl';

/** Below this, a difference is float noise from MapLibre's own transform math. */
export const CAMERA_EPSILON = 1e-6;

export type LngLatTuple = [lng: number, lat: number];

/**
 * Normalises every accepted `LngLatLike` shape into a plain tuple.
 * Comparison must not depend on which of the four shapes the caller used.
 */
export function toLngLatTuple(value: LngLatLike | undefined | null): LngLatTuple | null {
	if (value == null) return null;

	if (Array.isArray(value)) return [value[0], value[1]];

	if ('lng' in value) return [value.lng, value.lat];
	if ('lon' in value) return [value.lon, value.lat];

	return null;
}

export function sameNumber(
	a: number | undefined | null,
	b: number | undefined | null,
	epsilon = CAMERA_EPSILON
): boolean {
	if (a == null || b == null) return a == null && b == null;
	return Math.abs(a - b) <= epsilon;
}

/**
 * Guards the two-way camera binding: the map emits `move` continuously, so
 * writing a prop back without this check would feed an endless update loop.
 */
export function sameLngLat(
	a: LngLatLike | undefined | null,
	b: LngLatLike | undefined | null,
	epsilon = CAMERA_EPSILON
): boolean {
	const left = toLngLatTuple(a);
	const right = toLngLatTuple(b);
	if (left === null || right === null) return left === right;

	return sameNumber(left[0], right[0], epsilon) && sameNumber(left[1], right[1], epsilon);
}
