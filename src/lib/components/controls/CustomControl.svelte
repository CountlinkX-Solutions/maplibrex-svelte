<script lang="ts">
	import type { ControlPosition, IControl, Map as MapLibreMap } from 'maplibre-gl';
	import type { Snippet } from 'svelte';
	import { getMapContext } from '../../context.js';

	type Props = {
		/** @defaultValue 'top-right' */
		position?: ControlPosition;
		class?: string;
		children: Snippet<[{ map: MapLibreMap }]>;
	};

	let { position = 'top-right', class: className, children }: Props = $props();

	const context = getMapContext();

	// Read through `$derived`, which passes on only a new value: replacing a
	// spread props object with an equal one must not add the control anew.
	const stablePosition = $derived(position);

	let content = $state<HTMLDivElement | null>(null);

	// The snippet is rendered into a hidden holder and MapLibre relocates that
	// node into its own control container. Svelte keeps owning the node, so the
	// snippet stays reactive after the move.
	$effect(() => {
		const map = context.map;
		const node = content;
		const at = stablePosition;

		if (!map || !node) return;

		const control: IControl = {
			onAdd: () => node,
			onRemove: () => node.remove()
		};

		map.addControl(control, at);

		return () => map.removeControl(control);
	});
</script>

<!-- `hidden`, not an inline style: a strict CSP blocks style attributes. -->
<div hidden aria-hidden="true">
	<div bind:this={content} class={['maplibregl-ctrl', className]}>
		{#if context.map}
			{@render children({ map: context.map })}
		{/if}
	</div>
</div>
