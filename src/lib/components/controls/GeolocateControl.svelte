<script lang="ts">
	import { GeolocateControl as MapLibreGeolocateControl } from 'maplibre-gl';
	import type {
		ControlPosition,
		GeolocateControlEventType,
		GeolocateControlOptions
	} from 'maplibre-gl';
	import { splitEventProps } from '../../internal/events.js';
	import type { EventProps } from '../../types.js';
	import Control from './Control.svelte';

	type Props = GeolocateControlOptions &
		EventProps<GeolocateControlEventType> & {
			/** @defaultValue 'top-right' */
			position?: ControlPosition;
			/** Read-only binding to the underlying control, for imperative calls. */
			control?: MapLibreGeolocateControl | null;
		};

	let { position = 'top-right', control = $bindable(null), ...props }: Props = $props();

	// Handlers must not reach the constructor as if they were options.
	const split = $derived(splitEventProps(props));
</script>

<Control
	factory={(resolved: GeolocateControlOptions) => new MapLibreGeolocateControl(resolved)}
	options={split.rest as GeolocateControlOptions}
	{position}
	bind:control
	{...split.events}
/>
