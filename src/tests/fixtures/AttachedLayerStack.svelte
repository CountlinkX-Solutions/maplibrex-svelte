<script lang="ts">
	import type { ErrorEvent, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import GeoJSONSource from '#lib/components/sources/GeoJSONSource.svelte';
	import CircleLayer from '#lib/components/layers/CircleLayer.svelte';

	/**
	 * A layer that names its source by id instead of nesting in it, one case
	 * per `scenario`:
	 * - `after`: the layer follows its source in the markup;
	 * - `before`: the layer comes first in the markup;
	 * - `together`: source and layer sit in one `{#if show}` block.
	 */
	type Props = {
		scenario: 'after' | 'before' | 'together';
		/** A source option with no setter: changing it recreates the source. */
		tolerance?: number;
		show?: boolean;
		onmapready?: (map: MapLibreMap) => void;
		onerror?: (event: ErrorEvent) => void;
	};

	let { scenario, tolerance = 0.375, show = true, onmapready, onerror }: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	const points = {
		type: 'FeatureCollection' as const,
		features: [
			{
				type: 'Feature' as const,
				properties: {},
				geometry: { type: 'Point' as const, coordinates: [0, 0] }
			}
		]
	};

	$effect(() => {
		if (ready && map) onmapready?.(map);
	});
</script>

<MapLibre
	mapStyle={emptyStyle}
	center={[0, 0]}
	zoom={2}
	bind:map
	bind:ready
	{onerror}
	style="width: 320px; height: 240px"
>
	{#if scenario === 'after'}
		<GeoJSONSource id="s" data={points} {tolerance} />
		<CircleLayer id="attached" source="s" />
	{:else if scenario === 'before'}
		<CircleLayer id="attached" source="s" />
		<GeoJSONSource id="s" data={points} />
	{:else if show}
		<GeoJSONSource id="s" data={points} />
		<CircleLayer id="attached" source="s" />
	{/if}
</MapLibre>
