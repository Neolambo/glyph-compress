/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Anthropic prompt-cache coverage measurement
 *
 * Run with:  npm run measure:cache
 *
 * Reports, across sessions of increasing length, how much of each request
 * falls inside the cached prefix and what that costs once cache writes and
 * reads are priced at their real multipliers.
 *
 * Why this is a separate axis from compression: compression reduces the token
 * count of the content, caching reduces the *price* of tokens already sent.
 * On this project's own benchmarks compression delivers ~22%, while the
 * write/read spread (1.25x vs 0.1x) is worth up to 10x on repeated content —
 * so a request that is 74% cached instead of 100% is losing more than
 * compression can win back.
 *
 * The costs below are token-equivalents under Anthropic's published
 * multipliers, not billed dollars, and they assume every turn lands inside
 * the cache TTL (5 minutes by default). A session with long gaps between
 * turns re-writes instead of reading, and the advantage shrinks accordingly.
 */
import { encodingForModel } from 'js-tiktoken';
import { GlyphCompressor } from '../src/glyph-middleware.js';

const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

const enc = encodingForModel('gpt-4o');
const tokens = (text) => (text ? enc.encode(text).length : 0);

/** A file attached at the start of the session, as an IDE would. */
const ATTACHED_FILE = 'export class PaymentGateway {\n'
  + Array.from({ length: 120 }, (_, i) =>
    `  async processTransaction${i}(amount, currency) {\n`
    + '    const validated = this.validate(amount);\n'
    + '    return this.submit(validated, currency);\n  }').join('\n')
  + '\n}';

function buildSession(followUpPairs) {
  const turns = [
    { role: 'user', content: 'Review this file for bugs:\n```js\n' + ATTACHED_FILE + '\n```' },
    { role: 'assistant', content: 'I found three issues: missing null checks, no retry logic, and unbounded concurrency.' },
  ];
  for (let i = 0; i < followUpPairs; i++) {
    turns.push({
      role: 'user',
      content: `Question ${i}: walk me through how processTransaction${i} handles a currency mismatch, `
        + 'and whether the retry wrapper preserves idempotency across that boundary.',
    });
    turns.push({
      role: 'assistant',
      content: `For processTransaction${i}: the mismatch surfaces at validate(), which throws before `
        + 'submit() is reached, so the retry wrapper never sees it.',
    });
  }
  return turns;
}

const asBlocks = (content) => (Array.isArray(content) ? content : [{ type: 'text', text: content }]);
const asSystemBlocks = (system) => {
  if (Array.isArray(system)) return system;
  if (typeof system === 'string') return [{ type: 'text', text: system }];
  return [];
};

function measure(followUpPairs) {
  const turns = buildSession(followUpPairs);
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'anthropic' });

  let cachedRead = 0;
  let cachedWrite = 0;
  let fullPrice = 0;
  let previousPrefix = 0;
  let lastCoverage = 0;

  for (let turn = 0; turn < turns.length; turn += 2) {
    const payload = compressor._prepareAnthropicPayload(
      'You are a code reviewer.',
      turns.slice(0, turn + 1).map((m) => ({ ...m })),
    );

    // The cached prefix runs to the last block carrying cache_control.
    let running = 0;
    let prefix = 0;
    for (const block of asSystemBlocks(payload.system)) {
      running += tokens(block.text);
      if (block.cache_control) prefix = running;
    }
    for (const message of payload.messages) {
      for (const block of asBlocks(message.content)) {
        running += tokens(block.text);
        if (block.cache_control) prefix = running;
      }
    }

    // A prefix reads from cache only as far as it matches what was written
    // before; anything beyond that is a fresh write this turn.
    const reused = Math.min(prefix, previousPrefix);
    cachedRead += reused;
    cachedWrite += prefix - reused;
    fullPrice += running - prefix;
    previousPrefix = prefix;
    lastCoverage = running ? prefix / running : 0;
  }

  const cost = cachedRead * CACHE_READ_MULTIPLIER
    + cachedWrite * CACHE_WRITE_MULTIPLIER
    + fullPrice;

  return { turns: turns.length, coverage: lastCoverage, cost, cachedRead, cachedWrite, fullPrice };
}

console.log('Anthropic prompt-cache coverage (write 1.25x, read 0.1x, TTL assumed not to expire)\n');
console.log('  turns   prefix coverage   full-price tokens   effective cost');
for (const pairs of [0, 1, 3, 8, 20]) {
  const r = measure(pairs);
  console.log(
    `  ${String(r.turns).padStart(5)}   ${(r.coverage * 100).toFixed(0).padStart(14)}%   `
    + `${String(r.fullPrice).padStart(17)}   ${String(Math.round(r.cost)).padStart(14)}`,
  );
}
console.log('\nFull-price tokens are the ones falling outside the cached prefix — paid in full on every');
console.log('request. Before v1.33.6 the breakpoint pinned to the largest user block, so this column');
console.log('grew without bound as the conversation moved past it (20,763 tokens over a 42-turn session).');
