<script lang="ts">
	import { AttributionControl as MapLibreAttributionControl } from 'maplibre-gl';
	import type { ControlPosition, AttributionControlOptions } from 'maplibre-gl';
	import Control from './Control.svelte';

	type Props = AttributionControlOptions & {
		/** @defaultValue 'top-right' */
		position?: ControlPosition;
		/** Read-only binding to the underlying control, for imperative calls. */
		control?: MapLibreAttributionControl | null;
	};

	let { position = 'top-right', control = $bindable(null), ...options }: Props = $props();
</script>

<Control
	factory={(resolved: AttributionControlOptions) => new MapLibreAttributionControl(resolved)}
	{options}
	{position}
	bind:control
/>
