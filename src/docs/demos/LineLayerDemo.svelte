<script lang="ts">
	import type { ExpressionSpecification } from 'maplibre-gl';
	import { GeoJSONSource, LineLayer, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE, route } from './data.js';

	const path = route();

	// Annotated because an inline array widens to string[] and stops matching
	// the expression tuple the style spec asks for.
	const GRADIENT: ExpressionSpecification = [
		'interpolate',
		['linear'],
		['line-progress'],
		0,
		'#0d9488',
		0.5,
		'#eab308',
		1,
		'#b91c1c'
	];

	let width = $state(6);
	let dashed = $state(false);
	let gradient = $state(true);

	// line-gradient only works on a source with lineMetrics, and only as a
	// property of the line itself — not as a paint colour you can also set.
	const paint = $derived({
		'line-width': width,
		...(dashed ? { 'line-dasharray': [2, 1.5] } : {}),
		...(gradient ? { 'line-gradient': GRADIENT } : { 'line-color': '#0d9488' })
	});
</script>

<DemoFrame
	title="One line, three ways to style it"
	caption="A gradient runs along the line's own length, which is why the source needs lineMetrics. Dashes and gradients cannot be combined — MapLibre draws the dash pattern without the gradient."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[6, 42]} zoom={3.6}>
		<NavigationControl />

		<GeoJSONSource id="path" data={path} lineMetrics>
			<LineLayer id="path-line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} {paint} />
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			width
			<input type="range" min="1" max="18" bind:value={width} />
			<output>{width}px</output>
		</label>
		<label>
			<input type="checkbox" bind:checked={gradient} />
			gradient
		</label>
		<label>
			<input type="checkbox" bind:checked={dashed} />
			dashed
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
