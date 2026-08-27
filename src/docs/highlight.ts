/**
 * A deliberately small syntax highlighter for the documentation site.
 *
 * Pulling in a full highlighter would add a build-time dependency and a
 * megabyte of grammars to colour a handful of Svelte snippets. This covers the
 * five token classes that actually carry meaning in those snippets, and does it
 * in one pass so a keyword inside a string is never mistaken for a keyword.
 */

const KEYWORDS =
	'import|from|export|default|const|let|type|interface|as|if|else|return|await|async|function|new|null|undefined|true|false';

const RUNES = '\\$props|\\$state|\\$derived|\\$effect|\\$bindable|\\$inspect';

/**
 * Alternation order is the whole design: comments and strings are consumed
 * before anything can look inside them.
 */
const TOKEN = new RegExp(
	[
		`(?<com><!--[\\s\\S]*?-->|/\\*[\\s\\S]*?\\*/|//[^\\n]*)`,
		`(?<str>'(?:\\\\.|[^'\\\\])*'|"(?:\\\\.|[^"\\\\])*"|\`(?:\\\\.|[^\`\\\\])*\`)`,
		`(?<rune>${RUNES})`,
		`(?<tag></?[A-Z][\\w.]*)`,
		`(?<kw>\\b(?:${KEYWORDS})\\b)`
	].join('|'),
	'g'
);

const ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

/** Returns HTML. Every branch escapes, so snippet text can never become markup. */
export function highlight(code: string): string {
	let result = '';
	let lastIndex = 0;

	for (const match of code.matchAll(TOKEN)) {
		const groups = match.groups ?? {};
		const [className] = Object.entries(groups).find(([, value]) => value !== undefined) ?? [];
		if (!className) continue;

		result += escapeHtml(code.slice(lastIndex, match.index));
		result += `<span class="tok-${className}">${escapeHtml(match[0])}</span>`;
		lastIndex = match.index + match[0].length;
	}

	return result + escapeHtml(code.slice(lastIndex));
}
