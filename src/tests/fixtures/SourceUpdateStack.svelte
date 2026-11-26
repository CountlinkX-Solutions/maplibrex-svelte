<script lang="ts">
	import type {
		ErrorEvent,
		LayerSpecification,
		Map as MapLibreMap,
		StyleSpecification
	} from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import Source from '#lib/components/sources/Source.svelte';
	import BackgroundLayer from '#lib/components/layers/BackgroundLayer.svelte';
	import Layer from '#lib/components/layers/Layer.svelte';
	import type { AnySourceSpecification } from '#lib/internal/source.js';

	/**
	 * One source `subject` from a raw specification, with a layer of
	 * `layerType` reading it, between two background layers `below` and
	 * `above`, so a test can change the specification and see whether the
	 * source and its layer stayed where they were.
	 */
	type Props = {
		spec: AnySourceSpecification;
		layerType: LayerSpecification['type'];
		onmapready?: (map: MapLibreMap) => void;
		onerror?: (event: ErrorEvent) => void;
	};

	let { spec, layerType, onmapready, onerror }: Props = $props();

	// The test renderer replaces the whole props object on `rerender`, which
	// signals every prop read through it even when its value is unchanged. A
	// derived value stops that at an equal type, so only `spec` changes.
	const type = $derived(layerType);

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
	zoom={2}
	bind:map
	bind:ready
	{onerror}
	style="width: 320px; height: 240px"
>
	<BackgroundLayer id="below" paint={{ 'background-opacity': 0 }} />
	<Source id="subject" {spec}>
		<Layer id="subject-layer" {type} />
	</Source>
	<BackgroundLayer id="above" paint={{ 'background-opacity': 0 }} />
</MapLibre>
