<script lang="ts">
	import {
		HillshadeLayer,
		MapLibre,
		NavigationControl,
		RasterDEMSource,
		Terrain
	} from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { OSM_STYLE, TERRAIN_TILEJSON } from './data.js';

	// Height. Drives Terrain, so moving this actually raises the ground.
	let height = $state(1.5);

	// Shading strength. MapLibre calls it `hillshade-exaggeration`, but it only
	// deepens the shadows — the ground does not move.
	let shading = $state(0.5);

	let hillshade = $state(true);
</script>

<DemoFrame
	title="One elevation source, two consumers"
	caption="Both controls read the same raster-dem source. The first changes the ground; the second only changes how it is shaded — which is why MapLibre's own name for it, hillshade-exaggeration, misleads almost everyone the first time."
>
	<MapLibre
		mapStyle={OSM_STYLE}
		center={[7.6586, 45.9763]}
		zoom={12.4}
		pitch={72}
		bearing={-18}
		options={{ maxPitch: 85, maxZoom: 18 }}
	>
		<NavigationControl visualizePitch />

		<!-- No encoding prop: the TileJSON declares it. -->
		<RasterDEMSource id="dem" url={TERRAIN_TILEJSON}>
			<Terrain exaggeration={height} />

			<HillshadeLayer
				id="dem-hillshade"
				visible={hillshade}
				paint={{
					'hillshade-exaggeration': shading,
					'hillshade-shadow-color': '#2b2013',
					'hillshade-highlight-color': '#fbf7ef'
				}}
			/>
		</RasterDEMSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			terrain height
			<input type="range" min="0" max="3" step="0.1" bind:value={height} />
			<output>×{height.toFixed(1)}</output>
		</label>
		<label>
			hillshade strength
			<input type="range" min="0" max="1" step="0.05" bind:value={shading} />
			<output>{shading.toFixed(2)}</output>
		</label>
		<label>
			<input type="checkbox" bind:checked={hillshade} />
			hillshade
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
