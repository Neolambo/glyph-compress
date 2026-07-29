/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — implicit-cache impact for OpenAI and Gemini
 *
 * Run with:  npm run measure:implicit-cache
 *
 * Anthropic caching is explicit: you place cache_control breakpoints, and
 * v1.33.6 fixed where GlyphCompress puts them. OpenAI and Gemini cache
 * *implicitly* — the provider matches the longest identical **byte** prefix of
 * the request against what it has seen before. There is no marker to place, so
 * the only thing that matters is whether turn N is byte-identical to turn N-1
 * for as long as possible.
 *
 * That is a hard constraint for a dynamic dictionary. GlyphCompress
 * re-compresses the whole history on every turn, and the dictionary keeps
 * learning, so the same original text serialises to different bytes each
 * request and the shared prefix collapses. Uncompressed history, by contrast,
 * is byte-identical turn over turn and matches in full.
 *
 * This script reports both halves of that trade so they cannot be confused:
 * how many tokens compression removes, and what the destroyed cache costs.
 * All token counts come from js-tiktoken, never the internal heuristic.
 */
import { encodingForModel } from 'js-tiktoken';
import { GlyphCompressor } from '../src/glyph-middleware.js';
import { CACHED_INPUT_RATES } from '../src/session-measure.js';

// OpenAI bills cached input at 0.5x. Gemini implicit caching is ~0.25x, so the
// same prefix loss costs more there, not less — which is the entire point this
// script exists to show, and which a single shared rate silently erased: both
// provider tables came out byte-identical, halving the cost of a destroyed
// prefix on exactly the provider where it hurts most. The rates live in
// src/session-measure.js and are imported rather than restated here, because a
// constant that exists twice is a constant that will disagree with itself.

const enc = encodingForModel('gpt-4o');
const tokens = (text) => (text ? enc.encode(text).length : 0);

/** Identifier-repetitive source, the shape the dynamic dictionary targets. */
const ATTACHED_FILE = 'export class PaymentGateway {\n'
  + Array.from({ length: 120 }, (_, i) =>
    `  async processTransaction${i}(amount, currency) {\n`
    + '    const validated = this.validate(amount);\n'
    + '    return this.submit(validated, currency);\n  }').join('\n')
  + '\n}';

function buildSession(followUpPairs) {
  const turns = [
    { role: 'user', content: 'Review this file for bugs:\n```js\n' + ATTACHED_FILE + '\n```' },
    { role: 'assistant', content: 'Found three issues: null checks, retries, unbounded concurrency.' },
  ];
  for (let i = 0; i < followUpPairs; i++) {
    turns.push({ role: 'user', content: `Question ${i}: how does processTransaction${i} handle a currency mismatch, and does the retry wrapper stay idempotent?` });
    turns.push({ role: 'assistant', content: `For ${i}: validate() throws before submit(), so the retry wrapper never observes the mismatch.` });
  }
  return turns;
}

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

function runSession(followUpPairs, compress, provider, cachedRate) {
  const turns = buildSession(followUpPairs);
  const compressor = compress ? new GlyphCompressor({ level: 'standard', provider }) : null;
  let previous = null;
  let billed = 0;
  let sent = 0;
  let truncations = 0;

  for (let turn = 0; turn < turns.length; turn += 2) {
    const slice = turns.slice(0, turn + 1).map((m) => ({ ...m }));
    const payload = compress ? compressor.compressMessages(slice, provider).messages : slice;
    const text = wire(payload);

    const shared = previous === null ? 0 : commonPrefixLength(previous, text);
    if (previous !== null && shared < previous.length * 0.995) truncations++;

    const cached = tokens(text.slice(0, shared));
    const fresh = tokens(text) - cached;
    billed += cached * cachedRate + fresh;
    sent += tokens(text);
    previous = text;
  }

  return { billed, sent, truncations, requests: Math.ceil(turns.length / 2) };
}

for (const provider of ['openai', 'gemini']) {
  const cachedRate = CACHED_INPUT_RATES[provider];
  // A provider with no published rate would silently fall back to undefined and
  // turn every billed total into NaN, which prints as a confident 0.0%.
  if (!Number.isFinite(cachedRate)) {
    throw new Error(`no cached-input rate for '${provider}' — refusing to report a measurement built on it`);
  }
  console.log(`\n${provider} — implicit prefix caching, cached input at ${cachedRate}x`);
  console.log('  turns | tokens sent (raw -> glyph) | billed with cache (raw -> glyph) | prefix truncations');
  for (const pairs of [0, 3, 8, 20]) {
    const raw = runSession(pairs, false, provider, cachedRate);
    const glyph = runSession(pairs, true, provider, cachedRate);
    const sentDelta = ((glyph.sent - raw.sent) / raw.sent) * 100;
    const billedDelta = ((glyph.billed - raw.billed) / raw.billed) * 100;
    const sign = (n) => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));
    console.log(
      `  ${String(pairs * 2 + 2).padStart(5)} | ${String(raw.sent).padStart(6)} -> ${String(glyph.sent).padStart(6)} (${sign(sentDelta).padStart(6)}%)`
      + ` | ${String(Math.round(raw.billed)).padStart(6)} -> ${String(Math.round(glyph.billed)).padStart(6)} (${sign(billedDelta).padStart(6)}%)`
      + ` | ${glyph.truncations}/${glyph.requests - 1} vs ${raw.truncations}/${raw.requests - 1}`,
    );
  }
}

console.log('\nColumn 2 is compression alone. Column 3 adds implicit caching; the gap between the two');
console.log('percentages is what the destroyed byte prefix costs. Positive numbers mean GlyphCompress');
console.log('is more expensive than sending the conversation uncompressed.');
