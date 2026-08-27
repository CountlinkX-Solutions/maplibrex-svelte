<script lang="ts">
	import { FeatureState, FillLayer, GeoJSONSource, LineLayer, MapLibre } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE, grid } from './data.js';

	const cells = grid();

	let hoveredId = $state<number | null>(null);
</script>

<DemoFrame
	title="Hover as component lifecycle"
	caption="FeatureState is mounted only while a cell is hovered. Unmounting clears the state, so there is no removeFeatureState to remember."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[0, 46]} zoom={3}>
		<GeoJSONSource id="hover-cells" data={cells}>
			{#if hoveredId !== null}
				<FeatureState id={hoveredId} state={{ hover: true }} />
			{/if}

			<FillLayer
				id="hover-fill"
				paint={{
					'fill-color': '#0d9488',
					'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.85, 0.25]
				}}
				onmousemove={(event) => (hoveredId = Number(event.features?.[0]?.id ?? 0) || null)}
				onmouseleave={() => (hoveredId = null)}
			/>
			<LineLayer id="hover-outline" paint={{ 'line-color': '#0d9488', 'line-width': 1 }} />
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<span><strong>hovered feature</strong> {hoveredId ?? '—'}</span>
	{/snippet}
</DemoFrame>
