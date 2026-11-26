<script lang="ts">
	import type { ErrorEvent, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import GeoJSONSource from '#lib/components/sources/GeoJSONSource.svelte';
	import CircleLayer from '#lib/components/layers/CircleLayer.svelte';
	import Terrain from '#lib/components/style/Terrain.svelte';

	/**
	 * Entries that read a source by id, and the ways that source can arrive or
	 * fail to:
	 * - `layerSource`: a layer, mounted from the start, reading that source;
	 * - `sourceOnReady`: a GeoJSON source `late`, mounted in the same update
	 *   that makes the map ready;
	 * - `laterSource`: a layer mounted after the map is ready, reading it;
	 * - `showPair`: a layer reading `pair`, then the source `pair` after it in
	 *   the markup, both mounted together after the map is ready;
	 * - `terrainSource`: terrain reading that source.
	 */
	type Props = {
		mapStyle?: StyleSpecification;
		layerSource?: string;
		sourceOnReady?: boolean;
		laterSource?: string;
		showPair?: boolean;
		terrainSource?: string;
		onload?: (event: { target: MapLibreMap }) => void;
		onerror?: (event: ErrorEvent) => void;
		onmapready?: (map: MapLibreMap) => void;
	};

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	let {
		mapStyle = emptyStyle,
		layerSource,
		sourceOnReady = false,
		laterSource,
		showPair = false,
		terrainSource,
		onload,
		onerror,
		onmapready
	}: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

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
	{mapStyle}
	center={[0, 0]}
	zoom={2}
	bind:map
	bind:ready
	{onload}
	{onerror}
	style="width: 320px; height: 240px"
>
	{#if layerSource}
		<CircleLayer id="waiting" source={layerSource} />
	{/if}

	{#if sourceOnReady && ready}
		<GeoJSONSource id="late" data={points} />
	{/if}

	{#if laterSource}
		<CircleLayer id="later" source={laterSource} />
	{/if}

	{#if showPair}
		<CircleLayer id="pair-layer" source="pair" />
		<GeoJSONSource id="pair" data={points} />
	{/if}

	{#if terrainSource}
		<Terrain source={terrainSource} />
	{/if}
</MapLibre>
