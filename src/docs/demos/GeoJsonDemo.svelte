<script lang="ts">
	import { CircleLayer, GeoJSONSource, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { CITIES, DEMO_STYLE } from './data.js';

	let scale = $state(4);
	let selected = $state<string | null>(null);
</script>

<DemoFrame
	title="GeoJSON source with a circle layer"
	caption="The layer is nested inside the source, so it inherits the source id. Click a circle to read its properties."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[6, 46]} zoom={3.4}>
		<NavigationControl />

		<GeoJSONSource id="cities" data={CITIES}>
			<CircleLayer
				id="cities-dots"
				paint={{
					'circle-radius': ['*', ['get', 'population'], scale],
					'circle-color': '#0d9488',
					'circle-opacity': 0.75,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}}
				onclick={(event) => (selected = String(event.features?.[0]?.properties?.name ?? ''))}
			/>
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			radius factor
			<input type="range" min="1" max="8" step="0.5" bind:value={scale} />
			<output>{scale}</output>
		</label>
		<span><strong>clicked</strong> {selected ?? '—'}</span>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
