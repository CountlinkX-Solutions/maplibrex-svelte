<script lang="ts">
	import { FullscreenControl as MapLibreFullscreenControl } from 'maplibre-gl';
	import type {
		ControlPosition,
		FullscreenControlEventType,
		FullscreenControlOptions
	} from 'maplibre-gl';
	import { splitEventProps } from '../../internal/events.js';
	import type { EventProps } from '../../types.js';
	import Control from './Control.svelte';

	type Props = FullscreenControlOptions &
		EventProps<FullscreenControlEventType> & {
			/** @defaultValue 'top-right' */
			position?: ControlPosition;
			/** Read-only binding to the underlying control, for imperative calls. */
			control?: MapLibreFullscreenControl | null;
		};

	let { position = 'top-right', control = $bindable(null), ...props }: Props = $props();

	// Handlers must not reach the constructor as if they were options.
	const split = $derived(splitEventProps(props));
</script>

<Control
	factory={(resolved: FullscreenControlOptions) => new MapLibreFullscreenControl(resolved)}
	options={split.rest as FullscreenControlOptions}
	{position}
	bind:control
	{...split.events}
/>
