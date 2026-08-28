<script lang="ts">
	import { MapLibre, NavigationControl, RasterLayer, RasterSource } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { BLANK_STYLE } from './data.js';

	let opacity = $state(1);
	let saturation = $state(0);
</script>

<DemoFrame
	title="Raster tiles with live paint"
	caption="Image tiles need no styling to appear, but a raster layer still has paint properties. Both sliders update in place — the source is never touched."
>
	<MapLibre mapStyle={BLANK_STYLE} center={[2.3522, 48.8566]} zoom={5}>
		<NavigationControl />

		<RasterSource
			id="osm"
			tiles={['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png']}
			tileSize={256}
			maxzoom={19}
			attribution="© OpenStreetMap contributors"
		>
			<RasterLayer
				id="osm-layer"
				paint={{ 'raster-opacity': opacity, 'raster-saturation': saturation }}
			/>
		</RasterSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			opacity
			<input type="range" min="0.1" max="1" step="0.05" bind:value={opacity} />
			<output>{opacity.toFixed(2)}</output>
		</label>
		<label>
			saturation
			<input type="range" min="-1" max="1" step="0.1" bind:value={saturation} />
			<output>{saturation.toFixed(1)}</output>
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
