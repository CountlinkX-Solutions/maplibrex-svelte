import { describe, expect, it } from 'vitest';
import { INTERACTION_NAMES, planInteractionChanges } from './interactions.js';

describe('INTERACTION_NAMES', () => {
	it('covers every handler MapLibre exposes on the map', () => {
		expect([...INTERACTION_NAMES]).toEqual([
			'boxZoom',
			'cooperativeGestures',
			'doubleClickZoom',
			'dragPan',
			'dragRotate',
			'keyboard',
			'scrollZoom',
			'touchPitch',
			'touchZoomRotate'
		]);
	});
});

describe('planInteractionChanges', () => {
	it('plans nothing when nothing is requested', () => {
		expect(planInteractionChanges({ scrollZoom: true }, undefined)).toEqual([]);
	});

	it('plans nothing when the request matches the current state', () => {
		expect(
			planInteractionChanges({ scrollZoom: true, dragPan: false }, { scrollZoom: true })
		).toEqual([]);
	});

	it('plans a disable for a handler that is currently enabled', () => {
		expect(planInteractionChanges({ scrollZoom: true }, { scrollZoom: false })).toEqual([
			['scrollZoom', false]
		]);
	});

	it('plans an enable for a handler that is currently disabled', () => {
		expect(planInteractionChanges({ dragRotate: false }, { dragRotate: true })).toEqual([
			['dragRotate', true]
		]);
	});

	it('ignores a requested handler whose current state is unknown', () => {
		expect(planInteractionChanges({}, { keyboard: false })).toEqual([]);
	});

	it('skips a request of undefined, which means "leave it alone"', () => {
		expect(planInteractionChanges({ boxZoom: true }, { boxZoom: undefined })).toEqual([]);
	});

	it('returns changes in a stable order regardless of request key order', () => {
		const current = { scrollZoom: true, dragPan: true };

		expect(planInteractionChanges(current, { scrollZoom: false, dragPan: false })).toEqual([
			['dragPan', false],
			['scrollZoom', false]
		]);
	});
});
