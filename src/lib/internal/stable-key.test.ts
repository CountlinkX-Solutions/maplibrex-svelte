import { describe, expect, it } from 'vitest';
import { stableKey } from './stable-key.js';

describe('stableKey', () => {
	it('is stable across key order', () => {
		expect(stableKey({ a: 1, b: 2 })).toBe(stableKey({ b: 2, a: 1 }));
	});

	it('is stable for nested objects', () => {
		expect(stableKey({ o: { a: 1, b: 2 } })).toBe(stableKey({ o: { b: 2, a: 1 } }));
	});

	it('distinguishes different values', () => {
		expect(stableKey({ a: 1 })).not.toBe(stableKey({ a: 2 }));
	});

	it('preserves array order, which is meaningful', () => {
		expect(stableKey([1, 2])).not.toBe(stableKey([2, 1]));
	});

	it('handles undefined without throwing', () => {
		expect(stableKey(undefined)).toBe('undefined');
	});
});
