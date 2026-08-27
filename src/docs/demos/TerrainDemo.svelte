<script lang="ts">
	import { MapLibre, NavigationControl, RasterDEMSource, Sky, Terrain } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE, TERRAIN_TILES } from './data.js';

	let exaggeration = $state(1.6);
	let on = $state(true);
</script>

<DemoFrame
	title="Terrain and sky"
	caption="Both need pitch to be visible: straight down there is no relief to shade and no horizon to paint. Elevation tiles come from MapLibre's public demo endpoint."
>
	<MapLibre
		mapStyle={DEMO_STYLE}
		center={[11.39, 47.27]}
		zoom={11}
		pitch={70}
		bearing={40}
		options={{ maxPitch: 85 }}
	>
		<NavigationControl visualizePitch />

		<RasterDEMSource id="demo-dem" url={TERRAIN_TILES} encoding="terrarium">
			{#if on}
				<Terrain {exaggeration} />
			{/if}
		</RasterDEMSource>

		{#if on}
			<Sky sky-color="#0b2a4a" horizon-color="#9fb6c6" fog-color="#dfe8ee" fog-ground-blend={0.4} />
		{/if}
	</MapLibre>

	{#snippet controls()}
		<label>
			<input type="checkbox" bind:checked={on} />
			terrain and sky
		</label>
		<label>
			exaggeration
			<input type="range" min="0.5" max="3" step="0.1" bind:value={exaggeration} />
			<output>{exaggeration.toFixed(1)}</output>
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
