<script lang="ts">
	import type { LngLatLike } from 'maplibre-gl';
	import { MapLibre, Marker, Popup } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	let pin = $state<LngLatLike>([2.1734, 41.3851]);
	let noteOpen = $state(true);

	const readout = $derived(Array.isArray(pin) ? `${pin[0].toFixed(3)}, ${pin[1].toFixed(3)}` : '—');
</script>

<DemoFrame
	title="Draggable marker, attached popup, standalone popup"
	caption="Drag the red pin: bind:lngLat reflects the drag as it happens. Its popup is nested inside the marker, so the marker owns opening and closing."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[6, 44]} zoom={4}>
		<Marker bind:lngLat={pin} draggable color="#b91c1c">
			<Popup>
				<strong>Drag me</strong>
			</Popup>
		</Marker>

		<Marker lngLat={[12.4964, 41.9028]}>
			{#snippet content()}
				<div class="chip">Custom markup</div>
			{/snippet}
		</Marker>

		<Popup lngLat={[2.3522, 48.8566]} bind:open={noteOpen} closeOnClick={false}>
			<strong>Standalone</strong>
			<p>Driven by the open prop.</p>
		</Popup>
	</MapLibre>

	{#snippet controls()}
		<span><strong>pin</strong> {readout}</span>
		<label>
			<input type="checkbox" bind:checked={noteOpen} />
			standalone popup open
		</label>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.chip {
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		background: #0d9488;
		color: #fff;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		box-shadow: 0 2px 8px rgb(0 0 0 / 25%);
	}
</style>
