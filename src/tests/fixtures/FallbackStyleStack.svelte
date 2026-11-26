<script lang="ts">
	import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';

	/**
	 * The recovery pattern from #15: `onerror` assigns a fallback style when the
	 * one the map started with fails to load.
	 */
	type Props = {
		mapStyle: StyleSpecification | string;
		fallbackStyle: StyleSpecification;
		onload?: (event: { target: MapLibreMap }) => void;
	};

	let { mapStyle, fallbackStyle, onload }: Props = $props();

	let replacement = $state<StyleSpecification | null>(null);
</script>

<MapLibre
	mapStyle={replacement ?? mapStyle}
	onerror={() => (replacement = fallbackStyle)}
	{onload}
	style="width: 200px; height: 200px"
/>
