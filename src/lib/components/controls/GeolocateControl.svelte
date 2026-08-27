<script lang="ts">
	import { GeolocateControl as MapLibreGeolocateControl } from 'maplibre-gl';
	import type { ControlPosition, GeolocateControlOptions } from 'maplibre-gl';
	import Control from './Control.svelte';

	type Props = GeolocateControlOptions & {
		/** @defaultValue 'top-right' */
		position?: ControlPosition;
		/** Read-only binding to the underlying control, for imperative calls. */
		control?: MapLibreGeolocateControl | null;
	};

	let { position = 'top-right', control = $bindable(null), ...options }: Props = $props();
</script>

<Control
	factory={(resolved: GeolocateControlOptions) => new MapLibreGeolocateControl(resolved)}
	{options}
	{position}
	bind:control
/>
