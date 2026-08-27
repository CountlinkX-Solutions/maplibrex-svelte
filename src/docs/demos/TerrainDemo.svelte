<script lang="ts">
	import { MapLibre, NavigationControl, RasterDEMSource, Sky, Terrain } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { OSM_STYLE, TERRAIN_TILEJSON } from './data.js';

	let exaggeration = $state(1.4);
	let on = $state(true);
</script>

<DemoFrame
	title="Terrain and sky"
	caption="Both need pitch to be visible: straight down there is no relief to shade and no horizon to paint. Uncheck to see the same view flatten."
>
	<MapLibre
		mapStyle={OSM_STYLE}
		center={[11.39085, 47.27574]}
		zoom={11.2}
		pitch={78}
		options={{ maxPitch: 85, maxZoom: 18 }}
	>
		<NavigationControl visualizePitch />

		<!-- No encoding prop: the TileJSON declares it, and overriding it wrong
		     decodes the elevation into nonsense rather than failing loudly. -->
		<RasterDEMSource id="demo-dem" url={TERRAIN_TILEJSON}>
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
