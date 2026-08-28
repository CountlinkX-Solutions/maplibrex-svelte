<script lang="ts">
	import { GeoJSONSource, HeatmapLayer, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE, scatter } from './data.js';

	const points = scatter();

	let radius = $state(24);
	let intensity = $state(1);
	let weighted = $state(false);
</script>

<DemoFrame
	title="Density instead of dots"
	caption="Radius is measured in screen pixels, so the same data reads differently at every zoom. Weighting makes some points count more than others without changing their number."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[5, 45]} zoom={3.2}>
		<NavigationControl />

		<GeoJSONSource id="density" data={points}>
			<HeatmapLayer
				id="density-heat"
				paint={{
					'heatmap-radius': radius,
					'heatmap-intensity': intensity,
					'heatmap-opacity': 0.85,
					'heatmap-weight': weighted
						? ['interpolate', ['linear'], ['get', 'weight'], 0, 0.1, 10, 1]
						: 1
				}}
			/>
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			radius
			<input type="range" min="6" max="60" bind:value={radius} />
			<output>{radius}px</output>
		</label>
		<label>
			intensity
			<input type="range" min="0.2" max="4" step="0.1" bind:value={intensity} />
			<output>{intensity.toFixed(1)}</output>
		</label>
		<label>
			<input type="checkbox" bind:checked={weighted} />
			weight by property
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
