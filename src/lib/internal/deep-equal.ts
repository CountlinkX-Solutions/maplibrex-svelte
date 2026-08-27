/**
 * Structural equality for style-spec values (expressions, arrays, plain objects).
 * Style specifications are JSON, so reference identity is never a safe shortcut:
 * a template literal or an inline array produces a new reference on every render.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (typeof a !== typeof b) return false;
	if (a === null || b === null || typeof a !== 'object') return false;

	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
		return a.every((item, index) => deepEqual(item, b[index]));
	}

	const left = a as Record<string, unknown>;
	const right = b as Record<string, unknown>;
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	if (leftKeys.length !== rightKeys.length) return false;

	return leftKeys.every((key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]));
}
