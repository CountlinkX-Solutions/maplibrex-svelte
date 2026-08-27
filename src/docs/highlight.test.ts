import { describe, expect, it } from 'vitest';
import { highlight } from './highlight.js';

describe('highlight', () => {
	it('escapes HTML before anything else, so snippets cannot inject markup', () => {
		expect(highlight('<img src=x onerror=alert(1)>')).not.toContain('<img');
	});

	it('escapes ampersands and quotes in plain text', () => {
		expect(highlight('a & b')).toContain('a &amp; b');
	});

	it('wraps a double-quoted string in a string token', () => {
		expect(highlight('const a = "hi";')).toContain('<span class="tok-str">&quot;hi&quot;</span>');
	});

	it('wraps a line comment in a comment token', () => {
		expect(highlight('// note')).toBe('<span class="tok-com">// note</span>');
	});

	it('wraps a markup comment in a comment token', () => {
		expect(highlight('<!-- note -->')).toBe('<span class="tok-com">&lt;!-- note --&gt;</span>');
	});

	it('wraps runes in a rune token', () => {
		expect(highlight('let a = $state(1);')).toContain('<span class="tok-rune">$state</span>');
	});

	it('wraps keywords in a keyword token', () => {
		expect(highlight('import x')).toContain('<span class="tok-kw">import</span>');
	});

	it('wraps an opening tag name in a tag token', () => {
		expect(highlight('<MapLibre />')).toContain('<span class="tok-tag">&lt;MapLibre</span>');
	});

	it('does not treat a keyword inside a string as a keyword', () => {
		const result = highlight('"import"');

		expect(result).toContain('<span class="tok-str">&quot;import&quot;</span>');
		expect(result).not.toContain('tok-kw');
	});

	it('leaves ordinary code untouched apart from escaping', () => {
		expect(highlight('a + b')).toBe('a + b');
	});
});
