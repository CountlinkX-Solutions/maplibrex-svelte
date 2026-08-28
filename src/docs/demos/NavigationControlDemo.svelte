<script lang="ts">
	import { MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	let showZoom = $state(true);
	let showCompass = $state(true);
	let visualizePitch = $state(true);
</script>

<DemoFrame
	title="Zoom, compass and pitch"
	caption="Drag with the right mouse button to rotate and tilt. With visualizePitch on, the compass needle leans as well as turns, so the button reports both angles instead of one."
>
	<MapLibre
		mapStyle={DEMO_STYLE}
		center={[10, 45]}
		zoom={3.6}
		pitch={45}
		bearing={-25}
		options={{ maxPitch: 85 }}
	>
		<NavigationControl position="top-right" {showZoom} {showCompass} {visualizePitch} />
	</MapLibre>

	{#snippet controls()}
		<label><input type="checkbox" bind:checked={showZoom} /> showZoom</label>
		<label><input type="checkbox" bind:checked={showCompass} /> showCompass</label>
		<label><input type="checkbox" bind:checked={visualizePitch} /> visualizePitch</label>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
