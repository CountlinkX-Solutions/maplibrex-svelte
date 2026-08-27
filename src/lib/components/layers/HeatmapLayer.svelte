<script lang="ts">
	import type { HeatmapLayerSpecification } from 'maplibre-gl';
	import type { Snippet } from 'svelte';
	import Layer from './Layer.svelte';
	import type { LayerEventProps } from '../../types.js';

	type Props = Omit<HeatmapLayerSpecification, 'type' | 'id' | 'source' | 'source-layer'> &
		LayerEventProps & {
			/** Unique within the style. Changing it recreates the layer. */
			id: string;
			/** Defaults to the id of the enclosing source component. */
			source?: string;
			/** Required for vector tile sources with more than one layer. */
			sourceLayer?: string;
			/** Insert before this layer id; changing it moves the layer. */
			beforeId?: string;
			/** Sugar over `layout.visibility`. @defaultValue true */
			visible?: boolean;
			children?: Snippet<[{ id: string }]>;
		};

	let props: Props = $props();
</script>

<Layer type="heatmap" {...props} />
