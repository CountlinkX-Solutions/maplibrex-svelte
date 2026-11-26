<script lang="ts">
	import { Popup as MapLibrePopup } from 'maplibre-gl';
	import type { LngLatLike, PopupOptions } from 'maplibre-gl';
	import { untrack, type Snippet } from 'svelte';
	import { getMapContext, getMarkerContext } from '../../context.js';
	import { bindEvents } from '../../internal/bind-events.svelte.js';
	import { sameLngLat } from '../../internal/camera.js';
	import { stableKey } from '../../internal/stable-key.js';
	import type { PopupEventProps } from '../../types.js';

	type Props = PopupEventProps &
		PopupOptions & {
			/**
			 * Where the popup anchors. Ignored when nested inside a `<Marker>`,
			 * which supplies the position itself.
			 */
			lngLat?: LngLatLike;
			/**
			 * Two-way. Standalone popups are opened and closed by this prop;
			 * marker-attached popups report their state through it.
			 */
			open?: boolean;
			/** Read-only binding to the underlying popup. */
			popup?: MapLibrePopup | null;
			children?: Snippet<[{ popup: MapLibrePopup }]>;
		};

	let {
		lngLat,
		open = $bindable(false),
		popup = $bindable(null),
		children,
		maxWidth,
		offset,
		padding,
		subpixelPositioning,
		...rest
	}: Props = $props();

	const context = getMapContext();
	const markerContext = getMarkerContext();

	function classNames(value: string): string[] {
		return value.split(/\s+/).filter(Boolean);
	}
	const attachedToMarker = markerContext !== null;

	// No setters exist for these, so a change means a new popup. MapLibre copies
	// every key it is given over its defaults, `undefined` included, so an option
	// the consumer did not set is left out rather than passed as `undefined`.
	const constructorOnly = $derived(
		Object.fromEntries(
			Object.entries({
				closeButton: rest.closeButton,
				closeOnClick: rest.closeOnClick,
				closeOnMove: rest.closeOnMove,
				focusAfterOpen: rest.focusAfterOpen,
				anchor: rest.anchor,
				locationOccludedOpacity: rest.locationOccludedOpacity
			}).filter(([, value]) => value !== undefined)
		) as PopupOptions
	);
	const recreateKey = $derived(stableKey(constructorOnly));

	let content = $state<HTMLDivElement | null>(null);

	// Plain variables, not state: a teardown reads reactive values as they were
	// before the change that triggered it, so it cannot tell a rebuild from an
	// unmount through `recreateKey` itself.
	let latestKey = '';
	let rebuilding = false;
	/** A rebuild replaced a popup that was open, so the replacement opens. */
	let reopen = false;
	/** The replacement is opening, which is not an open for the consumer. */
	let reopening = false;

	function asReopen(action: () => unknown): void {
		reopening = true;
		try {
			action();
		} finally {
			reopening = false;
		}
	}

	// Pre-effects run before the effect below re-runs, so its teardown sees the
	// new key here when a constructor-only prop changed.
	$effect.pre(() => {
		latestKey = recreateKey;
	});

	$effect(() => {
		const map = context.map;
		const node = content;
		const key = recreateKey;

		if (!map || !node) return;

		const instance = untrack(() => {
			const created = new MapLibrePopup({
				...constructorOnly,
				...(rest.className !== undefined ? { className: rest.className } : {}),
				...(maxWidth !== undefined ? { maxWidth } : {}),
				...(offset !== undefined ? { offset } : {}),
				...(padding !== undefined ? { padding } : {}),
				...(subpixelPositioning !== undefined ? { subpixelPositioning } : {})
			});

			created.setDOMContent(node);
			if (lngLat !== undefined) created.setLngLat(lngLat);

			return created;
		});

		popup = instance;

		return () => {
			// A rebuild must not look like a close: the old popup's `close` is not
			// reported, and an open popup stays open in its replacement. An unmount
			// or a new map leaves the key as it was and still reports the close.
			rebuilding = latestKey !== key;
			reopen = rebuilding && instance.isOpen();
			popup = null;
			try {
				instance.remove();
			} finally {
				rebuilding = false;
			}
		};
	});

	// What a rebuild does is not the consumer's business: the old popup did not
	// close for them, and its replacement did not open for them. Every other
	// `open` reaches them, the first one included: the popup is opened only
	// once their handlers listen on it.
	const listeners = bindEvents(
		() => popup,
		() => rest,
		(name) => !(name === 'close' && rebuilding) && !(name === 'open' && reopening)
	);

	// Attaching to a marker delegates open/close to the marker's own click
	// handling, which is why the two modes are wired differently below.
	$effect(() => {
		const marker = markerContext?.marker;
		const instance = popup;
		if (!marker || !instance) return;

		marker.setPopup(instance);

		// A standalone replacement is reopened by the `open` effect below; an
		// attached one only opens through its marker.
		if (reopen) {
			reopen = false;
			untrack(() => asReopen(() => marker.togglePopup()));
		}

		return () => marker.setPopup(null);
	});

	$effect(() => {
		const instance = popup;
		const next = lngLat;
		if (!instance || next === undefined) return;
		if (instance.isOpen() && sameLngLat(instance.getLngLat(), next)) return;

		untrack(() => instance.setLngLat(next));
	});

	// Standalone open/close is driven by the prop.
	$effect(() => {
		const map = context.map;
		const instance = popup;
		const shouldOpen = open;
		const listening = listeners.target === instance;

		if (!map || !instance || attachedToMarker || !listening) return;

		const replacing = reopen;
		reopen = false;
		if (shouldOpen === instance.isOpen()) return;

		untrack(() => {
			if (!shouldOpen) instance.remove();
			else if (replacing) asReopen(() => instance.addTo(map));
			else instance.addTo(map);
		});
	});

	// Both modes report their real state back, so `bind:open` stays truthful
	// after a close button click or a `closeOnClick`.
	$effect(() => {
		const instance = popup;
		if (!instance) return;

		const subscriptions = [
			instance.on('open', () => {
				open = true;
			}),
			instance.on('close', () => {
				if (!rebuilding) open = false;
			})
		];

		return () => {
			for (const subscription of subscriptions) subscription.unsubscribe();
		};
	});

	// An unset prop goes back to MapLibre's default. `offset` and `padding`
	// have none, and their setters take `undefined`; `maxWidth` must be given
	// its default, as the setter leaves the width alone without a value.
	$effect(() => {
		const instance = popup;
		const next = maxWidth ?? '240px';
		if (!instance) return;
		untrack(() => instance.setMaxWidth(next));
	});

	$effect(() => {
		const instance = popup;
		const next = offset;
		if (!instance) return;
		untrack(() => instance.setOffset(next));
	});

	$effect(() => {
		const instance = popup;
		const next = padding;
		if (!instance) return;
		untrack(() => instance.setPadding(next));
	});

	$effect(() => {
		const instance = popup;
		const next = subpixelPositioning ?? false;
		if (!instance) return;
		untrack(() => instance.setSubpixelPositioning(next));
	});

	// MapLibre adds and removes a popup's classes in place, but only on the
	// container of an open popup, and builds a new container from the options
	// each time the popup opens, so both are updated.
	$effect(() => {
		const instance = popup;
		const next = rest.className ?? '';
		if (!instance) return;

		untrack(() => {
			const previous = instance.options.className ?? '';
			if (previous === next) return;
			for (const name of classNames(previous)) instance.removeClassName(name);
			instance.options.className = next;
			for (const name of classNames(next)) instance.addClassName(name);
		});
	});
</script>

<!-- `hidden`, not an inline style: a strict CSP blocks style attributes. -->
<div hidden aria-hidden="true">
	<div bind:this={content}>
		{#if popup}
			{@render children?.({ popup })}
		{/if}
	</div>
</div>
