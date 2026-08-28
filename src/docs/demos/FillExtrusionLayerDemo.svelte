<script lang="ts">
	import { FillExtrusionLayer, GeoJSONSource, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { OSM_STYLE, blocks } from './data.js';

	const buildings = blocks();

	let scale = $state(1);
	let opacity = $state(0.95);
</script>

<DemoFrame
	title="Polygons with height"
	caption="Height is in metres and read per feature, so one layer draws blocks of different sizes. Extrusions only exist when the camera is pitched — flat on, this is an ordinary fill."
>
	<MapLibre
		mapStyle={OSM_STYLE}
		center={[2.3522, 48.8566]}
		zoom={15.1}
		pitch={58}
		bearing={-22}
		options={{ maxPitch: 85 }}
	>
		<NavigationControl visualizePitch />

		<GeoJSONSource id="blocks" data={buildings}>
			<FillExtrusionLayer
				id="blocks-3d"
				paint={{
					'fill-extrusion-height': ['*', ['get', 'height'], scale],
					'fill-extrusion-base': ['get', 'base'],
					'fill-extrusion-opacity': opacity,
					'fill-extrusion-color': [
						'interpolate',
						['linear'],
						['get', 'height'],
						12,
						'#0d9488',
						124,
						'#b91c1c'
					]
				}}
			/>
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			height scale
			<input type="range" min="0" max="3" step="0.1" bind:value={scale} />
			<output>×{scale.toFixed(1)}</output>
		</label>
		<label>
			opacity
			<input type="range" min="0.2" max="1" step="0.05" bind:value={opacity} />
			<output>{opacity.toFixed(2)}</output>
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
