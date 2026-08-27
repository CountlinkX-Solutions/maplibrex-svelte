<script lang="ts">
	import type {
		CustomLayerInterface,
		LightSpecification,
		Map as MapLibreMap,
		SkySpecification,
		StyleSpecification
	} from 'maplibre-gl';
	import MapLibre from '$lib/components/MapLibre.svelte';
	import GeoJSONSource from '$lib/components/sources/GeoJSONSource.svelte';
	import CustomLayer from '$lib/components/layers/CustomLayer.svelte';
	import FeatureState from '$lib/components/data/FeatureState.svelte';
	import GlobalState from '$lib/components/style/GlobalState.svelte';
	import Image from '$lib/components/style/Image.svelte';
	import Light from '$lib/components/style/Light.svelte';
	import Projection from '$lib/components/style/Projection.svelte';
	import Sky from '$lib/components/style/Sky.svelte';

	type Props = {
		/** Toggles every style-level component at once, to test restore on unmount. */
		showStyle?: boolean;
		hovered?: boolean;
		labelSize?: number;
		onmapready?: (map: MapLibreMap) => void;
	};

	let { showStyle = true, hovered = true, labelSize = 12, onmapready }: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	const sky: SkySpecification = { 'sky-color': '#001133', 'horizon-color': '#8899aa' };
	const light: LightSpecification = { anchor: 'map', intensity: 0.4 };

	// A single opaque red pixel: enough to prove registration without a network
	// request or a decode step.
	const pixel = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);

	const noopCustomLayer: CustomLayerInterface = {
		id: 'custom-noop',
		type: 'custom',
		render: () => {}
	};

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
	{#if showStyle}
		<Projection type="globe" />
		<Sky {...sky} />
		<Light {...light} />
		<Image id="dot" image={pixel} />
		<GlobalState {labelSize} />
		<CustomLayer layer={noopCustomLayer} />
	{/if}

	<GeoJSONSource id="pts" data={points}>
		{#if hovered}
			<FeatureState id={1} state={{ hover: true }} />
		{/if}
	</GeoJSONSource>
</MapLibre>
