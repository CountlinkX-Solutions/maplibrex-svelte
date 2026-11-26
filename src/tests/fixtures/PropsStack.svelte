<script lang="ts">
	import type {
		ErrorEvent,
		Map as MapLibreMap,
		Marker as MapLibreMarker,
		PaddingOptions,
		Popup as MapLibrePopup,
		StyleImageMetadata,
		StyleSpecification
	} from 'maplibre-gl';
	import MapLibre from '#lib/components/MapLibre.svelte';
	import VectorSource from '#lib/components/sources/VectorSource.svelte';
	import BackgroundLayer from '#lib/components/layers/BackgroundLayer.svelte';
	import Layer from '#lib/components/layers/Layer.svelte';
	import Marker from '#lib/components/overlays/Marker.svelte';
	import Popup from '#lib/components/overlays/Popup.svelte';
	import Image from '#lib/components/style/Image.svelte';

	/**
	 * One of each component whose optional props #20 is about, each taking
	 * them from an object, so a test sets a prop by passing it and unsets it by
	 * leaving it out: a fill layer `subject` (source layer `a` unless given) on
	 * a vector source between two background layers, a marker, an open
	 * standalone popup, an image `dot`, and the map's `padding`.
	 */
	type Props = {
		vectorTiles: string[];
		padding?: PaddingOptions;
		layer?: {
			sourceLayer?: string;
			metadata?: unknown;
			minzoom?: number;
			maxzoom?: number;
		};
		marker?: Record<string, unknown>;
		popup?: Record<string, unknown>;
		image?: Partial<StyleImageMetadata>;
		onmapready?: (map: MapLibreMap) => void;
		oninstances?: (instances: { marker: MapLibreMarker; popup: MapLibrePopup }) => void;
		onerror?: (event: ErrorEvent) => void;
	};

	let {
		vectorTiles,
		padding,
		layer = {},
		marker = {},
		popup = {},
		image = {},
		onmapready,
		oninstances,
		onerror
	}: Props = $props();

	let map = $state<MapLibreMap | null>(null);
	let ready = $state(false);
	let markerInstance = $state<MapLibreMarker | null>(null);
	let popupInstance = $state<MapLibrePopup | null>(null);

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };
	const pixel = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);

	$effect(() => {
		if (ready && map) onmapready?.(map);
	});

	$effect(() => {
		if (markerInstance && popupInstance) {
			oninstances?.({ marker: markerInstance, popup: popupInstance });
		}
	});
</script>

<MapLibre
	mapStyle={emptyStyle}
	center={[0, 0]}
	zoom={3}
	{padding}
	bind:map
	bind:ready
	{onerror}
	style="width: 400px; height: 300px"
>
	<BackgroundLayer id="below" paint={{ 'background-opacity': 0 }} />
	<VectorSource id="tiles" tiles={vectorTiles}>
		<Layer
			id="subject"
			type="fill"
			sourceLayer={layer.sourceLayer ?? 'a'}
			metadata={layer.metadata}
			minzoom={layer.minzoom}
			maxzoom={layer.maxzoom}
		/>
	</VectorSource>
	<BackgroundLayer id="above" paint={{ 'background-opacity': 0 }} />

	<!-- Layer and Image props are named one by one: a prop read through a
	     spread signals whenever the spread object is replaced, and those two
	     components re-add themselves when an identity prop such as `id`
	     signals, which would hide what the tests look at. -->
	<Marker lngLat={[0, 0]} {...marker} bind:marker={markerInstance} />
	<Popup lngLat={[0, 0]} open {...popup} bind:popup={popupInstance}>Popup</Popup>
	<Image
		id="dot"
		image={pixel}
		pixelRatio={image.pixelRatio}
		sdf={image.sdf}
		stretchX={image.stretchX}
		stretchY={image.stretchY}
		content={image.content}
	/>
</MapLibre>
