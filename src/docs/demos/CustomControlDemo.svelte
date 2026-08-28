<script lang="ts">
	import type { LngLatLike } from 'maplibre-gl';
	import { CustomControl, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	let center = $state<LngLatLike>([6, 46]);
	let zoom = $state(3.4);

	const places: Array<{ name: string; at: LngLatLike }> = [
		{ name: 'Lisbon', at: [-9.139, 38.722] },
		{ name: 'Paris', at: [2.352, 48.857] },
		{ name: 'Rome', at: [12.496, 41.903] }
	];
</script>

<DemoFrame
	title="Your own markup, docked like a native control"
	caption="These are ordinary Svelte buttons with ordinary handlers. MapLibre relocates the node into its control container, and Svelte keeps owning it — so state, events and reactivity all still work after the move."
>
	<MapLibre mapStyle={DEMO_STYLE} bind:center bind:zoom cameraMode="fly">
		<NavigationControl position="top-right" />

		<CustomControl position="top-left" class="place-picker">
			{#each places as place (place.name)}
				<button
					type="button"
					onclick={() => {
						center = place.at;
						zoom = 6;
					}}
				>
					{place.name}
				</button>
			{/each}
		</CustomControl>
	</MapLibre>

	{#snippet controls()}
		<span><strong>zoom</strong> {zoom.toFixed(2)}</span>
		<span>the buttons drive props, not the map instance</span>
	{/snippet}
</DemoFrame>

<style>
	:global(.place-picker) {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	:global(.place-picker button) {
		border: 0;
		border-bottom: 1px solid #e2e5e7;
		background: #fff;
		color: #222;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.35rem 0.75rem;
		text-align: left;
		cursor: pointer;
	}

	:global(.place-picker button:last-child) {
		border-bottom: 0;
	}

	:global(.place-picker button:hover) {
		background: #f2f5f6;
	}
</style>
