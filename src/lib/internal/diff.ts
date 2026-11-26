import { deepEqual } from './deep-equal.js';

export type RecordDiff<TValue> = {
	/** Keys whose value must be pushed to MapLibre, with their new value. */
	changed: Array<[string, TValue]>;
	/** Keys that must be reset to their style default. */
	removed: string[];
};

/**
 * Compares two paint/layout records and returns the minimal set of updates.
 *
 * Recreating a layer to change one paint property throws away its tiles and
 * restarts every transition, so callers push only what actually changed.
 * An explicit `undefined` value counts as a removal, matching the MapLibre
 * setter contract where `undefined` restores the style default.
 */
export function diffRecords<TValue>(
	previous: Record<string, TValue | undefined> | undefined,
	next: Record<string, TValue | undefined> | undefined
): RecordDiff<TValue> {
	const before = previous ?? {};
	const after = next ?? {};
	const changed: Array<[string, TValue]> = [];
	const removed: string[] = [];

	for (const [key, value] of Object.entries(after)) {
		if (value === undefined) {
			if (before[key] !== undefined) removed.push(key);
			continue;
		}
		if (!deepEqual(before[key], value)) changed.push([key, value as TValue]);
	}

	for (const key of Object.keys(before)) {
		if (before[key] !== undefined && !Object.hasOwn(after, key)) removed.push(key);
	}

	return { changed, removed };
}

/**
 * The keys of `written` that `held` does not have, each set to `undefined`.
 *
 * MapLibre's `setLight` and `setSky` change only the keys they are given, so
 * writing back what the style held leaves every key a component added on top
 * of it. Given `undefined`, MapLibre puts a key back to its default.
 */
export function unsetKeys<T extends object>(
	written: T,
	held: T | undefined
): Partial<Record<keyof T, undefined>> {
	return Object.fromEntries(
		Object.keys(written)
			.filter((key) => held === undefined || !Object.hasOwn(held, key))
			.map((key) => [key, undefined])
	) as Partial<Record<keyof T, undefined>>;
}
