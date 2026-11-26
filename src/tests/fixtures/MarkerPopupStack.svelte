<script lang="ts">
	import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '$lib/components/MapLibre.svelte';
	import Marker from '$lib/components/overlays/Marker.svelte';
	import Popup from '$lib/components/overlays/Popup.svelte';

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
	let open = $state(false);

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
	<!-- Attached: the marker opens the popup, `bind:open` only reports it.
	     No closeButton: the user-close test relies on MapLibre's default. -->
	<Marker lngLat={[0, 0]}>
		<Popup {className} bind:open>
			<p data-testid="popup-content">Attached</p>
		</Popup>
	</Marker>
</MapLibre>
