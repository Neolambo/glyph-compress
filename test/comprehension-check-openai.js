/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — OpenAI Comprehension Spot-Check (dev-only, manual)
 *
 * Sibling to test/comprehension-check-gemini.js — same scenario, same
 * checks, so the two are directly comparable across providers. See that
 * file's header for the full rationale (ROADMAP.md's "Real Task
 * Evaluation" item, one scenario/one provider, not a statistical
 * benchmark). OpenAI already has its own offline, real-tokenizer-measured
 * breakeven table (MEASURED_TECH_GLYPH_TOKENS_OPENAI, via js-tiktoken —
 * see test/tokenizer-calibration.js), so unlike Gemini this script tests
 * comprehension only, not token-cost calibration.
 *
 * This is NOT a statistically meaningful benchmark and is NOT part of
 * `npm test` — it needs a real OPENAI_API_KEY, network access, and costs
 * a small amount of real generation quota.
 *
 * Usage: OPENAI_API_KEY=... node test/comprehension-check-openai.js [model]
 */
import { GlyphCompressor } from '../src/glyph-middleware.js';

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('OPENAI_API_KEY environment variable is required. Usage: OPENAI_API_KEY=... node test/comprehension-check-openai.js [model]');
  process.exit(1);
}
const MODEL = process.argv[2] || 'gpt-4o-mini';
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Same scenario as test/comprehension-check-gemini.js, so the two spot-
// checks are directly comparable across providers.
const code = `
\`\`\`javascript
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total; // BUG: does not apply the discount field
}

class OrderProcessor {
  constructor(taxRate) {
    this.taxRate = taxRate;
  }
  process(order) {
    const subtotal = calculateTotal(order.items);
    return subtotal * (1 + this.taxRate);
  }
}
\`\`\`
`.repeat(2);

const userPrompt = `Fix the bug in calculateTotal in src/billing/OrderProcessor.js — it ignores each item's discount field when summing the total.${code}`;

// Real-world callers (the CLI, standalone SDK usage) get this same shape:
// compressText() alone never includes the codebook/dynamic-dictionary
// legend — getCodebookPrompt() must be prepended, exactly as bin/cli.js
// does. Skipping that step tests something GlyphCompress never actually
// ships, and silently produces model hallucination instead of a real
// "does decoding work" signal (this is exactly what happened on the first,
// unrecorded attempt of the Gemini sibling script).
const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
const result = gc.compressText(userPrompt, 'openai');
const fullPrompt = gc.getCodebookPrompt() + '\n\n' + result.compressed;

const systemPreamble = 'You are a coding assistant. The user message below uses a compact notation defined at its start (a "GLYPH PROTOCOL" codebook) to save tokens. Decode it silently and respond normally, in plain English, as if the user had written it out in full — do not mention the notation itself.';

async function run() {
  console.log(`Compression: ${result.stats.ratio} (${result.stats.savedPct} saved), fallback=${result.stats.fallback}`);
  console.log(`Sending decoded prompt to OpenAI (${MODEL})...\n`);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPreamble },
        { role: 'user', content: fullPrompt },
      ],
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('chat/completions failed:', JSON.stringify(json, null, 2));
    process.exit(1);
  }

  const text = json.choices?.[0]?.message?.content || '';
  console.log('=== OpenAI response ===\n');
  console.log(text);
  console.log('\n=== usage ===', JSON.stringify(json.usage));

  const checks = [
    { label: 'names the correct function (calculateTotal)', pass: /calculateTotal/i.test(text) },
    { label: 'names the correct class (OrderProcessor)', pass: /OrderProcessor/i.test(text) },
    { label: 'identifies the discount bug', pass: /discount/i.test(text) },
    { label: 'does not invent a plausible-but-wrong function name', pass: !/calculateSubtotal/i.test(text) },
  ];

  console.log('\n=== Comprehension checks ===');
  let allPassed = true;
  for (const check of checks) {
    console.log(`  ${check.pass ? '✓' : '✗'} ${check.label}`);
    if (!check.pass) allPassed = false;
  }
  if (!allPassed) process.exitCode = 1;
}

run();
