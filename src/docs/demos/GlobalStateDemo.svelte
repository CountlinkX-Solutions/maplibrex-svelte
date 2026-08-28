<script lang="ts">
	import type { StyleSpecification } from 'maplibre-gl';
	import {
		CircleLayer,
		GeoJSONSource,
		GlobalState,
		MapLibre,
		NavigationControl
	} from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMOTILES_VECTOR, scatter } from './data.js';

	const points = scatter();

	let dotSize = $state(5);
	let minWeight = $state(0);

	/**
	 * The style declares its global state up front, with defaults. Expressions
	 * read those names, so the style is valid before any value is pushed.
	 */
	const style: StyleSpecification = {
		version: 8,
		state: {
			dotSize: { default: 5 },
			minWeight: { default: 0 }
		},
		sources: {
			world: { type: 'vector', url: DEMOTILES_VECTOR }
		},
		layers: [
			{ id: 'bg', type: 'background', paint: { 'background-color': '#0b1b22' } },
			{
				id: 'land',
				type: 'fill',
				source: 'world',
				'source-layer': 'countries',
				paint: { 'fill-color': '#16323d' }
			}
		]
	};
</script>

<DemoFrame
	title="One value, read by every expression that wants it"
	caption="Both sliders write global state, not layer paint. The circle layer reads the names from its own expressions, so a value set once reaches every layer that mentions it — no prop threading."
>
	<MapLibre mapStyle={style} center={[5, 45]} zoom={3.2}>
		<NavigationControl />

		<GlobalState {dotSize} {minWeight} />

		<GeoJSONSource id="dots" data={points}>
			<CircleLayer
				id="dots-layer"
				filter={['>=', ['get', 'weight'], ['global-state', 'minWeight']]}
				paint={{
					'circle-radius': ['global-state', 'dotSize'],
					'circle-color': '#35c9b8',
					'circle-opacity': 0.85
				}}
			/>
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			dotSize
			<input type="range" min="1" max="14" bind:value={dotSize} />
			<output>{dotSize}</output>
		</label>
		<label>
			minWeight
			<input type="range" min="0" max="10" bind:value={minWeight} />
			<output>{minWeight}</output>
		</label>
		<span>one drives paint, the other drives a filter</span>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
