<script lang="ts" module>
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import type { MapStatus } from '#lib/types.js';

	export type MapState = {
		status: MapStatus;
		error: Error | null;
		ready: boolean;
		map: MapLibreMap | null;
	};
</script>

<script lang="ts">
	import type { ErrorEvent, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import GeoJSONSource from '#lib/components/sources/GeoJSONSource.svelte';
	import RasterSource from '#lib/components/sources/RasterSource.svelte';
	import BackgroundLayer from '#lib/components/layers/BackgroundLayer.svelte';
	import CircleLayer from '#lib/components/layers/CircleLayer.svelte';
	import RasterLayer from '#lib/components/layers/RasterLayer.svelte';

	/**
	 * One map that reports its status, error, readiness and instance whenever
	 * any of them changes. Optionally renders a fallback, a tree (a top-level
	 * layer and a GeoJSON source with a nested layer), and a raster source whose
	 * tiles come from `rasterTiles`.
	 */
	type Props = {
		mapStyle: StyleSpecification | string;
		withFallback?: boolean;
		withTree?: boolean;
		rasterTiles?: string[];
		onerror?: (event: ErrorEvent) => void;
		onstate?: (state: MapState) => void;
	};

	let {
		mapStyle,
		withFallback = false,
		withTree = false,
		rasterTiles,
		onerror,
		onstate = () => {}
	}: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);
	let status = $state<MapStatus>('loading');
	let error = $state<Error | null>(null);

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
		onstate({ status, error, ready, map });
	});
</script>

{#snippet failed({ error }: { error: Error })}
	<p data-testid="fallback">The map could not be shown: {error.message}</p>
{/snippet}

<MapLibre
	{mapStyle}
	center={[0, 0]}
	zoom={2}
	bind:map
	bind:ready
	bind:status
	bind:error
	fallback={withFallback ? failed : undefined}
	{onerror}
	style="width: 320px; height: 240px"
>
	{#if withTree}
		<BackgroundLayer id="top-level" paint={{ 'background-opacity': 0 }} />
		<GeoJSONSource id="points" data={points}>
			<CircleLayer id="points-circle" />
		</GeoJSONSource>
	{/if}

	{#if rasterTiles}
		<RasterSource id="raster" tiles={rasterTiles} tileSize={256}>
			<RasterLayer id="raster-layer" />
		</RasterSource>
	{/if}
</MapLibre>
