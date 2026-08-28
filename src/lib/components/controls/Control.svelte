<script lang="ts" generics="TControl extends IControl, TOptions">
	import type { ControlPosition, IControl } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { getMapContext } from '../../context.js';
	import { bindEvents } from '../../internal/bind-events.svelte.js';
	import { stableKey } from '../../internal/stable-key.js';

	type Props = {
		/** Called once per mount. Kept as a factory so nothing is built on the server. */
		factory: (options: TOptions) => TControl;
		options: TOptions;
		/** @defaultValue 'top-right' */
		position?: ControlPosition;
		/** Read-only binding to the underlying control, for imperative calls. */
		control?: TControl | null;
	} & Record<string, unknown>;

	let {
		factory,
		options,
		position = 'top-right',
		control = $bindable(null),
		...events
	}: Props = $props();

	const context = getMapContext();
	const optionsKey = $derived(stableKey(options));

	// MapLibre controls are configured through their constructor and expose no
	// setters, so an option or position change means recreate, not mutate.
	// Only some MapLibre controls are Evented. Binding blindly would throw on the
	// ones that are not, so the check is what makes this safe for any IControl.
	const eventTarget = $derived(
		control && typeof (control as { on?: unknown }).on === 'function' ? control : null
	);

	bindEvents(
		() => eventTarget as never,
		() => events
	);

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
