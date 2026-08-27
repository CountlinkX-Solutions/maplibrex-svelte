<script lang="ts">
	import { MapLibre, NavigationControl, Projection } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	let globe = $state(true);
</script>

<DemoFrame
	title="Projection as a mountable component"
	caption="Unchecking removes the component, and the map goes back to whatever the style declared — not to a hardcoded mercator."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[10, 30]} zoom={1.6}>
		<NavigationControl />
		{#if globe}
			<Projection type="globe" />
		{/if}
	</MapLibre>

	{#snippet controls()}
		<label>
			<input type="checkbox" bind:checked={globe} />
			mount &lt;Projection type="globe" /&gt;
		</label>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
