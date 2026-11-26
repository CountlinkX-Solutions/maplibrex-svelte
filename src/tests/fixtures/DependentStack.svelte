<script lang="ts">
	import type { ErrorEvent, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import GeoJSONSource from '#lib/components/sources/GeoJSONSource.svelte';
	import RasterDEMSource from '#lib/components/sources/RasterDEMSource.svelte';
	import FeatureState from '#lib/components/data/FeatureState.svelte';
	import Terrain from '#lib/components/style/Terrain.svelte';

	/**
	 * Terrain and feature state, which need a source but are not layers, one
	 * case per `scenario`:
	 * - `late-source`: both name their source by id, ahead of sources that
	 *   render only while `showSource` is true;
	 * - `nested`: both nested in their sources, whose ids end in `suffix` and
	 *   whose options change with `revision`, which recreates them.
	 */
	type Props = {
		scenario: 'late-source' | 'nested';
		demTiles: string[];
		showSource?: boolean;
		suffix?: string;
		revision?: number;
		onmapready?: (map: MapLibreMap) => void;
		onerror?: (event: ErrorEvent) => void;
	};

	let {
		scenario,
		demTiles,
		showSource = true,
		suffix = '',
		revision = 0,
		onmapready,
		onerror
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
	{onerror}
	style="width: 320px; height: 240px"
>
	{#if scenario === 'late-source'}
		<Terrain source="dem" />
		<FeatureState source="pts" id={1} state={{ hover: true }} />
		{#if showSource}
			<RasterDEMSource id="dem" tiles={demTiles} tileSize={256} encoding="mapbox" />
			<GeoJSONSource id="pts" data={points} />
		{/if}
	{:else}
		<RasterDEMSource
			id={`dem${suffix}`}
			tiles={demTiles}
			tileSize={256}
			maxzoom={12 + revision}
			encoding="mapbox"
		>
			<Terrain />
		</RasterDEMSource>
		<GeoJSONSource id={`pts${suffix}`} data={points} tolerance={0.375 + revision}>
			<FeatureState id={1} state={{ hover: true }} />
		</GeoJSONSource>
	{/if}
</MapLibre>
