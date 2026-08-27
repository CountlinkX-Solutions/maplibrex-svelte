<script lang="ts">
	import type { AddProtocolAction, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '$lib/components/MapLibre.svelte';
	import GeoJSONSource from '$lib/components/sources/GeoJSONSource.svelte';
	import Protocol from '$lib/components/data/Protocol.svelte';

	type Props = {
		scheme: string;
		handler: AddProtocolAction;
		dataUrl: string;
		onmapready?: (map: MapLibreMap) => void;
	};

	let { scheme, handler, dataUrl, onmapready }: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	$effect(() => {
		if (ready && map) onmapready?.(map);
	});
</script>

<!--
	Protocol sits above MapLibre on purpose: sibling effects run in document
	order, so the scheme is registered before the map requests anything through it.
-->
<Protocol name={scheme} {handler} />

<MapLibre
	mapStyle={emptyStyle}
	center={[0, 0]}
	zoom={2}
	bind:map
	bind:ready
	style="width: 200px; height: 200px"
>
	<GeoJSONSource id="via-protocol" data={dataUrl} />
</MapLibre>
