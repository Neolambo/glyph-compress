/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — the showcase scenarios, priced in real tokens
 *
 * Run with:  npm run measure:showcase
 *
 * `npm run demo` — and the headline figures in README.md that come from it —
 * measure **characters**: `original.length` against `compressed.length`. That
 * is what produces "12.7x compression, 92% saved".
 *
 * Characters are not what providers bill, and on this project they have
 * disagreed with real tokens three separate times: glyph substitution measured
 * -5.8/-10.5pp on real files while looking like a win on length; the dynamic
 * dictionary inflated real tokens 37.8% while cutting characters 33%; and the
 * internal estimator's error runs +42.9% on plain text against -24.1% on glyph
 * text, which is enough to invert a verdict.
 *
 * So this reports the same scenarios both ways, side by side, with js-tiktoken
 * doing the counting. Where the two columns disagree, the token column is the
 * one that shows up on the bill.
 */
import { encodingForModel } from 'js-tiktoken';
// The same low-level Compressor `npm run demo` uses, deliberately — not
// GlyphCompressor. The point is to re-price the exact output the README
// reports, so the economics guard must not be in the way: with it, these
// payloads simply fall back and every row reads 0%, which answers a different
// question ("does the guard work?") than the one being asked here ("is the
// published figure true in tokens?").
import { Compressor } from '../src/compressor.js';

const enc = encodingForModel('gpt-4o');
const tokens = (text) => (text ? enc.encode(text).length : 0);

const { SCENARIOS } = await import('../test/demo-scenarios.js').catch(() => ({ SCENARIOS: null }));

if (!SCENARIOS) {
  console.error('This script needs the demo scenarios exported from test/demo-scenarios.js.');
  console.error('Run `npm run demo` for the character-based figures in the meantime.');
  process.exit(2);
}

console.log('Showcase scenarios: characters vs real tokens (js-tiktoken, o200k_base)\n');
console.log('  scenario                                   chars saved   REAL TOKENS saved');

let charOrig = 0;
let charComp = 0;
let tokOrig = 0;
let tokComp = 0;

for (const scenario of SCENARIOS) {
  const original = JSON.stringify(scenario.context);
  const compressor = new Compressor();
  const result = compressor.compress(scenario.context);

  const co = original.length;
  const cc = result.compressed.length;
  const to = tokens(original);
  const tc = tokens(result.compressed);

  charOrig += co;
  charComp += cc;
  tokOrig += to;
  tokComp += tc;

  const charPct = ((1 - cc / co) * 100).toFixed(0);
  const tokPct = ((1 - tc / to) * 100).toFixed(0);
  const flag = tc >= to ? '  <-- no saving in tokens' : '';
  console.log(
    `  ${scenario.name.slice(0, 40).padEnd(42)} ${String(charPct + '%').padStart(11)}   ${String(tokPct + '%').padStart(16)}${flag}`,
  );
}

console.log('');
console.log(`  AGGREGATE  characters: ${charOrig} -> ${charComp}  (${((1 - charComp / charOrig) * 100).toFixed(0)}% saved)`);
console.log(`             real tokens: ${tokOrig} -> ${tokComp}  (${((1 - tokComp / tokOrig) * 100).toFixed(0)}% saved)`);
console.log('');
console.log('The character column is what README.md and `npm run demo` report. The token');
console.log('column is what the provider charges for.');
