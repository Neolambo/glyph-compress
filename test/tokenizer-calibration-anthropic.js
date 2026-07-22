/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Anthropic Tokenizer Calibration (dev-only, manual)
 *
 * Sibling to test/tokenizer-calibration.js (OpenAI, offline via js-tiktoken)
 * and test/tokenizer-calibration-gemini.js (Gemini, live countTokens API).
 * Anthropic also has no offline pure-JS tokenizer library, so this measures
 * real token costs via the live `/v1/messages/count_tokens` API, which
 * needs a real ANTHROPIC_API_KEY, network access, and (unlike generation
 * calls) does not consume paid quota but does require a funded account.
 *
 * First run (2026, claude-haiku-4-5) found the same pattern already
 * measured for OpenAI and Gemini: common tech names and code keywords are
 * already efficient, often single-token entries in Anthropic's tokenizer
 * too, so replacing them with a Unicode glyph is rarely a real win.
 *
 * Usage: ANTHROPIC_API_KEY=... node test/tokenizer-calibration-anthropic.js [model]
 */
import { TECH_GLYPHS } from '../src/glyph-middleware.js';

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY environment variable is required. Usage: ANTHROPIC_API_KEY=... node test/tokenizer-calibration-anthropic.js [model]');
  process.exit(1);
}
const MODEL = process.argv[2] || 'claude-haiku-4-5-20251001';
const ENDPOINT = 'https://api.anthropic.com/v1/messages/count_tokens';
const ANTHROPIC_VERSION = '2023-06-01';

// Same 33 keyword/glyph pairs as MEASURED_CODE_KEYWORD_TOKENS_OPENAI/_GEMINI,
// in the order _minifySyntax() applies them.
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
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': ANTHROPIC_VERSION },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: text }] }),
  });
  if (!res.ok) {
    throw new Error(`count_tokens failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()).input_tokens;
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
  console.log(`\n${results.length} measured, ${losses} are a net token LOSS on Anthropic (${MODEL}).`);
  console.log('\n--- JS table snippet ---');
  console.log(results.map((r) => `  ${quoteKeyIfNeeded(r.key)}: [${format(r)}],`).join('\n'));
  return results;
}

async function run() {
  await measurePairs('TECH_GLYPHS', Object.entries(TECH_GLYPHS), (r) => `${r.keyTokens}, ${r.glyphTokens}`);
  await measurePairs('Code-minification keywords', CODE_KEYWORD_PAIRS, (r) => `${r.keyTokens}, ${r.glyphTokens}`);
}

run();
