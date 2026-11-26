import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap, PositionAnchor } from 'maplibre-gl';
import PopupStack from './fixtures/PopupStack.svelte';
import MarkerPopupStack from './fixtures/MarkerPopupStack.svelte';

/**
 * Regression cover for issue #17. Some popup options only reach MapLibre
 * through the constructor, so changing one makes `<Popup>` build a new popup.
 * Removing the old one fired `close` while the listener was still attached,
 * which wrote `open = false` back and left the new popup closed. A rebuild is
 * an implementation detail and must not look like the user closing the popup.
 *
 * Also covers issue #42: options the consumer did not set must keep MapLibre's
 * defaults. The fixtures set none of `closeButton`, `closeOnClick` and
 * `focusAfterOpen`, so every user-close test below relies on those defaults.
 *
 * And issue #43: a rebuild does not reach the consumer's `onclose` either,
 * and `className`, which MapLibre can change on a popup, is updated in place.
 * The rebuild tests change `anchor`, which still has no setter upstream.
 *
 * And issue #62: `onopen` is called for every open, including the first one
 * of a popup that starts open, and, like `onclose`, not for a rebuild.
 */

const WAIT = { timeout: 15_000 } as const;
// Effects settle in the flush that follows a prop change; a short window keeps
// a failure reporting its diff instead of timing out.
const SETTLE = { timeout: 3_000 } as const;

type Fixture = typeof PopupStack | typeof MarkerPopupStack;

async function mountPopup(fixture: Fixture) {
	let map: MapLibreMap | null = null;
	const reported: boolean[] = [];

	const onclose = vi.fn();
	const onopen = vi.fn();

	const initialProps = {
		className: 'first',
		popupAnchor: undefined as PositionAnchor | undefined,
		reopen: undefined as number | undefined,
		onclose,
		onopen,
		onopenchange: (open: boolean) => reported.push(open),
		onmapready: (instance: MapLibreMap) => {
			map = instance;
		}
	};

	const screen = await render(fixture, initialProps);

	await vi.waitFor(() => expect(map).not.toBeNull(), WAIT);

	const rerender = (next: Partial<typeof initialProps>) =>
		screen.rerender({ ...initialProps, ...next });

	return {
		map: map as unknown as MapLibreMap,
		rerender,
		onclose,
		onopen,
		/** The value `bind:open` holds now. */
		open: () => reported.at(-1)
	};
}

function popupWithClass(map: MapLibreMap, className: string): HTMLElement | null {
	return map.getContainer().querySelector<HTMLElement>(`.maplibregl-popup.${className}`);
}

function closeButton(map: MapLibreMap): HTMLButtonElement {
	const button = map
		.getContainer()
		.querySelector<HTMLButtonElement>('.maplibregl-popup-close-button');
	if (!button) throw new Error('no popup close button');
	return button;
}

describe('standalone popup', () => {
	it('stays open when a constructor-only prop rebuilds it', async () => {
		const { map, rerender, open, onclose } = await mountPopup(PopupStack);
		await vi.waitFor(() => expect(popupWithClass(map, 'first')).not.toBeNull(), WAIT);
		const before = popupWithClass(map, 'first');

		await rerender({ popupAnchor: 'top' });

		await vi.waitFor(() => {
			expect(open()).toBe(true);
			expect(popupWithClass(map, 'maplibregl-popup-anchor-top')).not.toBeNull();
		}, SETTLE);
		expect(before?.isConnected).toBe(false);
		expect(onclose).not.toHaveBeenCalled();
	});

	it('writes open = false when the user closes it', async () => {
		const { map, open } = await mountPopup(PopupStack);
		await vi.waitFor(() => expect(popupWithClass(map, 'first')).not.toBeNull(), WAIT);

		closeButton(map).click();

		await vi.waitFor(() => {
			expect(open()).toBe(false);
			expect(popupWithClass(map, 'first')).toBeNull();
		}, SETTLE);
	});

	it('still reports a user close after a rebuild', async () => {
		const { map, rerender, open, onclose } = await mountPopup(PopupStack);
		await vi.waitFor(() => expect(popupWithClass(map, 'first')).not.toBeNull(), WAIT);
		await rerender({ popupAnchor: 'top' });
		await vi.waitFor(
			() => expect(popupWithClass(map, 'maplibregl-popup-anchor-top')).not.toBeNull(),
			SETTLE
		);

		closeButton(map).click();

		await vi.waitFor(() => {
			expect(open()).toBe(false);
			expect(popupWithClass(map, 'first')).toBeNull();
		}, SETTLE);
		expect(onclose).toHaveBeenCalledTimes(1);
	});

	it('changes className in place, without a new popup', async () => {
		const { map, rerender, open, onclose } = await mountPopup(PopupStack);
		await vi.waitFor(() => expect(popupWithClass(map, 'first')).not.toBeNull(), WAIT);
		const before = popupWithClass(map, 'first');

		await rerender({ className: 'second' });

		await vi.waitFor(() => expect(popupWithClass(map, 'second')).toBe(before), SETTLE);
		expect(before?.classList.contains('first')).toBe(false);
		expect(open()).toBe(true);
		expect(onclose).not.toHaveBeenCalled();
	});
});

describe('options left unset', () => {
	it('shows a close button and takes focus, as MapLibre does by default', async () => {
		const { map } = await mountPopup(PopupStack);
		await vi.waitFor(() => expect(popupWithClass(map, 'first')).not.toBeNull(), WAIT);
		const element = popupWithClass(map, 'first') as HTMLElement;

		expect(element.querySelector('.maplibregl-popup-close-button')).not.toBeNull();
		expect(element.contains(document.activeElement)).toBe(true);
	});

	it('closes on a map click, as MapLibre does by default', async () => {
		const { map, open } = await mountPopup(PopupStack);
		await vi.waitFor(() => expect(popupWithClass(map, 'first')).not.toBeNull(), WAIT);

		// A click on the canvas corner, away from the popup in the middle.
		const canvas = map.getCanvas();
		const box = canvas.getBoundingClientRect();
		canvas.dispatchEvent(
			new MouseEvent('click', { bubbles: true, clientX: box.left + 5, clientY: box.top + 5 })
		);

		await vi.waitFor(() => {
			expect(open()).toBe(false);
			expect(popupWithClass(map, 'first')).toBeNull();
		}, SETTLE);
	});
});

function clickMarker(map: MapLibreMap): void {
	const pin = map.getContainer().querySelector<HTMLElement>('.maplibregl-marker');
	if (!pin) throw new Error('no marker element');
	pin.click();
}

async function mountOpened() {
	const mounted = await mountPopup(MarkerPopupStack);

	clickMarker(mounted.map);
	await vi.waitFor(() => {
		expect(mounted.open()).toBe(true);
		expect(popupWithClass(mounted.map, 'first')).not.toBeNull();
	}, WAIT);

	return mounted;
}

describe('marker-attached popup', () => {
	it('stays open when a constructor-only prop rebuilds it', async () => {
		const { map, rerender, open, onclose } = await mountOpened();
		const before = popupWithClass(map, 'first');

		await rerender({ popupAnchor: 'top' });

		await vi.waitFor(() => {
			expect(open()).toBe(true);
			expect(popupWithClass(map, 'maplibregl-popup-anchor-top')).not.toBeNull();
		}, SETTLE);
		expect(before?.isConnected).toBe(false);
		expect(onclose).not.toHaveBeenCalled();
	});

	it('still reports a user close after a rebuild', async () => {
		const { map, rerender, open, onclose } = await mountOpened();
		await rerender({ popupAnchor: 'top' });
		await vi.waitFor(
			() => expect(popupWithClass(map, 'maplibregl-popup-anchor-top')).not.toBeNull(),
			SETTLE
		);

		closeButton(map).click();

		await vi.waitFor(() => {
			expect(open()).toBe(false);
			expect(popupWithClass(map, 'first')).toBeNull();
		}, SETTLE);
		expect(onclose).toHaveBeenCalledTimes(1);
	});

	it('keeps a className changed in place when it opens again', async () => {
		const { map, rerender, open, onclose } = await mountOpened();
		const before = popupWithClass(map, 'first');

		await rerender({ className: 'second' });
		await vi.waitFor(() => expect(popupWithClass(map, 'second')).toBe(before), SETTLE);
		expect(onclose).not.toHaveBeenCalled();

		closeButton(map).click();
		await vi.waitFor(() => expect(open()).toBe(false), SETTLE);
		map.getContainer().querySelector<HTMLElement>('.maplibregl-marker')?.click();

		await vi.waitFor(() => {
			expect(open()).toBe(true);
			expect(popupWithClass(map, 'second')).not.toBeNull();
		}, SETTLE);
		expect(popupWithClass(map, 'first')).toBeNull();
		expect(onclose).toHaveBeenCalledTimes(1);
	});
});

describe('onopen (#62)', () => {
	it('is called when a standalone popup starts open', async () => {
		const { map, onopen } = await mountPopup(PopupStack);
		await vi.waitFor(() => expect(popupWithClass(map, 'first')).not.toBeNull(), WAIT);

		await vi.waitFor(() => expect(onopen).toHaveBeenCalledTimes(1), SETTLE);
	});

	it('is not called when a standalone popup is rebuilt, and is for a later open', async () => {
		const { map, rerender, open, onopen } = await mountPopup(PopupStack);
		await vi.waitFor(() => expect(popupWithClass(map, 'first')).not.toBeNull(), WAIT);
		const opened = onopen.mock.calls.length;

		await rerender({ popupAnchor: 'top' });
		await vi.waitFor(
			() => expect(popupWithClass(map, 'maplibregl-popup-anchor-top')).not.toBeNull(),
			SETTLE
		);
		expect(onopen).toHaveBeenCalledTimes(opened);

		closeButton(map).click();
		await vi.waitFor(() => expect(open()).toBe(false), SETTLE);
		await rerender({ popupAnchor: 'top', reopen: 1 });

		await vi.waitFor(() => {
			expect(open()).toBe(true);
			expect(onopen).toHaveBeenCalledTimes(opened + 1);
		}, SETTLE);
	});

	it('is called when the marker opens an attached popup', async () => {
		const { onopen } = await mountOpened();

		expect(onopen).toHaveBeenCalledTimes(1);
	});

	it('is not called when an attached popup is rebuilt, and is for a later open', async () => {
		const { map, rerender, open, onopen } = await mountOpened();

		await rerender({ popupAnchor: 'top' });
		await vi.waitFor(
			() => expect(popupWithClass(map, 'maplibregl-popup-anchor-top')).not.toBeNull(),
			SETTLE
		);
		expect(onopen).toHaveBeenCalledTimes(1);

		closeButton(map).click();
		await vi.waitFor(() => expect(open()).toBe(false), SETTLE);
		clickMarker(map);

		await vi.waitFor(() => {
			expect(open()).toBe(true);
			expect(onopen).toHaveBeenCalledTimes(2);
		}, SETTLE);
	});
});
