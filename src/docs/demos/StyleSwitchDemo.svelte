<script lang="ts">
	import type { StyleSpecification } from 'maplibre-gl';
	import {
		CircleLayer,
		GeoJSONSource,
		MapLibre,
		NavigationControl,
		type MapStatus
	} from '#lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { BLANK_STYLE, CITIES, DEMO_STYLE, OSM_STYLE } from './data.js';

	const STYLES: Record<string, StyleSpecification | string> = {
		'Demo tiles': DEMO_STYLE,
		OpenStreetMap: OSM_STYLE,
		Blank: BLANK_STYLE
	};

	let choice = $state('Demo tiles');
	let status = $state<MapStatus>('loading');
</script>

<DemoFrame
	title="Switching styles"
	caption="The circles are a GeoJSON source and a layer declared as components. Pick another style: the circles come back, drawn above the new style's own layers."
>
	<MapLibre mapStyle={STYLES[choice]} center={[6, 46]} zoom={3.4} bind:status>
		<NavigationControl />

		<GeoJSONSource id="cities" data={CITIES}>
			<CircleLayer
				id="cities-dots"
				paint={{
					'circle-radius': ['*', ['get', 'population'], 4],
					'circle-color': '#0d9488',
					'circle-opacity': 0.8,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}}
			/>
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			mapStyle
			<select bind:value={choice}>
				{#each Object.keys(STYLES) as name (name)}
					<option>{name}</option>
				{/each}
			</select>
		</label>
		<span class="status" data-status={status} aria-live="polite">
			<strong>status</strong>
			{status}
		</span>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	select {
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-raised);
		color: var(--text);
		font: inherit;
		font-size: 0.85rem;
		padding: 0.3rem 0.7rem;
	}

	.status[data-status='ready'] strong {
		color: var(--accent);
	}
</style>
