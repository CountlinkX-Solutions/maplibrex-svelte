import { describe, expect, it, vi } from 'vitest';
import { eventNameOf, pickEventHandlers, splitEventProps } from './events.js';

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

describe('splitEventProps', () => {
	it('returns empty halves for an empty record', () => {
		expect(splitEventProps({})).toEqual({ events: {}, rest: {} });
	});

	it('keeps plain options in rest', () => {
		expect(splitEventProps({ compact: true, unit: 'metric' })).toEqual({
			events: {},
			rest: { compact: true, unit: 'metric' }
		});
	});

	it('moves on-prefixed functions into events', () => {
		const ongeolocate = () => {};

		expect(splitEventProps({ ongeolocate, trackUserLocation: true })).toEqual({
			events: { ongeolocate },
			rest: { trackUserLocation: true }
		});
	});

	it('leaves an on-prefixed non-function in rest, because it is an option', () => {
		expect(splitEventProps({ online: true })).toEqual({ events: {}, rest: { online: true } });
	});

	it('leaves the bare on key in rest', () => {
		const on = () => {};

		expect(splitEventProps({ on })).toEqual({ events: {}, rest: { on } });
	});
});
