<script lang="ts">
	import type { GeolocateControl as MapLibreGeolocateControl } from 'maplibre-gl';
	import { GeolocateControl, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	let control = $state<MapLibreGeolocateControl | null>(null);
	let trackUserLocation = $state(true);
	let showAccuracyCircle = $state(true);
	let outcome = $state('not asked yet');
</script>

<DemoFrame
	title="Find the visitor, with their permission"
	caption="The browser decides, not the map: this needs a secure context and an explicit grant. Denying it is a normal outcome, so handle onerror rather than assuming a position will arrive."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[6, 46]} zoom={3}>
		<NavigationControl />
		<GeolocateControl
			position="top-right"
			bind:control
			{trackUserLocation}
			{showAccuracyCircle}
			ongeolocate={() => (outcome = 'located')}
			onerror={() => (outcome = 'denied or unavailable')}
		/>
	</MapLibre>

	{#snippet controls()}
		<label><input type="checkbox" bind:checked={trackUserLocation} /> trackUserLocation</label>
		<label><input type="checkbox" bind:checked={showAccuracyCircle} /> showAccuracyCircle</label>
		<button type="button" onclick={() => control?.trigger()}>trigger() from your own UI</button>
		<span><strong>state</strong> {outcome}</span>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

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
