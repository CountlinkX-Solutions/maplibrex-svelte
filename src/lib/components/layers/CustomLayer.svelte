<script lang="ts">
	import type { CustomLayerInterface } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { getMapContext } from '../../context.js';
	import { removeLayerIfPresent } from '../../internal/style-ops.js';

	type Props = {
		/**
		 * Your own WebGL layer: three.js, babylon.js, or raw GL. MapLibre calls
		 * its `onAdd`, `render` and `onRemove` hooks.
		 */
		layer: CustomLayerInterface;
		/** Insert before this layer id. */
		beforeId?: string;
	};

	let { layer, beforeId }: Props = $props();

	const context = getMapContext();

	$effect(() => {
		const map = context.map;
		const ready = context.ready;
		void context.styleEpoch;

		const custom = layer;
		const before = beforeId;

		if (!map || !ready) return;

		untrack(() => map.addLayer(custom, before));

		return () => removeLayerIfPresent(map, custom.id);
	});
</script>
