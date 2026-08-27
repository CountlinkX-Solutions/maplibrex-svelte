<script lang="ts">
	import { ScaleControl as MapLibreScaleControl } from 'maplibre-gl';
	import type { ControlPosition, ScaleControlOptions } from 'maplibre-gl';
	import Control from './Control.svelte';

	type Props = ScaleControlOptions & {
		/** @defaultValue 'top-right' */
		position?: ControlPosition;
		/** Read-only binding to the underlying control, for imperative calls. */
		control?: MapLibreScaleControl | null;
	};

	let { position = 'top-right', control = $bindable(null), ...options }: Props = $props();
</script>

<Control
	factory={(resolved: ScaleControlOptions) => new MapLibreScaleControl(resolved)}
	{options}
	{position}
	bind:control
/>
