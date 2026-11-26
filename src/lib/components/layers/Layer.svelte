<script lang="ts">
	import type { AddLayerObject, FilterSpecification, LayerSpecification } from 'maplibre-gl';
	import { untrack, type Snippet } from 'svelte';
	import { getMapContext, getSourceContext, getStyleRegistry } from '../../context.js';
	import { bindLayerEvents } from '../../internal/bind-events.svelte.js';
	import { deepEqual } from '../../internal/deep-equal.js';
	import { diffRecords } from '../../internal/diff.js';
	import type { DependentRegistration } from '../../internal/registry.js';
	import {
		removeLayerIfPresent,
		setLayoutProperty,
		setPaintProperty
	} from '../../internal/style-ops.js';
	import type { LayerEventProps } from '../../types.js';

	type StyleRecord = Record<string, unknown>;

	type Props = LayerEventProps & {
		/** Unique within the style. Changing it recreates the layer. */
		id: string;
		type: LayerSpecification['type'];
		/** Defaults to the id of the enclosing source component. */
		source?: string;
		/**
		 * Required for vector tile sources with more than one layer. MapLibre has
		 * no setter for it, so a change adds the layer anew, in the same place.
		 */
		sourceLayer?: string;
		filter?: FilterSpecification;
		layout?: StyleRecord;
		paint?: StyleRecord;
		/** Changed in place; unsetting it adds the layer anew, in the same place. */
		minzoom?: number;
		/** Changed in place; unsetting it adds the layer anew, in the same place. */
		maxzoom?: number;
		/** Sugar over `layout.visibility`. @defaultValue true */
		visible?: boolean;
		/**
		 * Insert before this layer id; changing it moves the layer. Without it,
		 * the layer's place in the markup decides its place in the style.
		 */
		beforeId?: string;
		/**
		 * Compared by value. MapLibre has no setter for it, so a change adds the
		 * layer anew, in the same place.
		 */
		metadata?: unknown;
		children?: Snippet<[{ id: string }]>;
	};

	let {
		id,
		type,
		source,
		sourceLayer,
		filter,
		layout,
		paint,
		minzoom,
		maxzoom,
		visible = true,
		beforeId,
		metadata,
		children,
		...events
	}: Props = $props();

	const context = getMapContext();
	const sourceContext = getSourceContext();
	const registry = getStyleRegistry();

	const resolvedSource = $derived(source ?? sourceContext?.id);
	const resolvedLayout = $derived({
		...layout,
		...(visible ? {} : { visibility: 'none' })
	} satisfies StyleRecord);

	let anchor = $state<HTMLElement>();
	/** In the style now. */
	let inStyle = $state(false);
	/**
	 * Added at least once. Children render from then on and stay through style
	 * swaps and source recreates, which take the layer out for a moment.
	 */
	let added = $state(false);
	let appliedPaint = $state<StyleRecord | undefined>();
	let appliedLayout = $state<StyleRecord | undefined>();
	let appliedFilter = $state<FilterSpecification | undefined>();
	let registration: DependentRegistration | undefined;
	/** Bumped to add the layer anew, for what MapLibre sets only on adding a layer. */
	let revision = $state(0);
	/** What the layer was added with, of the options read only then. */
	let addedWith: {
		sourceLayer: string | undefined;
		metadata: unknown;
		minzoom: number | undefined;
		maxzoom: number | undefined;
	} = { sourceLayer: undefined, metadata: undefined, minzoom: undefined, maxzoom: undefined };

	function forget() {
		inStyle = false;
		appliedPaint = undefined;
		appliedLayout = undefined;
		appliedFilter = undefined;
	}

	// The registry adds the layer once its source is in the style, puts it back
	// after a style swap or a source recreate, and places it by the anchor below,
	// so the draw order follows the markup whenever the layer mounts. Identity
	// changes that MapLibre offers no setter for register the layer anew.
	$effect(() => {
		const element = anchor;
		const layerId = id;
		const layerType = type;
		const sourceId = resolvedSource;
		void revision;

		if (!element) return;

		if (layerType !== 'background' && !sourceId) {
			throw new Error(
				`[maplibrex] Layer "${layerId}" needs a source: pass \`source\` or nest it inside a source component.`
			);
		}

		const current = registry.addDependent({
			source: sourceId,
			layer: { id: layerId, anchor: element, beforeId: untrack(() => beforeId) },
			apply: (map, before) => {
				map.addLayer(
					{
						id: layerId,
						type: layerType,
						...(sourceId ? { source: sourceId } : {}),
						...(sourceLayer ? { 'source-layer': sourceLayer } : {}),
						...(filter ? { filter } : {}),
						...(minzoom !== undefined ? { minzoom } : {}),
						...(maxzoom !== undefined ? { maxzoom } : {}),
						...(metadata !== undefined ? { metadata } : {}),
						layout: resolvedLayout,
						paint: paint ?? {}
					} as AddLayerObject,
					before
				);
				// MapLibre reports an invalid layer through `onerror` and leaves it out.
				if (!map.getLayer(layerId)) return false;

				appliedPaint = paint;
				appliedLayout = resolvedLayout;
				appliedFilter = filter;
				addedWith = { sourceLayer, metadata, minzoom, maxzoom };
				inStyle = true;
				added = true;
			},
			unapply: (map) => {
				forget();
				removeLayerIfPresent(map, layerId);
			},
			reset: forget
		});
		registration = current;

		return () => {
			current.unregister();
			if (registration === current) registration = undefined;
		};
	});

	// Only an explicit change moves the layer: mounting never does.
	$effect(() => {
		const target = beforeId;
		untrack(() => registration?.setBeforeId(target));
	});

	// Paint and layout are pushed property by property. Recreating the layer to
	// change one colour would drop its tiles and restart every transition.
	$effect(() => {
		const map = context.map;
		const next = paint;
		if (!map || !inStyle) return;

		const { changed, removed } = diffRecords<unknown>(
			untrack(() => appliedPaint),
			next
		);
		if (changed.length === 0 && removed.length === 0) return;

		untrack(() => {
			for (const [key, value] of changed) setPaintProperty(map, id, key, value);
			for (const key of removed) setPaintProperty(map, id, key, undefined);
			appliedPaint = next;
		});
	});

	$effect(() => {
		const map = context.map;
		const next = resolvedLayout;
		if (!map || !inStyle) return;

		const { changed, removed } = diffRecords<unknown>(
			untrack(() => appliedLayout),
			next
		);
		if (changed.length === 0 && removed.length === 0) return;

		untrack(() => {
			for (const [key, value] of changed) setLayoutProperty(map, id, key, value);
			for (const key of removed) setLayoutProperty(map, id, key, undefined);
			appliedLayout = next;
		});
	});

	$effect(() => {
		const map = context.map;
		const next = filter;
		if (!map || !inStyle) return;
		if (
			deepEqual(
				untrack(() => appliedFilter),
				next
			)
		)
			return;

		untrack(() => {
			map.setFilter(id, next);
			appliedFilter = next;
		});
	});

	// MapLibre has no setter for `source-layer` or `metadata`, and its zoom
	// range setter leaves a bound it is not given as it was, so those changes,
	// and unsetting a bound, add the layer anew; the registry puts it back in
	// the same place. A new bound goes through `setLayerZoomRange`.
	$effect(() => {
		const map = context.map;
		const next = { sourceLayer, metadata, minzoom, maxzoom };
		if (!map || !inStyle) return;

		untrack(() => {
			const before = addedWith;
			const unset =
				(before.minzoom !== undefined && next.minzoom === undefined) ||
				(before.maxzoom !== undefined && next.maxzoom === undefined);
			if (
				unset ||
				next.sourceLayer !== before.sourceLayer ||
				!deepEqual(before.metadata, next.metadata)
			) {
				revision += 1;
				return;
			}
			if (next.minzoom === before.minzoom && next.maxzoom === before.maxzoom) return;

			// Typed as numbers, but `undefined` is what leaves a bound alone.
			map.setLayerZoomRange(id, next.minzoom as number, next.maxzoom as number);
			addedWith = { ...before, minzoom: next.minzoom, maxzoom: next.maxzoom };
		});
	});

	bindLayerEvents(
		() => (inStyle ? context.map : null),
		() => id,
		() => events
	);
</script>

<!-- Marks the layer's place in the markup, which is its place in the draw
     order. Empty and `hidden`, not styled inline: a strict CSP blocks style
     attributes. -->
<div bind:this={anchor} hidden aria-hidden="true" data-maplibrex="layer"></div>

{#if added}
	{@render children?.({ id })}
{/if}
