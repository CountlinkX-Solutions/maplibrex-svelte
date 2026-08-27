<script lang="ts">
	import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '$lib/components/MapLibre.svelte';
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

<MapLibre
	mapStyle={emptyStyle}
	center={[0, 0]}
	zoom={3}
	bind:map
	bind:ready
	style="width: 400px; height: 300px"
>
	<!-- Default pin with an attached popup: the popup must not replace the pin. -->
	<Marker lngLat={[0, 0]} color="#b91c1c">
		<Popup>
			<strong data-testid="pin-popup">Attached</strong>
		</Popup>
	</Marker>

	<!-- Custom markup: this one does replace the pin. -->
	<Marker lngLat={[10, 0]} class="custom-marker">
		{#snippet content()}
			<div data-testid="custom-content">Custom</div>
		{/snippet}
	</Marker>
</MapLibre>
