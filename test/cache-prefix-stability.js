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
 * v1.25.0 fixed a real gap this suite's own name promised but didn't
 * check: "protocol preamble stays identical across turns" only ever
 * compared the FIRST LINE of the system message (a literal that never
 * changes) — never the full codebook block, which was payload-filtered
 * (only lists glyphs the current message happens to use) and so varied
 * request to request, defeating the very caching this suite claimed to
 * lock in. Found by reproducing it directly: two different multi-turn
 * payloads produced two different SYM: lines. Fixed with a hybrid
 * strategy mirroring Anthropic's existing first-turn-vs-multi-turn
 * cache_control switch (see useStructuredSystem) — once a session has
 * assistant history, OpenAI/Gemini get the full, unconditional codebook
 * (byte-identical every time, with the per-request DYN line moved
 * outside the stable block) instead of the smaller filtered one, but
 * only when that larger header doesn't flip the message net-negative
 * (see the two-tier retry in _compressMessagesForStrategy) — otherwise
 * it falls back to the smaller filtered codebook, never to zero
 * compression just because the stability upgrade wasn't affordable.
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

  // Large enough that the ~350 extra tokens of the full stable codebook
  // still leaves the message net-positive — this is the realistic case
  // (sizeable IDE agent system prompts, meaty exchanges) where the
  // caching upgrade should actually engage.
  const largeContent = (subject, repeats = 60) => (
    `Fix the error in the ${subject} module. TypeError: cannot read property of undefined at line 42. `
    + `function handle_${subject}(event) { const result = fetchData(event); return result; } `.repeat(repeats)
  );
  const bigSystemPrompt = 'You are an expert pair-programming assistant integrated into a code editor. '.repeat(20);

  await test('OpenAI multi-turn: once assistant history exists, the ENTIRE codebook block (not just line 1) is byte-identical across turns with different tech/content', () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
    // Turn 1 has no assistant history yet — by design (mirroring Anthropic's
    // own first-turn-lightweight behavior) it uses the smaller filtered
    // codebook, since there's no prior turn to cache against. The real
    // "does this stay stable" question only applies once a session is
    // already in cache-stable mode — turn 2 vs. turn 3 below, both of
    // which already have assistant history when compressed.
    gc.compressMessages([
      { role: 'system', content: bigSystemPrompt },
      { role: 'user', content: largeContent('ReactAuth') },
    ], 'openai');

    const turn2 = gc.compressMessages([
      { role: 'system', content: bigSystemPrompt },
      { role: 'user', content: largeContent('ReactAuth') },
      { role: 'assistant', content: 'Fixed it, the issue was a race condition.' },
      { role: 'user', content: 'Create pytest unit tests for the DjangoBackend save() method. ' + 'def test_save_method(): pass '.repeat(60) },
    ], 'openai');
    assert(!turn2.stats.thisMessage.fallback, 'turn 2 (already has assistant history) should still compress, not fall back to zero compression');

    const turn3 = gc.compressMessages([
      { role: 'system', content: bigSystemPrompt },
      { role: 'user', content: largeContent('ReactAuth') },
      { role: 'assistant', content: 'Fixed it, the issue was a race condition.' },
      { role: 'user', content: 'Create pytest unit tests for the DjangoBackend save() method. ' + 'def test_save_method(): pass '.repeat(60) },
      { role: 'assistant', content: 'Added the tests.' },
      { role: 'user', content: largeContent('KubernetesDeploy') },
    ], 'openai');
    assert(!turn3.stats.thisMessage.fallback, 'turn 3 should still compress, not fall back to zero compression');

    const sys2 = turn2.messages.find((m) => m.role === 'system').content;
    const sys3 = turn3.messages.find((m) => m.role === 'system').content;
    assert(sys2.includes('TECH:') && sys3.includes('TECH:'), 'both multi-turn calls should upgrade to the full, unconditional codebook once they can afford the header');

    // The stable block must be byte-identical up to the original system
    // text — this is the actual "prefix a provider can cache" boundary,
    // not just the protocol version line the old (insufficient) check used.
    const codebookBlock2 = sys2.slice(0, sys2.indexOf('[/GLYPH]') + '[/GLYPH]'.length);
    const codebookBlock3 = sys3.slice(0, sys3.indexOf('[/GLYPH]') + '[/GLYPH]'.length);
    assert.strictEqual(codebookBlock2, codebookBlock3, `the full codebook block must be byte-identical across turns referencing different tech names, got:\n---turn2---\n${codebookBlock2}\n---turn3---\n${codebookBlock3}`);
    assert(sys3.includes(bigSystemPrompt), 'the original system text must still be present verbatim');
  });

  await test('OpenAI multi-turn: the stable codebook survives the dynamic dictionary GROWING mid-session', () => {
    // The test above varies content between turns, but a session that starts
    // on a large payload saturates the dictionary on turn 1 — so it never
    // exercises the case this whole feature exists for: new `§N` entries
    // being learned while already in cache-stable mode. Learning is
    // order-dependent, so a codebook that embedded dictionary state would
    // change here and silently invalidate the provider's cached prefix on
    // every turn that learns anything. Verified reachable: this sequence
    // grows the dictionary from tens of entries to the cap between the two
    // compared turns.
    const gc = new GlyphCompressor({ level: 'ultra', provider: 'openai' });
    const small = largeContent('Widget');
    const big = small + '\n' + largeContent('KubernetesDeploy') + '\n' + largeContent('DjangoBackend');

    const messages = [{ role: 'user', content: small }];
    gc.compressMessages(messages, 'openai');                       // turn 1: filtered header, by design
    messages.push({ role: 'assistant', content: 'ok' });

    messages.push({ role: 'user', content: small });
    const turnA = gc.compressMessages(messages, 'openai');          // turn 2: cache-stable mode begins
    const dictAfterA = gc.dynamicDict.size;
    messages.push({ role: 'assistant', content: 'ok' });

    messages.push({ role: 'user', content: big });                  // turn 3: much more vocabulary
    const turnB = gc.compressMessages(messages, 'openai');
    const dictAfterB = gc.dynamicDict.size;

    assert(!turnA.stats.thisMessage.fallback && !turnB.stats.thisMessage.fallback,
      'precondition: both compared turns must actually compress');
    assert(dictAfterB > dictAfterA,
      `precondition: the dictionary must actually grow between the compared turns (${dictAfterA} -> ${dictAfterB}) or this test proves nothing`);

    const sysA = turnA.messages.find((m) => m.role === 'system').content;
    const sysB = turnB.messages.find((m) => m.role === 'system').content;
    assert(sysA.includes('[/GLYPH]') && sysB.includes('[/GLYPH]'),
      'both turns must emit a delimited codebook block, or the slicing below compares nothing');
    const blockA = sysA.slice(0, sysA.indexOf('[/GLYPH]') + '[/GLYPH]'.length);
    const blockB = sysB.slice(0, sysB.indexOf('[/GLYPH]') + '[/GLYPH]'.length);

    // Three assertions together make the invariant unfalsifiable-by-luck.
    // The block being equal is not enough on its own: a payload pair whose
    // filtered codebooks happen to coincide would satisfy it even with the
    // cache-stable path disabled. Requiring the growth to be *visible* in
    // the DYN line proves the new vocabulary really did land outside the
    // cacheable block rather than never existing.
    assert(sysA.includes('DYN:') && sysB.includes('DYN:'),
      'both turns should carry a dynamic-dictionary line');
    assert.notStrictEqual(
      sysA.slice(sysA.indexOf('DYN:')),
      sysB.slice(sysB.indexOf('DYN:')),
      `the DYN line is identical across turns even though the dictionary grew ${dictAfterA} -> ${dictAfterB} — the growth is not reaching the payload, so this test cannot prove anything about where it lands`,
    );
    assert.strictEqual(blockA, blockB,
      `the cacheable codebook block changed while the dictionary grew ${dictAfterA} -> ${dictAfterB}; every provider cache read for this session would miss`);
  });

  await test('OpenAI multi-turn: the request-specific DYN line lives outside the stable codebook block', () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
    gc.compressMessages([
      { role: 'system', content: bigSystemPrompt },
      { role: 'user', content: largeContent('ReactAuth') },
    ], 'openai');
    const turn2 = gc.compressMessages([
      { role: 'system', content: bigSystemPrompt },
      { role: 'user', content: largeContent('ReactAuth') },
      { role: 'assistant', content: 'Fixed it.' },
      { role: 'user', content: 'Create pytest unit tests for the DjangoBackend save() method. ' + 'def test_save_method(): pass '.repeat(60) },
    ], 'openai');
    const sys2 = turn2.messages.find((m) => m.role === 'system').content;
    const codebookBlock = sys2.slice(0, sys2.indexOf('[/GLYPH]') + '[/GLYPH]'.length);
    assert(!codebookBlock.includes('DYN:'), 'the cache-stable block must never embed request-specific DYN entries, mirroring the Anthropic invariant above');
    assert(sys2.includes('[GLYPH DYNAMIC]'), 'the DYN line should still be present, just outside the stable block');
  });

  await test('OpenAI multi-turn: a small message that cannot afford the larger stable header degrades to the filtered codebook, not to zero compression', () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
    gc.compressMessages([
      { role: 'system', content: 'You are a coding assistant.' },
      { role: 'user', content: largeContent('Alpha', 25) },
    ], 'openai');
    const turn2 = gc.compressMessages([
      { role: 'system', content: 'You are a coding assistant.' },
      { role: 'user', content: largeContent('Alpha', 25) },
      { role: 'assistant', content: 'Fixed it.' },
      { role: 'user', content: 'Create pytest unit tests for save(). ' + 'def test_save_method(): pass '.repeat(25) },
    ], 'openai');
    assert(!turn2.stats.thisMessage.fallback, 'a message too small for the stable header must still compress via the smaller filtered codebook, not fall all the way back to the original uncompressed payload');
    const sys2 = turn2.messages.find((m) => m.role === 'system').content;
    assert(!sys2.includes('TECH:'), 'too-small-to-afford-it case should use the smaller filtered codebook, not the full stable one');
  });

  await test('raw provider is unaffected by cache-stable codebook logic even with assistant history', () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
    const turn2 = gc.compressMessages([
      { role: 'system', content: bigSystemPrompt },
      { role: 'user', content: largeContent('ReactAuth') },
      { role: 'assistant', content: 'Fixed it.' },
      { role: 'user', content: largeContent('DjangoBackend') },
    ], 'raw');
    const sys2 = turn2.messages.find((m) => m.role === 'system').content;
    assert(!sys2.includes('[GLYPH DYNAMIC]'), 'raw provider must keep its existing single-block codebook shape, unaffected by the new hybrid logic');
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
