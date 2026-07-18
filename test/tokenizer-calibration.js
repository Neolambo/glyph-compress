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
 * back to multi-token UTF-8 byte encoding.
 *
 * This suite uses js-tiktoken (a pure-JS port of OpenAI's tiktoken, dev
 * dependency only — not shipped at runtime, and it has no Anthropic/Gemini
 * equivalent) to measure REAL token costs for cl100k_base (GPT-3.5/4) and
 * o200k_base (GPT-4o). It does two things the isolated-glyph check alone
 * cannot:
 *
 *   1. Apples-to-apples word-vs-glyph comparison: a glyph that costs "only"
 *      2 tokens is still a net LOSS if the English word it replaces was
 *      already 1 token in the target tokenizer — isolated glyph cost alone
 *      cannot show that, only a direct word-vs-glyph diff can.
 *   2. Phrase-level before/after comparison for the multi-word
 *      ERROR_PATTERNS/PROMPT_PATTERNS substitutions, which are not simple
 *      1:1 word swaps and need a realistic example string to measure
 *      honestly.
 *
 * It does not change runtime behavior by itself; it is a regression guard
 * + calibration report, and its TECH_GLYPHS output is the source data for
 * the measured cost table wired into the runtime breakeven check (see
 * MEASURED_TECH_GLYPH_TOKENS in glyph-middleware.js).
 *
 * Run directly for the full report: `node test/tokenizer-calibration.js`
 */
import { getEncoding } from 'js-tiktoken';
import { TECH_GLYPHS, DOMAIN_GLYPHS } from '../src/glyph-middleware.js';

const cl100k = getEncoding('cl100k_base');
const o200k = getEncoding('o200k_base');

function tokenCount(enc, text) {
  return enc.encode(text).length;
}

function heuristicTokenCost(glyph, charsPerToken = 3.8) {
  let nonAscii = 0;
  for (let i = 0; i < glyph.length; i++) {
    if (glyph.charCodeAt(i) > 127) nonAscii++;
  }
  return glyph.length / charsPerToken + 1.5 * nonAscii;
}

// ═══════════════════════════════════════════════════════════
// PART 1 — Word vs glyph, apples-to-apples (TECH_GLYPHS)
// ═══════════════════════════════════════════════════════════

console.log('=== PART 1: word-vs-glyph token cost (TECH_GLYPHS) ===\n');
console.log('name'.padEnd(12), 'glyph'.padEnd(6), 'word:cl'.padEnd(8), 'glyph:cl'.padEnd(9), 'word:o2'.padEnd(8), 'glyph:o2'.padEnd(9), 'verdict');

const techRows = [];
for (const [name, glyph] of Object.entries(TECH_GLYPHS)) {
  const wordCl = tokenCount(cl100k, name);
  const glyphCl = tokenCount(cl100k, glyph);
  const wordO2 = tokenCount(o200k, name);
  const glyphO2 = tokenCount(o200k, glyph);
  const netLoserCl = glyphCl >= wordCl;
  const netLoserO2 = glyphO2 >= wordO2;
  const verdict = netLoserCl || netLoserO2 ? 'LOSS' : 'win';
  techRows.push({ name, glyph, wordCl, glyphCl, wordO2, glyphO2, verdict });
}

techRows.sort((a, b) => (a.verdict === b.verdict ? 0 : a.verdict === 'LOSS' ? -1 : 1));
for (const r of techRows) {
  console.log(
    r.name.padEnd(12), JSON.stringify(r.glyph).padEnd(6),
    String(r.wordCl).padEnd(8), String(r.glyphCl).padEnd(9),
    String(r.wordO2).padEnd(8), String(r.glyphO2).padEnd(9),
    r.verdict,
  );
}

const techLosers = techRows.filter((r) => r.verdict === 'LOSS');
console.log(`\n${techRows.length} TECH_GLYPHS measured, ${techLosers.length} are a net token LOSS against at least one real OpenAI tokenizer (glyph costs >= the word it replaces).`);

// ═══════════════════════════════════════════════════════════
// PART 2 — Isolated glyph cost vs the existing heuristic (all families)
// ═══════════════════════════════════════════════════════════

console.log('\n=== PART 2: isolated glyph cost vs heuristic (all glyph families) ===\n');

const SYM_SAMPLE = {
  error: '✗', warning: '⚠', typeMismatch: '∉', notFound: '∅', returns: '→',
  func: 'ƒ', cls: '𝒞', effect: '⟿', fix: '⺌', perf: '⺋', review: '⺎',
  debug: '⺃', deploy: '⺏', create: '▲', refactor: '●', test: '►', doc: '■',
  connect: '□', document: '■', optimize: '▫', protect: '○', monitor: '◄',
};

const allGlyphs = {
  ...Object.fromEntries(Object.entries(TECH_GLYPHS).map(([k, v]) => [`tech:${k}`, v])),
  ...Object.fromEntries(Object.entries(DOMAIN_GLYPHS).map(([k, v]) => [`domain:${k}`, v])),
  ...Object.fromEntries(Object.entries(SYM_SAMPLE).map(([k, v]) => [`sym:${k}`, v])),
  'dynamic:marker': '§1',
  'dynamic:marker-2digit': '§12',
};

const rows = [];
for (const [label, glyph] of Object.entries(allGlyphs)) {
  const cl = tokenCount(cl100k, glyph);
  const o2 = tokenCount(o200k, glyph);
  const heuristic = heuristicTokenCost(glyph);
  rows.push({ label, glyph, cl100k: cl, o200k: o2, heuristic: Number(heuristic.toFixed(2)) });
}
rows.sort((a, b) => Math.max(b.cl100k, b.o200k) - Math.max(a.cl100k, a.o200k));
for (const r of rows) {
  console.log(
    r.label.padEnd(16), JSON.stringify(r.glyph).padEnd(8),
    String(r.cl100k).padEnd(8), String(r.o200k).padEnd(8), String(r.heuristic),
  );
}

const UNDERESTIMATE_TOLERANCE = 1.5;
const mispriced = rows.filter((r) => Math.max(r.cl100k, r.o200k) - r.heuristic > UNDERESTIMATE_TOLERANCE);
console.log(`\n${rows.length} glyphs measured, ${mispriced.length} underestimated by >${UNDERESTIMATE_TOLERANCE} tokens vs a real OpenAI tokenizer.`);

// ═══════════════════════════════════════════════════════════
// PART 3 — Phrase-level before/after (ERROR_PATTERNS / PROMPT_PATTERNS)
// ═══════════════════════════════════════════════════════════

console.log('\n=== PART 3: phrase-level before/after (representative examples) ===\n');

const phraseExamples = [
  { label: 'error:propNotExist', before: "Property 'department' does not exist on type 'User'", after: "'department'∉User" },
  { label: 'error:typeNotAssignable', before: "Type 'string' is not assignable to type 'number'", after: 'string∉→number' },
  { label: 'error:cannotFindModule', before: "Cannot find module 'dotenv'", after: "∅'dotenv'" },
  { label: 'prompt:fixError', before: 'fix the error in UserProfile.tsx', after: '⺌✗ UserProfile.tsx' },
  { label: 'prompt:createComponent', before: 'create a dashboard component', after: '▲⊞ dashboard' },
  { label: 'prompt:deploy', before: 'deploy the application to kubernetes', after: '⺏ the application→kubernetes' },
  { label: 'prompt:review', before: 'review the security module', after: '⺎ the security module' },
];

console.log('label'.padEnd(24), 'before:cl'.padEnd(10), 'after:cl'.padEnd(9), 'before:o2'.padEnd(10), 'after:o2'.padEnd(9), 'verdict');
let phraseLosers = 0;
for (const ex of phraseExamples) {
  const beforeCl = tokenCount(cl100k, ex.before);
  const afterCl = tokenCount(cl100k, ex.after);
  const beforeO2 = tokenCount(o200k, ex.before);
  const afterO2 = tokenCount(o200k, ex.after);
  const verdict = afterCl >= beforeCl || afterO2 >= beforeO2 ? 'LOSS' : 'win';
  if (verdict === 'LOSS') phraseLosers++;
  console.log(
    ex.label.padEnd(24), String(beforeCl).padEnd(10), String(afterCl).padEnd(9),
    String(beforeO2).padEnd(10), String(afterO2).padEnd(9), verdict,
  );
}
console.log(`\n${phraseExamples.length} phrase patterns measured, ${phraseLosers} are a net token LOSS on this representative example.`);

// ═══════════════════════════════════════════════════════════
// Exit status
// ═══════════════════════════════════════════════════════════

const totalLosses = techLosers.length + mispriced.length + phraseLosers;
console.log(`\nTOTAL: ${totalLosses} findings across all three parts.`);

if (process.env.GLYPHCOMPRESS_STRICT_TOKENIZER_CALIBRATION === '1' && totalLosses > 0) {
  console.log('tokenizer-calibration FAILED (strict mode)');
  process.exitCode = 1;
} else {
  console.log('tokenizer-calibration report complete (informational suite, does not fail CI by default)');
}
