<script lang="ts">
	import { addProtocol, removeProtocol } from 'maplibre-gl';
	import type { AddProtocolAction } from 'maplibre-gl';

	type Props = {
		/** The scheme to claim, without `://` — for example `pmtiles`. */
		name: string;
		handler: AddProtocolAction;
	};

	let { name, handler }: Props = $props();

	// Protocols are global to MapLibre, not scoped to one map, so this component
	// needs no map context. Ordering does matter: register the protocol BEFORE the
	// map that requests those URLs, by placing this component above <MapLibre>.
	$effect(() => {
		const scheme = name;
		const load = handler;

		addProtocol(scheme, load);

		return () => removeProtocol(scheme);
	});
</script>
