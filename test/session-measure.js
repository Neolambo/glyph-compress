/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — tests for the session-cost measurement
 *
 * This module exists so a user can get the project's headline number on their
 * own code instead of taking one synthetic fixture's word for it. That makes
 * it a *reporting* surface, and a reporting surface that flatters the tool is
 * worse than none at all — it is the same failure as an internal estimator
 * that was wrong by 40% while sounding precise.
 *
 * So the properties pinned here are mostly about honesty rather than
 * arithmetic: that a saving is not claimed where nothing repeats, that the
 * `exact` flag tells the truth about which counter ran, and that the two
 * quantities which are constantly conflated stay separable.
 */
import assert from 'assert';
import { measureSession, buildReattachSession, CACHED_INPUT_RATES } from '../src/session-measure.js';
import { hasRealTokenizer } from '../src/real-token-counter.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${name}: ${error.message}`);
    failed++;
  }
}

console.log('\nsession-measure\n');

/** Identifier-repetitive source, the shape an IDE keeps re-attaching. */
const FILE = 'export class PaymentGateway {\n'
  + Array.from({ length: 40 }, (_, i) =>
    `  async processTransaction${i}(amount, currency) {\n`
    + '    const validated = this.validate(amount);\n'
    + '    return this.submit(validated, currency);\n  }').join('\n')
  + '\n}';

test('a re-attachment session repeats the file and varies the conversation', () => {
  const messages = buildReattachSession(FILE, 4, 'js');
  assert.strictEqual(messages.length, 8, 'four turns is four user and four assistant messages');
  const userTurns = messages.filter((m) => m.role === 'user');
  for (const turn of userTurns) {
    assert(turn.content.includes(FILE), 'every user turn must carry the file, as an IDE does');
  }
  assert.strictEqual(
    new Set(userTurns.map((m) => m.content)).size,
    userTurns.length,
    'the turns must differ, or the measurement is of a duplicated request rather than a session',
  );
});

test('savings grow with session length, because the redundancy does', () => {
  const short = measureSession({ text: FILE, turns: 3, provider: 'openai' });
  const long = measureSession({ text: FILE, turns: 12, provider: 'openai' });
  assert(
    long.sentDeltaPct < short.sentDeltaPct,
    `a longer session re-sends more, so the saving must be larger: ${long.sentDeltaPct.toFixed(1)}% vs ${short.sentDeltaPct.toFixed(1)}%`,
  );
  assert(long.sentDeltaPct < -50, `expected a substantial saving at 12 turns, got ${long.sentDeltaPct.toFixed(1)}%`);
});

test('sent and billed are reported separately and can disagree', () => {
  const r = measureSession({ text: FILE, turns: 8, provider: 'openai' });
  assert(r.raw.billed < r.raw.sent, 'a cached prefix must make the billed figure lower than the raw token count');
  assert.notStrictEqual(
    r.sentDeltaPct.toFixed(4),
    r.billedDeltaPct.toFixed(4),
    'collapsing the two into one number is the confusion this module exists to prevent',
  );
});

test('a prefix break is counted, not hidden', () => {
  const r = measureSession({ text: FILE, turns: 10, provider: 'openai' });
  // Uncompressed history is byte-identical turn over turn, so a provider
  // matches it in full and there is nothing to break. Anything else means the
  // detector is reporting noise.
  assert.strictEqual(r.raw.prefixBreaks, 0, `uncompressed history cannot break its own prefix, got ${r.raw.prefixBreaks}`);
  // Compression re-derives the payload as the dictionary learns, so at least
  // one break is expected over ten turns — and it must be *reported*. Silently
  // returning zero here would hide the single cost that can outweigh every
  // saving this module measures.
  assert(
    r.glyph.prefixBreaks >= 1,
    'compressing a growing history changes bytes a cache was matching on; a report of zero breaks over 10 turns means the detector is not working',
  );
});

test('the exact flag reports which counter actually ran', () => {
  const r = measureSession({ text: FILE, turns: 4, provider: 'openai' });
  assert.strictEqual(
    r.exact,
    hasRealTokenizer(),
    'claiming real token counts without js-tiktoken is exactly the 40%-wrong estimator problem',
  );
});

test('Gemini is priced for its cheaper cache read, which makes a broken prefix cost more', () => {
  assert(
    CACHED_INPUT_RATES.gemini < CACHED_INPUT_RATES.openai,
    'a lower cached rate means more of the bill sits in the cache, so losing it hurts more',
  );
  const gemini = measureSession({ text: FILE, turns: 6, provider: 'gemini' });
  assert.strictEqual(gemini.cachedRate, CACHED_INPUT_RATES.gemini, 'the provider rate must reach the result');
});

test('a single turn is refused rather than reported as a saving', () => {
  // With one turn nothing has been re-attached, so any percentage here would
  // describe compression alone while carrying a session-economics label.
  assert.throws(
    () => measureSession({ text: FILE, turns: 1, provider: 'openai' }),
    /at least 2 turns/,
    'one turn must be rejected, not measured',
  );
});

test('empty input is refused rather than measured as a 0% saving', () => {
  assert.throws(() => measureSession({ text: '', turns: 4 }), /non-empty string/);
  assert.throws(() => measureSession({ text: '   \n  ', turns: 4 }), /non-empty string/);
  assert.throws(() => measureSession({ turns: 4 }), /non-empty string/);
});

console.log(`\nsession-measure: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('session-measure suite ok');
