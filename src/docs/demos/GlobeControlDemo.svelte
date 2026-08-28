<script lang="ts">
	import { GlobeControl, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';
</script>

<DemoFrame
	title="Mercator and globe, one button"
	caption="Press the globe in the top right. The same style and the same data are reprojected — nothing is reloaded, so the switch is a camera change rather than a new map."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[10, 30]} zoom={1.4}>
		<NavigationControl />
		<GlobeControl position="top-right" />
	</MapLibre>

	{#snippet controls()}
		<span>for the same thing as a prop, see <code>&lt;Projection&gt;</code></span>
	{/snippet}
</DemoFrame>
