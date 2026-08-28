<script lang="ts">
	import type { StyleSpecification } from 'maplibre-gl';
	import {
		BackgroundLayer,
		FillLayer,
		LineLayer,
		MapLibre,
		NavigationControl,
		VectorSource
	} from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMOTILES_VECTOR } from './data.js';

	// A style with no layers at all, so the only background is the one below.
	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	let colour = $state('#0b2a3a');
	let showBackground = $state(true);
</script>

<DemoFrame
	title="The layer underneath everything"
	caption="Land comes from a vector source; the sea is not data at all — it is the background showing through. Turn the background off and the ocean becomes the page, which is what makes this layer type worth having."
>
	<MapLibre mapStyle={emptyStyle} center={[10, 47]} zoom={3.4}>
		<NavigationControl />

		{#if showBackground}
			<BackgroundLayer id="bg" paint={{ 'background-color': colour }} />
		{/if}

		<VectorSource id="world" url={DEMOTILES_VECTOR}>
			<FillLayer
				id="world-fill"
				sourceLayer="countries"
				paint={{ 'fill-color': '#e8e2d5', 'fill-opacity': 1 }}
			/>
			<LineLayer
				id="world-outline"
				sourceLayer="countries"
				paint={{ 'line-color': '#b9ad97', 'line-width': 0.8 }}
			/>
		</VectorSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			<input type="checkbox" bind:checked={showBackground} />
			background layer
		</label>
		<label>
			sea colour
			<input type="color" bind:value={colour} />
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
