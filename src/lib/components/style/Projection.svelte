<script lang="ts">
	import type { ProjectionSpecification } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { getMapContext } from '../../context.js';
	import { deepEqual } from '../../internal/deep-equal.js';
	import { isStyleAlive } from '../../internal/style-ops.js';

	type Props = ProjectionSpecification;

	let projection: Props = $props();

	const context = getMapContext();

	$effect(() => {
		const map = context.map;
		const ready = context.ready;
		void context.styleEpoch;
		const next = { ...projection };

		if (!map || !ready) return;

		const previous = untrack(() => map.getProjection());
		if (deepEqual(previous, next)) return;

		map.setProjection(next);

		return () => {
			if (isStyleAlive(map)) map.setProjection(previous);
		};
	});
</script>
