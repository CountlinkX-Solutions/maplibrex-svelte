<script lang="ts">
	import { tick } from 'svelte';
	import type { StyleSpecification } from 'maplibre-gl';
	import { MapLibre, NavigationControl, type MapStatus } from '#lib/index.js';
	import DemoFrame from '../ui/DemoFrame.svelte';
	import { DEMO_STYLE } from './data.js';

	const STYLES: Record<string, StyleSpecification | string> = {
		'Demo style': DEMO_STYLE,
		'Missing URL': 'https://demotiles.maplibre.org/no-such-style.json',
		'Invalid style': {
			version: 8,
			sources: {},
			layers: [{ id: 'broken', type: 'background', paint: { 'background-color': 'not-a-colour' } }]
		}
	};

	let choice = $state('Demo style');
	let status = $state<MapStatus>('loading');
	let error = $state<Error | null>(null);
	let attempt = $state(0);

	/**
	 * Creates the map again, optionally with every canvas refusing a WebGL
	 * context, as a browser without WebGL does. The refusal lasts only while
	 * the new map is created, so nothing else on the page is affected.
	 */
	async function recreate(withoutWebGL: boolean) {
		const original = HTMLCanvasElement.prototype.getContext;
		if (withoutWebGL) {
			HTMLCanvasElement.prototype.getContext = function (
				this: HTMLCanvasElement,
				type: string,
				...rest: unknown[]
			) {
				if (type.includes('webgl')) return null;
				return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
			} as typeof original;
		}

		try {
			attempt += 1;
			await tick();
		} finally {
			HTMLCanvasElement.prototype.getContext = original;
		}
	}
</script>

<DemoFrame
	title="Status, errors and a fallback"
	caption="A style that fails leaves the map in place: pick another and it recovers. Without WebGL there is no map at all, so the fallback snippet is rendered in its container instead."
>
	{#key attempt}
		<MapLibre mapStyle={STYLES[choice]} center={[2.17, 41.38]} zoom={3} bind:status bind:error>
			<NavigationControl />

			{#snippet fallback({ error: reason })}
				<div class="fallback">
					<strong>This map needs WebGL2.</strong>
					<span>{reason.name}</span>
				</div>
			{/snippet}
		</MapLibre>
	{/key}

	{#snippet controls()}
		<span class="status" data-status={status} aria-live="polite">
			<strong>status</strong>
			{status}
		</span>
		<label>
			mapStyle
			<select bind:value={choice}>
				{#each Object.keys(STYLES) as name (name)}
					<option>{name}</option>
				{/each}
			</select>
		</label>
		<button type="button" onclick={() => recreate(true)}>Recreate without WebGL</button>
		<button type="button" onclick={() => recreate(false)}>Recreate</button>
		{#if error}
			<span class="error">{error.message}</span>
		{/if}
	{/snippet}
</DemoFrame>

<style>
	.fallback {
		display: grid;
		place-content: center;
		gap: 0.25rem;
		height: 100%;
		padding: 1rem;
		text-align: center;
		color: var(--text-muted);
	}

	.status[data-status='ready'] strong {
		color: var(--accent);
	}

	.error {
		flex-basis: 100%;
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	select,
	button {
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-raised);
		color: var(--text);
		font: inherit;
		font-size: 0.85rem;
		padding: 0.3rem 0.7rem;
	}

	button {
		cursor: pointer;
	}

	button:hover {
		border-color: var(--border-strong);
	}
</style>
