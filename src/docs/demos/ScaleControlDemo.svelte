<script lang="ts">
	import { MapLibre, NavigationControl, ScaleControl } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	let unit = $state<'metric' | 'imperial' | 'nautical'>('metric');
	let maxWidth = $state(120);
	let zoom = $state(4);
</script>

<DemoFrame
	title="A bar that means something different at every zoom"
	caption="The bar keeps a round number and changes its length, rather than keeping its length and showing an awkward number. Zoom in and watch the label fall to the next step."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[8, 46]} bind:zoom>
		<NavigationControl />
		<ScaleControl position="bottom-left" {unit} {maxWidth} />
	</MapLibre>

	{#snippet controls()}
		<label>
			unit
			<select bind:value={unit}>
				<option value="metric">metric</option>
				<option value="imperial">imperial</option>
				<option value="nautical">nautical</option>
			</select>
		</label>
		<label>
			maxWidth
			<input type="range" min="60" max="240" step="10" bind:value={maxWidth} />
			<output>{maxWidth}px</output>
		</label>
		<span><strong>zoom</strong> {zoom.toFixed(1)}</span>
	{/snippet}
</DemoFrame>

<style>
	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	select {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.2rem 0.35rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-raised);
		color: var(--text);
	}
</style>
