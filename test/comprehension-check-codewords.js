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
 * Not part of `npm test`: needs a real key, network, and generation quota.
 *
 * Usage: ANTHROPIC_API_KEY=... node test/comprehension-check-codewords.js [model] [--codewords]
 */
import { GlyphCompressor } from '../src/glyph-middleware.js';

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY environment variable is required.');
  process.exit(1);
}

const USE_CODEWORDS = process.argv.includes('--codewords');
const MODEL = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'claude-haiku-4-5-20251001';

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

const compressor = new GlyphCompressor({
  level: 'standard',
  provider: 'anthropic',
  codewordDictionary: USE_CODEWORDS,
});

const prompt = `${QUESTION}\n\n\`\`\`js\n${source}\n\`\`\``;
const result = compressor.compressText(prompt, 'anthropic');
const codebook = compressor.getCodebookPrompt();

console.log(`mode        : ${USE_CODEWORDS ? 'word codewords (zebra)' : 'glyph markers (§N)'}`);
console.log(`dictionary  : ${compressor.dynamicDict.size} entries`);
console.log(`compression : ${result.stats.ratio} (${result.stats.savedPct} saved), fallback=${result.stats.fallback}`);
console.log(`sample      : ${[...compressor.dynamicDict.entries()].slice(0, 4).map(([w, g]) => `${g}=${w}`).join(', ')}`);

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 400,
    system: codebook,
    messages: [{ role: 'user', content: result.compressed }],
  }),
});

const body = await response.json();
if (!response.ok) {
  console.error('request failed:', JSON.stringify(body, null, 2));
  process.exit(1);
}

const text = body.content.map((block) => block.text || '').join('');
console.log(`\n=== response ===\n${text}`);
console.log(`\n=== usage === ${JSON.stringify(body.usage)}`);

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
