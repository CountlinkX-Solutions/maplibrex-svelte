<script lang="ts">
	import type { ErrorEvent, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import GeoJSONSource from '#lib/components/sources/GeoJSONSource.svelte';
	import RasterDEMSource from '#lib/components/sources/RasterDEMSource.svelte';
	import BackgroundLayer from '#lib/components/layers/BackgroundLayer.svelte';
	import CircleLayer from '#lib/components/layers/CircleLayer.svelte';
	import FeatureState from '#lib/components/data/FeatureState.svelte';
	import Terrain from '#lib/components/style/Terrain.svelte';
	import EpochProbe from './EpochProbe.svelte';

	/**
	 * The tree a style swap has to bring back: a top-level layer, a GeoJSON
	 * source with a nested layer and feature state, optionally a layer between
	 * them, and optionally terrain nested in a raster-dem source.
	 */
	type Props = {
		mapStyle: StyleSpecification | string;
		/** Tile URLs for the raster-dem source; terrain is rendered only when given. */
		demTiles?: string[];
		/** Mounts a layer between the top-level layer and the source. */
		showExtra?: boolean;
		onmapready?: (map: MapLibreMap) => void;
		onerror?: (event: ErrorEvent) => void;
		onepoch?: (epoch: number) => void;
	};

	let {
		mapStyle,
		demTiles,
		showExtra = false,
		onmapready,
		onerror,
		onepoch = () => {}
	}: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

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
	{mapStyle}
	center={[0, 0]}
	zoom={2}
	bind:map
	bind:ready
	{onerror}
	style="width: 320px; height: 240px"
>
	<EpochProbe {onepoch} />

	<BackgroundLayer id="top-level" paint={{ 'background-opacity': 0 }} />

	{#if showExtra}
		<BackgroundLayer id="extra" paint={{ 'background-opacity': 0 }} />
	{/if}

	<GeoJSONSource id="points" data={points}>
		<CircleLayer id="points-circle" />
		<FeatureState id={1} state={{ hover: true }} />
	</GeoJSONSource>

	{#if demTiles}
		<RasterDEMSource id="dem" tiles={demTiles} tileSize={256} encoding="mapbox">
			<Terrain />
		</RasterDEMSource>
	{/if}
</MapLibre>
