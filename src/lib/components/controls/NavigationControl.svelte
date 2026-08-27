<script lang="ts">
	import { NavigationControl as MapLibreNavigationControl } from 'maplibre-gl';
	import type { ControlPosition, NavigationControlOptions } from 'maplibre-gl';
	import Control from './Control.svelte';

	type Props = NavigationControlOptions & {
		/** @defaultValue 'top-right' */
		position?: ControlPosition;
		/** Read-only binding to the underlying control, for imperative calls. */
		control?: MapLibreNavigationControl | null;
	};

	let { position = 'top-right', control = $bindable(null), ...options }: Props = $props();
</script>

<Control
	factory={(resolved: NavigationControlOptions) => new MapLibreNavigationControl(resolved)}
	{options}
	{position}
	bind:control
/>
