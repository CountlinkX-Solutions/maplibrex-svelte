<script lang="ts">
	import type { StyleSpecification } from 'maplibre-gl';
	import {
		BackgroundLayer,
		FillLayer,
		GeoJSONSource,
		LineLayer,
		MapLibre,
		NavigationControl
	} from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { grid } from './data.js';

	const cells = grid();

	// A style with no layers at all, so the only background is the one below.
	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	let color = $state('#0f1b21');
	let showBackground = $state(true);
</script>

<DemoFrame
	title="The layer underneath everything"
	caption="Background is the only layer type with no source: it paints the whole viewport. Turn it off and you see the map's own canvas, not a hole in the data."
>
	<MapLibre mapStyle={emptyStyle} center={[0, 46]} zoom={3}>
		<NavigationControl />

		{#if showBackground}
			<BackgroundLayer id="bg" paint={{ 'background-color': color }} />
		{/if}

		<GeoJSONSource id="bg-cells" data={cells}>
			<FillLayer id="bg-fill" paint={{ 'fill-color': '#35c9b8', 'fill-opacity': 0.3 }} />
			<LineLayer id="bg-outline" paint={{ 'line-color': '#7fd8cd', 'line-width': 1 }} />
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			<input type="checkbox" bind:checked={showBackground} />
			background layer
		</label>
		<label>
			colour
			<input type="color" bind:value={color} />
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
