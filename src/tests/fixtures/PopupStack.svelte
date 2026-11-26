<script lang="ts">
	import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import Popup from '#lib/components/overlays/Popup.svelte';

	type Props = {
		/** Constructor-only: changing it makes the component build a new popup. */
		className?: string;
		/** Reports every value `bind:open` takes, so the test can read it back. */
		onopenchange?: (open: boolean) => void;
		onmapready?: (map: MapLibreMap) => void;
	};

	let { className = 'first', onopenchange, onmapready }: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);
	let open = $state(true);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	$effect(() => {
		onopenchange?.(open);
	});

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
	<!-- No closeButton, closeOnClick or focusAfterOpen: the tests rely on MapLibre's defaults. -->
	<Popup lngLat={[0, 0]} {className} bind:open>
		<p data-testid="popup-content">Standalone</p>
	</Popup>
</MapLibre>
