<script lang="ts">
	import type { AddLayerObject, FilterSpecification, LayerSpecification } from 'maplibre-gl';
	import { untrack, type Snippet } from 'svelte';
	import { getMapContext, getSourceContext } from '../../context.js';
	import { bindLayerEvents } from '../../internal/bind-events.svelte.js';
	import { deepEqual } from '../../internal/deep-equal.js';
	import { diffRecords } from '../../internal/diff.js';
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
		/** Required for vector tile sources with more than one layer. */
		sourceLayer?: string;
		filter?: FilterSpecification;
		layout?: StyleRecord;
		paint?: StyleRecord;
		minzoom?: number;
		maxzoom?: number;
		/** Sugar over `layout.visibility`. @defaultValue true */
		visible?: boolean;
		/** Insert before this layer id; changing it moves the layer. */
		beforeId?: string;
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

	const resolvedSource = $derived(source ?? sourceContext?.id);
	const resolvedLayout = $derived({
		...layout,
		...(visible ? {} : { visibility: 'none' })
	} satisfies StyleRecord);

	let mounted = $state(false);
	let appliedPaint = $state<StyleRecord | undefined>();
	let appliedLayout = $state<StyleRecord | undefined>();
	let appliedFilter = $state<FilterSpecification | undefined>();

	// Add and remove. Re-runs when the map appears, when the style is replaced,
	// when the enclosing source is recreated, and on identity changes that
	// MapLibre offers no setter for.
	$effect(() => {
		const map = context.map;
		const ready = context.ready;
		void context.styleEpoch;
		void sourceContext?.epoch;

		const layerId = id;
		const layerType = type;
		const sourceId = resolvedSource;

		if (!map || !ready) return;

		if (layerType !== 'background' && !sourceId) {
			throw new Error(
				`[maplibrex] Layer "${layerId}" needs a source: pass \`source\` or nest it inside a source component.`
			);
		}

		untrack(() => {
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
				beforeId
			);

			appliedPaint = paint;
			appliedLayout = resolvedLayout;
			appliedFilter = filter;
			mounted = true;
		});

		return () => {
			mounted = false;
			appliedPaint = undefined;
			appliedLayout = undefined;
			appliedFilter = undefined;
			removeLayerIfPresent(map, layerId);
		};
	});

	// Paint and layout are pushed property by property. Recreating the layer to
	// change one colour would drop its tiles and restart every transition.
	$effect(() => {
		const map = context.map;
		const next = paint;
		if (!map || !mounted) return;

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
		if (!map || !mounted) return;

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
		if (!map || !mounted) return;
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

	$effect(() => {
		const map = context.map;
		const range = { minzoom, maxzoom };
		if (!map || !mounted) return;
		if (range.minzoom === undefined && range.maxzoom === undefined) return;

		untrack(() => map.setLayerZoomRange(id, range.minzoom ?? 0, range.maxzoom ?? 24));
	});

	$effect(() => {
		const map = context.map;
		const target = beforeId;
		if (!map || !mounted) return;

		untrack(() => map.moveLayer(id, target));
	});

	bindLayerEvents(
		() => (mounted ? context.map : null),
		() => id,
		() => events
	);
</script>

{#if mounted}
	{@render children?.({ id })}
{/if}
