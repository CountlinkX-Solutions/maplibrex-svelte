<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import NavigationControl from '#lib/components/controls/NavigationControl.svelte';
	import CustomControl from '#lib/components/controls/CustomControl.svelte';
	import FeatureState from '#lib/components/data/FeatureState.svelte';
	import CircleLayer from '#lib/components/layers/CircleLayer.svelte';
	import CustomLayer from '#lib/components/layers/CustomLayer.svelte';
	import Layer from '#lib/components/layers/Layer.svelte';
	import Marker from '#lib/components/overlays/Marker.svelte';
	import Popup from '#lib/components/overlays/Popup.svelte';
	import GeoJSONSource from '#lib/components/sources/GeoJSONSource.svelte';
	import RasterDEMSource from '#lib/components/sources/RasterDEMSource.svelte';
	import GlobalState from '#lib/components/style/GlobalState.svelte';
	import Image from '#lib/components/style/Image.svelte';
	import Light from '#lib/components/style/Light.svelte';
	import Projection from '#lib/components/style/Projection.svelte';
	import Sky from '#lib/components/style/Sky.svelte';
	import Terrain from '#lib/components/style/Terrain.svelte';

	/**
	 * Each component that adds something to the map, rendered only when its
	 * props object is given and spread into it, as in `<Layer {...props} />`.
	 * Replacing an object with an equal copy changes no value the component
	 * reads. The sources that dependents read are written here, not passed in,
	 * so only the component under test receives a new object.
	 */
	type Props = {
		source?: ComponentProps<typeof GeoJSONSource>;
		layer?: ComponentProps<typeof Layer>;
		circle?: ComponentProps<typeof CircleLayer>;
		featureState?: ComponentProps<typeof FeatureState>;
		custom?: ComponentProps<typeof CustomLayer>;
		image?: ComponentProps<typeof Image>;
		/** Rendered inside a raster-dem source `dem` on `demTiles`. */
		terrain?: ComponentProps<typeof Terrain>;
		demTiles?: string[];
		control?: ComponentProps<typeof NavigationControl>;
		customControl?: Omit<ComponentProps<typeof CustomControl>, 'children'>;
		marker?: ComponentProps<typeof Marker>;
		popup?: ComponentProps<typeof Popup>;
		light?: ComponentProps<typeof Light>;
		sky?: ComponentProps<typeof Sky>;
		projection?: ComponentProps<typeof Projection>;
		globalState?: ComponentProps<typeof GlobalState>;
		onmapready?: (map: MapLibreMap) => void;
	};

	let {
		source,
		layer,
		circle,
		featureState,
		custom,
		image,
		terrain,
		demTiles,
		control,
		customControl,
		marker,
		popup,
		light,
		sky,
		projection,
		globalState,
		onmapready
	}: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };
	const points = {
		type: 'FeatureCollection' as const,
		features: [
			{
				type: 'Feature' as const,
				id: 1,
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
	{#if source}
		<GeoJSONSource {...source} />
	{/if}

	{#if layer || circle || featureState}
		<GeoJSONSource id="pts" data={points}>
			{#if layer}
				<Layer {...layer} />
			{/if}
			{#if circle}
				<CircleLayer {...circle} />
			{/if}
			{#if featureState}
				<FeatureState {...featureState} />
			{/if}
		</GeoJSONSource>
	{/if}

	{#if custom}
		<CustomLayer {...custom} />
	{/if}
	{#if image}
		<Image {...image} />
	{/if}
	{#if terrain && demTiles}
		<RasterDEMSource id="dem" tiles={demTiles} tileSize={256} encoding="mapbox">
			<Terrain {...terrain} />
		</RasterDEMSource>
	{/if}

	{#if control}
		<NavigationControl {...control} />
	{/if}
	{#if customControl}
		<CustomControl {...customControl}>
			<span data-testid="custom-control">custom</span>
		</CustomControl>
	{/if}

	{#if marker}
		<Marker {...marker} />
	{/if}
	{#if popup}
		<Popup {...popup}>
			<p>popup</p>
		</Popup>
	{/if}

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
</MapLibre>
