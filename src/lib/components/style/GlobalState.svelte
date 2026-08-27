<script lang="ts">
	import { untrack } from 'svelte';
	import { getMapContext } from '../../context.js';
	import { diffRecords } from '../../internal/diff.js';
	import { isStyleAlive } from '../../internal/style-ops.js';

	/**
	 * Every prop becomes one global state property, reachable from style
	 * expressions through `["global-state", "<name>"]`.
	 */
	type Props = Record<string, unknown>;

	let values: Props = $props();

	const context = getMapContext();

	let mounted = $state(false);
	let applied = $state<Record<string, unknown> | undefined>();

	// Global state belongs to the style, so unmounting puts back what the style
	// declared rather than leaving the map with this component's values.
	$effect(() => {
		const map = context.map;
		const ready = context.ready;
		void context.styleEpoch;

		if (!map || !ready) return;

		const previous = untrack(() => map.getGlobalState());
		const touched = untrack(() => Object.keys(values));

		untrack(() => {
			const next = { ...values };
			for (const [name, value] of Object.entries(next)) {
				map.setGlobalStateProperty(name, value);
			}
			applied = next;
			mounted = true;
		});

		return () => {
			mounted = false;
			applied = undefined;
			if (!isStyleAlive(map)) return;
			// `null` is how MapLibre resets a global state property to its default.
			for (const name of touched) map.setGlobalStateProperty(name, previous[name] ?? null);
		};
	});

	$effect(() => {
		const map = context.map;
		const next = { ...values };
		if (!map || !mounted) return;

		const { changed, removed } = diffRecords<unknown>(
			untrack(() => applied),
			next
		);
		if (changed.length === 0 && removed.length === 0) return;

		untrack(() => {
			for (const [name, value] of changed) map.setGlobalStateProperty(name, value);
			for (const name of removed) map.setGlobalStateProperty(name, null);
			applied = next;
		});
	});
</script>
