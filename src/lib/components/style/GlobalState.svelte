<script lang="ts">
	import { diffRecords } from '../../internal/diff.js';
	import { holdStyleState } from '../../internal/style-state.svelte.js';

	/**
	 * Every prop becomes one global state property, reachable from style
	 * expressions through `["global-state", "<name>"]`.
	 */
	type Props = Record<string, unknown>;

	let values: Props = $props();

	type State = Record<string, unknown>;

	// Global state belongs to the style, so unmounting puts back what the style
	// declared rather than leaving the map with this component's values.
	// `null` is how MapLibre resets a property to the style's declared default.
	holdStyleState<State, State>({
		name: '<GlobalState>',
		value: () => ({ ...values }),
		snapshot: (map) => map.getGlobalState(),
		write: (map, next, last) => {
			const { changed, removed } = diffRecords<unknown>(last, next);
			for (const [name, value] of changed) map.setGlobalStateProperty(name, value);
			for (const name of removed) map.setGlobalStateProperty(name, null);
		},
		restore: (map, previous, last) => {
			for (const name of Object.keys(last)) {
				map.setGlobalStateProperty(name, previous[name] ?? null);
			}
		}
	});
</script>
