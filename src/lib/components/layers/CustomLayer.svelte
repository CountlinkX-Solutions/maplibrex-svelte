<script lang="ts">
	import type { CustomLayerInterface } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { getStyleRegistry } from '../../context.js';
	import type { DependentRegistration } from '../../internal/registry.js';
	import { removeLayerIfPresent } from '../../internal/style-ops.js';

	type Props = {
		/**
		 * Your own WebGL layer: three.js, babylon.js, or raw GL. MapLibre calls
		 * its `onAdd`, `render` and `onRemove` hooks.
		 */
		layer: CustomLayerInterface;
		/**
		 * Insert before this layer id; changing it moves the layer. Without it,
		 * the layer's place in the markup decides its place in the style.
		 */
		beforeId?: string;
	};

	let { layer, beforeId }: Props = $props();

	const registry = getStyleRegistry();

	let anchor = $state<HTMLElement>();
	let registration: DependentRegistration | undefined;

	// Placed through the registry like any other layer, so it keeps its place
	// in the markup relative to them and comes back after a style swap.
	$effect(() => {
		const element = anchor;
		const custom = layer;
		if (!element) return;

		const current = registry.addDependent({
			source: undefined,
			layer: { id: custom.id, anchor: element, beforeId: untrack(() => beforeId) },
			apply: (map, before) => {
				map.addLayer(custom, before);
				if (!map.getLayer(custom.id)) return false;
			},
			unapply: (map) => removeLayerIfPresent(map, custom.id)
		});
		registration = current;

		return () => {
			current.unregister();
			if (registration === current) registration = undefined;
		};
	});

	$effect(() => {
		const target = beforeId;
		untrack(() => registration?.setBeforeId(target));
	});
</script>

<!-- Marks the layer's place in the markup. `hidden`, not styled inline: a
     strict CSP blocks style attributes. -->
<div bind:this={anchor} hidden aria-hidden="true" data-maplibrex="layer"></div>
