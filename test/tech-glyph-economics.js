/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Tech Glyph Economics Suite
 *
 * test/tokenizer-calibration.js measured every TECH_GLYPHS entry against
 * real OpenAI tokenizers (cl100k_base/o200k_base) and found all 28 are a
 * net token LOSS — common tech names are already 1-2 BPE tokens, and the
 * Unicode glyph that used to replace them costs as much or more. This
 * suite locks in the fix: for provider 'openai', tech-name substitution
 * must never apply when the measured data shows a loss, while 'raw'
 * (which intentionally has no breakeven guard, used for demos and
 * character-level reporting) keeps substituting unconditionally.
 *
 * v1.26.0 extended the same measurement to Gemini, using live calls
 * against the real `models/{model}:countTokens` API (no offline pure-JS
 * tokenizer exists for Gemini, unlike js-tiktoken for OpenAI — see
 * test/tokenizer-calibration-gemini.js) — same finding, 26/28 losses.
 * The tests below use the resulting static MEASURED_TECH_GLYPH_TOKENS_GEMINI
 * table baked into the compressor, not a live call, so this suite needs
 * no network access or API key to run.
 */
import assert from 'assert';
import { GlyphCompressor, TECH_GLYPHS } from '../src/glyph-middleware.js';

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

for (const [name, glyph] of Object.entries(TECH_GLYPHS)) {
  test(`OpenAI: "${name}" is never replaced with its measured-loss glyph (${glyph})`, () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
    const r = gc.compressText(`Use ${name} for this project and document how ${name} is configured.`);
    assert(!r.compressed.includes(glyph), `"${name}" should stay as plain text on OpenAI, got: ${r.compressed}`);
    assert(r.compressed.includes(name), `"${name}" itself should still be present, got: ${r.compressed}`);
  });
}

test('raw provider is unaffected: tech-name substitution still applies unconditionally', () => {
  const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
  const r = gc.compressText('Use react for the frontend and docker for packaging.');
  assert(r.compressed.includes('ℜ'), 'raw mode should still substitute react -> ℜ (demo/character-level mode)');
  assert(r.compressed.includes('𝒟'), 'raw mode should still substitute docker -> 𝒟 (demo/character-level mode)');
});

test('OpenAI provider still saves real tokens even with tech-name substitution disabled', () => {
  const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
  const text = Array.from({ length: 10 }, (_, i) => (
    `Use react and typescript to fix bug${i} in the AuthenticationManager module, then verify AuthenticationManager tests pass.`
  )).join(' ');
  const r = gc.compressText(text);
  assert(r.stats.compressedTokens <= r.stats.originalTokens, 'should never be net-negative on OpenAI (fallback protects this)');
});

// Measured live against Gemini's real countTokens API: 26/28 TECH_GLYPHS
// are a net loss there too (only csharp and nextjs win, since their words
// are 2 tokens and the glyph is 1) — see MEASURED_TECH_GLYPH_TOKENS_GEMINI.
const GEMINI_WINNING_GLYPHS = new Set(['csharp', 'nextjs']);
for (const [name, glyph] of Object.entries(TECH_GLYPHS)) {
  if (GEMINI_WINNING_GLYPHS.has(name)) continue;
  test(`Gemini: "${name}" is never replaced with its measured-loss glyph (${glyph})`, () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'gemini' });
    const r = gc.compressText(`Use ${name} for this project and document how ${name} is configured.`, 'gemini');
    assert(!r.compressed.includes(glyph), `"${name}" should stay as plain text on Gemini, got: ${r.compressed}`);
    assert(r.compressed.includes(name), `"${name}" itself should still be present, got: ${r.compressed}`);
  });
}

test('Gemini: the two measured-winning glyphs (csharp, nextjs) still substitute normally', () => {
  const gc = new GlyphCompressor({ level: 'standard', provider: 'gemini' });
  // Large/repeated enough to clear the net-negative fallback threshold —
  // a short message legitimately falls back to plain text either way
  // (tested elsewhere), which would make this assertion pass vacuously.
  const text = Array.from({ length: 10 }, (_, i) => (
    `Use csharp and nextjs for microservice${i}, then document csharp and nextjs configuration for that service.`
  )).join(' ');
  const r = gc.compressText(text, 'gemini');
  assert(r.compressed.includes('ᶜ'), `csharp should still substitute to its glyph on Gemini (measured win), got: ${r.compressed}`);
  assert(r.compressed.includes('ℕ'), `nextjs should still substitute to its glyph on Gemini (measured win), got: ${r.compressed}`);
});

test('Gemini provider still saves real tokens even with tech-name substitution mostly disabled', () => {
  const gc = new GlyphCompressor({ level: 'standard', provider: 'gemini' });
  const text = Array.from({ length: 10 }, (_, i) => (
    `Use react and typescript to fix bug${i} in the AuthenticationManager module, then verify AuthenticationManager tests pass.`
  )).join(' ');
  const r = gc.compressText(text, 'gemini');
  assert(r.stats.compressedTokens <= r.stats.originalTokens, 'should never be net-negative on Gemini (fallback protects this)');
});

console.log(`\ntech-glyph-economics: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('tech-glyph-economics suite ok');
}
