<script lang="ts">
	import { FillExtrusionLayer, GeoJSONSource, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE, grid } from './data.js';

	const cells = grid();

	let scale = $state(1);
	let opacity = $state(0.9);
</script>

<DemoFrame
	title="Polygons with height"
	caption="Height is read per feature from a property, so one layer draws blocks of different sizes. Extrusions only exist when the camera is pitched — flat on, this is an ordinary fill."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[0, 42]} zoom={3.4} pitch={55} bearing={-15}>
		<NavigationControl visualizePitch />

		<GeoJSONSource id="blocks" data={cells}>
			<FillExtrusionLayer
				id="blocks-3d"
				paint={{
					'fill-extrusion-height': ['*', ['get', 'height'], scale],
					'fill-extrusion-base': 0,
					'fill-extrusion-opacity': opacity,
					'fill-extrusion-color': [
						'interpolate',
						['linear'],
						['get', 'height'],
						20000,
						'#0d9488',
						245000,
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
