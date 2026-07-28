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
 *
 * Every other measurement in this repository attaches the file once. This one
 * attaches it on *every* turn, because that is what an IDE actually does: open
 * files are re-serialised into each request, unchanged, for the whole session.
 * The duplication is inside a single request, so an earlier copy is redundant
 * with a later one the model can already see — which is what makes eliding it
 * safe, and what `_elideRepeatedBlocks` does.
 *
 * The number this reports is not a compression ratio. Nothing here is
 * compressed: the file is transmitted once instead of ten times, and the
 * savings come entirely from bytes that were never sent. That is the point of
 * running it — the largest wins in this project come from not sending things,
 * not from making things smaller.
 *
 * Two columns, because they answer different questions. "Tokens sent" is what
 * leaves the machine, provider-neutral. "Billed with cache" prices those
 * tokens the way a provider with a prefix cache actually charges for them, and
 * can move in the opposite direction: re-compressing history every turn
 * changes bytes a cache was matching on, and a destroyed prefix costs more
 * than the compression saved. Both are measured with js-tiktoken.
 */
import { encodingForModel } from 'js-tiktoken';
import { GlyphCompressor } from '../src/glyph-middleware.js';

// OpenAI bills cached input at 0.5x. Gemini implicit caching is ~0.25x, so the
// same prefix loss costs more there, not less.
const CACHED_INPUT_RATE = 0.5;

const enc = encodingForModel('gpt-4o');
const tokens = (text) => (text ? enc.encode(text).length : 0);

/** Identifier-repetitive source, the shape an IDE keeps re-attaching. */
const ATTACHED_FILE = 'export class PaymentGateway {\n'
  + Array.from({ length: 120 }, (_, i) =>
    `  async processTransaction${i}(amount, currency) {\n`
    + '    const validated = this.validate(amount);\n'
    + '    return this.submit(validated, currency);\n  }').join('\n')
  + '\n}';

/**
 * A session where the open file rides along on every user turn — the case the
 * other scripts deliberately exclude.
 */
function buildSession(userTurns) {
  const turns = [];
  for (let i = 0; i < userTurns; i++) {
    turns.push({
      role: 'user',
      content: `Question ${i}: does processTransaction${i} stay idempotent across a currency mismatch?\n`
        + '```js\n' + ATTACHED_FILE + '\n```',
    });
    turns.push({
      role: 'assistant',
      content: `For ${i}: validate() throws before submit(), so the retry wrapper never observes it.`,
    });
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

function runSession(userTurns, compress, provider) {
  const turns = buildSession(userTurns);
  const compressor = compress ? new GlyphCompressor({ level: 'standard', provider }) : null;
  let previous = null;
  let billed = 0;
  let sent = 0;
  let breaks = 0;

  for (let turn = 0; turn < turns.length; turn += 2) {
    const slice = turns.slice(0, turn + 1).map((m) => ({ ...m }));
    const payload = compress ? compressor.compressMessages(slice, provider).messages : slice;
    const text = wire(payload);

    const shared = previous === null ? 0 : commonPrefixLength(previous, text);
    // A prefix that no longer covers what the previous request established has
    // been broken, and everything after it is billed fresh again.
    if (previous !== null && shared < previous.length * 0.995) breaks++;

    const cached = tokens(text.slice(0, shared));
    const fresh = tokens(text) - cached;
    billed += cached * CACHED_INPUT_RATE + fresh;
    sent += tokens(text);
    previous = text;
  }

  return { billed, sent, breaks, requests: Math.ceil(turns.length / 2) };
}

const sign = (n) => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

console.log('Re-attached file, cumulative over the session (js-tiktoken, gpt-4o encoding)\n');
for (const provider of ['openai', 'anthropic']) {
  console.log(`${provider} — cached input priced at ${CACHED_INPUT_RATE}x`);
  console.log('  re-attachments | tokens sent (raw -> glyph) | billed with cache (raw -> glyph) | prefix breaks');
  for (const userTurns of [2, 5, 10, 20]) {
    const raw = runSession(userTurns, false, provider);
    const glyph = runSession(userTurns, true, provider);
    const sentDelta = ((glyph.sent - raw.sent) / raw.sent) * 100;
    const billedDelta = ((glyph.billed - raw.billed) / raw.billed) * 100;
    console.log(
      `  ${String(userTurns).padStart(14)} | ${String(raw.sent).padStart(6)} -> ${String(glyph.sent).padStart(6)} (${sign(sentDelta).padStart(6)}%)`
      + ` | ${String(Math.round(raw.billed)).padStart(6)} -> ${String(Math.round(glyph.billed)).padStart(6)} (${sign(billedDelta).padStart(6)}%)`
      + ` | ${glyph.breaks}/${glyph.requests - 1} vs ${raw.breaks}/${raw.requests - 1}`,
    );
  }
  console.log('');
}

console.log('Negative percentages are savings. The savings here are not compression: the file is');
console.log('transmitted once and referred to afterwards, so what disappears is repetition, not');
console.log('detail. Compare against `npm run measure:implicit-cache`, where the same file is');
console.log('attached only once and there is nothing to elide.');
