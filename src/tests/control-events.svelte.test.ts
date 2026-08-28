import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ControlEventStack from './fixtures/ControlEventStack.svelte';

/**
 * Controls used to accept options and a binding but no `on<event>` props, even
 * though GeolocateControl and FullscreenControl are Evented. Documenting the
 * handlers before they existed is what surfaced the gap.
 */
describe('control event props', () => {
	it('delivers an event from the control to its on<event> prop', async () => {
		const seen: string[] = [];

		await render(ControlEventStack, {
			onready: (event: { label: string }) => seen.push(event.label)
		});

		await vi.waitFor(() => expect(seen).toEqual(['announced']), { timeout: 15_000 });
	});
});
