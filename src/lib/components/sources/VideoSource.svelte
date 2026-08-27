<script lang="ts">
	import type { VideoSourceSpecification } from 'maplibre-gl';
	import type { Snippet } from 'svelte';
	import Source from './Source.svelte';

	type Props = Omit<VideoSourceSpecification, 'type'> & {
		/** Unique within the style. Changing it recreates the source. */
		id: string;
		/** Layers nested here inherit this source id automatically. */
		children?: Snippet<[{ id: string }]>;
	};

	let { id, children, ...spec }: Props = $props();
</script>

<Source {id} spec={{ type: 'video', ...spec }} {children} />
