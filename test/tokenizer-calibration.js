/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Tokenizer Calibration Suite (dev-only)
 *
 * Every glyph's cost was previously estimated with a flat heuristic
 * (glyph.length / charsPerToken + 1.5 * nonAsciiChars) that was never
 * checked against a real BPE tokenizer. That heuristic can be wrong in
 * both directions: common glyphs may already be single tokens (heuristic
 * overestimates their cost, understating real savings), while rare
 * supplementary-plane math-alphanumeric symbols (𝒞, 𝒟, 𝒦, ℜ, ℕ, ℙ, ₘ, ᵣ,
 * 𝔸, 𝕊, 𝔻, 𝔼, 𝔽…) are very likely absent from BPE merge tables and fall
 * back to multi-token UTF-8 byte encoding — 3-6 tokens for what the
 * heuristic assumes costs ~1.5-2.
 *
 * This suite uses js-tiktoken (a pure-JS port of OpenAI's tiktoken, dev
 * dependency only — not shipped at runtime, and it has no Anthropic/Gemini
 * equivalent) to measure REAL token costs for cl100k_base (GPT-3.5/4) and
 * o200k_base (GPT-4o) and compares them against the heuristic. It does not
 * change runtime behavior; it is a regression guard + calibration report so
 * a newly-added glyph that turns out to be a real token disaster is caught
 * before shipping, instead of discovered later via a negative benchmark
 * number.
 *
 * Run directly for the full report: `node test/tokenizer-calibration.js`
 */
import { getEncoding } from 'js-tiktoken';
import { TECH_GLYPHS, DOMAIN_GLYPHS } from '../src/glyph-middleware.js';

const cl100k = getEncoding('cl100k_base');
const o200k = getEncoding('o200k_base');

function realTokenCost(enc, glyph) {
  return enc.encode(glyph).length;
}

function heuristicTokenCost(glyph, charsPerToken = 3.8) {
  let nonAscii = 0;
  for (let i = 0; i < glyph.length; i++) {
    if (glyph.charCodeAt(i) > 127) nonAscii++;
  }
  return glyph.length / charsPerToken + 1.5 * nonAscii;
}

const STRUCTURE_SAMPLE = {
  error: '✗', warning: '⚠', typeMismatch: '∉', notFound: '∅', returns: '→',
  func: 'ƒ', cls: '𝒞', effect: '⟿', fix: '⺌', perf: '⺋', review: '⺎',
  debug: '⺃', deploy: '⺏', create: '▲', refactor: '●', test: '►', doc: '■',
};

const allGlyphs = {
  ...Object.fromEntries(Object.entries(TECH_GLYPHS).map(([k, v]) => [`tech:${k}`, v])),
  ...Object.fromEntries(Object.entries(DOMAIN_GLYPHS).map(([k, v]) => [`domain:${k}`, v])),
  ...Object.fromEntries(Object.entries(STRUCTURE_SAMPLE).map(([k, v]) => [`sym:${k}`, v])),
  'dynamic:marker': '§1',
  'dynamic:marker-2digit': '§12',
};

const rows = [];
for (const [label, glyph] of Object.entries(allGlyphs)) {
  const cl = realTokenCost(cl100k, glyph);
  const o2 = realTokenCost(o200k, glyph);
  const heuristic = heuristicTokenCost(glyph);
  rows.push({ label, glyph, cl100k: cl, o200k: o2, heuristic: Number(heuristic.toFixed(2)) });
}

rows.sort((a, b) => Math.max(b.cl100k, b.o200k) - Math.max(a.cl100k, a.o200k));

console.log('label'.padEnd(22), 'glyph'.padEnd(8), 'cl100k'.padEnd(8), 'o200k'.padEnd(8), 'heuristic');
for (const r of rows) {
  console.log(
    r.label.padEnd(22),
    JSON.stringify(r.glyph).padEnd(8),
    String(r.cl100k).padEnd(8),
    String(r.o200k).padEnd(8),
    String(r.heuristic),
  );
}

// Regression guard: flag any glyph where the heuristic UNDERSTATES the real
// cost by more than 1.5 tokens against either encoding — that is the
// dangerous direction (silently spends more tokens than the breakeven
// check believes it does).
const UNDERESTIMATE_TOLERANCE = 1.5;
const mispriced = rows.filter((r) => Math.max(r.cl100k, r.o200k) - r.heuristic > UNDERESTIMATE_TOLERANCE);

console.log(`\n${rows.length} glyphs measured, ${mispriced.length} underestimated by >${UNDERESTIMATE_TOLERANCE} tokens vs a real OpenAI tokenizer.`);
if (mispriced.length > 0) {
  console.log('Underestimated glyphs (real cost is higher than the breakeven heuristic assumes):');
  for (const r of mispriced) {
    console.log(`  ${r.label} ${JSON.stringify(r.glyph)}: heuristic=${r.heuristic} cl100k=${r.cl100k} o200k=${r.o200k}`);
  }
}

if (process.env.GLYPHCOMPRESS_STRICT_TOKENIZER_CALIBRATION === '1' && mispriced.length > 0) {
  console.log('\ncodebook-tokenizer-calibration FAILED (strict mode)');
  process.exitCode = 1;
} else {
  console.log('tokenizer-calibration report complete (informational suite, does not fail CI by default — see README)');
}
