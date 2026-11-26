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

	// Global state belongs to the style, so a property this component lets go
	// of, by unmounting or by dropping the prop, gets back the value the style
	// shown at that moment held. `null` is how MapLibre resets a property to
	// the style's declared default.
	holdStyleState<State, State>({
		name: '<GlobalState>',
		value: () => ({ ...values }),
		// MapLibre hands out its live state object and updates it in place, so
		// only a copy still holds the values from before.
		snapshot: (map) => ({ ...map.getGlobalState() }),
		write: (map, next, last, snapshot) => {
			const { changed, removed } = diffRecords<unknown>(last, next);
			for (const [name, value] of changed) map.setGlobalStateProperty(name, value);
			for (const name of removed) map.setGlobalStateProperty(name, snapshot[name] ?? null);
		},
		restore: (map, snapshot, last) => {
			for (const [name, value] of Object.entries(last)) {
				if (value !== undefined) map.setGlobalStateProperty(name, snapshot[name] ?? null);
			}
		}
	});
</script>
