import { describe, expect, it, vi } from 'vitest';
import { eventNameOf, pickEventHandlers } from './events.js';

describe('eventNameOf', () => {
	it('strips the on prefix', () => {
		expect(eventNameOf('onclick')).toBe('click');
	});

	it('preserves the rest of the casing', () => {
		expect(eventNameOf('onstyleimagemissing')).toBe('styleimagemissing');
	});
});

describe('pickEventHandlers', () => {
	it('returns an empty record when there is nothing to pick', () => {
		expect(pickEventHandlers({ id: 'a', zoom: 4 })).toEqual({});
	});

	it('collects only on-prefixed function props', () => {
		const onclick = vi.fn();
		const onmove = vi.fn();

		expect(pickEventHandlers({ onclick, onmove, id: 'a', online: true })).toEqual({
			click: onclick,
			move: onmove
		});
	});

	it('ignores on-prefixed props that are not functions', () => {
		expect(pickEventHandlers({ onclick: 'nope' })).toEqual({});
	});

	it('ignores the bare on key', () => {
		expect(pickEventHandlers({ on: () => {} })).toEqual({});
	});
});
