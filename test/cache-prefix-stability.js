/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Cache-Prefix Stability Suite
 *
 * OpenAI and Gemini both apply automatic, implicit prompt-cache discounts
 * when a request's leading tokens are byte-identical to a recently seen
 * request (no cache_control needed, unlike Anthropic's explicit ephemeral
 * blocks). GlyphCompress only gets that discount on the injected codebook
 * if the codebook text is deterministic — the same input content must
 * always produce the exact same codebook bytes, and request-specific
 * state (like the DYN: dynamic-dictionary line) must never bleed into a
 * block that's supposed to be cache-stable.
 *
 * This does not change runtime behavior; it locks in an invariant the
 * cache-aware code (see _anthropicStableProtocolBlock,
 * _buildMinimalCompactCodebookPrompt) already relies on implicitly.
 */
import assert from 'assert';
import { GlyphCompressor, wrapOpenAI, wrapAnthropic } from '../src/glyph-middleware.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

async function run() {
  // Long/repetitive enough to clear the codebook-skip threshold (short
  // messages legitimately fall back to plain text — see the adaptive
  // fallback tested elsewhere — which would make these fixtures pass
  // vacuously instead of actually exercising codebook injection).
  const richContent = (subject) => Array.from({ length: 10 }, (_, i) => (
    `Use React and TypeScript to fix the ${subject}Manager bug in the ${subject}Manager module (case ${i}), `
    + `then re-run the ${subject}Manager regression suite.`
  )).join(' ');

  await test('OpenAI: identical content produces byte-identical codebook across independent instances', () => {
    const content = richContent('Authentication');
    const gcA = new GlyphCompressor({ level: 'standard', provider: 'openai' });
    const gcB = new GlyphCompressor({ level: 'standard', provider: 'openai' });
    const resultA = gcA.compressMessages([{ role: 'user', content }], 'openai');
    const resultB = gcB.compressMessages([{ role: 'user', content }], 'openai');
    const sysA = resultA.messages.find((m) => m.role === 'system');
    const sysB = resultB.messages.find((m) => m.role === 'system');
    assert(sysA && sysB, 'both requests should inject a codebook system message');
    assert.strictEqual(sysA.content, sysB.content, 'identical input content must produce a byte-identical codebook across independent sessions (required for provider-side implicit prefix caching)');
  });

  await test('OpenAI: protocol preamble stays identical across turns even as unrelated dynamic content changes', () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
    const turn1 = gc.compressMessages([{ role: 'user', content: richContent('ComponentAlpha') }], 'openai');
    const turn2 = gc.compressMessages([{ role: 'user', content: richContent('PipelineBeta') }], 'openai');
    const sys1 = turn1.messages.find((m) => m.role === 'system').content;
    const sys2 = turn2.messages.find((m) => m.role === 'system').content;
    // The two turns reference different tech names and different dynamic
    // words, so their *content* legitimately differs — but the fixed
    // protocol version header must still be byte-identical so a
    // provider-side cache can match on the leading tokens.
    assert.strictEqual(sys1.split('\n')[0], sys2.split('\n')[0], 'protocol version header must be stable');
    assert.strictEqual(sys1.split('\n')[0], '[GLYPH PROTOCOL v0.5]', 'protocol header should be the expected literal');
  });

  await test('Anthropic: the cache_control-tagged stable block never embeds request-specific DYN entries', async () => {
    // The structured, per-block cache_control format (where the protocol
    // preamble and the request-specific DYN line live in *separate*
    // blocks) is only produced by wrapAnthropic() once the transcript has
    // assistant history — see _prepareAnthropicPayload's useStructuredSystem.
    let capturedParams = null;
    const mockClient = {
      messages: {
        create: async (params) => {
          capturedParams = params;
          return { id: 'msg_1' };
        },
      },
    };
    const wrapped = wrapAnthropic(mockClient, { level: 'standard' });
    await wrapped.messages.create({
      model: 'claude',
      system: 'You are a senior engineer.',
      messages: [
        { role: 'user', content: richContent('OrderReconciliation') },
        { role: 'assistant', content: 'Looking into it now.' },
        { role: 'user', content: 'Any update?' },
      ],
    });
    const blocks = Array.isArray(capturedParams.system) ? capturedParams.system : [];
    const stableBlock = blocks.find((b) => b.cache_control && b.text.includes('[GLYPH PROTOCOL'));
    assert(stableBlock, `should produce a cache_control-tagged stable protocol block, got: ${JSON.stringify(capturedParams.system)}`);
    assert(!stableBlock.text.includes('DYN:'), 'stable (cached) block must not contain request-specific dynamic-dictionary entries — those belong in the separate, non-cached [GLYPH DYNAMIC] block');
  });

  await test('wrapOpenAI: two independently-created clients produce the same codebook for the same content', async () => {
    const calls = [];
    const fakeUpstream = {
      chat: {
        completions: {
          create: async (params) => {
            calls.push(params);
            return { choices: [{ message: { content: 'ok' } }] };
          },
        },
      },
    };
    const clientA = wrapOpenAI(fakeUpstream, { level: 'standard' });
    const clientB = wrapOpenAI(fakeUpstream, { level: 'standard' });
    const content = richContent('TerraformCluster');
    await clientA.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content }] });
    await clientB.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content }] });
    const sysA = calls[0].messages.find((m) => m.role === 'system');
    const sysB = calls[1].messages.find((m) => m.role === 'system');
    assert(sysA && sysB, 'both clients should inject a codebook system message for this fixture');
    assert.strictEqual(sysA.content, sysB.content, 'wrapOpenAI codebook injection must be deterministic across independently-created clients');
  });

  console.log(`\ncache-prefix-stability: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  } else {
    console.log('cache-prefix-stability suite ok');
  }
}

run();
