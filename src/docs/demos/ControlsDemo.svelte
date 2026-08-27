<script lang="ts">
	import {
		CustomControl,
		FullscreenControl,
		GlobeControl,
		MapLibre,
		NavigationControl,
		ScaleControl
	} from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	let zoom = $state(3);
</script>

<DemoFrame
	title="Controls in every corner"
	caption="CustomControl is the button on the left: your own markup, docked and styled like a native control."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[10, 45]} bind:zoom>
		<NavigationControl position="top-right" visualizePitch />
		<GlobeControl position="top-right" />
		<FullscreenControl position="top-right" />
		<ScaleControl position="bottom-left" unit="metric" />

		<CustomControl position="top-left">
			<button type="button" onclick={() => (zoom = 3)}>Reset zoom</button>
		</CustomControl>
	</MapLibre>
</DemoFrame>

<style>
	button {
		border: 0;
		background: transparent;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.35rem 0.6rem;
		cursor: pointer;
		color: #222;
	}
</style>
