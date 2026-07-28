/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — single-token codeword vocabulary
 *
 * The dynamic dictionary replaces a repeated identifier with a short stand-in.
 * Which stand-in you choose is an information-theory question, and this project
 * had been answering it wrong: `§N` costs **2 real tokens**, so it can only pay
 * on identifiers costing 3 or more — which excludes most of them.
 * `AuthenticationManager` is 2 tokens. `handleSubmit` is 2. Substituting those
 * was pure loss, and v1.33.8 correctly stopped doing it.
 *
 * The mistake was treating the codeword alphabet as free to invent. It is not:
 * BPE is a learned variable-length code trained on natural text, so it already
 * assigns the shortest encodings to ordinary words. Anything that *looks* like
 * a code — `§N`, a hex colour, base64, an emoji — is by construction outside
 * that distribution and costs more. Measured, in running text:
 *
 *   #A3F2 (16-bit colour)        5 tokens
 *   rgb(163,242,193)             8 tokens
 *   base64, 4 chars              3 tokens
 *   §1  / emoji / CJK            2 tokens
 *   an ordinary English word     1 token
 *
 * So the cheapest available codeword is a common word, and the right code does
 * not look like a code at all. Halving the codeword cost is worth more than it
 * sounds, because it moves the break-even: every 2-token identifier becomes
 * profitable. Simulated over this repository, entries admitted go from 4-10 to
 * 31-49 per file and savings improve 4.6x to 21x.
 *
 * The risk this trades for is **ambiguity**. `§1` cannot occur naturally;
 * `zebra` can. Two defences below: a vocabulary picked to be improbable in
 * source code, and — the one that actually matters — a per-payload collision
 * check, since no static list can anticipate every codebase.
 */

/**
 * Candidates are concrete nouns from natural landscape, flora and food:
 * domains that essentially never appear as identifiers in source code, while
 * still being common enough in English that BPE encodes each as one token.
 *
 * Deliberately excluded despite being single-token and thematically similar:
 * `delta`, `spring`, `summit`, `ridge`, `vector`, `matrix`, `kernel`, `prism`,
 * and also `salt`, `bloom`, `bean`, `leaf`, `mint`, `sage`, `palm`. Every one
 * of them passes a naive collision scan against this repository and is still a
 * bad choice — `salt` is cryptography, `bloom` is a filter, `bean` is Java,
 * `leaf` is every tree structure, `spring` and `sage` are frameworks. A
 * vocabulary is only as safe as its worst plausible collision, not its average
 * one, and the per-payload check below should be a backstop rather than the
 * thing doing all the work.
 *
 * Every entry is asserted to cost exactly one token by
 * test/codeword-vocabulary.js — an earlier hand-assembled version of this list
 * had 27 of 85 entries costing two or more, which would have quietly halved
 * the point of the exercise.
 */
const CODEWORD_VOCABULARY = [
  'zebra', 'quartz', 'ember', 'willow', 'cobalt', 'maple', 'raven', 'ivory',
  'lunar', 'amber', 'cedar', 'comet', 'meteor', 'glacier', 'canyon', 'lagoon',
  'reef', 'dune', 'oasis', 'marsh', 'grove', 'orchard', 'meadow', 'prairie',
  'plateau', 'mesa', 'gorge', 'cavern', 'brook', 'creek', 'cascade', 'torrent',
  'fern', 'moss', 'ivy', 'alder', 'olive', 'plum', 'peach', 'cherry', 'quince',
  'pear', 'lemon', 'lime', 'mango', 'melon', 'thyme', 'basil', 'ginger',
  'cumin', 'dill', 'parsley', 'leek', 'celery', 'spinach', 'kale', 'pine',
  'oak', 'elm', 'fir', 'reed', 'vine', 'bark', 'pollen', 'nectar', 'honey',
  'syrup', 'butter', 'cream', 'sugar', 'flour', 'yeast', 'dough', 'bread',
  'toast', 'waffle', 'pancake', 'muffin', 'biscuit', 'noodle', 'pasta', 'rice',
  'barley', 'wheat', 'millet', 'quinoa', 'almond', 'walnut', 'peanut', 'sesame',
];

/**
 * Codewords that would be ambiguous in this specific payload, removed.
 *
 * This is the defence that carries the weight. A static list cannot know that
 * a given codebase has a `Willow` service or a test fixture full of herbs, and
 * a codeword that also occurs as content makes the substitution undecodable in
 * exactly the direction that corrupts silently: the model expands a word the
 * author actually wrote.
 *
 * Matching is case-insensitive and by **substring**, not whole word. A first
 * version matched whole words only, on the reasoning that `zebraCrossing`
 * tokenizes differently from a standalone `zebra` and so cannot be confused
 * with it. That reasoning is about the tokenizer and the risk is about the
 * model: given `zebra=AuthenticationManager` in the codebook and
 * `zebraCrossing` in the body, expanding it to `AuthenticationManagerCrossing`
 * is a plausible reading, and a wrong one that nothing downstream would catch.
 *
 * Substring matching burns vocabulary — the cost is capacity, and there is
 * plenty: ~89 codewords against a dictionary that tops out at 96 and typically
 * uses far fewer. Trading capacity for an ambiguity that corrupts silently is
 * the right way round.
 */
export function availableCodewords(text = '', vocabulary = CODEWORD_VOCABULARY) {
  if (!text) return [...vocabulary];
  const haystack = text.toLowerCase();
  return vocabulary.filter((word) => !haystack.includes(word));
}

export { CODEWORD_VOCABULARY };
