import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Removal is always best-effort.
 *
 * Teardown races with two things the component cannot observe: a style swap
 * that already dropped everything the user added, and a map that is being
 * destroyed. Both make a plain `removeLayer`/`removeSource` throw on an entity
 * that is legitimately gone, so absence is the success case, not an error.
 */
function isAlive(map: MapLibreMap): boolean {
	try {
		return Boolean(map.getStyle());
	} catch {
		return false;
	}
}

export function removeLayerIfPresent(map: MapLibreMap, layerId: string): void {
	if (!isAlive(map)) return;
	if (map.getLayer(layerId)) map.removeLayer(layerId);
}

export function removeSourceIfPresent(map: MapLibreMap, sourceId: string): void {
	if (!isAlive(map)) return;
	if (map.getSource(sourceId)) map.removeSource(sourceId);
}

/**
 * MapLibre refuses to remove a source that layers still reference, so a source
 * recreate has to evict its dependents first. The ids are returned for logging
 * and tests; the layer components re-add themselves on the next source epoch.
 */
export function removeLayersUsingSource(map: MapLibreMap, sourceId: string): string[] {
	if (!isAlive(map)) return [];

	const dependents = map
		.getStyle()
		.layers.filter((layer) => 'source' in layer && layer.source === sourceId)
		.map((layer) => layer.id);

	for (const layerId of dependents) removeLayerIfPresent(map, layerId);

	return dependents;
}

type LooseStyleSetter = (layerId: string, name: string, value: unknown) => unknown;

/**
 * MapLibre types the paint and layout setters against exhaustive property
 * unions, but a component receives its keys as data at runtime. The typed
 * layer wrappers are what keep the consumer-facing surface honest, so the
 * widening is expressed here once instead of at every call site.
 */
export function setPaintProperty(
	map: MapLibreMap,
	layerId: string,
	name: string,
	value: unknown
): void {
	(map.setPaintProperty as unknown as LooseStyleSetter)(layerId, name, value);
}

export function setLayoutProperty(
	map: MapLibreMap,
	layerId: string,
	name: string,
	value: unknown
): void {
	(map.setLayoutProperty as unknown as LooseStyleSetter)(layerId, name, value);
}
