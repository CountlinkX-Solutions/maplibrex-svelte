<script lang="ts">
	import { LogoControl as MapLibreLogoControl } from 'maplibre-gl';
	import type { ControlPosition, LogoControlOptions } from 'maplibre-gl';
	import Control from './Control.svelte';

	type Props = LogoControlOptions & {
		/** @defaultValue 'top-right' */
		position?: ControlPosition;
		/** Read-only binding to the underlying control, for imperative calls. */
		control?: MapLibreLogoControl | null;
	};

	let { position = 'top-right', control = $bindable(null), ...options }: Props = $props();
</script>

<Control
	factory={(resolved: LogoControlOptions) => new MapLibreLogoControl(resolved)}
	{options}
	{position}
	bind:control
/>
