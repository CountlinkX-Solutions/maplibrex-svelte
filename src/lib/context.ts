import { getContext, hasContext, setContext } from 'svelte';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';

const MAP_CONTEXT = Symbol.for('maplibrex.map');
const SOURCE_CONTEXT = Symbol.for('maplibrex.source');
const MARKER_CONTEXT = Symbol.for('maplibrex.marker');

/**
 * What every descendant of `<MapLibre>` needs in order to touch the map safely.
 *
 * Properties are declared readonly and are backed by getters over `$state`, so
 * consumers read them inside `$effect` and re-run when the map appears, becomes
 * usable, or swaps its style.
 */
export interface MapContext {
	/** The live instance, or `null` before mount and after teardown. */
	readonly map: MapLibreMap | null;
	/** `true` once the style is loaded and sources/layers can be added. */
	readonly ready: boolean;
	/**
	 * Increments on every completed style load. `setStyle` wipes user-added
	 * sources and layers, so descendants track this to re-add themselves.
	 */
	readonly styleEpoch: number;
}

/** Lets a nested `<Layer>` inherit the id of its enclosing source component. */
export interface SourceContext {
	readonly id: string;
	/** Increments when the source is recreated, so child layers re-add. */
	readonly epoch: number;
}

/** Lets a nested `<Popup>` attach itself to its enclosing `<Marker>`. */
export interface MarkerContext {
	readonly marker: Marker | null;
}

export function setMapContext(context: MapContext): MapContext {
	return setContext(MAP_CONTEXT, context);
}

/**
 * @throws if used outside a `<MapLibre>` subtree, which is a wiring mistake
 * rather than a runtime condition worth handling.
 */
export function getMapContext(): MapContext {
	if (!hasContext(MAP_CONTEXT)) {
		throw new Error('[maplibrex] This component must be rendered inside <MapLibre>.');
	}
	return getContext<MapContext>(MAP_CONTEXT);
}

export function setSourceContext(context: SourceContext): SourceContext {
	return setContext(SOURCE_CONTEXT, context);
}

/** Returns `null` when the component is not nested inside a source. */
export function getSourceContext(): SourceContext | null {
	return hasContext(SOURCE_CONTEXT) ? getContext<SourceContext>(SOURCE_CONTEXT) : null;
}

export function setMarkerContext(context: MarkerContext): MarkerContext {
	return setContext(MARKER_CONTEXT, context);
}

/** Returns `null` when the component is not nested inside a marker. */
export function getMarkerContext(): MarkerContext | null {
	return hasContext(MARKER_CONTEXT) ? getContext<MarkerContext>(MARKER_CONTEXT) : null;
}
