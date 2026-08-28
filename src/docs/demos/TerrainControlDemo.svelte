<script lang="ts">
	import { MapLibre, NavigationControl, RasterDEMSource, Sky, TerrainControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { OSM_STYLE, TERRAIN_TILEJSON } from './data.js';
</script>

<DemoFrame
	title="Terrain as a button"
	caption="The same effect as mounting <Terrain>, handed to the visitor instead of decided by you. It needs a raster-dem source in the style, which is why the source is declared even though nothing else reads it."
>
	<MapLibre
		mapStyle={OSM_STYLE}
		center={[11.39085, 47.27574]}
		zoom={11.6}
		pitch={72}
		options={{ maxPitch: 85 }}
	>
		<NavigationControl visualizePitch />

		<!-- Without a sky, a pitched map draws nothing above the horizon and the
		     frame shows through, which reads as a rendering glitch. -->
		<Sky sky-color="#0b2a4a" horizon-color="#9fb6c6" fog-color="#dfe8ee" fog-ground-blend={0.4} />
		<RasterDEMSource id="control-dem" url={TERRAIN_TILEJSON} />
		<TerrainControl source="control-dem" exaggeration={1.4} position="top-right" />
	</MapLibre>

	{#snippet controls()}
		<span>press the mountain button in the top right</span>
	{/snippet}
</DemoFrame>
