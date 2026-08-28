<script lang="ts">
	import { browser } from '$app/environment';
	import { ImageSource, MapLibre, NavigationControl, RasterLayer } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE, overlayImageUrl, type Corners } from './data.js';

	// Built from a canvas, so it exists only in the browser: this page is
	// prerendered in Node, where there is no document to draw into.
	const url = $derived(browser ? overlayImageUrl() : null);

	let opacity = $state(0.85);
	let stretched = $state(false);

	const square: Corners = [
		[-6, 46],
		[6, 46],
		[6, 38],
		[-6, 38]
	];

	const skewed: Corners = [
		[-8, 47],
		[7, 45],
		[5, 37],
		[-6, 39]
	];

	const coordinates = $derived(stretched ? skewed : square);
</script>

<DemoFrame
	title="An image pinned to four corners"
	caption="The corners are geographic, not pixels: move them and the image is warped to fit. Order is clockwise from the top left."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[0, 42]} zoom={3.6}>
		<NavigationControl />

		{#if url}
			<ImageSource id="overlay" {url} {coordinates}>
				<RasterLayer id="overlay-layer" paint={{ 'raster-opacity': opacity }} />
			</ImageSource>
		{/if}
	</MapLibre>

	{#snippet controls()}
		<label>
			opacity
			<input type="range" min="0.1" max="1" step="0.05" bind:value={opacity} />
			<output>{opacity.toFixed(2)}</output>
		</label>
		<label>
			<input type="checkbox" bind:checked={stretched} />
			skew the corners
		</label>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
