/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Benchmark vs. Alternatives
 *
 * test/benchmark.js and test/benchmark-realistic.js measure GlyphCompress
 * in isolation. Neither compares it against what a developer would
 * actually do without it. This script does, against the two realistic
 * baselines available without a specialized dependency:
 *
 *   1. No compression — send the original text as-is. Fine until it
 *      doesn't fit the token budget, at which point something has to give.
 *   2. Naive truncation — the common fallback when content doesn't fit: cut
 *      it off at the budget. Simple, and it permanently discards whatever
 *      was cut — there is no decoding it back.
 *   3. GlyphCompress — compress the same content toward the same budget.
 *
 * The metric is deliberately narrow and honest: at a fixed real token
 * budget (measured with js-tiktoken, the same real OpenAI tokenizer this
 * project's own calibration work uses — see test/tokenizer-calibration.js
 * for why a real tokenizer matters over a character-count heuristic), what
 * fraction of the ORIGINAL character content is still represented? This
 * does not claim GlyphCompress produces better model answers — verifying
 * that requires real per-strategy LLM judging calls, which is exactly the
 * "measure task success" item still open in ROADMAP.md's v1.22.0. What
 * this DOES show, reproducibly and without needing any API key: naive
 * truncation permanently deletes whatever doesn't fit; GlyphCompress
 * shrinks the same information so more of it survives the same budget.
 *
 * NOT included: LLMLingua. It's a genuinely relevant comparison, but it is
 * a Python library with its own model-based compression approach — adding
 * it means adding a Python runtime as a dependency of a Node.js project's
 * benchmark tooling, which is a separate decision from this script and is
 * intentionally left out rather than faked or approximated.
 *
 * This is a reporting tool, not a pass/fail gate — like
 * test/benchmark-realistic.js, it is not part of `npm test` or `npm run
 * check`. Run directly: `npm run benchmark:alternatives`.
 */
import fs from 'fs';
import { getEncoding } from 'js-tiktoken';
import { GlyphCompressor } from '../src/glyph-middleware.js';

const enc = getEncoding('o200k_base'); // GPT-4o's real tokenizer.

const BUDGETS = [500, 1000, 2000, 4000];

const fileCases = [
  'README.md',
  'ROADMAP.md',
  'docs/architecture.md',
  'src/compressor.js',
  'src/workspace-intelligence.js',
];

function realTokenCount(text) {
  return enc.encode(text).length;
}

/**
 * The common real-world fallback when content exceeds a token budget:
 * keep the first N tokens, drop the rest entirely. Whatever gets cut is
 * gone — there is no codebook to decode it back, unlike compression.
 */
function naiveTruncateToBudget(text, budget) {
  const tokens = enc.encode(text);
  if (tokens.length <= budget) return { text, retainedTokenFraction: 1, truncated: false };
  const kept = tokens.slice(0, budget);
  return {
    text: enc.decode(kept),
    retainedTokenFraction: budget / tokens.length,
    truncated: true,
  };
}

function glyphCompressToBudget(text, level = 'standard') {
  const compressor = new GlyphCompressor({ level, provider: 'openai' });
  const result = compressor.compressText(text, 'openai');
  const compressedTokens = realTokenCount(result.compressed);
  return { compressedText: result.compressed, compressedTokens, fallback: result.stats.fallback };
}

function formatPct(value) {
  return `${Math.round(value * 100)}%`;
}

function runFileCase(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const originalTokens = realTokenCount(text);
  const glyph = glyphCompressToBudget(text);

  console.log(`\nFILE ${filePath} — original: ${originalTokens} real tokens (o200k_base), GlyphCompress: ${glyph.compressedTokens} tokens${glyph.fallback ? ' (fallback: net-negative, sent as-is)' : ''}`);
  console.log('  budget | no-compression fits | naive truncation retains | GlyphCompress retains');
  console.log('  ' + '-'.repeat(70));

  const rows = [];
  for (const budget of BUDGETS) {
    const noCompressionFits = originalTokens <= budget;
    const truncated = naiveTruncateToBudget(text, budget);

    // If compressed output still exceeds the budget (large file, small
    // budget), the fraction of ORIGINAL content retained is how much of
    // the (already information-preserving) compressed text fits —
    // budget / compressedTokens, NOT that fraction multiplied by the
    // compression ratio again. That second multiplication is a real bug
    // this script had on its first pass: budget/compressedTokens *
    // (compressedTokens/originalTokens) algebraically collapses to
    // budget/originalTokens — exactly the plain naive-truncation ratio,
    // silently erasing any measurable difference between the two
    // strategies whenever both need further truncation. Caught by
    // noticing the aggregate table showed a suspicious flat +0% advantage
    // at every budget instead of scaling with each file's real
    // compression ratio.
    const glyphRetained = Math.min(1, budget / glyph.compressedTokens);

    rows.push({ budget, noCompressionFits, truncatedRetained: truncated.retainedTokenFraction, glyphRetained });

    console.log([
      `  ${String(budget).padStart(6)}`,
      (noCompressionFits ? 'yes' : 'no — exceeds budget').padEnd(20),
      formatPct(truncated.retainedTokenFraction).padStart(24),
      formatPct(glyphRetained).padStart(21),
    ].join(' | '));
  }

  return { filePath, originalTokens, compressedTokens: glyph.compressedTokens, rows };
}

console.log('GlyphCompress vs. Alternatives Benchmark');
console.log('='.repeat(72));
console.log('Real tokens measured with js-tiktoken (o200k_base, GPT-4o\'s tokenizer) — see test/tokenizer-calibration.js for why a real tokenizer matters over a character-count heuristic.');
console.log('Metric: at a fixed token budget, what fraction of the ORIGINAL content survives? Naive truncation permanently deletes whatever is cut; GlyphCompress shrinks the same information.');
console.log('NOT included: LLMLingua (a Python library — adding it means adding a Python runtime as a benchmark dependency, a separate decision, not approximated here).');

const results = fileCases.map(runFileCase);

console.log(`\n${'='.repeat(72)}`);
console.log('AGGREGATE (average retained fraction across all files, per budget)');
console.log('='.repeat(72));
console.log('  budget | naive truncation | GlyphCompress | advantage');
console.log('  ' + '-'.repeat(60));

for (const budget of BUDGETS) {
  const rowsAtBudget = results.flatMap((r) => r.rows.filter((row) => row.budget === budget));
  const avgTruncated = rowsAtBudget.reduce((sum, r) => sum + r.truncatedRetained, 0) / rowsAtBudget.length;
  const avgGlyph = rowsAtBudget.reduce((sum, r) => sum + r.glyphRetained, 0) / rowsAtBudget.length;
  console.log([
    `  ${String(budget).padStart(6)}`,
    formatPct(avgTruncated).padStart(17),
    formatPct(avgGlyph).padStart(13),
    `${avgGlyph >= avgTruncated ? '+' : ''}${formatPct(avgGlyph - avgTruncated)}`.padStart(9),
  ].join(' | '));
}

console.log('\nMethodology and known limitations documented in docs/benchmark-methodology.md.');
