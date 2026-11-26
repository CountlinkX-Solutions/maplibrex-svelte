<script lang="ts">
	import type { Map as MapLibreMap, PositionAnchor, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import Popup from '#lib/components/overlays/Popup.svelte';

	type Props = {
		/** Changed in place, without a new popup. */
		className?: string;
		/**
		 * The popup's `anchor`, which is constructor-only: changing it makes the
		 * component build a new popup. Named apart because the test renderer
		 * takes an `anchor` key as a mount option.
		 */
		popupAnchor?: PositionAnchor;
		/** Passed to the popup as its `onclose` handler. */
		onclose?: () => void;
		/** Passed to the popup as its `onopen` handler. */
		onopen?: () => void;
		/**
		 * Given, opens the popup through `bind:open`, as an app does after the
		 * user closed it. Every rerender re-reads it, so a test passes it only
		 * to open the popup again.
		 */
		reopen?: number;
		/** Reports every value `bind:open` takes, so the test can read it back. */
		onopenchange?: (open: boolean) => void;
		onmapready?: (map: MapLibreMap) => void;
	};

	let {
		className = 'first',
		popupAnchor,
		onclose,
		onopen,
		reopen,
		onopenchange,
		onmapready
	}: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);
	let open = $state(true);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	$effect(() => {
		onopenchange?.(open);
	});

	$effect(() => {
		if (reopen !== undefined) open = true;
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
	<Popup lngLat={[0, 0]} {className} anchor={popupAnchor} {onclose} {onopen} bind:open>
		<p data-testid="popup-content">Standalone</p>
	</Popup>
</MapLibre>
