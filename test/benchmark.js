/**
 * GlyphCompress benchmark harness.
 *
 * Compares original versus compressed representative payloads and reports
 * deterministic proxy metrics for trust and measurement work.
 */

import { GlyphCompressor } from '../vscode-ext/glyph-middleware.js';

const fixtures = [
  {
    name: 'React TypeScript diagnostic',
    provider: 'raw',
    level: 'standard',
    input: `Fix the TypeScript error in src/components/Dashboard.tsx line 42.
Property 'analytics' does not exist on type 'DashboardProps'.
The component uses React, TypeScript, and fetchAnalytics from ../api/analytics.`,
    expected: ['∉', '₍'],
  },
  {
    name: 'OpenAI chat request',
    provider: 'openai',
    level: 'standard',
    messages: [
      { role: 'system', content: 'You are a senior TypeScript developer.' },
      { role: 'user', content: 'review src/routes/admin.routes.ts for authentication and SQL injection issues' },
    ],
    expected: ['[GLYPH PROTOCOL', '⺎', '₍'],
  },
  {
    name: 'Anthropic cacheable request',
    provider: 'anthropic',
    level: 'standard',
    messages: [
      { role: 'system', content: 'You are an expert code reviewer.' },
      { role: 'user', content: 'explain how the python data pipeline in examples/test-pipeline.py works' },
    ],
    expected: ['[GLYPH PROTOCOL', '⺎', 'ᵖ'],
  },
  {
    name: 'Gemini-compatible proxy payload',
    provider: 'gemini',
    level: 'aggressive',
    messages: [
      { role: 'user', content: 'deploy the node service to kubernetes with terraform and docker' },
    ],
    expected: ['𝒦', '𝒯', '𝒟'],
  },
  {
    name: 'Ultra code summarization',
    provider: 'raw',
    level: 'ultra',
    input: 'Summarize this file:\n```ts\nimport React from "react";\nexport function App() {\n  console.log("debug");\n  return <main>Hello</main>;\n}\n```',
    expected: ['imp:', 'ƒ:'],
  },
];

function estimateTokens(value) {
  return Math.ceil(JSON.stringify(value).length / 4);
}

function containsAll(text, markers) {
  return markers.every((marker) => text.includes(marker));
}

function scoreFixture(text, expected) {
  const expectedScore = expected.length === 0
    ? 1
    : expected.filter((marker) => text.includes(marker)).length / expected.length;
  const hasMissingFileReference = /(?:undefined|null)₍/.test(text);
  const hallucinationPenalty = hasMissingFileReference ? 0.2 : 0;
  return Math.max(0, expectedScore - hallucinationPenalty);
}

function runFixture(fixture) {
  const compressor = new GlyphCompressor({ level: fixture.level });
  let originalTokens;
  let compressedTokens;
  let totalTokens;
  let compressedText;

  if (fixture.messages) {
    const result = compressor.compressMessages(fixture.messages, fixture.provider);
    const originalUserMessages = fixture.messages.filter((message) => message.role === 'user');
    const compressedUserMessages = result.messages.filter((message) => message.role === 'user');
    originalTokens = estimateTokens(originalUserMessages);
    compressedTokens = estimateTokens(compressedUserMessages);
    totalTokens = estimateTokens(result.messages);
    compressedText = JSON.stringify(result.messages);
  } else {
    const result = compressor.compressText(fixture.input);
    originalTokens = result.stats.originalTokens;
    compressedTokens = result.stats.compressedTokens;
    totalTokens = compressedTokens;
    compressedText = result.compressed;
  }

  const saved = originalTokens - compressedTokens;
  const savedPct = originalTokens > 0 ? 1 - compressedTokens / originalTokens : 0;
  const quality = scoreFixture(compressedText, fixture.expected);
  const editSuccessProxy = containsAll(compressedText, fixture.expected) ? 1 : 0;
  const hallucinatedFileRefs = (compressedText.match(/(?:undefined|null)₍/g) || []).length;

  return {
    name: fixture.name,
    provider: fixture.provider,
    level: fixture.level,
    originalTokens,
    compressedTokens,
    totalTokens,
    ratio: originalTokens / Math.max(1, compressedTokens),
    saved,
    savedPct,
    quality,
    editSuccessProxy,
    hallucinatedFileRefs,
  };
}

function formatPct(value) {
  return `${Math.round(value * 100)}%`;
}

const results = fixtures.map(runFixture);
const totals = results.reduce((acc, item) => {
  acc.originalTokens += item.originalTokens;
  acc.compressedTokens += item.compressedTokens;
  acc.quality += item.quality;
  acc.editSuccessProxy += item.editSuccessProxy;
  acc.hallucinatedFileRefs += item.hallucinatedFileRefs;
  return acc;
}, {
  originalTokens: 0,
  compressedTokens: 0,
  quality: 0,
  editSuccessProxy: 0,
  hallucinatedFileRefs: 0,
});

console.log('\nGlyphCompress Benchmark v1.1.0');
console.log('='.repeat(72));
console.log('Scenario | Provider | Level | Payload | Saved | Fidelity | Edit OK | Bad refs');
console.log('-'.repeat(72));

for (const item of results) {
  console.log([
    item.name,
    item.provider,
    item.level,
    `${item.ratio.toFixed(1)}x`,
    formatPct(item.savedPct),
    formatPct(item.quality),
    item.editSuccessProxy ? 'yes' : 'no',
    String(item.hallucinatedFileRefs),
  ].join(' | '));
}

const aggregateRatio = totals.originalTokens / Math.max(1, totals.compressedTokens);
const aggregateSavedPct = 1 - totals.compressedTokens / Math.max(1, totals.originalTokens);
const averageQuality = totals.quality / results.length;
const editSuccessRate = totals.editSuccessProxy / results.length;

console.log('-'.repeat(72));
console.log(`Aggregate ratio: ${aggregateRatio.toFixed(1)}x`);
console.log(`Aggregate saved: ${formatPct(aggregateSavedPct)}`);
console.log(`Context fidelity score: ${formatPct(averageQuality)}`);
console.log(`Edit success proxy: ${formatPct(editSuccessRate)}`);
console.log(`Hallucinated file refs: ${totals.hallucinatedFileRefs}`);

if (aggregateRatio <= 1 || averageQuality < 0.8 || totals.hallucinatedFileRefs > 0) {
  process.exit(1);
}