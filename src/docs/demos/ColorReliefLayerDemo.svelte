<script lang="ts">
	import type { ExpressionSpecification } from 'maplibre-gl';
	import { ColorReliefLayer, MapLibre, NavigationControl, RasterDEMSource } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { BLANK_STYLE, TERRAIN_TILEJSON } from './data.js';

	let opacity = $state(1);
	let scheme = $state<'terrain' | 'thermal'>('terrain');

	const ramps: Record<'terrain' | 'thermal', ExpressionSpecification> = {
		terrain: [
			'interpolate',
			['linear'],
			['elevation'],
			0,
			'#1d4f3f',
			800,
			'#4e8a45',
			1600,
			'#c9b269',
			2600,
			'#8a6a4e',
			3600,
			'#ffffff'
		],
		thermal: [
			'interpolate',
			['linear'],
			['elevation'],
			0,
			'#08123b',
			800,
			'#3b1f6e',
			1600,
			'#a52f5f',
			2600,
			'#e97a2f',
			3600,
			'#ffe9a3'
		]
	};

	// The ramp is an expression over ["elevation"], so the colours are assigned
	// by height rather than baked into the tiles.
	const paint = $derived({
		'color-relief-opacity': opacity,
		'color-relief-color': ramps[scheme]
	});
</script>

<DemoFrame
	title="Elevation as colour"
	caption="Same raster-dem source as hillshade, read a different way: instead of shading slopes, every pixel is coloured by how high it is."
>
	<MapLibre mapStyle={BLANK_STYLE} center={[7.75, 46.02]} zoom={8.6}>
		<NavigationControl />

		<RasterDEMSource id="relief-dem" url={TERRAIN_TILEJSON}>
			<ColorReliefLayer id="relief" {paint} />
		</RasterDEMSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			ramp
			<select bind:value={scheme}>
				<option value="terrain">terrain</option>
				<option value="thermal">thermal</option>
			</select>
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

	select {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.2rem 0.35rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-raised);
		color: var(--text);
	}
</style>
