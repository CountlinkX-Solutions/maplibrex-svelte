<script lang="ts">
	import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '$lib/components/MapLibre.svelte';
	import GeoJSONSource from '$lib/components/sources/GeoJSONSource.svelte';
	import FillLayer from '$lib/components/layers/FillLayer.svelte';
	import Marker from '$lib/components/overlays/Marker.svelte';

	type Props = {
		fillColor?: string;
		showLayer?: boolean;
		/** Handed to the test once the style is loaded and children have mounted. */
		onmapready?: (map: MapLibreMap) => void;
	};

	let { fillColor = '#ff0000', showLayer = true, onmapready }: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

	// Inline and empty on purpose: the tests must not depend on a tile server.
	const emptyStyle: StyleSpecification = {
		version: 8,
		sources: {},
		layers: []
	};

	const square = {
		type: 'FeatureCollection' as const,
		features: [
			{
				type: 'Feature' as const,
				properties: {},
				geometry: {
					type: 'Polygon' as const,
					coordinates: [
						[
							[0, 0],
							[1, 0],
							[1, 1],
							[0, 1],
							[0, 0]
						]
					]
				}
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
	style="width: 320px; height: 240px"
>
	<GeoJSONSource id="squares" data={square}>
		{#if showLayer}
			<FillLayer id="squares-fill" paint={{ 'fill-color': fillColor }} />
		{/if}
	</GeoJSONSource>

	<Marker lngLat={[0, 0]} />
</MapLibre>
