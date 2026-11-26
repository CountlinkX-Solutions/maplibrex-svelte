import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
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
 */

const WAIT = { timeout: 15_000 } as const;
// Effects settle in the flush that follows a prop change; a short window keeps
// a failure reporting its diff instead of timing out.
const SETTLE = { timeout: 3_000 } as const;

type Fixture = typeof PopupStack | typeof MarkerPopupStack;

async function mountPopup(fixture: Fixture) {
	let map: MapLibreMap | null = null;
	const reported: boolean[] = [];

	const initialProps = {
		className: 'first',
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
		const { map, rerender, open } = await mountPopup(PopupStack);
		await vi.waitFor(() => expect(popupWithClass(map, 'first')).not.toBeNull(), WAIT);

		await rerender({ className: 'second' });

		await vi.waitFor(() => {
			expect(open()).toBe(true);
			expect(popupWithClass(map, 'second')).not.toBeNull();
		}, SETTLE);
		expect(popupWithClass(map, 'first')).toBeNull();
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
		const { map, rerender, open } = await mountPopup(PopupStack);
		await vi.waitFor(() => expect(popupWithClass(map, 'first')).not.toBeNull(), WAIT);
		await rerender({ className: 'second' });
		await vi.waitFor(() => expect(popupWithClass(map, 'second')).not.toBeNull(), SETTLE);

		closeButton(map).click();

		await vi.waitFor(() => {
			expect(open()).toBe(false);
			expect(popupWithClass(map, 'second')).toBeNull();
		}, SETTLE);
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

describe('marker-attached popup', () => {
	async function mountOpened() {
		const mounted = await mountPopup(MarkerPopupStack);
		const pin = mounted.map.getContainer().querySelector<HTMLElement>('.maplibregl-marker');
		if (!pin) throw new Error('no marker element');

		pin.click();
		await vi.waitFor(() => {
			expect(mounted.open()).toBe(true);
			expect(popupWithClass(mounted.map, 'first')).not.toBeNull();
		}, WAIT);

		return mounted;
	}

	it('stays open when a constructor-only prop rebuilds it', async () => {
		const { map, rerender, open } = await mountOpened();

		await rerender({ className: 'second' });

		await vi.waitFor(() => {
			expect(open()).toBe(true);
			expect(popupWithClass(map, 'second')).not.toBeNull();
		}, SETTLE);
		expect(popupWithClass(map, 'first')).toBeNull();
	});

	it('still reports a user close after a rebuild', async () => {
		const { map, rerender, open } = await mountOpened();
		await rerender({ className: 'second' });
		await vi.waitFor(() => expect(popupWithClass(map, 'second')).not.toBeNull(), SETTLE);

		closeButton(map).click();

		await vi.waitFor(() => {
			expect(open()).toBe(false);
			expect(popupWithClass(map, 'second')).toBeNull();
		}, SETTLE);
	});
});
