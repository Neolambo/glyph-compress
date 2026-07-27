/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 * 
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 * 
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Demo & Benchmark
 * 
 * Simulates realistic IDE→LLM communication scenarios,
 * compresses them, and measures savings.
 */

import { Compressor, Codebook } from '../src/compressor.js';
import { generateSystemPrompt, estimateOverhead } from '../src/system-prompt-generator.js';
import { getAlphabetStats } from '../src/radical-alphabet.js';

// ═══════════════════════════════════════════════════════════
// TEST SCENARIOS — Realistic IDE contexts
// ═══════════════════════════════════════════════════════════

import { SCENARIOS } from './demo-scenarios.js';

// ═══════════════════════════════════════════════════════════
// RUN DEMO
// ═══════════════════════════════════════════════════════════

console.log('='.repeat(70));
console.log('GlyphCompress — Demo & Benchmark');
console.log('='.repeat(70));
console.log();

// Show alphabet stats
const stats = getAlphabetStats();
console.log('Alphabet:');
console.log(`  Radicals:    ${stats.radicals}`);
console.log(`  Domains:     ${stats.domains}`);
console.log(`  Actions:     ${stats.actions}`);
console.log(`  Techs:       ${stats.techs}`);
console.log(`  Structures:  ${stats.structures}`);
console.log(`  Error codes: ${stats.errorCodes}`);
console.log(`  Total:       ${stats.totalSymbols} unique symbols`);
console.log();

// Show system prompt overhead
const overhead = estimateOverhead();
console.log('System Prompt Overhead (paid once):');
console.log(`  ${overhead.chars} chars ≈ ${overhead.estimatedTokens} tokens`);
console.log();

// Process each scenario
const codebook = new Codebook();
const compressor = new Compressor(codebook);

let totalOriginal = 0;
let totalCompressed = 0;

console.log('='.repeat(70));
console.log('SCENARIO RESULTS');
console.log('='.repeat(70));

for (const scenario of SCENARIOS) {
  const original = JSON.stringify(scenario.context);
  const result = compressor.compress(scenario.context);

  totalOriginal += original.length;
  totalCompressed += result.compressed.length;

  const ratio = (original.length / Math.max(1, result.compressed.length)).toFixed(1);
  const saved = ((1 - result.compressed.length / original.length) * 100).toFixed(0);

  console.log(`\n─── ${scenario.name} ───`);
  console.log(`  Original:   ${original.length} chars`);
  console.log(`  Compressed: ${result.compressed.length} chars`);
  console.log(`  Ratio:      ${ratio}x (${saved}% saved)`);
  console.log();
  console.log('  ORIGINAL PROMPT:');
  console.log(`    "${scenario.context.prompt}"`);
  console.log('  COMPRESSED OUTPUT:');
  result.compressed.split('\n').forEach(line => {
    if (line.trim()) console.log(`    ${line}`);
  });
}

// Show system prompt
console.log();
console.log('='.repeat(70));
console.log('GENERATED SYSTEM PROMPT (sent once to LLM)');
console.log('='.repeat(70));
const sysPrompt = generateSystemPrompt(codebook);
console.log(sysPrompt);

// Final stats
console.log();
console.log('='.repeat(70));
console.log('AGGREGATE RESULTS');
console.log('='.repeat(70));
const finalRatio = (totalOriginal / totalCompressed).toFixed(1);
const finalSaved = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);

console.log(`  Total original:     ${totalOriginal.toLocaleString()} chars`);
console.log(`  Total compressed:   ${totalCompressed.toLocaleString()} chars`);
console.log(`  Overall ratio:      ${finalRatio}x`);
console.log(`  Chars saved:        ${(totalOriginal - totalCompressed).toLocaleString()} (${finalSaved}%)`);
console.log(`  System prompt cost: ${overhead.chars} chars (amortized over all messages)`);
console.log(`  File index entries: ${codebook.fileIndex.size}`);
console.log(`  Replacements made:  ${codebook.stats.replacements}`);
console.log();

// Token cost estimate
const tokensOriginal = Math.ceil(totalOriginal / 4);
const tokensCompressed = Math.ceil(totalCompressed / 4) + overhead.estimatedTokens;
const tokenSaved = tokensOriginal - tokensCompressed;
const costPerToken = 3 / 1000000; // ~$3/M tokens (Claude Sonnet)

console.log('  TOKEN COST ESTIMATE (Claude Sonnet @ $3/M tokens):');
console.log(`    Original:   ${tokensOriginal.toLocaleString()} tokens → $${(tokensOriginal * costPerToken).toFixed(4)}`);
console.log(`    Compressed: ${tokensCompressed.toLocaleString()} tokens → $${(tokensCompressed * costPerToken).toFixed(4)}`);
console.log(`    Saved:      ${tokenSaved.toLocaleString()} tokens → $${(tokenSaved * costPerToken).toFixed(4)} per batch`);
console.log(`    At 50 req/day: $${(tokenSaved * costPerToken * 50 * 30).toFixed(2)}/month saved`);
