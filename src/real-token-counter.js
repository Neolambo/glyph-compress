/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — real BPE token counting, when it is available
 *
 * Everything else in this project estimates tokens from text length. That is
 * unavoidable for a hot path, and calibrated (see src/token-estimator.js), but
 * length is a genuinely poor predictor of BPE cost for short identifiers — and
 * the dynamic dictionary's admission rule lives or dies on exactly that.
 * Measured with js-tiktoken over o200k_base:
 *
 *   AuthenticationManager    21 chars -> 2 tokens
 *   processTransaction0      19 chars -> 3 tokens
 *
 * The *shorter* identifier costs more. No length heuristic can separate them,
 * and getting it wrong means replacing a 2-token word with a 2-token `§N`
 * glyph and billing the user for the privilege — measured at +37.8% real
 * tokens on identifier-repetitive source before v1.33.7.
 *
 * So this module counts for real when `js-tiktoken` is installed, and reports
 * that it cannot when it is not. It is an **optional** dependency: the caller
 * must keep a conservative fallback that never admits a substitution it cannot
 * prove wins. Present, the dictionary keeps the substitutions that genuinely
 * pay; absent, it keeps only the ones that are safe on length alone.
 *
 * The encoder is loaded once, lazily, and only ever consulted while *building*
 * the dictionary — once per candidate word, not once per message.
 *
 * o200k_base is OpenAI's tokenizer. Anthropic and Gemini tokenize differently,
 * so for those it remains an approximation — a far closer one than character
 * count, and the same trade already made by the MEASURED_TECH_GLYPH_TOKENS_*
 * tables in the middleware.
 */
import { createRequire } from 'module';

let encoder;
let loadAttempted = false;

/**
 * Resolve a `require` that works from both the ESM source and the CJS bundle.
 *
 * A top-level `createRequire(import.meta.url)` looks natural here and breaks
 * the build: esbuild emits `undefined` for `import.meta.url` when targeting
 * CJS, so the bundled middleware threw ERR_INVALID_ARG_VALUE on load — before
 * reaching any compression code. Preferring the ambient `require` when one
 * exists keeps the CJS output working and never evaluates `import.meta.url`
 * there at all.
 */
function resolveRequire() {
  if (typeof require === 'function') return require;
  try {
    return createRequire(import.meta.url);
  } catch {
    return null;
  }
}

function loadEncoder() {
  if (loadAttempted) return encoder;
  loadAttempted = true;
  try {
    // Resolved at runtime rather than bundled: js-tiktoken is optional, and a
    // hard import would make the whole middleware fail to load without it.
    const req = resolveRequire();
    const tiktoken = req ? req('js-tiktoken') : null;
    encoder = tiktoken ? tiktoken.getEncoding('o200k_base') : null;
  } catch {
    encoder = null;
  }
  return encoder;
}

/**
 * True when real counting is available. Exposed so callers can report which
 * rule they applied instead of leaving it ambiguous.
 */
export function hasRealTokenizer() {
  return loadEncoder() != null;
}

/**
 * Real BPE token count for `text`, or null when js-tiktoken is not installed.
 *
 * Never throws: a tokenizer failure must degrade to the conservative path, not
 * take down compression.
 */
export function countRealTokens(text) {
  if (typeof text !== 'string' || text.length === 0) return 0;
  const enc = loadEncoder();
  if (!enc) return null;
  try {
    return enc.encode(text).length;
  } catch {
    return null;
  }
}

/**
 * Token cost of a word *as it appears in running text*, leading space included.
 *
 * The leading space matters and must not be discounted away: BPE merges it
 * into the word's first token, so ` amount` is one token while `amount` bare
 * can be more. What the dictionary is really choosing between is ` word` and
 * ` §N` — both in context — so both sides must be measured the same way.
 * Measuring the word with the space subtracted while pricing the glyph bare
 * flatters the substitution on both sides at once.
 */
export function countWordTokens(word) {
  if (typeof word !== 'string' || word.length === 0) return 0;
  return countRealTokens(` ${word}`);
}

/**
 * Token cost of a dynamic glyph in the same running-text form, so callers
 * compare like with like. `§` is non-ASCII and the digits are cheap, but the
 * total is what matters and it is not 1.
 */
export function countGlyphTokens(glyph) {
  const measured = countRealTokens(` ${glyph}`);
  // Conservative default when no tokenizer is present: measured at 3 for the
  // ` §N` form across N from 1 to 99.
  return measured == null ? 3 : measured;
}
