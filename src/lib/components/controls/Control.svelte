<script lang="ts" generics="TControl extends IControl, TOptions">
	import type { ControlPosition, IControl } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { getMapContext } from '../../context.js';
	import { stableKey } from '../../internal/stable-key.js';

	type Props = {
		/** Called once per mount. Kept as a factory so nothing is built on the server. */
		factory: (options: TOptions) => TControl;
		options: TOptions;
		/** @defaultValue 'top-right' */
		position?: ControlPosition;
		/** Read-only binding to the underlying control, for imperative calls. */
		control?: TControl | null;
	};

	// `$bindable(null)` is a prop default, not a dead store: a parent can read it
	// before the effect below assigns the real instance.
	// eslint-disable-next-line no-useless-assignment
	let { factory, options, position = 'top-right', control = $bindable(null) }: Props = $props();

	const context = getMapContext();
	const optionsKey = $derived(stableKey(options));

	// MapLibre controls are configured through their constructor and expose no
	// setters, so an option or position change means recreate, not mutate.
	$effect(() => {
		const map = context.map;
		const at = position;
		void optionsKey;

		if (!map) return;

		const instance = untrack(() => factory(options));
		map.addControl(instance, at);
		control = instance;

		return () => {
			control = null;
			map.removeControl(instance);
		};
	});
</script>
