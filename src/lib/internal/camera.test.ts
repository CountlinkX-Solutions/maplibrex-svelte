import { describe, expect, it } from 'vitest';
import { sameCamera, sameLngLat, sameNumber, toLngLatTuple } from './camera.js';

describe('toLngLatTuple', () => {
	it('accepts an array pair', () => {
		expect(toLngLatTuple([10, 20])).toEqual([10, 20]);
	});

	it('accepts an object with lng/lat', () => {
		expect(toLngLatTuple({ lng: 10, lat: 20 })).toEqual([10, 20]);
	});

	it('accepts an object with lon/lat', () => {
		expect(toLngLatTuple({ lon: 10, lat: 20 })).toEqual([10, 20]);
	});

	it('returns null for undefined', () => {
		expect(toLngLatTuple(undefined)).toBeNull();
	});
});

describe('sameLngLat', () => {
	it('is true for identical coordinates expressed in different shapes', () => {
		expect(sameLngLat([10, 20], { lng: 10, lat: 20 })).toBe(true);
	});

	it('is true within the tolerance', () => {
		expect(sameLngLat([10, 20], [10.0000001, 20])).toBe(true);
	});

	it('is false beyond the tolerance', () => {
		expect(sameLngLat([10, 20], [10.01, 20])).toBe(false);
	});

	it('is true when both sides are missing', () => {
		expect(sameLngLat(undefined, undefined)).toBe(true);
	});

	it('is false when only one side is missing', () => {
		expect(sameLngLat([10, 20], undefined)).toBe(false);
	});
});

describe('sameNumber', () => {
	it('is true within the tolerance', () => {
		expect(sameNumber(4, 4.0000001)).toBe(true);
	});

	it('is false beyond the tolerance', () => {
		expect(sameNumber(4, 4.5)).toBe(false);
	});

	it('is true when both sides are undefined', () => {
		expect(sameNumber(undefined, undefined)).toBe(true);
	});

	it('is false when only one side is undefined', () => {
		expect(sameNumber(4, undefined)).toBe(false);
	});
});

describe('sameCamera', () => {
	it('compares a center by position, whatever its shape', () => {
		expect(sameCamera('center', [10, 20], { lng: 10, lat: 20 })).toBe(true);
		expect(sameCamera('center', [10, 20], [10, 21])).toBe(false);
	});

	it('compares the other props as numbers within the epsilon', () => {
		expect(sameCamera('zoom', 6, 6 + 1e-9)).toBe(true);
		expect(sameCamera('bearing', 30, 31)).toBe(false);
	});

	it('treats a missing value as equal only to another missing value', () => {
		expect(sameCamera('pitch', undefined, undefined)).toBe(true);
		expect(sameCamera('pitch', 0, undefined)).toBe(false);
		expect(sameCamera('center', undefined, [0, 0])).toBe(false);
	});
});
