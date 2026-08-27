<script lang="ts">
	import { browser } from '$app/environment';
	import { GeoJSONSource, Image, MapLibre, SymbolLayer } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { CITIES, DEMO_STYLE, ringIcon } from './data.js';

	// Generated in code rather than fetched, so the icon needs no network request.
	// Guarded on browser because ImageData does not exist while this page is
	// prerendered in Node.
	const icon = $derived(browser ? ringIcon() : null);

	let registered = $state(true);
</script>

<DemoFrame
	title="A generated icon behind a symbol layer"
	caption="Unregistering the image leaves the symbol layer with nothing to draw — which is exactly what the map reports through onstyleimagemissing."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[6, 46]} zoom={3.4}>
		{#if registered && icon}
			<Image id="ring" image={icon} pixelRatio={2} />
		{/if}

		<GeoJSONSource id="icon-cities" data={CITIES}>
			<SymbolLayer
				id="icon-cities-symbols"
				layout={{ 'icon-image': 'ring', 'icon-allow-overlap': true }}
			/>
		</GeoJSONSource>
	</MapLibre>

	{#snippet controls()}
		<label>
			<input type="checkbox" bind:checked={registered} />
			mount &lt;Image id="ring" /&gt;
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
