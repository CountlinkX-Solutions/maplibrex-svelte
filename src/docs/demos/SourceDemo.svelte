<script lang="ts">
	import type { SourceSpecification } from 'maplibre-gl';
	import { CircleLayer, MapLibre, NavigationControl, Source, SymbolLayer } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE, scatter } from './data.js';

	const points = scatter();

	let cluster = $state(true);

	// The raw specification the typed wrappers build for you. Toggling `cluster`
	// changes an option with no setter upstream, so the source is recreated —
	// and the nested layers re-add themselves without you doing anything.
	const spec = $derived({
		type: 'geojson',
		data: points,
		cluster,
		clusterRadius: 45
	} satisfies SourceSpecification);
</script>

<DemoFrame
	title="The raw specification, unwrapped"
	caption="Toggling clustering changes an option MapLibre exposes no setter for, so the source is recreated. The layers below it come back on their own."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[5, 45]} zoom={3.2}>
		<NavigationControl />

		<Source id="scatter" {spec}>
			<CircleLayer
				id="scatter-points"
				filter={['!', ['has', 'point_count']]}
				paint={{ 'circle-radius': 4, 'circle-color': '#b91c1c', 'circle-opacity': 0.85 }}
			/>

			{#if cluster}
				<CircleLayer
					id="scatter-clusters"
					filter={['has', 'point_count']}
					paint={{
						'circle-radius': ['step', ['get', 'point_count'], 14, 20, 20, 60, 28],
						'circle-color': '#0d9488',
						'circle-opacity': 0.85,
						'circle-stroke-width': 2,
						'circle-stroke-color': '#ffffff'
					}}
				/>
				<SymbolLayer
					id="scatter-counts"
					filter={['has', 'point_count']}
					layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }}
					paint={{ 'text-color': '#ffffff' }}
				/>
			{/if}
		</Source>
	</MapLibre>

	{#snippet controls()}
		<label>
			<input type="checkbox" bind:checked={cluster} />
			cluster
		</label>
		<span>400 generated points</span>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
