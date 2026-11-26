<script lang="ts">
	import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import GeoJSONSource from '#lib/components/sources/GeoJSONSource.svelte';
	import BackgroundLayer from '#lib/components/layers/BackgroundLayer.svelte';
	import CircleLayer from '#lib/components/layers/CircleLayer.svelte';

	/**
	 * Two maps on one page with the same source and layer ids, the layers in
	 * opposite markup order. `showFirstSource` toggles the first map's source.
	 */
	type Props = {
		showFirstSource?: boolean;
		onmapsready?: (first: MapLibreMap, second: MapLibreMap) => void;
	};

	let { showFirstSource = true, onmapsready }: Props = $props();

	let first = $state<MapLibreMap | null>(null);
	let firstReady = $state(false);
	let second = $state<MapLibreMap | null>(null);
	let secondReady = $state(false);

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
		if (firstReady && secondReady && first && second) onmapsready?.(first, second);
	});
</script>

<MapLibre
	mapStyle={emptyStyle}
	bind:map={first}
	bind:ready={firstReady}
	style="width: 200px; height: 150px"
>
	<BackgroundLayer id="a" />
	{#if showFirstSource}
		<GeoJSONSource id="s" data={points}>
			<CircleLayer id="dots" />
		</GeoJSONSource>
	{/if}
	<BackgroundLayer id="b" />
</MapLibre>

<MapLibre
	mapStyle={emptyStyle}
	bind:map={second}
	bind:ready={secondReady}
	style="width: 200px; height: 150px"
>
	<BackgroundLayer id="b" />
	<GeoJSONSource id="s" data={points}>
		<CircleLayer id="dots" />
	</GeoJSONSource>
	<BackgroundLayer id="a" />
</MapLibre>
