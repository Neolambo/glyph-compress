/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 * 
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 * 
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Integration Test
 * 
 * Tests the middleware with OpenAI and Claude message formats,
 * verifies compression ratios, and validates the codebook injection.
 */

import assert from 'assert';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { GlyphCompressor, wrapOpenAI } from '../src/glyph-middleware.js';
import { PROVIDER_COMPRESSION_PROFILES, TRUST_POLICY_PROFILES } from '../src/index.js';
import { buildWorkspaceCodebook, detectIntent, runDoctor, saveWorkspaceCodebook, selectRelevantFiles } from '../src/workspace-intelligence.js';
const require = createRequire(import.meta.url);
const currentVersion = require('../package.json').version;
let passed = 0;
let failed = 0;

// Async tests rejected *after* fn() returned, so the try/catch never saw the
// failure and the suite printed a green tick. Worse here than elsewhere: this
// file ends in process.exit(), which tears down the process before a pending
// rejection can even surface as an unhandled one. Their results are collected
// here and awaited before the summary instead.
const pending = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      pending.push(result.then(
        () => { console.log(`  ✓ ${name}`); passed++; },
        (e) => { console.log(`  ✗ ${name}: ${e.message}`); failed++; },
      ));
      return;
    }
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

// using standard assert

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: GlyphCompressor Core ═══\n');
// ═══════════════════════════════════════════════════════════


// Encoding vs economics are two different contracts, and since v1.33.8 they
// have two different tests.
//
// `compressText()` only ships glyphs when they cost fewer REAL tokens than the
// text they replace. On a one-line prompt they never do — "fix the error in
// app.tsx" is 7 tokens, "⺌✗ ◈₍1₎" is 12 — so the gate correctly returns the
// input untouched. That is a size effect, not a verdict on the encoding:
// measured with `npm run measure:showcase`, the same encoder saves 78% of real
// tokens across the five showcase scenarios.
//
// Tests below that assert *what the encoder produces* therefore call it
// directly, through encodeOnly(). Tests that assert a *saving* keep going
// through compressText() with a payload large enough for the saving to be real.
// Mirrors compressText()'s pipeline minus the economics gate: the dictionary
// has to be built first, exactly as compressText() does, or dynamic §N entries
// never exist and a test asserting them fails for the wrong reason.
const encodeOnly = (compressor, text) => {
  const safeText = compressor._applyPrivacyFirewall(text, false);
  compressor._buildDynamicDictionary(safeText);
  return compressor._compressUserMessage(text, safeText);
};

const gc = new GlyphCompressor({ level: 'standard' });

test('Compress prompt: fix error', () => {
  const r = { compressed: encodeOnly(gc, 'fix the error in app.tsx') };
  assert(r.compressed.includes('⺌✗'), `Expected ⺌✗, got: ${r.compressed}`);
});

test('Compress prompt: create component', () => {
  const r = { compressed: encodeOnly(gc, 'create a login component') };
  assert(r.compressed.includes('▲⊞'), `Expected ▲⊞, got: ${r.compressed}`);
});

test('Compress prompt: deploy', () => {
  const r = { compressed: encodeOnly(gc, 'deploy the app to kubernetes') };
  assert(r.compressed.includes('⺏'), `Expected ⺏, got: ${r.compressed}`);
  assert(r.compressed.includes('𝒦'), `Expected 𝒦, got: ${r.compressed}`);
});

test('Compress tech names', () => {
  const r = { compressed: encodeOnly(gc, 'build a react app with typescript and postgres') };
  assert(r.compressed.includes('ℜ'), `Expected ℜ for react`);
  assert(r.compressed.includes('ᵗ'), `Expected ᵗ for typescript`);
  assert(r.compressed.includes('ℙ'), `Expected ℙ for postgres`);
});

test('Compress error messages', () => {
  const r = { compressed: encodeOnly(gc, "Property 'name' does not exist on type 'User'") };
  assert(r.compressed.includes("'name'∉User"), `Expected compressed error, got: ${r.compressed}`);
});

test('Compress file paths', () => {
  const r = { compressed: encodeOnly(gc, 'The file src/components/Header.tsx has an issue') };
  assert(r.compressed.includes('₍'), `Expected file index ref, got: ${r.compressed}`);
});

test('Stats tracking', () => {
  // A one-line prompt is the case where compression correctly declines, so
  // asserting a saving on one asserts something untrue since v1.33.8. Stats
  // are exercised on a payload where compression genuinely pays, at the level
  // that pays: measured on this repository's own source, 'standard' does not
  // clear the 10% margin and 'aggressive' saves ~900 real tokens.
  const source = fs.readFileSync(new URL('../src/compressor.js', import.meta.url), 'utf8').slice(0, 8000);
  const statsGC = new GlyphCompressor({ level: 'aggressive' });
  const r = statsGC.compressText(`optimize the performance of this module:\n\`\`\`js\n${source}\n\`\`\``);
  assert(parseInt(r.stats.originalTokens) > parseInt(r.stats.compressedTokens),
    'Compressed should be smaller');
  assert(r.stats.ratio.includes('x'), 'Should report a ratio');
});

test('Privacy firewall: redacts secrets before compression', () => {
  const gc = new GlyphCompressor({ level: 'standard', privacyFirewall: true });
  const r = gc.compressText('Use API_KEY=sk-prodSECRETSECRETSECRETSECRETSECRET and contact admin@example.com from 192.168.10.22');
  assert(!r.compressed.includes('sk-prodSECRET'), 'Should not expose raw API key');
  assert(!r.compressed.includes('admin@example.com'), 'Should not expose raw email');
  assert(!r.compressed.includes('192.168.10.22'), 'Should not expose raw IP address');
  assert(r.compressed.includes('⟦SECRET_ASSIGNMENT_'), 'Should include redaction placeholder');
  assert(r.sourceMap.privacy.length >= 3, 'Should record privacy redactions');
  assert(r.sourceMap.privacy.every(entry => !entry.hash.includes('SECRET')), 'Privacy metadata should not include raw secret values');
  assert(r.sourceMap.replacements.some(entry => entry.kind === 'privacy' && entry.redacted), 'Should record safe privacy replacement entries');
  assert(r.sourceMap.trustPolicy === 'privacy', 'Privacy firewall should select privacy trust policy');
});

test('Trust policies: lossless preserves user text exactly', () => {
  const gc = new GlyphCompressor({ level: 'ultra', trustPolicy: 'lossless' });
  const input = "fix src/app.tsx. Property 'name' does not exist on type 'User'.\n```ts\nimport React from 'react';\nfunction App() { return null; }\n```";
  const r = gc.compressText(input);
  assert(r.compressed === input, 'Lossless trust policy should not transform text');
  assert(r.sourceMap.trustPolicy === 'lossless', 'Should record lossless policy');
  assert(r.sourceMap.replacements.length === 0, 'Lossless policy should not record replacements');
});

test('Trust policies: reversible blocks lossy code minification', () => {
  const gc = new GlyphCompressor({ level: 'aggressive', trustPolicy: 'reversible' });
  const input = 'Fix this code:\n```ts\nimport React from "react";\nexport function App() {\n  return <div>Hello</div>;\n}\n```';
  const r = gc.compressText(input);
  assert(r.sourceMap.trustPolicy === 'reversible', 'Should record reversible policy');
  assert(!r.compressed.includes('imp ℜ'), 'Reversible policy should not minify code blocks');
  assert(!r.sourceMap.codeBlocks.some(block => block.mode === 'minified'), 'Reversible policy should not emit minified code block maps');
});

test('Trust policies: lossy allows ultra summaries', () => {
  const gc = new GlyphCompressor({ level: 'ultra', trustPolicy: 'lossy' });
  const r = gc.compressText('```ts\nimport React from "react";\nfunction App() { return null; }\n```');
  assert(r.sourceMap.trustPolicy === 'lossy', 'Should record lossy policy');
  assert(r.sourceMap.trust.lossy === true, 'Should expose lossy trust metadata');
  assert(r.sourceMap.codeBlocks.some(block => block.mode === 'summary'), 'Lossy policy should allow ultra code summaries');
});

test('Trust policies: public profile table is exported', () => {
  assert(TRUST_POLICY_PROFILES.lossless.allows.dynamic === false, 'Lossless profile should block dynamic dictionary');
  assert(TRUST_POLICY_PROFILES.lossy.allows.codeSummary === true, 'Lossy profile should allow code summaries');
});

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: OpenAI Message Format ═══\n');
// ═══════════════════════════════════════════════════════════

const gcOpenAI = new GlyphCompressor({ level: 'standard' });

test('OpenAI: fallback preserves existing system prompt when compression is net-negative', () => {
  const messages = [
    { role: 'system', content: 'You are a coding assistant.' },
    { role: 'user', content: 'fix the bug in UserProfile.tsx' },
  ];
  const { messages: compressed, stats } = gcOpenAI.compressMessages(messages, 'openai');
  assert(compressed[0].role === 'system', 'First should be system');
  assert(compressed[0].content === 'You are a coding assistant.', 'Should preserve original system prompt');
  assert(compressed[1].content === 'fix the bug in UserProfile.tsx', 'Should preserve original user prompt');
  assert(stats.thisMessage.fallback === true, 'Should record adaptive fallback');
});

test('OpenAI: short messages compress without codebook when codebook overhead exceeds text savings', () => {
  const messages = [
    { role: 'user', content: 'explain how react hooks work' },
  ];
  const { messages: compressed, stats } = gcOpenAI.compressMessages(messages, 'openai');
  assert(compressed.length === 1, 'Should keep original message count');
  assert(compressed[0].role === 'user', 'Should keep original first message');
  assert(!compressed[0].content.includes('[GLYPH PROTOCOL'), 'Should skip codebook for short messages');
  assert(stats.thisMessage.compressedTokens <= stats.thisMessage.originalTokens, 'Should not increase token count');
});

test('OpenAI: track stats per message', () => {
  const messages = [
    {
      role: 'user',
      // Real source, not repeated marketing prose. Measured: that prose falls
      // back at every level once compression is priced in real tokens, because
      // long English phrases are already close to optimal for BPE. Source code
      // is what compresses — comments, indentation and structure.
      content: 'create a dashboard component and explain the architecture:\n```js\n'
        + fs.readFileSync(new URL('../src/compressor.js', import.meta.url), 'utf8').slice(0, 8000)
        + '\n```',
    },
  ];
  // 'aggressive': measured, 'standard' does not clear the 10% margin on real
  // source and correctly falls back, so asserting compression at 'standard'
  // asserts something untrue since v1.33.8.
  const statsClient = new GlyphCompressor({ level: 'aggressive', provider: 'openai' });
  const { messages: compressed, stats } = statsClient.compressMessages(messages, 'openai');
  // The user message should be shorter after compression
  const userMsg = compressed.find(m => m.role === 'user');
  assert(userMsg.content.length < messages[0].content.length,
    'User message should be compressed');
  assert(stats.thisMessage.fallback === false, 'Should keep compressed payload when net-positive');
  assert(stats.thisMessage.ratio.includes('x'), 'Should have ratio');
  assert(stats.thisMessage.provider === 'openai', 'Should record provider-aware stats');
  assert(stats.thisMessage.profile === 'chat-compact', 'Should use OpenAI provider profile');
});

test('OpenAI: may compress assistant history when it reduces transcript cost', () => {
  // The assistant turn carries code too. Repeated English prose was measured
  // to fall back at every level once compression is priced in real tokens, so
  // a transcript made of it could never demonstrate history compression.
  const assistantHistory = 'Here is the relevant section:\n```js\n'
    + fs.readFileSync(new URL('../src/token-estimator.js', import.meta.url), 'utf8')
    + '\n```';
  const messages = [
    { role: 'system', content: 'You are a staff engineer reviewing a production repository.' },
    {
      role: 'user',
      // Real source rather than repeated prose: measured, English phrases are
      // already near-optimal for BPE and fall back at every level, so a
      // transcript built from them tests nothing about compression.
      content: 'Review this implementation before merge:\n```js\n'
        + fs.readFileSync(new URL('../src/compressor.js', import.meta.url), 'utf8').slice(0, 8000)
        + '\n```',
    },
    { role: 'assistant', content: assistantHistory },
    { role: 'user', content: 'Draft the final merge summary with risks and mitigation.' },
  ];
  const historyGC = new GlyphCompressor({ level: 'aggressive', provider: 'openai' });
  const { messages: compressed, stats } = historyGC.compressMessages(messages, 'openai');
  const assistantMessage = compressed.find((message) => message.role === 'assistant');
  assert(assistantMessage, 'Should keep assistant history in transcript');
  assert(assistantMessage.content.length < assistantHistory.length, 'Should compress assistant history when beneficial');
  assert(stats.thisMessage.fallback === false, 'Should keep compressed payload when assistant history compression is net-positive');
});

test('Provider profiles: tune dynamic dictionary thresholds by provider', () => {
  // 35 characters and 12 repetitions: long enough to qualify under BOTH
  // admission pricings. With js-tiktoken the real count decides; without it a
  // conservative chars/8 rule does, and the shorter identifiers used before
  // cleared only the first — so this passed in development and failed in the
  // shipped configuration, which the no-optional CI job now catches.
  const text = 'Fix ' + 'ProviderProfileAlphaLongIdentifier '.repeat(12) + 'now.';
  const mapOf = (provider) => {
    const c = new GlyphCompressor({ level: 'standard', provider });
    encodeOnly(c, text);
    return { sourceMap: c.getSourceMap() };
  };
  const raw = mapOf('raw');
  const anthropic = mapOf('anthropic');
  const local = mapOf('local');
  assert(raw.sourceMap.version === currentVersion, 'Should include the current source map version');
  assert(anthropic.sourceMap.provider === 'anthropic', 'Should store normalized provider in source map');
  assert(anthropic.sourceMap.profile.strategy === 'cache-stable', 'Should store provider profile metadata');
  assert(local.sourceMap.profile.strategy === 'aggressive-local', 'Should support local profile metadata');
  assert(raw.sourceMap.dynamic.length >= anthropic.sourceMap.dynamic.length, 'Anthropic profile should be at least as conservative as raw');
  assert(local.sourceMap.dynamic.some(entry => entry.provider === 'local' && entry.profile === 'aggressive-local'), 'Local dynamic entries should record provider profile');
});

test('Provider profiles: public profile table is exported', () => {
  assert(PROVIDER_COMPRESSION_PROFILES.openai.strategy === 'chat-compact', 'Should export OpenAI compression profile');
  assert(PROVIDER_COMPRESSION_PROFILES.anthropic.dynamicMinSavedChars > PROVIDER_COMPRESSION_PROFILES.openai.dynamicMinSavedChars, 'Anthropic should keep a more conservative dynamic threshold');
});

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: Claude/Anthropic Message Format ═══\n');
// ═══════════════════════════════════════════════════════════

const gcClaude = new GlyphCompressor({ level: 'standard' });

test('Claude: short Anthropic messages compress without codebook overhead', () => {
  const messages = [
    { role: 'system', content: 'You are an expert developer.' },
    { role: 'user', content: 'debug the python pipeline' },
  ];
  const { messages: compressed, stats } = gcClaude.compressMessages(messages, 'anthropic');
  const sysMsg = compressed.find(m => m.role === 'system');
  assert(sysMsg, 'Should have system message');
  assert(sysMsg.content === 'You are an expert developer.', 'Should preserve original system prompt');
  assert(!compressed.some(m => m.content.includes('[GLYPH PROTOCOL')), 'Should skip codebook for short Anthropic messages');
  assert(stats.thisMessage.compressedTokens <= stats.thisMessage.originalTokens, 'Should not increase token count');
});

test('Claude: preserve user messages when compression is net-negative', () => {
  const messages = [
    { role: 'user', content: 'review the security of the authentication module in auth.service.ts' },
  ];
  const { messages: compressed, stats } = gcClaude.compressMessages(messages, 'anthropic');
  const userMsg = compressed.find(m => m.role === 'user');
  assert(userMsg.content === messages[0].content, 'Should preserve original user prompt');
  assert(stats.thisMessage.fallback === true, 'Should record fallback when Anthropic payload is net-negative');
});

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: v2 Advanced Features ═══\n');
// ═══════════════════════════════════════════════════════════

test('Dynamic Dictionary replaces repeated words', () => {
  const gc = new GlyphCompressor({ level: 'standard' });
  // Priced in real tokens since v1.33.8: AuthenticationManager is 2 tokens and
  // a §N glyph is 2, so it was always a losing swap.
  const r = { compressed: encodeOnly(gc, 'The ' + 'SuperUniqueIdentifierNameForTesting '.repeat(12) + 'logic.') };
  // Dynamic entries are §N references (e.g. §1), not single Greek/Cyrillic
  // letters — that pool collided with the reserved TECH_GLYPHS symbols for
  // "Agent" (α) and "prompt" (π) and exhausted after 54 entries.
  assert(/§\d+/.test(r.compressed), 'Should replace SuperUniqueIdentifierNameForTesting with a §N dynamic-dictionary reference');
  assert(!r.compressed.includes('SuperUniqueIdentifierNameForTesting'), 'SuperUniqueIdentifierNameForTesting should be gone');
});

test('Dynamic Dictionary glyphs never collide with reserved TECH_GLYPHS symbols', () => {
  const gc = new GlyphCompressor({ level: 'standard' });
  // Encoded below the economics gate, and with an identifier long enough to be
  // admitted under both pricings — the real-token one when js-tiktoken is
  // installed, and the conservative chars/8 one when it is not. The assertion
  // is about glyph *collision*, so it needs a dynamic entry to exist at all.
  const compressed = encodeOnly(gc, 'Agent Agent Agent orchestrates the Agent workflow while ' + 'SuperUniqueIdentifierNameForTesting '.repeat(12) + 'runs.');
  const r = { compressed, sourceMap: gc.getSourceMap() };
  // "Agent" itself is both a TECH_GLYPHS entry (agent -> 'α') and, before
  // the §N redesign, would have been the *exact* symbol the dynamic
  // dictionary assigned first — producing an unresolvable ambiguity where
  // 'α' meant two different things in the same payload.
  assert(r.compressed.includes('α'), 'Tech glyph for "Agent" should still be applied');
  const dynGlyphs = r.sourceMap.dynamic.map(e => e.glyph);
  assert(!dynGlyphs.includes('α'), 'Dynamic dictionary must never reuse the reserved Agent glyph α');
  assert(dynGlyphs.every(g => /^§\d+$/.test(g)), 'All dynamic glyphs should be §N references');
});

test('Ultra level strips comments and console.logs', () => {
  const gcUltra = new GlyphCompressor({ level: 'ultra' });
  const code = 'function test() { console.log("debug"); // comment here\n /* block */ return true; }';
  const r = gcUltra.compressText(code);
  assert(!r.compressed.includes('console.log'), 'Logs should be stripped');
  assert(!r.compressed.includes('comment here'), 'Inline comments should be stripped');
  assert(!r.compressed.includes('block'), 'Block comments should be stripped');
});

test('Anthropic wrap adds cache_control to system', async () => {
  // Mock Anthropic client
  let capturedParams = null;
  const mockClient = {
    messages: {
      create: async (params) => { capturedParams = params; return { id: 'msg_1' }; }
    }
  };
  
  // Need to import wrapAnthropic from the same module
  const { wrapAnthropic } = await import('../src/glyph-middleware.js');
  const wrapped = wrapAnthropic(mockClient);
  await wrapped.messages.create({
    model: 'claude',
    system: 'Hello',
    messages: [{ role: 'user', content: 'test' }]
  });
  
  assert(typeof capturedParams.system === 'string', 'First-turn Anthropic system should stay a string');
  assert(capturedParams.system === 'Hello', 'Should preserve original system text when no structured cache blocks are needed');
});

test('Anthropic wrap keeps stable protocol block separate from dynamic additions', async () => {
  let capturedParams = null;
  const mockClient = {
    messages: {
      create: async (params) => { capturedParams = params; return { id: 'msg_2' }; }
    }
  };

  const { wrapAnthropic } = await import('../src/glyph-middleware.js');
  const wrapped = wrapAnthropic(mockClient, { level: 'aggressive' });
  await wrapped.messages.create({
    model: 'claude',
    system: 'You are a release reviewer.',
    messages: [
      {
        role: 'user',
        // Real source: the structured system path (protocol block plus
        // separate DYN block) only runs when compression is actually applied,
        // and repeated prose falls back at every level once compression is
        // priced in real tokens.
        content: 'Review this before release:\n```js\n'
          + fs.readFileSync(new URL('../src/compressor.js', import.meta.url), 'utf8').slice(0, 8000)
          + '\n```',
      },
      {
        role: 'assistant',
        content: 'Previous review summary: benchmark and provider stability need a final pass before release.',
      },
      {
        role: 'user',
        content: 'Continue the review and produce the final release recommendation.',
      },
    ],
  });

  assert(Array.isArray(capturedParams.system), 'Structured Anthropic system should be an array');
  assert(capturedParams.system[0].text.includes('[GLYPH PROTOCOL'), 'First system block should contain the stable protocol');
  assert(!capturedParams.system[0].text.includes('DYN:'), 'Stable protocol block should not include request-specific dynamic entries');
  assert(capturedParams.system[0].cache_control?.type === 'ephemeral', 'Stable protocol block should be cacheable');
  assert(capturedParams.system.some((block) => block.text === 'You are a release reviewer.'), 'Original system prompt should remain separate');
  assert(capturedParams.messages.some((message) => Array.isArray(message.content)), 'Largest user message should be converted to Anthropic text blocks');
});

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: Compression Levels ═══\n');
// ═══════════════════════════════════════════════════════════

const complexMessage = `I have a TypeScript error in my React component at src/components/Dashboard.tsx line 42. 
The error says: Property 'analytics' does not exist on type 'DashboardProps'. 
Also there's a warning about unused imports on line 3.
Here's the code:
\`\`\`typescript
import React, { useState, useEffect, useCallback } from 'react';
import { DashboardProps } from '../types';
import { fetchAnalytics } from '../api/analytics';
import { unusedHelper } from '../utils';

export const Dashboard: React.FC<DashboardProps> = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics(userId).then(setData).finally(() => setLoading(false));
  }, [userId]);

  return <div>{loading ? 'Loading...' : JSON.stringify(data)}</div>;
};
\`\`\`
Can you fix this?`;

test('Light: only compress prompts and tech names', () => {
  const gc = new GlyphCompressor({ level: 'light' });
  const r = { compressed: encodeOnly(gc, complexMessage) };
  assert(r.compressed.includes('ℜ') || r.compressed.includes('ᵗ'), 'Should compress tech names');
  // The savedPct assertion that used to sit here measured the economics gate,
  // not the level — and encodeOnly deliberately runs below that gate. What the
  // test name claims is the *restraint* of 'light', which had no coverage at
  // all. The old comment said light leaves file paths alone; measured, it does
  // fold them into ◈₍N₎ references. What it actually preserves is fenced code,
  // which is the distinction that separates it from 'aggressive'.
  assert(
    /```[\s\S]*const analytics|```[\s\S]*\w/.test(r.compressed),
    'light must leave fenced code blocks intact rather than minifying them',
  );
  assert(!r.compressed.includes('imp ℜ'), 'light must not apply aggressive-level import minification');
  assert(r.compressed.length < complexMessage.length, 'light should still shorten the prompt text itself');
});

test('Standard: compress prompts + files + errors', () => {
  const gc = new GlyphCompressor({ level: 'standard' });
  const r = gc.compressText(complexMessage);
  assert(r.compressed.includes("∉"), 'Should compress error (contains ∉ symbol)');
  // Threshold lowered from 10% to 5%: the dynamic dictionary used to count
  // single-occurrence words as "savings" even though a definition seen
  // only once can never amortize the cost of transmitting its own DYN
  // entry. Requiring freq >= 2 (see _buildDynamicDictionary) removed that
  // inflated, uneconomical contribution — the number is now honest rather
  // than inflated, and still clearly net-positive.
  assert(parseInt(r.stats.savedPct) > 5, 'Should save >5%');
});

test('Aggressive: compress code blocks too', () => {
  const gcAggressive = new GlyphCompressor({ level: 'aggressive' });
  // Use a string with raw backticks (not escaped) to simulate actual markdown
  const codeMsg = 'Fix this code:\n' + '```' + 'typescript\nimport React from "react";\n\nexport const App = () => <div>Hello</div>;\n' + '```';
  const r = { compressed: encodeOnly(gcAggressive, codeMsg) };
  assert(r.compressed.includes('```'), `Should preserve code block, got: ${r.compressed}`);
  assert(r.compressed.includes('imp ℜ'), 'Should minify import');
  assert(r.compressed.includes('exp ◇ App'), 'Should minify export const');
});

test('Ultra: compress Python code', () => {
  const gc = new GlyphCompressor({ level: 'ultra' });
  const code = '```py\nimport os\nfrom utils import get_data\n\nclass DataModel:\n    def do_work(self):\n        return True\n\ndef helper():\n    pass\n```';
  const r = gc.compressText(code);
  assert(r.compressed.includes('imp:2'), `Should find 2 imports, got: ${r.compressed}`);
  assert(r.compressed.includes('ƒ:2'), `Should find 2 functions, got: ${r.compressed}`);
  assert(r.compressed.includes('𝒞:1'), `Should find 1 class, got: ${r.compressed}`);
});

test('Ultra: compress Rust code', () => {
  const gc = new GlyphCompressor({ level: 'ultra' });
  const code = '```rust\nuse std::fs;\nuse reqwest::Client;\n\npub struct Server {\n    port: u16,\n}\n\nimpl Server {\n    pub async fn start(&self) {}\n}\n\nfn main() {}\n```';
  const r = gc.compressText(code);
  assert(r.compressed.includes('imp:2'), `Should find 2 imports, got: ${r.compressed}`);
  assert(r.compressed.includes('ƒ:2'), `Should find 2 functions, got: ${r.compressed}`);
  assert(r.compressed.includes('𝒞:1'), `Should find 1 struct, got: ${r.compressed}`);
});

test('Ultra: compress Go code', () => {
  const gc = new GlyphCompressor({ level: 'ultra' });
  const code = '```go\nimport (\n\t"fmt"\n\t"net/http"\n)\n\ntype Server struct {}\n\nfunc startServer() {}\n\nfunc (s *Server) stop() {}\n```';
  const r = gc.compressText(code);
  // Note: Go imports in block are not caught by line-by-line yet if not on same line, but 'type X struct' and 'func' should work.
  // Wait, the regex checks for `type X struct` on a single line. Let's just check functions and struct.
  assert(r.compressed.includes('ƒ:2'), `Should find 2 functions, got: ${r.compressed}`);
  assert(r.compressed.includes('𝒞:1'), `Should find 1 struct, got: ${r.compressed}`);
});

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: Large Batch (Simulated Session) ═══\n');
// ═══════════════════════════════════════════════════════════

// 'openai' (not the default 'raw') exercises the same net-negative
// fallback that compressText() now shares with compressMessages(): every
// individual message compresses to at most its original token count, so
// the aggregate ratio is guaranteed >= 1x by construction, not by chance.
// 'raw' intentionally has no such safety net (it exists to report
// unguarded character-level deltas) and can legitimately dip under 1x on
// short, low-repetition, single-topic messages like these — see
// docs/architecture.md and the README's realistic-benchmark notes.
const sessionGC = new GlyphCompressor({ level: 'standard', provider: 'openai' });
const sessionMessages = [
  'fix the error in src/components/Navbar.tsx',
  'create a new API endpoint for user registration with express and typescript',
  "Property 'email' does not exist on type 'RegisterInput'. Check src/validators/auth.validator.ts line 15",
  'optimize the database queries in src/services/user.service.ts. The findAll method is slow',
  'deploy the application to kubernetes using terraform',
  'write unit tests for the authentication middleware in src/middleware/auth.ts',
  'refactor the payment processing module to use the strategy pattern',
  "debug why the docker container keeps crashing. Error: Cannot find module 'dotenv'",
  'review the security of src/routes/admin.routes.ts for SQL injection vulnerabilities',
  'add redis caching to the product catalog API in src/controllers/products.controller.ts',
];

let totalOrig = 0;
let totalComp = 0;

for (const msg of sessionMessages) {
  const r = sessionGC.compressText(msg);
  totalOrig += r.stats.originalTokens;
  totalComp += r.stats.compressedTokens;
}

const batchStats = sessionGC.getStats();

test(`Batch: processed ${sessionMessages.length} messages`, () => {
  assert(batchStats.messagesProcessed === sessionMessages.length,
    `Expected ${sessionMessages.length}, got ${batchStats.messagesProcessed}`);
});

// This used to assert `ratio > 1` on nine one-line prompts, and since v1.33.8
// prices compression in real tokens rather than characters, that claim is
// simply false: a one-line prompt has nothing to amortise a codebook against,
// and the glyph forms cost more than the English they replace at that size.
// The compressor now declines, which is the correct outcome and the one the
// README already describes as "weak fit".
//
// Replacing the false claim with the true one is more useful than inflating
// the fixture until the old number comes back — this is the documented
// boundary of the tool, and nothing covered it before.
test('Batch: one-line prompts are declined rather than inflated', () => {
  const ratio = parseFloat(batchStats.overallRatio);
  assert(ratio >= 1, `compression must never make a batch worse, got ${batchStats.overallRatio}`);
  assert(batchStats.totalSavedTokens >= 0, 'a batch of short prompts must not cost tokens');
});

// The counterpart: realistic IDE context, where compression does pay. Without
// this, the assertion above would be satisfied by a compressor that never
// compresses anything at all.
test('Batch: realistic IDE payloads do compress', () => {
  // 'aggressive', not 'standard', and real source rather than synthetic lines.
  // Measured on 8,000 characters of this repository's own src/compressor.js:
  // 'standard' saves nothing that clears the 10% margin and correctly falls
  // back, 'aggressive' saves 901 real tokens and 'ultra' 2,112. Asserting a
  // saving at 'standard' would be asserting something untrue.
  const source = fs.readFileSync(new URL('../src/compressor.js', import.meta.url), 'utf8').slice(0, 8000);
  const realisticGC = new GlyphCompressor({ level: 'aggressive', provider: 'openai' });
  const result = realisticGC.compressText(`Review this:\n\`\`\`js\n${source}\n\`\`\``, 'openai');
  const saved = result.stats.originalTokens - result.stats.compressedTokens;

  assert(!result.fallback, 'a real source file at aggressive should not fall back');
  assert(saved > 100, `realistic payloads should save real tokens, saved ${saved}`);
});

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: CLI Trust Features ═══\n');
// ═══════════════════════════════════════════════════════════

test('Source maps: expose reversible dictionaries', () => {
  const gc = new GlyphCompressor({ level: 'ultra' });
  const r = gc.compressText("Fix src/components/App.tsx. Property 'name' does not exist on type 'User'.\n```ts\nimport React from 'react';\nfunction App() { return null; }\n```");
  assert(r.sourceMap.version === currentVersion, 'Should include source map version');
  assert(r.sourceMap.files.some(file => file.path === 'src/components/App.tsx'), 'Should map file refs to paths');
  assert(r.sourceMap.diagnostics.some(diag => diag.original.includes("Property 'name'")), 'Should map diagnostics');
  assert(r.sourceMap.codeBlocks.some(block => block.mode === 'summary'), 'Should map summarized code blocks');
  assert(r.sourceMap.replacements.some(item => item.kind === 'file'), 'Should record replacements');
  assert(r.sourceMap.symbols.some(item => item.kind === 'file' && item.span.start.line === 1), 'Should record file symbol spans');
  assert(r.sourceMap.diagnostics.some(diag => diag.span && diag.span.start.line === 1), 'Should record diagnostic spans');
});

test('Source maps: record AST-like token spans inside minified code blocks', () => {
  const gc = new GlyphCompressor({ level: 'aggressive' });
  // Below the economics gate: this asserts what minification *records*, not
  // whether the result is cheap enough to ship. A six-line snippet is not, and
  // gating it would make the test fail for an unrelated reason.
  encodeOnly(gc, "Review this code:\n```ts\nimport React from 'react';\nexport function App() {\n  const title = 'Hi';\n  return title;\n}\n```");
  const r = { sourceMap: gc.getSourceMap() };
  const block = r.sourceMap.codeBlocks.find(item => item.mode === 'minified');
  assert(block && Array.isArray(block.tokens), 'Minified code block should expose structural tokens');
  assert(block.tokens.some(token => token.kind === 'import' && token.glyph === 'imp' && token.span.start.line === 3), 'Should map import token span');
  assert(block.tokens.some(token => token.kind === 'function' && token.name === 'App'), 'Should map function token with name');
  assert(block.tokens.some(token => token.kind === 'return' && token.glyph === '→'), 'Should map return token');
  assert(r.sourceMap.ast.some(token => token.blockMode === 'minified' && token.kind === 'function'), 'Top-level ast map should include block mode');
});

test('Source maps: dynamic dictionary can be read after compression', () => {
  const gc = new GlyphCompressor({ level: 'standard' });
  // SuperUniqueIdentifierName is 4 real tokens against a 2-token glyph and is
  // repeated enough to amortise its own definition; AuthenticationManager,
  // used here before, measures at 2 tokens and no longer qualifies.
  // Comma-separated on purpose. This test is about the *single-word* dynamic
  // entry, and the bigram pattern (`word\s+word`) would otherwise win and
  // consume every occurrence — repeating one word ten times even forms the
  // bigram "X X" — leaving no single-word span to assert on. Punctuation
  // between the identifiers stops a bigram forming at all.
  encodeOnly(gc, 'SuperUniqueIdentifierNameForTesting, AnotherDistinctIdentifierNameHere. '.repeat(12));
  const r = { sourceMap: gc.getSourceMap() };
  const dictionaries = gc.getReversibleDictionaries();
  assert(r.sourceMap.dynamic.some(entry => entry.original === 'SuperUniqueIdentifierNameForTesting'), 'Should expose dynamic source map entry');
  assert(dictionaries.dynamic.some(entry => entry.original === 'SuperUniqueIdentifierNameForTesting'), 'Should expose reversible dynamic dictionary');
  assert(dictionaries.symbols.some(entry => entry.kind === 'dynamic' && entry.original === 'SuperUniqueIdentifierNameForTesting'), 'Should expose reversible dynamic spans');
});

test('Source maps: record line and column spans across multiple lines', () => {
  const gc = new GlyphCompressor({ level: 'standard' });
  const r = gc.compressText("Intro line\nFix src/server/auth.ts. Property 'email' does not exist on type 'User'.");
  const fileSymbol = r.sourceMap.symbols.find(item => item.kind === 'file' && item.original === 'src/server/auth.ts');
  const diagnostic = r.sourceMap.diagnostics.find(item => item.original.includes("Property 'email'"));
  assert(fileSymbol.span.start.line === 2, 'File span should keep original line');
  assert(fileSymbol.span.start.column === 5, 'File span should keep original column');
  assert(diagnostic.span.start.line === 2, 'Diagnostic span should keep original line');
});

test('Source maps: CommonJS root export matches ESM behavior', () => {
  // By package name, not by path. `require('..')` resolves the directory and
  // therefore reads `main` — which points at the ESM src/index.js — instead of
  // the `exports.require` condition that a real consumer's
  // `require('glyph-compress')` goes through. The two land on different files,
  // so the test was not exercising the entry point its name claims.
  //
  // It passed anyway on Node 20 and 22, which can require() an ES module, and
  // failed only once Node 18 joined the CI matrix — where require(ESM) does not
  // exist. The failure was real but the diagnosis it invites is wrong: nothing
  // is broken for users, because name-based resolution reaches src/index.cjs on
  // every supported version. What was broken is this assertion's aim.
  const cjs = require('glyph-compress');
  const gc = new cjs.GlyphCompressor({ level: 'standard' });
  encodeOnly(gc, 'Fix src/server/auth.ts because AuthenticationManager repeats AuthenticationManager.');
  const r = { sourceMap: gc.getSourceMap() };
  assert(r.sourceMap.version === currentVersion, 'Should expose source maps through require()');
  assert(r.sourceMap.files.some(file => file.path === 'src/server/auth.ts'), 'Should expose file maps through require()');
  assert(typeof cjs.buildWorkspaceCodebook === 'function', 'Should expose workspace intelligence through require()');
  assert(typeof cjs.Compressor === 'function', 'Should expose Compressor through require()');
  assert(typeof cjs.Codebook === 'function', 'Should expose Codebook through require()');
  assert(typeof cjs.generateSystemPrompt === 'function', 'Should expose generateSystemPrompt through require()');
  assert(typeof cjs.estimateOverhead === 'function', 'Should expose estimateOverhead through require()');
  assert(cjs.RADICALS && typeof cjs.RADICALS.CODE === 'string', 'Should expose RADICALS through require()');
});

test('CLI: explain flag prints compression explanation', () => {
  const cliPath = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
  const output = execFileSync(process.execPath, [cliPath, 'package.json', '--level', 'standard', '--explain'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8',
  });
  assert(output.includes('Compression explanation'), 'Should print explanation heading');
  assert(output.includes('Level:             standard'), 'Should print selected compression level');
  assert(output.includes('Detected changes:'), 'Should print detected compression changes');
});

test('CLI: source-map flag prints source map JSON', () => {
  const cliPath = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
  const output = execFileSync(process.execPath, [cliPath, 'package.json', '--level', 'standard', '--source-map'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8',
  });
  assert(output.includes('Source map'), 'Should print source map heading');
  assert(output.includes(`"version": "${currentVersion}"`), 'Should print source map version');
  assert(output.includes('"files"'), 'Should include file dictionary');
});

console.log('\n═══ TEST: Workspace Intelligence ═══\n');

function withTempWorkspace(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-workspace-'));
  try {
    fs.mkdirSync(path.join(dir, 'src', 'services'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'test'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'node test/integration.js', benchmark: 'node test/benchmark.js' } }), 'utf8');
    fs.writeFileSync(path.join(dir, 'README.md'), '# fixture\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'LICENSE'), 'fixture\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'src', 'services', 'auth.ts'), "import { db } from '../db';\nexport function AuthenticationManager() { return db.user.findMany(); }\n// TODO: error TS2339: Property 'name' does not exist\n", 'utf8');
    fs.writeFileSync(path.join(dir, 'test', 'auth.test.ts'), "import { AuthenticationManager } from '../src/services/auth';\ntest('auth', () => AuthenticationManager());\n", 'utf8');
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('Workspace intelligence: builds persistent codebook and ranks relevant files', () => withTempWorkspace((dir) => {
  const codebook = buildWorkspaceCodebook(dir);
  const codebookPath = saveWorkspaceCodebook(dir, codebook);
  const selection = selectRelevantFiles(dir, 'fix AuthenticationManager error', { codebook });
  assert(codebook.version === currentVersion, 'Should use the current codebook schema version');
  assert(fs.existsSync(codebookPath), 'Should persist workspace codebook');
  assert(codebook.symbols.some(symbol => symbol.name === 'AuthenticationManager'), 'Should index symbols');
  assert(selection.intents.includes('fix_error'), 'Should detect fix intent');
  assert(selection.files.some(file => file.path === 'src/services/auth.ts'), 'Should rank relevant source file');
}));

test('Workspace intelligence: doctor reports repository readiness', () => withTempWorkspace((dir) => {
  const report = runDoctor(dir);
  assert(report.ok, 'Fixture repository should pass doctor checks');
  assert(report.checks.some(check => check.name === 'benchmark script' && check.ok), 'Should check benchmark script');
}));

test('Workspace intelligence: CLI inspect prints JSON summary', () => withTempWorkspace((dir) => {
  const cliPath = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
  const output = execFileSync(process.execPath, [cliPath, 'inspect', 'fix AuthenticationManager error', '--json'], {
    cwd: dir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);
  assert(result.version === currentVersion, 'Should print the current inspect output version');
  assert(result.intents.includes('fix_error'), 'Should include detected intent');
  assert(result.relevantFiles.some(file => file.path === 'src/services/auth.ts'), 'Should include relevant file');
}));

test('Workspace intelligence: intent detection covers roadmap workflows', () => {
  assert(detectIntent('review staged diff for pull request').includes('review_diff'), 'Should detect review diff');
  assert(detectIntent('write unit tests for the service').includes('write_tests'), 'Should detect tests');
  assert(detectIntent('optimize slow query performance').includes('optimize_performance'), 'Should detect performance');
});

console.log('\n═══ TEST: Stable Platform Metadata ═══\n');

test('Stable platform: package exposes TypeScript declarations', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const pkg = require('..' + '/package.json');
  assert(pkg.version === currentVersion, 'Package should expose the current release version');
  assert(pkg.types === 'src/index.d.ts', 'Package should expose root types');
  assert(pkg.exports['.'].types === './src/index.d.ts', 'Root export should expose types');
  assert(pkg.exports['./middleware'].types === './src/index.d.ts', 'Middleware export should expose complete package types');
  assert(pkg.exports['./middleware'].import === './src/glyph-middleware.js', 'Middleware ESM export should avoid the VS Code package scope');
  assert(fs.existsSync(path.join(root, 'src', 'index.d.ts')), 'Root declaration file should exist');
});

test('Stable platform: package allowlist excludes scratch artifacts', () => {
  const pkg = require('..' + '/package.json');
  assert(pkg.files.includes('src/'), 'Package should include runtime source');
  assert(pkg.files.includes('vscode-ext/glyph-middleware.cjs'), 'Package should include CJS middleware');
  assert(!pkg.files.includes('docs/'), 'Package should not publish the entire docs directory');
  assert(!pkg.files.includes('scripts/'), 'Package should not publish the entire scripts directory');
  assert(!pkg.files.includes('test/'), 'Package should not publish test directory');
  assert(!pkg.files.includes('assets/'), 'Package should not publish large assets');
});

test('Stable platform: formal governance docs exist', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  for (const doc of ['SECURITY.md', 'PRIVACY.md', 'ENTERPRISE.md']) {
    assert(fs.existsSync(path.join(root, doc)), `${doc} should exist`);
  }
});

test('Contributor hygiene: contributor and release docs exist', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  for (const doc of ['CONTRIBUTING.md', 'docs/release.md', 'docs/architecture.md']) {
    assert(fs.existsSync(path.join(root, doc)), `${doc} should exist`);
  }
});

test('Contributor hygiene: issue and PR templates exist', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const templates = [
    '.github/ISSUE_TEMPLATE/bug_report.yml',
    '.github/ISSUE_TEMPLATE/feature_request.yml',
    '.github/ISSUE_TEMPLATE/provider_compatibility.yml',
    '.github/ISSUE_TEMPLATE/benchmark_submission.yml',
    '.github/pull_request_template.md',
  ];
  for (const template of templates) {
    assert(fs.existsSync(path.join(root, template)), `${template} should exist`);
  }
});

test('Contributor hygiene: link checker is wired into package scripts', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const pkg = require('..' + '/package.json');
  assert(pkg.scripts['check:links'] === 'node scripts/check-links.js', 'Should expose link checker script');
  assert(fs.existsSync(path.join(root, 'scripts', 'check-links.js')), 'Link checker script should exist');
});

test('Provider estimates: public estimator API is exported', () => {
  // By name for the same reason as the CommonJS root export test above: the
  // point is what a consumer's require() reaches, and a path bypasses exports.
  const api = require('glyph-compress');
  assert(typeof api.estimateProviderTokens === 'function', 'Should export provider token estimator');
  assert(api.PROVIDER_COMPRESSION_PROFILES.local.strategy === 'aggressive-local', 'Should export provider compression profiles');
  assert(api.TRUST_POLICY_PROFILES.privacy.redacts === true, 'Should export trust policy profiles');
  assert(api.normalizeProvider('claude') === 'anthropic', 'Should normalize provider aliases');
});

test('Testing split: package exposes focused suite scripts', () => {
  const pkg = require('..' + '/package.json');
  for (const script of ['test:unit', 'test:cli', 'test:workspace', 'test:metadata', 'test:integration']) {
    assert(Boolean(pkg.scripts[script]), `${script} should exist`);
  }
});

// ═══════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════

// Async test results land here; the totals below are only correct once every
// collected promise has settled.
await Promise.all(pending);

console.log('\n' + '═'.repeat(70));
console.log('RESULTS');
console.log('═'.repeat(70));
console.log(`  Tests passed: ${passed}`);
console.log(`  Tests failed: ${failed}`);
console.log();
console.log(`  Batch session stats:`);
console.log(`    Messages:    ${batchStats.messagesProcessed}`);
console.log(`    Tokens orig: ${batchStats.totalOriginalTokens}`);
console.log(`    Tokens comp: ${batchStats.totalCompressedTokens}`);
console.log(`    Saved:       ${batchStats.totalSavedTokens} tokens (${batchStats.overallSavedPct})`);
console.log(`    Ratio:       ${batchStats.overallRatio}`);
console.log(`    Cost saved:  ${batchStats.estimatedCostSaved}`);
console.log();

// Show compressed examples
console.log('  Sample compressions:');
const gcDemo = new GlyphCompressor({ level: 'standard' });
for (const msg of sessionMessages.slice(0, 5)) {
  const r = gcDemo.compressText(msg);
  console.log(`    "${msg.substring(0, 50)}..."`);
  console.log(`     → "${r.compressed}" (${r.stats.ratio}, ${r.stats.savedPct})`);
  console.log();
}

process.exit(failed > 0 ? 1 : 0);
