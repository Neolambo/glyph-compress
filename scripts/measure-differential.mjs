/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — the cost of re-sending a file the model has already read
 *
 * Run with:  npm run measure:differential
 * On your own code:  npx glyph-compress measure <file> --turns 10
 *
 * Every other measurement in this repository attaches the file once, which is
 * the one case where there is nothing to elide. This one re-attaches it on
 * every turn, the way an IDE actually serialises open files. The duplication
 * sits inside a single request, so an earlier copy is redundant with a later
 * one the model can already see — which is what makes eliding it safe, and
 * what `_elideRepeatedBlocks` does.
 *
 * What comes back is not a compression ratio. Nothing here is compressed to
 * get it: the file is transmitted once instead of ten times, and the savings
 * are bytes that were never sent. That is the point of running it — the
 * largest wins in this project come from not sending things.
 *
 * The measurement itself lives in src/session-measure.js, shared with the
 * `measure` CLI command, so the number this prints and the number a user gets
 * on their own repository come from the same code. Two copies of a
 * measurement eventually disagree, and this project has already shipped a test
 * that re-derived a formula instead of calling it and passed against a
 * mutation as a result.
 */
import { measureSession } from '../src/session-measure.js';
import { hasRealTokenizer } from '../src/real-token-counter.js';

if (!hasRealTokenizer()) {
  console.error('js-tiktoken is not installed, so this would report estimates rather than');
  console.error('measurements. Install it and re-run:  npm install js-tiktoken');
  process.exit(1);
}

/** Identifier-repetitive source, the shape an IDE keeps re-attaching. */
const ATTACHED_FILE = 'export class PaymentGateway {\n'
  + Array.from({ length: 120 }, (_, i) =>
    `  async processTransaction${i}(amount, currency) {\n`
    + '    const validated = this.validate(amount);\n'
    + '    return this.submit(validated, currency);\n  }').join('\n')
  + '\n}';

const sign = (n) => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));
const pad = (n, w) => String(n).padStart(w);

console.log('Re-attached file, cumulative over the session (js-tiktoken, gpt-4o encoding)\n');

for (const provider of ['openai', 'anthropic']) {
  const first = measureSession({ text: ATTACHED_FILE, turns: 2, provider });
  console.log(`${provider} — cached input priced at ${first.cachedRate}x`);
  console.log('  re-attachments | tokens sent (raw -> glyph) | billed with cache (raw -> glyph) | prefix breaks');
  for (const turns of [2, 5, 10, 20]) {
    const r = measureSession({ text: ATTACHED_FILE, turns, provider });
    console.log(
      `  ${pad(turns, 14)} | ${pad(r.raw.sent, 6)} -> ${pad(r.glyph.sent, 6)} (${pad(sign(r.sentDeltaPct), 6)}%)`
      + ` | ${pad(r.raw.billed, 6)} -> ${pad(r.glyph.billed, 6)} (${pad(sign(r.billedDeltaPct), 6)}%)`
      + ` | ${r.glyph.prefixBreaks}/${r.raw.requests - 1} vs ${r.raw.prefixBreaks}/${r.raw.requests - 1}`,
    );
  }
  console.log('');
}

console.log('Negative percentages are savings. The savings here are not compression: the file is');
console.log('transmitted once and referred to afterwards, so what disappears is repetition, not');
console.log('detail. Compare against `npm run measure:implicit-cache`, where the same file is');
console.log('attached only once and there is nothing to elide.');
console.log('\nRun it on your own code — the numbers above are one synthetic fixture:');
console.log('  npx glyph-compress measure path/to/your/file.ts --turns 10');
