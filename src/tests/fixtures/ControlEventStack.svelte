<script lang="ts">
	import { Evented } from 'maplibre-gl';
	import type { IControl, StyleSpecification } from 'maplibre-gl';
	import Control from '$lib/components/controls/Control.svelte';
	import MapLibre from '$lib/components/MapLibre.svelte';

	type Props = {
		onready?: (event: { type: 'ready'; label: string }) => void;
	};

	let { onready }: Props = $props();

	const emptyStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

	/**
	 * A control that is also Evented, which is the shape GeolocateControl and
	 * FullscreenControl have. Firing on add keeps the test deterministic: no
	 * permission prompt, no user gesture.
	 */
	class AnnouncingControl extends Evented implements IControl {
		#container: HTMLElement | null = null;

		onAdd() {
			this.#container = document.createElement('div');
			this.#container.className = 'maplibregl-ctrl';
			queueMicrotask(() => this.fire({ type: 'ready', label: 'announced' } as never));
			return this.#container;
		}

		onRemove() {
			this.#container?.remove();
			this.#container = null;
		}
	}
</script>

<MapLibre mapStyle={emptyStyle} center={[0, 0]} zoom={2} style="width: 300px; height: 220px">
	<Control factory={() => new AnnouncingControl()} options={undefined} {onready} />
</MapLibre>
