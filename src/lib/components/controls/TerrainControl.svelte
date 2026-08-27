<script lang="ts">
	import { TerrainControl as MapLibreTerrainControl } from 'maplibre-gl';
	import type { ControlPosition, TerrainSpecification } from 'maplibre-gl';
	import Control from './Control.svelte';

	type Props = TerrainSpecification & {
		/** @defaultValue 'top-right' */
		position?: ControlPosition;
		/** Read-only binding to the underlying control, for imperative calls. */
		control?: MapLibreTerrainControl | null;
	};

	let { position = 'top-right', control = $bindable(null), ...options }: Props = $props();
</script>

<Control
	factory={(resolved: TerrainSpecification) => new MapLibreTerrainControl(resolved)}
	{options}
	{position}
	bind:control
/>
