<script lang="ts">
	import type { ControlPosition } from 'maplibre-gl';
	import { LogoControl, MapLibre } from '$lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	let position = $state<ControlPosition>('bottom-left');
	let compact = $state(false);
</script>

<DemoFrame
	title="Where the logo sits"
	caption="Position is the prop every control shares, and this is the simplest place to see what the four values do."
>
	<MapLibre mapStyle={DEMO_STYLE} center={[6, 46]} zoom={3}>
		<LogoControl {position} {compact} />
	</MapLibre>

	{#snippet controls()}
		<label>
			position
			<select bind:value={position}>
				<option value="top-left">top-left</option>
				<option value="top-right">top-right</option>
				<option value="bottom-left">bottom-left</option>
				<option value="bottom-right">bottom-right</option>
			</select>
		</label>
		<label><input type="checkbox" bind:checked={compact} /> compact</label>
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
