/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — codeword vocabulary suite
 *
 * The whole reason this vocabulary exists is that a codeword costing 2 tokens
 * (`§N`) cannot pay on a 2-token identifier, and most identifiers are 2 tokens.
 * A one-token codeword moves that break-even. So "every entry costs exactly one
 * token" is not a detail — it is the entire premise, and an entry that quietly
 * costs two silently removes the advantage while looking fine.
 *
 * That is not hypothetical: a hand-assembled version of this list had 27 of 85
 * entries at two or more tokens, because it was written by picking plausible
 * words rather than by measuring them.
 */
import assert from 'assert';
import { readFileSync } from 'fs';
import { CODEWORD_VOCABULARY, availableCodewords } from '../src/codeword-vocabulary.js';
import { conservativeWordTokens } from '../src/real-token-counter.js';
import { GlyphCompressor } from '../src/glyph-middleware.js';
import { loadEncoder, skipSuite } from './helpers/optional-tokenizer.js';

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

// Loaded through the optional-tokenizer helper: this suite's central premise
// is that every codeword costs exactly one REAL token, which cannot be checked
// without a tokenizer. Rather than assert it against the heuristic — the
// instrument whose error caused the bug this vocabulary exists to fix — the
// suite skips loudly when js-tiktoken is absent.
const enc = await loadEncoder();
if (!enc) {
  skipSuite('codeword-vocabulary', 'js-tiktoken not installed; every assertion here needs real token counts');
}
const tokens = (text) => enc.encode(text).length;

test('every codeword costs exactly one real token in running text', () => {
  const offenders = CODEWORD_VOCABULARY
    .map((word) => ({ word, cost: tokens(` ${word}`) }))
    .filter((entry) => entry.cost !== 1);
  assert.strictEqual(
    offenders.length,
    0,
    `these entries are not single-token and defeat the point of the vocabulary: ${JSON.stringify(offenders)}`,
  );
});

test('a codeword is cheaper than the §N form it replaces', () => {
  // The comparison that motivates the whole vocabulary. If this ever stops
  // holding, the vocabulary is pure risk for no gain.
  assert(tokens(' §1') > tokens(` ${CODEWORD_VOCABULARY[0]}`), '§N must cost more than a word codeword');
});

test('no duplicates, since two identifiers sharing a codeword would be undecodable', () => {
  assert.strictEqual(new Set(CODEWORD_VOCABULARY).size, CODEWORD_VOCABULARY.length);
});

test('the vocabulary is large enough for a session dictionary', () => {
  // maxDynamicEntries tops out at 96 across the provider profiles; a smaller
  // vocabulary would silently cap the dictionary below its configured size.
  assert(CODEWORD_VOCABULARY.length >= 80, `expected at least 80 codewords, got ${CODEWORD_VOCABULARY.length}`);
});

test('a codeword occurring in the payload is withdrawn', () => {
  const word = CODEWORD_VOCABULARY[0];
  assert(
    !availableCodewords(`const ${word} = 1;`).includes(word),
    'a codeword that also appears as content would make the substitution ambiguous',
  );
});

test('withdrawal is case-insensitive', () => {
  const word = CODEWORD_VOCABULARY[0];
  const upper = word[0].toUpperCase() + word.slice(1);
  assert(
    !availableCodewords(`class ${upper}Service {}`).includes(word),
    `${upper} must disqualify ${word} — the model cannot be expected to distinguish them`,
  );
});

test('withdrawal covers compounds too, not just standalone occurrences', () => {
  // The first version of this suite asserted the opposite — that
  // `zebraCrossing` should leave `zebra` usable, since the two tokenize
  // differently. That argument is about the tokenizer; the risk is about the
  // model. Given `zebra=AuthenticationManager` in the codebook and
  // `zebraCrossing` in the body, expanding it to
  // `AuthenticationManagerCrossing` is a plausible reading and a silently
  // wrong one. Capacity is the cheaper thing to spend.
  const word = CODEWORD_VOCABULARY[0];
  assert(
    !availableCodewords(`const ${word}Crossing = 1;`).includes(word),
    'a compound containing the codeword must disqualify it — the expansion would be ambiguous',
  );
});

test('withdrawing on substrings still leaves enough vocabulary for a real payload', () => {
  // The conservative rule is only affordable if it does not empty the pool on
  // ordinary source. Asserted against this repository's largest file.
  const source = readFileSync(new URL('../vscode-ext/glyph-middleware.js', import.meta.url), 'utf8');
  const left = availableCodewords(source);
  assert(
    left.length >= 40,
    `substring withdrawal left only ${left.length} codewords on a real 2,800-line source file — the rule is too expensive`,
  );
});

test('an empty payload withdraws nothing', () => {
  assert.strictEqual(availableCodewords('').length, CODEWORD_VOCABULARY.length);
});

// ─── Per-provider strategy ────────────────────────────────────────────────
//
// Comprehension turned out to be provider-dependent, so the choice lives in
// the provider profile rather than in a global flag. Measured, 4 checks per
// run and ~6 runs per cell:
//
//   anthropic haiku-4-5     §N 3-4/4 always   codewords 3-4/4 always
//   openai gpt-4o-mini      §N 10/12          codewords 4/12
//   gemini 2.5-flash-lite   §N 3-4/4 always   codewords 1-2/4, never higher
//
// Only Anthropic sustains codewords. OpenAI and Gemini fail identically:
// they resolve the reference and then answer in the compressed vocabulary,
// ignoring the codebook's instruction to expand back. raw and local stay on
// §N as diagnostic/offline profiles.
const EXPECTED_STRATEGY = {
  anthropic: true,
  gemini: false,
  openai: false,
  raw: false,
  local: false,
};

for (const [provider, expected] of Object.entries(EXPECTED_STRATEGY)) {
  test(`${provider} defaults to ${expected ? 'word codewords' : '§N markers'}`, () => {
    const compressor = new GlyphCompressor({ level: 'standard', provider });
    assert.strictEqual(
      compressor.codewordDictionary,
      expected,
      `${provider} must default to ${expected ? 'codewords' : '§N'} — this encodes a measured comprehension result, not a preference`,
    );
  });
}

test('an explicit option overrides the provider default, both ways', () => {
  // A caller who has measured their own model must be able to say so.
  assert.strictEqual(new GlyphCompressor({ provider: 'gemini', codewordDictionary: true }).codewordDictionary, true);
  assert.strictEqual(new GlyphCompressor({ provider: 'anthropic', codewordDictionary: false }).codewordDictionary, false);
});

test('changing provider per call carries the strategy with it', () => {
  // compressText(text, provider) can retarget a compressor built for another
  // provider. Without this, a Gemini request would go out carrying Anthropic's
  // codewords — the exact combination measured at 1-2/4.
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'raw' });
  assert.strictEqual(compressor.codewordDictionary, false, 'precondition: raw starts on §N');
  compressor.compressText('function handleRequest(payload) { return payload; }', 'anthropic');
  assert.strictEqual(compressor.codewordDictionary, true, 'retargeting to anthropic should adopt its strategy');
  compressor.compressText('function handleRequest(payload) { return payload; }', 'gemini');
  assert.strictEqual(compressor.codewordDictionary, false, 'retargeting to gemini should drop back to §N');
});

test('an explicit option survives a per-call provider change', () => {
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'raw', codewordDictionary: true });
  compressor.compressText('function handleRequest(payload) { return payload; }', 'gemini');
  assert.strictEqual(
    compressor.codewordDictionary,
    true,
    'an explicit choice must not be silently overwritten by a provider default',
  );
});


// The conservative fallback must never OVER-estimate a word's token cost.
//
// Without js-tiktoken, admission prices a word at floor(length / 8). That
// divisor is the entire safety margin behind the never-inflate guarantee in
// the shipped configuration: over-estimating the word being replaced makes a
// substitution look profitable when it is not, which is precisely how a
// payload grows. Under-estimating only forfeits savings.
//
// Found by mutation testing: changing the divisor from 8 to 4 — doubling every
// estimate — was caught by nothing, in either configuration. The property is
// checkable here, where the real counts are available.
test('the tokenizer-free estimate never exceeds the real token cost', () => {
  const source = readFileSync(new URL('../vscode-ext/glyph-middleware.js', import.meta.url), 'utf8')
    + readFileSync(new URL('../src/workspace-intelligence.js', import.meta.url), 'utf8');
  const identifiers = [...new Set(source.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g) || [])];
  assert(identifiers.length > 500, `expected a substantial corpus, got ${identifiers.length}`);

  const overEstimates = identifiers
    .map((word) => ({ word, guess: conservativeWordTokens(word), real: tokens(` ${word}`) }))
    .filter((entry) => entry.guess > entry.real);

  assert.strictEqual(
    overEstimates.length,
    0,
    `the fallback over-estimated ${overEstimates.length} of ${identifiers.length} identifiers, which lets losing substitutions through: ${JSON.stringify(overEstimates.slice(0, 5))}`,
  );
});

test('the tokenizer-free estimate is not so low that it rejects everything', () => {
  // The control. An estimate of always-1 would satisfy the assertion above
  // perfectly and disable the dictionary entirely, which is safe and useless.
  for (const word of ['ReconciliationWorkerRegistryService', 'PaymentSettlementGatewayCoordinator']) {
    assert(
      conservativeWordTokens(word) > 2,
      `${word} (${word.length} chars) must still clear the 2-token codeword bar under the fallback, or nothing ever qualifies`,
    );
  }
});

console.log(`\ncodeword-vocabulary: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('codeword-vocabulary suite ok');
}
