<script lang="ts">
	import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import GeoJSONSource from '#lib/components/sources/GeoJSONSource.svelte';
	import FeatureState from '#lib/components/data/FeatureState.svelte';

	type Props = {
		hovered?: boolean;
		hoverState?: Record<string, unknown>;
		selected?: boolean;
		onmapready?: (map: MapLibreMap) => void;
	};

	let {
		hovered = true,
		hoverState = { hover: true },
		selected = true,
		onmapready
	}: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	const points = {
		type: 'FeatureCollection' as const,
		features: [
			{
				id: 1,
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
	style="width: 320px; height: 240px"
>
	<!-- Hover plus selection on one feature: two components, one key each. -->
	<GeoJSONSource id="pts" data={points}>
		{#if hovered}
			<FeatureState id={1} state={hoverState} />
		{/if}
		{#if selected}
			<FeatureState id={1} state={{ selected: true }} />
		{/if}
	</GeoJSONSource>
</MapLibre>
