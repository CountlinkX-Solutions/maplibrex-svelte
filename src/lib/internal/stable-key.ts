/**
 * A deterministic string identity for a plain options object.
 *
 * MapLibre controls take their options in the constructor and expose no
 * setters, so the only way to honour a changed option is to recreate the
 * control. Effects need a tracked scalar to decide that, and key order must not
 * count as a change: `{a, b}` and `{b, a}` describe the same control.
 */
export function stableKey(value: unknown): string {
	if (value === undefined) return 'undefined';

	return JSON.stringify(value, (_key, item) => {
		if (item === null || typeof item !== 'object' || Array.isArray(item)) return item;

		return Object.fromEntries(
			Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
		);
	});
}
