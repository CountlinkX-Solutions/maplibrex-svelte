<script lang="ts">
	import { FullscreenControl, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';
</script>

<DemoFrame
	title="Expand the map, not the page"
	caption="The button expands the map container by default. Press Escape to come back — the browser owns that, not MapLibre."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[6, 46]} zoom={3}>
		<NavigationControl />
		<FullscreenControl position="top-right" />
	</MapLibre>

	{#snippet controls()}
		<span>pass <code>container</code> to expand a wrapper instead of the map</span>
	{/snippet}
</DemoFrame>
