/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — does a WORD codeword survive at scale?
 *
 * The existing comprehension checks answered this weakly. Their fixture is
 * small enough that the dictionary admits only 2 entries, so a pass says
 * almost nothing about a mechanism whose whole point is admitting 30-50. It
 * also came out *more* expensive there (950 input tokens against 931), because
 * a codebook cannot amortise over that little body text.
 *
 * The real question is whether a model still resolves identifiers correctly
 * when a few dozen ordinary words have been redefined underneath it. `§1` is
 * unmistakably a placeholder; `zebra` is a word the model has strong priors
 * about, and those priors are exactly what might override the codebook.
 *
 * So: a payload large enough to fill the dictionary, and questions whose
 * answers are only correct if the substitutions were decoded. Run both ways
 * and compare — a pass in isolation proves nothing without the §N arm.
 *
 * MEASURED RESULT (2026-07-28), 4 checks per run, ~6 runs per cell:
 *
 *   provider                  §N markers      word codewords
 *   anthropic haiku-4-5       3-4/4 always    3-4/4 always
 *   openai gpt-4o-mini        10/12           4/12
 *   gemini 2.5-flash-lite     3-4/4 always    1-2/4, never higher
 *
 * Only Anthropic sustains codewords. OpenAI and Gemini fail identically and
 * every time: they resolve the reference correctly and then answer in the
 * compressed vocabulary — "lagoon", which IS the right class, instead of
 * RefundEligibilityValidator — ignoring the codebook's `OUT:` instruction to
 * expand before answering.
 *
 * A first reading blamed Gemini's API shape, since v1beta generateContent has
 * no system role and the codebook lands in the user turn. Measuring OpenAI
 * refuted it: OpenAI *has* a system role, receives the codebook there, and
 * fails the same way. The difference is instruction-following, not transport.
 *
 * Moving that instruction to the end of the preamble and making it imperative
 * lifted Gemini from 1/4 to 2/4 across three runs — and dropped Anthropic from
 * 12/12 to 9/12, so it was reverted. There is no single placement that serves
 * both.
 *
 * Conclusion: the strategy is chosen per provider (v1.35.0) — codewords on
 * Anthropic, §N everywhere else. A saving that costs comprehension is not a
 * saving.
 *
 * Not part of `npm test`: needs a real key, network, and generation quota.
 *
 * Usage: <PROVIDER>_API_KEY=... node test/comprehension-check-codewords.js [provider] [model] [--codewords]
 */
import { GlyphCompressor } from '../src/glyph-middleware.js';

// Provider is chosen by whichever key is present, so the same scenario and the
// same checks run everywhere — a codeword that only one model decodes reliably
// is not a result worth shipping.
const PROVIDERS = {
  anthropic: { key: process.env.ANTHROPIC_API_KEY, defaultModel: 'claude-haiku-4-5-20251001' },
  openai: { key: process.env.OPENAI_API_KEY, defaultModel: 'gpt-4o-mini' },
  gemini: { key: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY, defaultModel: 'gemini-2.5-flash-lite' },
};
const PROVIDER = process.argv.slice(2).find((a) => PROVIDERS[a])
  || Object.keys(PROVIDERS).find((name) => PROVIDERS[name].key);
if (!PROVIDER || !PROVIDERS[PROVIDER].key) {
  console.error('Set ANTHROPIC_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY.');
  console.error('Usage: <KEY>=... node test/comprehension-check-codewords.js [provider] [model] [--codewords]');
  process.exit(1);
}
const API_KEY = PROVIDERS[PROVIDER].key;

const FORCE_CODEWORDS = process.argv.includes('--codewords');
const FORCE_GLYPHS = process.argv.includes('--glyphs');
const MODEL = process.argv.slice(2).find((a) => !a.startsWith('--') && !PROVIDERS[a]) || PROVIDERS[PROVIDER].defaultModel;

/**
 * A payload with many distinct, repeated identifiers — the shape that fills a
 * dictionary. Each identifier repeats enough to be worth substituting, and the
 * questions below depend on telling them apart.
 */
const MODULES = [
  'InventoryReconciliationService', 'PaymentSettlementGateway', 'ShipmentTrackingCoordinator',
  'CustomerLoyaltyCalculator', 'WarehouseAllocationPlanner', 'RefundEligibilityValidator',
  'SupplierContractRegistry', 'TaxJurisdictionResolver', 'FraudSignalAggregator',
  'DeliveryWindowEstimator', 'ReturnAuthorizationHandler', 'CurrencyConversionBroker',
];

const source = MODULES.map((name, i) => `
export class ${name} {
  constructor(dependencies) {
    this.dependencies = dependencies;
    this.retryBudget = ${i + 2};
  }

  async execute(request) {
    const validated = await ${name}.validate(request);
    if (!validated) throw new Error('${name} rejected the request');
    return this.dependencies.dispatch(${name}.name, validated);
  }

  static validate(request) {
    return request != null && typeof request === 'object';
  }
}
`).join('\n');

// The answers are only reachable if the codebook was decoded. Deliberately not
// asking about the first or last module, and asking for a number that appears
// only inside one class body.
const QUESTION = [
  'Answer in three short lines, no code:',
  '1. What is the exact class name whose retryBudget is 7?',
  '2. How many classes are defined in total?',
  '3. Name the class that comes immediately after FraudSignalAggregator.',
].join('\n');

// The option is only passed when a flag was actually given. Passing
// `codewordDictionary: false` unconditionally is an EXPLICIT false, which
// overrides the provider profile — so an earlier version of this harness
// reported "§N" for Anthropic while claiming to test the defaults.
const compressor = new GlyphCompressor({
  level: 'standard',
  provider: PROVIDER,
  ...(FORCE_CODEWORDS ? { codewordDictionary: true } : {}),
  ...(FORCE_GLYPHS ? { codewordDictionary: false } : {}),
});

const prompt = `${QUESTION}\n\n\`\`\`js\n${source}\n\`\`\``;
const result = compressor.compressText(prompt, PROVIDER);
const codebook = compressor.getCodebookPrompt();

console.log(`provider    : ${PROVIDER} (${MODEL})`);
console.log(`mode        : ${compressor.codewordDictionary ? 'word codewords (zebra)' : 'glyph markers (§N)'}`
  + `${FORCE_CODEWORDS || FORCE_GLYPHS ? ' [forced]' : ' [provider default]'}`);
console.log(`dictionary  : ${compressor.dynamicDict.size} entries`);
console.log(`compression : ${result.stats.ratio} (${result.stats.savedPct} saved), fallback=${result.stats.fallback}`);
console.log(`sample      : ${[...compressor.dynamicDict.entries()].slice(0, 4).map(([w, g]) => `${g}=${w}`).join(', ')}`);

async function ask() {
  if (PROVIDER === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: codebook,
        messages: [{ role: 'user', content: result.compressed }],
      }),
    });
    const b = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(b, null, 2));
    return { text: b.content.map((c) => c.text || '').join(''), usage: b.usage };
  }

  if (PROVIDER === 'openai') {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        max_completion_tokens: 400,
        messages: [
          { role: 'system', content: codebook },
          { role: 'user', content: result.compressed },
        ],
      }),
    });
    const b = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(b, null, 2));
    return { text: b.choices?.[0]?.message?.content || '', usage: b.usage };
  }

  // Gemini's v1beta generateContent has no separate system role, so the
  // codebook is prepended to the same part — matching what
  // test/comprehension-check-gemini.js already does, so the two stay comparable.
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${codebook}\n\n${result.compressed}` }] }],
    }),
  });
  const b = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(b, null, 2));
  return { text: b.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '', usage: b.usageMetadata };
}

let answer;
try {
  answer = await ask();
} catch (err) {
  console.error('request failed:', err.message);
  process.exit(1);
}

const text = answer.text;
console.log(`\n=== response ===\n${text}`);
console.log(`\n=== usage === ${JSON.stringify(answer.usage)}`);

// Ground truth: retryBudget is i + 2, so 7 is index 5 -> RefundEligibilityValidator.
// FraudSignalAggregator is index 8, so the next is DeliveryWindowEstimator.
const checks = [
  ['resolves the class with retryBudget 7 (RefundEligibilityValidator)', /RefundEligibilityValidator/.test(text)],
  ['counts all 12 classes', /\b12\b/.test(text)],
  ['resolves the class after FraudSignalAggregator (DeliveryWindowEstimator)', /DeliveryWindowEstimator/.test(text)],
  ['does not leak an undecoded codeword into the answer', !/§\d+/.test(text)],
];

console.log('\n=== comprehension checks ===');
let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed++;
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
}
console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exitCode = failed > 0 ? 1 : 0;
