import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * The gesture handlers MapLibre exposes as properties on the map, each with
 * `enable()`, `disable()` and `isEnabled()`. Sorted so that planned changes
 * are applied in a stable order.
 */
export const INTERACTION_NAMES = [
	'boxZoom',
	'cooperativeGestures',
	'doubleClickZoom',
	'dragPan',
	'dragRotate',
	'keyboard',
	'scrollZoom',
	'touchPitch',
	'touchZoomRotate'
] as const;

export type InteractionName = (typeof INTERACTION_NAMES)[number];

/** What the caller wants; an omitted or `undefined` entry means "leave it alone". */
export type InteractionRequest = Partial<Record<InteractionName, boolean | undefined>>;

export type InteractionChange = [name: InteractionName, enabled: boolean];

/**
 * Works out which handlers actually need toggling.
 *
 * Calling `enable()` on an already-enabled handler is not free: MapLibre
 * re-registers DOM listeners, and for the cooperative gestures handler it
 * rebuilds its overlay element. Comparing first keeps a reactive prop from
 * churning the handler on every unrelated render.
 */
export function planInteractionChanges(
	current: Partial<Record<InteractionName, boolean>>,
	requested: InteractionRequest | undefined
): InteractionChange[] {
	if (!requested) return [];

	return INTERACTION_NAMES.filter((name) => {
		const want = requested[name];
		return want !== undefined && current[name] !== undefined && current[name] !== want;
	}).map((name) => [name, requested[name] as boolean]);
}

/** Reads the live enabled state of every handler on a map. */
export function readInteractionState(map: MapLibreMap): Record<InteractionName, boolean> {
	return Object.fromEntries(
		INTERACTION_NAMES.map((name) => [name, map[name].isEnabled()])
	) as Record<InteractionName, boolean>;
}
