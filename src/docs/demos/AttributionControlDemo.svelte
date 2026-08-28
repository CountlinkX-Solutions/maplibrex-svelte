<script lang="ts">
	import { AttributionControl, MapLibre, NavigationControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	let compact = $state(false);
	let credit = $state(true);
</script>

<DemoFrame
	title="Credit where the tiles came from"
	caption="Most tile providers require this, and the map adds one by default — so pass attributionControl: false in options before adding your own, or you get two."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[6, 46]} zoom={3} options={{ attributionControl: false }}>
		<NavigationControl />
		<AttributionControl
			position="bottom-right"
			{compact}
			customAttribution={credit ? 'Survey data © Your organisation' : undefined}
		/>
	</MapLibre>

	{#snippet controls()}
		<label><input type="checkbox" bind:checked={compact} /> compact</label>
		<label><input type="checkbox" bind:checked={credit} /> custom attribution</label>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
