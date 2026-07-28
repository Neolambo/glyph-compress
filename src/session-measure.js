/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — what a session costs, on your own file
 *
 * Every published figure in this project was measured on one codebase, mostly
 * on one synthetic fixture. That is enough to prove a mechanism works and not
 * enough to tell you what it does for *your* code, which is the only number
 * you are actually deciding on. This module is the engine behind
 * `glyph-compress measure <file>`, so the answer is one command away and does
 * not require cloning anything.
 *
 * It simulates the thing that dominates a real IDE session: the same file
 * re-attached to every request, unchanged, while the conversation grows around
 * it. Two quantities come back, and conflating them is the mistake this whole
 * project is a correction to:
 *
 *   sent   — tokens leaving the machine. Provider-neutral.
 *   billed — what those tokens cost once a prefix cache is priced in. Can move
 *            in the opposite direction, because re-compressing history changes
 *            the bytes a cache was matching on and a broken prefix costs more
 *            than the compression saved.
 *
 * Shared with scripts/measure-differential.mjs rather than reimplemented there.
 * A measurement that exists twice is a measurement that will disagree with
 * itself, and this repository has already shipped a test that re-derived a
 * formula instead of calling it and passed against a mutation as a result.
 */
import { GlyphCompressor } from './glyph-middleware.js';
import { countRealTokens, hasRealTokenizer } from './real-token-counter.js';
import { estimateProviderTokens } from './token-estimator.js';

/**
 * Cached-input multipliers. OpenAI bills cached input at 0.5x; Gemini's
 * implicit caching is nearer 0.25x, which makes a destroyed prefix cost *more*
 * there, not less. Anthropic is explicit and priced separately (write 1.25x,
 * read 0.1x) — `measure:cache` is the script for that axis.
 */
export const CACHED_INPUT_RATES = { openai: 0.5, gemini: 0.25, anthropic: 0.5 };

const textOf = (message) => (typeof message.content === 'string'
  ? message.content
  : (Array.isArray(message.content) ? message.content.map((b) => b.text || '').join('') : ''));

/** Serialise the way a provider sees it: role and content, in order. */
const wire = (messages) => messages.map((m) => `${m.role}:${textOf(m)}`).join('\n');

function commonPrefixLength(a, b) {
  const limit = Math.min(a.length, b.length);
  let i = 0;
  while (i < limit && a[i] === b[i]) i++;
  return i;
}

/**
 * A session that re-attaches `text` on every user turn, as an IDE does with
 * open files. The questions vary so the conversation genuinely grows; only the
 * attachment repeats, which is the redundancy being measured.
 */
export function buildReattachSession(text, turns, language = 'js') {
  const messages = [];
  for (let i = 0; i < turns; i++) {
    messages.push({
      role: 'user',
      content: `Question ${i + 1} about this file:\n\`\`\`${language}\n${text}\n\`\`\``,
    });
    messages.push({
      role: 'assistant',
      content: `Answer ${i + 1}: see the relevant section above; the behaviour is unchanged since the last turn.`,
    });
  }
  return messages;
}

function runSession(messages, provider, compress, count, cachedRate) {
  const compressor = compress ? new GlyphCompressor({ level: 'standard', provider }) : null;
  let previous = null;
  let sent = 0;
  let billed = 0;
  let prefixBreaks = 0;

  for (let turn = 0; turn < messages.length; turn += 2) {
    const slice = messages.slice(0, turn + 1).map((m) => ({ ...m }));
    const payload = compress ? compressor.compressMessages(slice, provider).messages : slice;
    const serialised = wire(payload);

    const shared = previous === null ? 0 : commonPrefixLength(previous, serialised);
    // A prefix that no longer covers what the previous request established has
    // been broken; everything past the break is billed fresh again.
    if (previous !== null && shared < previous.length * 0.995) prefixBreaks++;

    const total = count(serialised);
    const cached = count(serialised.slice(0, shared));
    sent += total;
    billed += cached * cachedRate + (total - cached);
    previous = serialised;
  }

  return { sent, billed: Math.round(billed), prefixBreaks, requests: messages.length / 2 };
}

/**
 * Measure a re-attachment session both ways and report the difference.
 *
 * `exact` says whether js-tiktoken was available. When it is not, the counts
 * come from the internal estimator, which has been wrong by 40% before — so
 * the flag travels with the result rather than being inferred by the caller.
 */
export function measureSession({ text, turns = 10, provider = 'openai', language = 'js' } = {}) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('measureSession requires the file contents as a non-empty string');
  }
  if (!Number.isInteger(turns) || turns < 2) {
    throw new Error('measureSession requires at least 2 turns — with one turn nothing has repeated yet');
  }

  const exact = hasRealTokenizer();
  const count = exact
    ? (value) => countRealTokens(value) ?? 0
    : (value) => estimateProviderTokens(value, provider).tokens;

  const cachedRate = CACHED_INPUT_RATES[provider] ?? 0.5;
  const messages = buildReattachSession(text, turns, language);
  const raw = runSession(messages, provider, false, count, cachedRate);
  const glyph = runSession(messages, provider, true, count, cachedRate);

  const delta = (before, after) => (before ? ((after - before) / before) * 100 : 0);

  return {
    provider,
    turns,
    exact,
    cachedRate,
    raw,
    glyph,
    sentDeltaPct: delta(raw.sent, glyph.sent),
    billedDeltaPct: delta(raw.billed, glyph.billed),
  };
}
