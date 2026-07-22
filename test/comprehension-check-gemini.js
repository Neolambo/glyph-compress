/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Gemini Comprehension Spot-Check (dev-only, manual)
 *
 * ROADMAP.md's "Real Task Evaluation" item calls for repeatable model-based
 * comprehension tests across providers — verifying an LLM actually decodes
 * a compressed prompt correctly, not just that the byte/token math works
 * out. This is a first, deliberately modest step: one realistic bug-fix
 * scenario sent to a real Gemini model, checking that the response names
 * the correct function/class (via the dynamic dictionary's §N glyphs) and
 * correctly describes the bug, rather than hallucinating plausible-looking
 * names it invented on its own.
 *
 * This is NOT a statistically meaningful benchmark (one scenario, one
 * provider, one model) and is NOT part of `npm test` — it needs a real
 * GEMINI_API_KEY, network access, and costs a small amount of real
 * generation quota. Multi-provider coverage (OpenAI, Anthropic) and
 * broader task coverage remain open under v1.22.0.
 *
 * Usage: GEMINI_API_KEY=... node test/comprehension-check-gemini.js [model]
 */
import { GlyphCompressor } from '../src/glyph-middleware.js';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('GEMINI_API_KEY environment variable is required. Usage: GEMINI_API_KEY=... node test/comprehension-check-gemini.js [model]');
  process.exit(1);
}
const MODEL = process.argv[2] || 'gemini-2.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

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
// does. Skipping that step here would test something GlyphCompress never
// actually ships, and silently produces model hallucination instead of a
// real "does decoding work" signal.
const gc = new GlyphCompressor({ level: 'standard', provider: 'gemini' });
const result = gc.compressText(userPrompt, 'gemini');
const fullPrompt = gc.getCodebookPrompt() + '\n\n' + result.compressed;

const systemPreamble = 'You are a coding assistant. The user message below uses a compact notation defined at its start (a "GLYPH PROTOCOL" codebook) to save tokens. Decode it silently and respond normally, in plain English, as if the user had written it out in full — do not mention the notation itself.';

async function run() {
  console.log(`Compression: ${result.stats.ratio} (${result.stats.savedPct} saved), fallback=${result.stats.fallback}`);
  console.log(`Sending decoded prompt to Gemini (${MODEL})...\n`);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `${systemPreamble}\n\n${fullPrompt}` }] }] }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('generateContent failed:', JSON.stringify(json, null, 2));
    process.exit(1);
  }

  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  console.log('=== Gemini response ===\n');
  console.log(text);
  console.log('\n=== usageMetadata ===', JSON.stringify(json.usageMetadata));

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
