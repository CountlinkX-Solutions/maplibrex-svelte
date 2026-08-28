<script lang="ts">
	import { HillshadeLayer, MapLibre, NavigationControl, RasterDEMSource } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { BLANK_STYLE, TERRAIN_TILEJSON } from './data.js';

	let exaggeration = $state(0.6);
	let shadow = $state('#2b2013');
</script>

<DemoFrame
	title="Elevation without leaving 2D"
	caption="The same source that drives 3D terrain also feeds hillshade, which needs no pitch. Nothing here is a basemap — the relief is the only thing drawn."
>
	<MapLibre mapStyle={BLANK_STYLE} center={[7.75, 46.05]} zoom={9}>
		<NavigationControl />

		<!-- No encoding prop: the TileJSON declares it. -->
		<RasterDEMSource id="dem" url={TERRAIN_TILEJSON}>
			<HillshadeLayer
				id="dem-hillshade"
				paint={{
					'hillshade-exaggeration': exaggeration,
					'hillshade-shadow-color': shadow,
					'hillshade-highlight-color': '#f4f7f5'
				}}
			/>
		</RasterDEMSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			exaggeration
			<input type="range" min="0" max="1" step="0.05" bind:value={exaggeration} />
			<output>{exaggeration.toFixed(2)}</output>
		</label>
		<label>
			shadow
			<input type="color" bind:value={shadow} />
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
