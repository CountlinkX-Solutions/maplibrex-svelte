import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import FeatureStateStack from './fixtures/FeatureStateStack.svelte';

/**
 * Regression cover for issue #16. `<FeatureState>` cleaned up with
 * `removeFeatureState(target)` and no key, which wipes every state key of the
 * feature. With hover and selection on the same feature as two components,
 * ending the hover also cleared the selection.
 */

const WAIT = { timeout: 15_000 } as const;
// A cleanup runs in the same flush as the change, so state settles at once;
// a short window keeps a failure reporting its diff instead of timing out.
const SETTLE = { timeout: 3_000 } as const;
const FEATURE = { source: 'pts', id: 1 } as const;

async function mountStack(
	props: { hovered?: boolean; hoverState?: Record<string, unknown>; selected?: boolean } = {}
) {
	let map: MapLibreMap | null = null;

	const initialProps = {
		hovered: true,
		hoverState: { hover: true } as Record<string, unknown>,
		selected: true,
		...props,
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		}
	};

	const screen = await render(FeatureStateStack, initialProps);

	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);

	const rerender = (next: Partial<typeof initialProps>) =>
		screen.rerender({ ...initialProps, ...next });

	return { rerender, map: map as unknown as MapLibreMap };
}

describe('feature state shared by several components', () => {
	it('merges the keys of every component on the same feature', async () => {
		const { map } = await mountStack();

		expect(map.getFeatureState(FEATURE)).toEqual({ hover: true, selected: true });
	});

	it('keeps the key of the other component when one unmounts', async () => {
		const { map, rerender } = await mountStack();

		await rerender({ hovered: false });

		await vi.waitFor(
			() => expect(map.getFeatureState(FEATURE)).toEqual({ selected: true }),
			SETTLE
		);
	});

	it('removes only the key that leaves the state prop', async () => {
		const { map, rerender } = await mountStack({ hoverState: { hover: true, pressed: true } });

		expect(map.getFeatureState(FEATURE)).toEqual({ hover: true, pressed: true, selected: true });

		await rerender({ hoverState: { hover: true } });

		await vi.waitFor(
			() => expect(map.getFeatureState(FEATURE)).toEqual({ hover: true, selected: true }),
			SETTLE
		);
	});
});
