<script lang="ts">
	import { MapLibre, NavigationControl, RasterLayer, VideoSource } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DRONE_CORNERS, DRONE_VIDEO, OSM_STYLE } from './data.js';

	let opacity = $state(1);
</script>

<DemoFrame
	title="A video pinned to four corners"
	caption="Same shape as an image source, but the frames keep coming. Two encodings are listed so the browser can pick one it plays."
>
	<MapLibre mapStyle={OSM_STYLE} center={[-122.514, 37.5629]} zoom={16.5}>
		<NavigationControl />

		<VideoSource id="drone" urls={DRONE_VIDEO} coordinates={DRONE_CORNERS}>
			<RasterLayer id="drone-layer" paint={{ 'raster-opacity': opacity }} />
		</VideoSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			opacity
			<input type="range" min="0.1" max="1" step="0.05" bind:value={opacity} />
			<output>{opacity.toFixed(2)}</output>
		</label>
		<span>video © Mapbox sample assets</span>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
