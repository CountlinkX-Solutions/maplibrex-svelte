<script lang="ts">
	import { FillLayer, LineLayer, MapLibre, NavigationControl, VectorSource } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { BLANK_STYLE, DEMOTILES_VECTOR } from './data.js';

	let clicked = $state<string | null>(null);
	let outlines = $state(true);
</script>

<DemoFrame
	title="Vector tiles, styled from scratch"
	caption="A blank background and one vector source: every polygon here is drawn by the two nested layers, not by a basemap. Click a country to read a property off the tile."
>
	<MapLibre mapStyle={BLANK_STYLE} center={[10, 45]} zoom={3}>
		<NavigationControl />

		<VectorSource id="world" url={DEMOTILES_VECTOR}>
			<!-- sourceLayer is not optional here: the tiles carry three layers. -->
			<FillLayer
				id="world-fill"
				sourceLayer="countries"
				paint={{ 'fill-color': '#0d9488', 'fill-opacity': 0.35 }}
				onclick={(event) => (clicked = String(event.features?.[0]?.properties?.NAME ?? ''))}
			/>
			<LineLayer
				id="world-outline"
				sourceLayer="countries"
				visible={outlines}
				paint={{ 'line-color': '#7fd8cd', 'line-width': 0.8 }}
			/>
		</VectorSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			<input type="checkbox" bind:checked={outlines} />
			outlines
		</label>
		<span><strong>clicked</strong> {clicked ?? '—'}</span>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
