/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Gemini Tokenizer Calibration (dev-only, manual)
 *
 * Sibling to test/tokenizer-calibration.js, which measures TECH_GLYPHS/
 * code-keyword word-vs-glyph token costs against real OpenAI tokenizers
 * using js-tiktoken — a pure-JS, offline, no-API-key library. Gemini has
 * no offline equivalent: the only way to measure its real token cost is
 * the live `models/{model}:countTokens` REST API, which needs a real
 * GEMINI_API_KEY and network access. That's why this is a separate,
 * manually-run script — NOT part of `npm test`/test/run-suites.js — and
 * why its output is a static table (MEASURED_TECH_GLYPH_TOKENS_GEMINI /
 * MEASURED_CODE_KEYWORD_TOKENS_GEMINI in vscode-ext/glyph-middleware.js)
 * baked into the shipped compressor, not a runtime API call.
 *
 * First run (2026, gemini-2.5-flash-lite) found the same pattern already
 * measured for OpenAI: 26/28 TECH_GLYPHS and 32/33 code-minification
 * keyword/glyph pairs are a net token LOSS on Gemini too — common tech
 * names and code keywords are already efficient single-token entries in
 * Gemini's tokenizer, same root cause as the OpenAI finding.
 *
 * Usage: GEMINI_API_KEY=... node test/tokenizer-calibration-gemini.js [model]
 * (model defaults to gemini-2.5-flash-lite; countTokens calls do not
 * consume generation quota, but do count toward rate limits — this makes
 * ~120 sequential calls with a short delay between them.)
 */
import { TECH_GLYPHS } from '../src/glyph-middleware.js';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('GEMINI_API_KEY environment variable is required. Usage: GEMINI_API_KEY=... node test/tokenizer-calibration-gemini.js [model]');
  process.exit(1);
}
const MODEL = process.argv[2] || 'gemini-2.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:countTokens?key=${API_KEY}`;

// Same 33 keyword/glyph pairs as MEASURED_CODE_KEYWORD_TOKENS_OPENAI, in
// the order _minifySyntax() applies them.
const CODE_KEYWORD_PAIRS = [
  ['return', '→'], ['function', 'ƒ'], ['const', '◇'], ['let', '◇'],
  ['import', 'imp'], ['export', 'exp'], ['def', 'ƒ'], ['class', '𝒞'],
  ['from', 'imp'], ['yield', '→'], ['self.', 's.'],
  ['int', '◇t'], ['void', '◇t'], ['char', '◇t'], ['float', '◇t'],
  ['double', '◇t'], ['long', '◇t'], ['short', '◇t'],
  ['fn', 'ƒ'], ['pub', '+'], ['mut', 'm'], ['impl', 'I'],
  ['struct', '𝒞'], ['use', 'imp'], ['match', '?'], ['func', 'ƒ'],
  ['package', 'pkg'], ['type', '◇t'], ['public', '+'], ['private', '-'],
  ['protected', '#'], ['using', 'imp'], ['#include', 'imp'],
];

async function countTokens(text) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text }] }] }),
  });
  if (!res.ok) {
    throw new Error(`countTokens failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()).totalTokens;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quoteKeyIfNeeded(key) {
  return /^[a-zA-Z]+$/.test(key) ? key : `'${key}'`;
}

async function measurePairs(label, pairs, format) {
  console.log(`\n=== ${label} (${pairs.length} pairs, model=${MODEL}) ===\n`);
  const results = [];
  for (const [key, glyph] of pairs) {
    const keyTokens = await countTokens(key);
    await sleep(150);
    const glyphTokens = await countTokens(glyph);
    await sleep(150);
    const verdict = glyphTokens >= keyTokens ? 'LOSS' : 'win';
    results.push({ key, glyph, keyTokens, glyphTokens, verdict });
    console.log(key.padEnd(12), JSON.stringify(glyph).padEnd(8), 'word:', keyTokens, 'glyph:', glyphTokens, verdict);
  }
  const losses = results.filter((r) => r.verdict === 'LOSS').length;
  console.log(`\n${results.length} measured, ${losses} are a net token LOSS on Gemini (${MODEL}).`);
  console.log('\n--- JS table snippet ---');
  console.log(results.map((r) => `  ${quoteKeyIfNeeded(r.key)}: [${format(r)}],`).join('\n'));
  return results;
}

async function run() {
  await measurePairs('TECH_GLYPHS', Object.entries(TECH_GLYPHS), (r) => `${r.keyTokens}, ${r.glyphTokens}`);
  await measurePairs('Code-minification keywords', CODE_KEYWORD_PAIRS, (r) => `${r.keyTokens}, ${r.glyphTokens}`);
}

run();
