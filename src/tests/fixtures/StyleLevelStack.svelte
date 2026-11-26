<script lang="ts">
	import type {
		ErrorEvent,
		LightSpecification,
		Map as MapLibreMap,
		ProjectionSpecification,
		SkySpecification,
		StyleSpecification
	} from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import RasterDEMSource from '#lib/components/sources/RasterDEMSource.svelte';
	import GlobalState from '#lib/components/style/GlobalState.svelte';
	import Image from '#lib/components/style/Image.svelte';
	import Light from '#lib/components/style/Light.svelte';
	import Projection from '#lib/components/style/Projection.svelte';
	import Sky from '#lib/components/style/Sky.svelte';
	import Terrain from '#lib/components/style/Terrain.svelte';
	import EpochProbe from './EpochProbe.svelte';

	/**
	 * One map with the style-level components, each rendered only when its prop
	 * is given, so a test can mount and unmount them at any point: before or
	 * after a style swap, or while a style is being rebuilt.
	 */
	type Props = {
		mapStyle: StyleSpecification | string;
		light?: LightSpecification;
		sky?: SkySpecification;
		projection?: ProjectionSpecification;
		globalState?: Record<string, unknown>;
		/** Renders `<Image id="dot">` with a one-pixel image. */
		image?: boolean;
		/** Tile URLs for a raster-dem source `dem`; `<Terrain>` is nested in it when given. */
		demTiles?: string[];
		exaggeration?: number;
		onmapready?: (map: MapLibreMap) => void;
		onerror?: (event: ErrorEvent) => void;
		onepoch?: (epoch: number) => void;
	};

	let {
		mapStyle,
		light,
		sky,
		projection,
		globalState,
		image = false,
		demTiles,
		exaggeration,
		onmapready,
		onerror,
		onepoch = () => {}
	}: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

	const pixel = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);

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

	{#if light}
		<Light {...light} />
	{/if}
	{#if sky}
		<Sky {...sky} />
	{/if}
	{#if projection}
		<Projection {...projection} />
	{/if}
	{#if globalState}
		<GlobalState {...globalState} />
	{/if}
	{#if image}
		<Image id="dot" image={pixel} />
	{/if}
	{#if demTiles}
		<RasterDEMSource id="dem" tiles={demTiles} tileSize={256} encoding="mapbox">
			<Terrain {exaggeration} />
		</RasterDEMSource>
	{/if}
</MapLibre>
