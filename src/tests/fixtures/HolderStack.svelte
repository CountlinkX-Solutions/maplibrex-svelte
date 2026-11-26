<script lang="ts">
	import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '$lib/components/MapLibre.svelte';
	import CustomControl from '$lib/components/controls/CustomControl.svelte';
	import Marker from '$lib/components/overlays/Marker.svelte';
	import Popup from '$lib/components/overlays/Popup.svelte';

	type Props = {
		onmapready?: (map: MapLibreMap) => void;
	};

	let { onmapready }: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	$effect(() => {
		if (ready && map) onmapready?.(map);
	});
</script>

<!-- Every component that renders its markup into a hidden holder before
     MapLibre moves it into a container of its own. -->
<MapLibre
	mapStyle={emptyStyle}
	center={[0, 0]}
	zoom={3}
	bind:map
	bind:ready
	style="width: 400px; height: 300px"
>
	<Marker lngLat={[0, 0]}>
		{#snippet content()}
			<div data-testid="marker-content">Marker</div>
		{/snippet}
	</Marker>

	<Popup lngLat={[5, 0]} open={true}>
		<p data-testid="popup-content">Popup</p>
	</Popup>

	<CustomControl position="top-left">
		<button type="button" data-testid="control-content">Control</button>
	</CustomControl>
</MapLibre>
