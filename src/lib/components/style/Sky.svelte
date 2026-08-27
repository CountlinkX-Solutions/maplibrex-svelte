<script lang="ts">
	import type { SkySpecification } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { getMapContext } from '../../context.js';
	import { deepEqual } from '../../internal/deep-equal.js';
	import { isStyleAlive } from '../../internal/style-ops.js';

	type Props = SkySpecification;

	let sky: Props = $props();

	const context = getMapContext();

	$effect(() => {
		const map = context.map;
		const ready = context.ready;
		void context.styleEpoch;
		const next = { ...sky };

		if (!map || !ready) return;

		const previous = untrack(() => map.getSky());
		if (deepEqual(previous, next)) return;

		map.setSky(next);

		return () => {
			if (isStyleAlive(map)) map.setSky(previous);
		};
	});
</script>
