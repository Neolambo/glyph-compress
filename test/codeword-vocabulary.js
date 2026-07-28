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
import { encodingForModel } from 'js-tiktoken';
import { CODEWORD_VOCABULARY, availableCodewords } from '../src/codeword-vocabulary.js';

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

const enc = encodingForModel('gpt-4o');
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

console.log(`\ncodeword-vocabulary: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('codeword-vocabulary suite ok');
}
