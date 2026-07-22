/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Code-Minification Economics Suite (v1.21.0)
 *
 * test/tech-glyph-economics.js found that all 28 TECH_GLYPHS lose real
 * tokens on OpenAI. The same measurement applied to _minifySyntax()'s
 * keyword-to-glyph substitutions inside code blocks (return -> "→",
 * function -> "ƒ", const -> "◇", public -> "+", ...) found the same
 * result for all 33 pairs tested: common code keywords are already
 * single BPE tokens (code is a huge fraction of pretraining data), so
 * replacing them with a 1-4 token Unicode glyph never wins. This suite
 * locks in the fix: for provider 'openai', code-block keyword
 * minification must never apply when the measured data shows a loss,
 * while 'raw' (demos, character-level reporting) keeps substituting
 * unconditionally.
 *
 * v1.26.0 extended the same measurement to Gemini via live countTokens
 * API calls (see MEASURED_CODE_KEYWORD_TOKENS_GEMINI) — same finding,
 * 32/33 losses (only "#include" -> "imp" wins). The tests below use that
 * static table, so this suite needs no network access or API key to run.
 */
import assert from 'assert';
import { GlyphCompressor } from '../src/glyph-middleware.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

function repeatedSnippet(lang, code, times = 8) {
  const body = Array.from({ length: times }, (_, i) => code.replaceAll('N', String(i))).join('\n');
  return `Explain this module in detail please:\n\`\`\`${lang}\n${body}\`\`\`\n`;
}

const cases = [
  { lang: 'js', glyph: 'ƒ', keyword: 'function', code: 'function fnN(id) {\n  return id;\n}\n' },
  { lang: 'js', glyph: '◇', keyword: 'const', code: 'function fnN(id) {\n  const x = id;\n  return x;\n}\n' },
  { lang: 'py', glyph: '𝒞', keyword: 'class', code: 'class ServiceN:\n    def run(self):\n        return True\n' },
  { lang: 'rs', glyph: '𝒞', keyword: 'struct', code: 'struct RecordN {\n    id: u32,\n}\n' },
  { lang: 'go', glyph: 'pkg', keyword: 'package', code: 'package mainN\nfunc runN() {}\n' },
  { lang: 'java', glyph: '+', keyword: 'public', code: 'public class ServiceN {\n  void run() {}\n}\n' },
];

for (const { lang, glyph, keyword, code } of cases) {
  test(`OpenAI: "${keyword}" (${lang}) is never minified to its measured-loss glyph (${glyph})`, () => {
    const gc = new GlyphCompressor({ level: 'aggressive', provider: 'openai', trustPolicy: 'lossy' });
    const prompt = repeatedSnippet(lang, code);
    const r = gc.compressText(prompt);
    assert(!r.compressed.includes(glyph), `"${keyword}" should never become "${glyph}" on OpenAI, got: ${r.compressed.slice(0, 200)}`);
  });
}

test('raw provider is unaffected: code-keyword minification still applies unconditionally', () => {
  const gc = new GlyphCompressor({ level: 'aggressive', provider: 'raw', trustPolicy: 'lossy' });
  const prompt = 'Explain:\n```js\nfunction run(id) {\n  const x = id;\n  return x;\n}\n```\n';
  const r = gc.compressText(prompt);
  assert(r.compressed.includes('ƒ'), 'raw mode should still minify function -> ƒ (demo/character-level mode)');
  assert(r.compressed.includes('◇'), 'raw mode should still minify const -> ◇ (demo/character-level mode)');
});

test('OpenAI code blocks still get real savings from comment/blank-line removal and the dynamic dictionary, not just fallback', () => {
  const gc = new GlyphCompressor({ level: 'aggressive', provider: 'openai', trustPolicy: 'lossy' });
  const code = Array.from({ length: 8 }, (_, i) => `function fetchUser${i}(id) {\n  // fetch a user record\n  const user = db.find(id);\n\n  return user;\n}\n`).join('\n');
  const prompt = `Explain this module:\n\`\`\`js\n${code}\`\`\`\n`;
  const r = gc.compressText(prompt);
  assert(r.fallback === false, 'a large enough snippet should stay net-positive without falling back to the original text');
  assert(!r.compressed.includes('// fetch a user record'), 'comments should still be stripped');
  assert(r.stats.compressedTokens < r.stats.originalTokens, 'should still be a genuine net token saving');
});

for (const { lang, glyph, keyword, code } of cases) {
  test(`Gemini: "${keyword}" (${lang}) is never minified to its measured-loss glyph (${glyph})`, () => {
    const gc = new GlyphCompressor({ level: 'aggressive', provider: 'gemini', trustPolicy: 'lossy' });
    const prompt = repeatedSnippet(lang, code);
    const r = gc.compressText(prompt, 'gemini');
    assert(!r.compressed.includes(glyph), `"${keyword}" should never become "${glyph}" on Gemini, got: ${r.compressed.slice(0, 200)}`);
  });
}

test('Gemini: the one measured-winning keyword ("#include" -> "imp") still minifies normally', () => {
  const gc = new GlyphCompressor({ level: 'aggressive', provider: 'gemini', trustPolicy: 'lossy' });
  const code = Array.from({ length: 8 }, (_, i) => `#include <stdioN_${i}.h>\nvoid runN_${i}() {}\n`).join('\n');
  const prompt = `Explain this module:\n\`\`\`c\n${code}\`\`\`\n`;
  const r = gc.compressText(prompt, 'gemini');
  assert(r.compressed.includes('imp'), `"#include" should still minify to "imp" on Gemini (measured win), got: ${r.compressed.slice(0, 200)}`);
});

test('Gemini code blocks still get real savings from comment/blank-line removal and the dynamic dictionary, not just fallback', () => {
  const gc = new GlyphCompressor({ level: 'aggressive', provider: 'gemini', trustPolicy: 'lossy' });
  const code = Array.from({ length: 8 }, (_, i) => `function fetchUser${i}(id) {\n  // fetch a user record\n  const user = db.find(id);\n\n  return user;\n}\n`).join('\n');
  const prompt = `Explain this module:\n\`\`\`js\n${code}\`\`\`\n`;
  const r = gc.compressText(prompt, 'gemini');
  assert(r.fallback === false, 'a large enough snippet should stay net-positive without falling back to the original text');
  assert(!r.compressed.includes('// fetch a user record'), 'comments should still be stripped');
  assert(r.stats.compressedTokens < r.stats.originalTokens, 'should still be a genuine net token saving');
});

console.log(`\ncode-minify-economics: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('code-minify-economics suite ok');
}
