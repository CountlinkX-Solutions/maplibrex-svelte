<script lang="ts">
	import type { LayerSpecification } from 'maplibre-gl';
	import { GeoJSONSource, Layer, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE, scatter } from './data.js';

	const points = scatter();

	type Kind = Extract<LayerSpecification['type'], 'circle' | 'heatmap'>;

	let kind = $state<Kind>('circle');

	// The type is a prop, so the same declaration renders either layer. MapLibre
	// has no setter for a layer's type, so switching recreates it.
	const paint = $derived(
		kind === 'circle'
			? { 'circle-radius': 4, 'circle-color': '#0d9488', 'circle-opacity': 0.8 }
			: { 'heatmap-radius': 26, 'heatmap-opacity': 0.85 }
	);
</script>

<DemoFrame
	title="Layer type as a prop"
	caption="The typed wrappers exist because they narrow paint to the properties that layer type actually has. Reach for the generic Layer when the type is data — a saved view, a user choice — rather than something you write."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[5, 45]} zoom={3.2}>
		<NavigationControl />

		<GeoJSONSource id="switchable" data={points}>
			<Layer id="switchable-layer" type={kind} {paint} />
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			type
			<select bind:value={kind}>
				<option value="circle">circle</option>
				<option value="heatmap">heatmap</option>
			</select>
		</label>
		<span>the source is untouched either way</span>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	select {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.2rem 0.35rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-raised);
		color: var(--text);
	}
</style>
