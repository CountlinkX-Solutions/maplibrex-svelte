<script lang="ts">
	import { FillLayer, GeoJSONSource, LineLayer, MapLibre } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE, grid } from './data.js';

	const cells = grid();

	let color = $state('#0d9488');
	let opacity = $state(0.55);
	let visible = $state(true);
</script>

<DemoFrame
	title="Paint updates in place"
	caption="Moving these controls calls setPaintProperty for the one key that changed. The layer is never recreated, so its tiles and transitions survive."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[0, 46]} zoom={3}>
		<GeoJSONSource id="cells" data={cells}>
			<FillLayer
				id="cells-fill"
				{visible}
				paint={{ 'fill-color': color, 'fill-opacity': opacity }}
			/>
			<LineLayer id="cells-outline" paint={{ 'line-color': color, 'line-width': 1 }} />
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			colour
			<input type="color" bind:value={color} />
		</label>
		<label>
			opacity
			<input type="range" min="0" max="1" step="0.05" bind:value={opacity} />
			<output>{opacity.toFixed(2)}</output>
		</label>
		<label>
			<input type="checkbox" bind:checked={visible} />
			visible
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
