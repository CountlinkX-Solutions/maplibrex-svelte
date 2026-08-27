<script lang="ts">
	import { GlobeControl as MapLibreGlobeControl } from 'maplibre-gl';
	import type { ControlPosition } from 'maplibre-gl';
	import Control from './Control.svelte';

	type Props = {
		/** @defaultValue 'top-right' */
		position?: ControlPosition;
		/** Read-only binding to the underlying control, for imperative calls. */
		control?: MapLibreGlobeControl | null;
	};

	let { position = 'top-right', control = $bindable(null) }: Props = $props();
</script>

<Control factory={() => new MapLibreGlobeControl()} options={undefined} {position} bind:control />
