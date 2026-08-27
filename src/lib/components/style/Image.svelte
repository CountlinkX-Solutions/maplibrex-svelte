<script lang="ts">
	import type { StyleImageMetadata, StyleImageSource } from 'maplibre-gl';
	import { untrack } from 'svelte';
	import { getMapContext } from '../../context.js';
	import { isStyleAlive } from '../../internal/style-ops.js';

	type Props = Partial<StyleImageMetadata> & {
		/** The name symbol layers refer to through `icon-image`. */
		id: string;
		/** Loaded with `map.loadImage`. Give either this or `image`, not both. */
		url?: string;
		/** An already-decoded image: canvas output, generated pixels, an SVG blob. */
		image?: StyleImageSource;
		/** Called when `url` fails to load, instead of leaving the map silent. */
		onerror?: (error: unknown) => void;
	};

	let {
		id,
		url,
		image,
		onerror,
		pixelRatio,
		sdf,
		stretchX,
		stretchY,
		content,
		textFitWidth,
		textFitHeight
	}: Props = $props();

	const context = getMapContext();

	const metadata = $derived({
		...(pixelRatio !== undefined ? { pixelRatio } : {}),
		...(sdf !== undefined ? { sdf } : {}),
		...(stretchX !== undefined ? { stretchX } : {}),
		...(stretchY !== undefined ? { stretchY } : {}),
		...(content !== undefined ? { content } : {}),
		...(textFitWidth !== undefined ? { textFitWidth } : {}),
		...(textFitHeight !== undefined ? { textFitHeight } : {})
	} satisfies Partial<StyleImageMetadata>);

	// A style swap drops registered images along with everything else, so this
	// tracks the style epoch like sources and layers do.
	$effect(() => {
		const map = context.map;
		const ready = context.ready;
		void context.styleEpoch;

		const imageId = id;
		const source = image;
		const href = url;

		if (!map || !ready) return;

		if (source === undefined && href === undefined) {
			throw new Error(`[maplibrex] <Image id="${imageId}"> needs either \`url\` or \`image\`.`);
		}

		let cancelled = false;

		const register = (resolved: StyleImageSource) => {
			if (cancelled) return;
			// `addImage` throws on a duplicate id, and a re-run after a prop change
			// legitimately arrives with the image already present.
			if (map.hasImage(imageId)) map.updateImage(imageId, resolved);
			else
				map.addImage(
					imageId,
					resolved,
					untrack(() => metadata)
				);
		};

		if (source !== undefined) {
			register(source);
		} else {
			map
				.loadImage(href as string)
				.then((response) => register(response.data))
				.catch((error: unknown) => {
					if (!cancelled) onerror?.(error);
				});
		}

		return () => {
			cancelled = true;
			if (isStyleAlive(map) && map.hasImage(imageId)) map.removeImage(imageId);
		};
	});
</script>
