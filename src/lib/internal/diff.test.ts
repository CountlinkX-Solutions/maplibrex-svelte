import { describe, expect, it } from 'vitest';
import { diffRecords, unsetKeys } from './diff.js';

describe('diffRecords', () => {
	it('reports nothing when both sides are empty', () => {
		expect(diffRecords(undefined, undefined)).toEqual({ changed: [], removed: [] });
	});

	it('reports every key as changed when there is no previous record', () => {
		expect(diffRecords(undefined, { 'fill-color': '#f00', 'fill-opacity': 0.5 })).toEqual({
			changed: [
				['fill-color', '#f00'],
				['fill-opacity', 0.5]
			],
			removed: []
		});
	});

	it('ignores keys whose value is deeply equal', () => {
		const prev = { 'line-width': 2, 'line-dasharray': [1, 2] };
		const next = { 'line-width': 2, 'line-dasharray': [1, 2] };

		expect(diffRecords(prev, next)).toEqual({ changed: [], removed: [] });
	});

	it('detects a changed nested expression', () => {
		const prev = { 'fill-color': ['get', 'a'] };
		const next = { 'fill-color': ['get', 'b'] };

		expect(diffRecords(prev, next)).toEqual({
			changed: [['fill-color', ['get', 'b']]],
			removed: []
		});
	});

	it('lists keys that disappeared from the next record', () => {
		expect(
			diffRecords({ 'fill-color': '#f00', 'fill-opacity': 1 }, { 'fill-color': '#f00' })
		).toEqual({
			changed: [],
			removed: ['fill-opacity']
		});
	});

	it('treats an explicit undefined value as a removal, not a change', () => {
		expect(diffRecords({ 'fill-color': '#f00' }, { 'fill-color': undefined })).toEqual({
			changed: [],
			removed: ['fill-color']
		});
	});
});

describe('unsetKeys', () => {
	// Strict equality: a key present with `undefined` is the whole point.
	it('maps every written key to undefined when nothing was held', () => {
		expect(unsetKeys({ anchor: 'map', intensity: 0.4 }, undefined)).toStrictEqual({
			anchor: undefined,
			intensity: undefined
		});
	});

	it('leaves out the keys the held record has, whatever their value', () => {
		expect(unsetKeys({ anchor: 'map', intensity: 0.4 }, { intensity: 0.1 })).toStrictEqual({
			anchor: undefined
		});
	});

	it('returns an empty record when the held record has every written key', () => {
		expect(unsetKeys({ intensity: 0.4 }, { intensity: 0.1, color: '#fff' })).toStrictEqual({});
	});
});
