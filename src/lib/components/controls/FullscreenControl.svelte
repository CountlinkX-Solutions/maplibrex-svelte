<script lang="ts">
	import { FullscreenControl as MapLibreFullscreenControl } from 'maplibre-gl';
	import type { ControlPosition, FullscreenControlOptions } from 'maplibre-gl';
	import Control from './Control.svelte';

	type Props = FullscreenControlOptions & {
		/** @defaultValue 'top-right' */
		position?: ControlPosition;
		/** Read-only binding to the underlying control, for imperative calls. */
		control?: MapLibreFullscreenControl | null;
	};

	let { position = 'top-right', control = $bindable(null), ...options }: Props = $props();
</script>

<Control
	factory={(resolved: FullscreenControlOptions) => new MapLibreFullscreenControl(resolved)}
	{options}
	{position}
	bind:control
/>
