import { getContext, hasContext, setContext } from 'svelte';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { StyleRegistry } from './internal/registry.js';

const MAP_CONTEXT = Symbol.for('maplibrex.map');
const SOURCE_CONTEXT = Symbol.for('maplibrex.source');
const MARKER_CONTEXT = Symbol.for('maplibrex.marker');
const REGISTRY_CONTEXT = Symbol.for('maplibrex.registry');

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
	 * Increments on every completed style load, including a style swap. A swap
	 * drops everything added to the previous style; sources and layers are put
	 * back by the library, and anything a descendant adds by hand can track
	 * this to add it again.
	 */
	readonly styleEpoch: number;
}

/** Lets a nested `<Layer>` inherit the id of its enclosing source component. */
export interface SourceContext {
	readonly id: string;
	/**
	 * Increments when the source is recreated. The library's own components
	 * no longer need it; it is kept for code that adds things to the source by
	 * hand and has to add them again.
	 */
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

/**
 * Internal, not exported from the package: the registry `<MapLibre>` creates
 * for its map, through which sources, layers, terrain and feature state reach
 * the style.
 */
export function setStyleRegistry(registry: StyleRegistry): StyleRegistry {
	return setContext(REGISTRY_CONTEXT, registry);
}

/** @throws outside a `<MapLibre>` subtree, like {@link getMapContext}. */
export function getStyleRegistry(): StyleRegistry {
	if (!hasContext(REGISTRY_CONTEXT)) {
		throw new Error('[maplibrex] This component must be rendered inside <MapLibre>.');
	}
	return getContext<StyleRegistry>(REGISTRY_CONTEXT);
}

export function setMarkerContext(context: MarkerContext): MarkerContext {
	return setContext(MARKER_CONTEXT, context);
}

/** Returns `null` when the component is not nested inside a marker. */
export function getMarkerContext(): MarkerContext | null {
	return hasContext(MARKER_CONTEXT) ? getContext<MarkerContext>(MARKER_CONTEXT) : null;
}
