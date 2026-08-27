<script lang="ts">
	import type { LngLatLike } from 'maplibre-gl';
	import { MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	let center = $state<LngLatLike>([2.1734, 41.3851]);
	let zoom = $state(4);
	let bearing = $state(0);

	const readout = $derived(
		Array.isArray(center) ? `${center[0].toFixed(2)}, ${center[1].toFixed(2)}` : '—'
	);
</script>

<DemoFrame
	title="Bound camera"
	caption="Pan or zoom the map and the numbers follow. Press the button and the map follows instead — the same two props, both directions."
>
	<MapLibre mapStyle={DEMO_STYLE} bind:center bind:zoom bind:bearing cameraMode="fly">
		<NavigationControl />
	</MapLibre>

	{#snippet controls()}
		<span><strong>center</strong> {readout}</span>
		<span><strong>zoom</strong> {zoom.toFixed(2)}</span>
		<span><strong>bearing</strong> {bearing.toFixed(0)}°</span>
		<button
			type="button"
			onclick={() => {
				center = [12.4964, 41.9028];
				zoom = 6;
			}}
		>
			Fly to Rome
		</button>
	{/snippet}
</DemoFrame>

<style>
	button {
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-raised);
		color: var(--text);
		font: inherit;
		font-size: 0.85rem;
		padding: 0.3rem 0.7rem;
		cursor: pointer;
	}

	button:hover {
		border-color: var(--border-strong);
	}
</style>
