<script lang="ts">
	import type { BackgroundLayerSpecification } from 'maplibre-gl';
	import type { Snippet } from 'svelte';
	import Layer from './Layer.svelte';
	import type { LayerEventProps } from '../../types.js';

	type Props = Omit<BackgroundLayerSpecification, 'type' | 'id'> &
		LayerEventProps & {
			/** Unique within the style. Changing it recreates the layer. */
			id: string;
			/** Insert before this layer id; changing it moves the layer. */
			beforeId?: string;
			/** Sugar over `layout.visibility`. @defaultValue true */
			visible?: boolean;
			children?: Snippet<[{ id: string }]>;
		};

	let props: Props = $props();
</script>

<Layer type="background" {...props} />
