/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Context Budget Planner Suite (v1.32.0)
 *
 * Covers `GlyphCompressor.compressToBudget()` / `planCompressionForBudget()`
 * and the `level: 'auto'` trust-policy fix they depend on.
 *
 * The trust-policy fix is not incidental here: _resolveTrustPolicy() reads
 * `this.level` but only ran once, in the constructor, so a level chosen
 * *after* construction (by `auto`, or by this planner's escalation) kept the
 * conservative policy derived from the original level — which forbids
 * exactly the transforms that define 'aggressive'/'ultra'. Every level then
 * produced byte-identical output and any escalation was meaningless, while
 * `stats.selectedLevel` still claimed the heavier level had been applied.
 * Several assertions below exist specifically to keep that from regressing.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { GlyphCompressor, planCompressionForBudget, selectCompressionLevel } from '../src/glyph-middleware.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const codeSample = fs.readFileSync(path.join(root, 'src', 'compressor.js'), 'utf8');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

// ─── The level/trust coupling the planner depends on ───────────

test("level 'auto' actually applies the level it selects, not just report it", () => {
  assert.strictEqual(selectCompressionLevel(codeSample), 'ultra', 'fixture must be code-heavy enough to select ultra');

  const explicit = new GlyphCompressor({ level: 'ultra', provider: 'raw' });
  const auto = new GlyphCompressor({ level: 'auto', provider: 'raw' });

  const explicitResult = explicit.compressText(codeSample);
  const autoResult = auto.compressText(codeSample);

  assert.strictEqual(autoResult.stats.selectedLevel, 'ultra', "auto should select ultra for this fixture");
  assert.strictEqual(
    autoResult.stats.compressedTokens,
    explicitResult.stats.compressedTokens,
    'auto-selecting ultra must produce the same output as constructing with ultra — otherwise it reports a level it did not apply',
  );
});

test('an explicitly pinned trust policy is never silently escalated by level selection', () => {
  const pinned = new GlyphCompressor({ level: 'auto', provider: 'raw', trustPolicy: 'reversible' });
  const result = pinned.compressText(codeSample);

  assert.strictEqual(pinned.trustPolicy, 'reversible', 'explicit policy must survive level selection');
  const unpinned = new GlyphCompressor({ level: 'ultra', provider: 'raw' });
  assert(
    result.stats.compressedTokens > unpinned.compressText(codeSample).stats.compressedTokens,
    'a pinned reversible policy must still block ultra transforms — choosing a level is not consent to widen what is allowed',
  );
});

test('compressText restores the level and trust policy it was called with', () => {
  const gc = new GlyphCompressor({ level: 'auto', provider: 'raw' });
  const policyBefore = gc.trustPolicy;
  gc.compressText(codeSample);
  assert.strictEqual(gc.level, 'auto', 'configured level must be restored');
  assert.strictEqual(gc.trustPolicy, policyBefore, 'trust policy must be restored, not left at the resolved level');
});

// The chat path (proxy, wrapOpenAI/wrapAnthropic, VS Code extension) picks
// its level through _resolveBaseLevel/_candidateMessageStrategies rather
// than compressText(), so it needs its own coverage — the same coupling bug
// was far more severe there (325 vs 4922 tokens on this fixture).
function buildThread() {
  return [
    { role: 'system', content: 'You are a senior engineer.' },
    { role: 'user', content: `Review this file:\n\n\`\`\`js\n${codeSample}\n\`\`\`` },
    { role: 'assistant', content: 'Looks reasonable overall.' },
    { role: 'user', content: 'Now find the performance bottleneck.' },
  ];
}

function threadTokens(compressor) {
  const result = compressor.compressMessages(buildThread(), 'openai');
  return result.stats.thisMessage.compressedTokens;
}

test("compressMessages with level 'auto' applies the level it resolves", () => {
  const explicit = threadTokens(new GlyphCompressor({ level: 'ultra', provider: 'openai' }));
  const auto = threadTokens(new GlyphCompressor({ level: 'auto', provider: 'openai' }));
  const standard = threadTokens(new GlyphCompressor({ level: 'standard', provider: 'openai' }));

  assert(explicit < standard, 'precondition: ultra must beat standard on this thread');
  assert.strictEqual(
    auto,
    explicit,
    `auto resolved to ultra but delivered ${auto} tokens instead of ultra's ${explicit} — the level/trust coupling bug in the chat path`,
  );
});

test('compressMessages honors an explicitly pinned trust policy', () => {
  const pinned = new GlyphCompressor({ level: 'auto', provider: 'openai', trustPolicy: 'reversible' });
  const tokens = threadTokens(pinned);
  const unpinned = threadTokens(new GlyphCompressor({ level: 'auto', provider: 'openai' }));

  assert.strictEqual(pinned.trustPolicy, 'reversible', 'pinned policy must survive candidate trials');
  assert(tokens > unpinned, 'a pinned reversible policy must still block ultra transforms in the chat path');
});

// Attentional Decay Compaction is the third site of the same coupling: it
// explicitly forces `level = 'ultra'` for older turns, which the derived
// policy then vetoed. This one bit the *default* configuration — ADC's
// entire purpose is to stop chat history exploding, and at `level:
// 'standard'` it silently did not.
function buildDecayThread() {
  const messages = [];
  for (let i = 0; i < 4; i++) {
    // A *different* slice per turn, deliberately. An identical snippet in
    // every turn is now removed by _elideRepeatedBlocks before decay ever
    // runs, which would conflate the two mechanisms and make this assert on
    // their combined effect rather than on decay. Distinct content isolates
    // decay, which is what this test is about.
    const snippet = codeSample.slice(i * 3000, i * 3000 + 3000);
    messages.push({ role: 'user', content: `Turn ${i}: review this\n\n\`\`\`js\n${snippet}\n\`\`\`` });
    messages.push({ role: 'assistant', content: `Reply ${i}: here is my analysis of the code.` });
  }
  return messages;
}

function decayTokens(options) {
  const gc = new GlyphCompressor({ provider: 'openai', attentionalDecay: true, ...options });
  return gc.compressMessages(buildDecayThread(), 'openai').stats.thisMessage.compressedTokens;
}

test('attentional decay actually compacts old turns at the default level', () => {
  const atDefault = decayTokens({ level: 'standard' });
  const atUltra = decayTokens({ level: 'ultra' });

  assert.strictEqual(
    atDefault,
    atUltra,
    `decay forces 'ultra' for old turns, so the default level must reach the same result (${atDefault} vs ${atUltra}) — otherwise the derived trust policy is vetoing the forced level`,
  );
});

test('attentional decay measurably beats no decay', () => {
  const withDecay = decayTokens({ level: 'standard' });
  const withoutDecay = new GlyphCompressor({ level: 'standard', provider: 'openai' })
    .compressMessages(buildDecayThread(), 'openai').stats.thisMessage.compressedTokens;

  // Threshold measured, not chosen. On the distinct-content fixture the
  // ratio is 0.53 with decay working and exactly 1.00 with it disabled, so
  // 0.7 sits clear of both. The previous 0.5 was calibrated against a
  // fixture that repeated one identical snippet, where decay's cold-zone
  // summarization was partly just deduplicating — work _elideRepeatedBlocks
  // now does earlier, which is why that threshold stopped reflecting decay.
  assert(
    withDecay < withoutDecay * 0.7,
    `decay produced ${withDecay} vs ${withoutDecay} without it (ratio ${(withDecay / withoutDecay).toFixed(2)}) — a disabled decay measures 1.00, so anything near it means old-turn compaction is not running`,
  );
});

test('attentional decay still respects an explicitly pinned trust policy', () => {
  const pinned = decayTokens({ level: 'standard', trustPolicy: 'reversible' });
  const derived = decayTokens({ level: 'standard' });
  assert(pinned > derived, 'a pinned reversible policy must keep blocking ultra transforms even under decay');
});

// ─── Differential transmission (repeated-block elision) ────────
// IDEs re-attach open-file context every turn, so the same file arrives
// unchanged turn after turn. Measured before this existed: the same file over
// 5 turns emitted 1635|1635|1592|1592|1592 real tokens — full weight every
// time, within a single request the model reads as a whole.

function repeatedFileThread(turns) {
  const messages = [];
  for (let i = 1; i <= turns; i++) {
    messages.push({ role: 'user', content: `Turn ${i}: reviewing the same file.\n\n\`\`\`js\n${codeSample}\n\`\`\`\nWhat changed?` });
    if (i < turns) messages.push({ role: 'assistant', content: 'Noted.' });
  }
  return messages;
}

test('a file re-sent across turns is transmitted once, not once per turn', () => {
  const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
  const result = gc.compressMessages(repeatedFileThread(5), 'openai');
  const body = JSON.stringify(result.messages);

  // The fence survives exactly once — in the most recent turn.
  const fences = body.match(/```/g) || [];
  assert.strictEqual(
    fences.length,
    2,
    `expected one surviving code block (two fence markers), found ${fences.length / 2} blocks — the file is still being re-sent per turn`,
  );
  // Asserted on the leading fragment, not the whole sentence: the dynamic
  // dictionary legitimately substitutes words inside the marker ("…in this
  // §69 — see the most recent copy"), and its definition ships in the same
  // request's DYN line, so the marker stays decodable. Matching the full
  // string would fail on a working system.
  // Two marker wordings since v1.33.9, because the reference direction has to
  // match which copy survived: "repeated later … most recent copy" when decay
  // is on and the newest is kept, "shown earlier … first copy" when it is off
  // and the oldest is kept. Asserted on the leading fragment of either, not
  // the whole sentence: the dynamic dictionary legitimately substitutes words
  // inside the marker, and its definition ships in the same request's DYN
  // line, so the marker stays decodable. Matching the full string would fail
  // on a working system.
  assert(
    body.includes('identical code block repeated') || body.includes('identical code block shown earlier'),
    'the non-surviving turns should carry an elision marker',
  );
});

// Which copy survives depends on whether anything rewrites history, and both
// directions have to be pinned — each is unsafe in the other's mode.
//
// With decay ON the newest must survive: decay compacts OLD turns, so a marker
// pointing backwards would dangle once its referent was summarised away — the
// silent failure class of the ◈₍1₎ collision fixed in v1.32.6. Measured over a
// 10-turn session, turns 0-5 come back decayed with their code replaced by
// structural summaries.
//
// With decay OFF nothing compacts anything, so the oldest can survive — and
// keeping it means history bytes never change, which is what a provider's
// prefix cache keys on. Measured: prefix breaks drop from 9-of-9 to 1-of-9
// over 10 turns, and because the transmitted token count is identical either
// way (-75.4%), the entire difference lands on the bill: -63.7% keeping the
// newest against -75.4% keeping the oldest on OpenAI, -66.8% vs -78.5% on
// Anthropic. Reproduce with `npm run measure:implicit-cache`.
for (const decay of [false, true]) {
  test(`the surviving copy is the ${decay ? 'newest (decay on: nothing else survives compaction)' : 'oldest (decay off: keeps the cache prefix intact)'}`, () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'openai', attentionalDecay: decay });
    const messages = gc.compressMessages(repeatedFileThread(4), 'openai').messages;
    const users = messages.filter((m) => m.role === 'user');
    const withFence = users.filter((m) => typeof m.content === 'string' && m.content.includes('```'));

    assert.strictEqual(withFence.length, 1, 'exactly one turn should still carry the block');
    assert.strictEqual(
      withFence[0],
      decay ? users[users.length - 1] : users[0],
      decay
        ? 'with decay on, the surviving copy must be the newest turn — keeping an old one is what decay would later destroy'
        : 'with decay off, the surviving copy must be the oldest turn — keeping the newest rewrites history every turn and misses the prefix cache',
    );

    // The marker must point the way the survivor actually lies. A back-
    // reference emitted while the newest copy survived would send the model
    // looking in the wrong direction.
    const markers = users
      .filter((m) => m !== withFence[0])
      .map((m) => (typeof m.content === 'string' ? m.content : ''));
    assert(markers.length > 0, 'precondition: some turns must have been elided');
    for (const text of markers) {
      assert(
        decay ? text.includes('repeated later') : text.includes('shown earlier'),
        `marker direction must match the surviving copy (decay=${decay}), got: ${text.slice(0, 120)}`,
      );
    }
  });
}

test('elision holds up with attentional decay enabled', () => {
  const plain = new GlyphCompressor({ level: 'standard', provider: 'openai' })
    .compressMessages(repeatedFileThread(5), 'openai').stats.thisMessage.compressedTokens;
  const decayed = new GlyphCompressor({ level: 'standard', provider: 'openai', attentionalDecay: true })
    .compressMessages(repeatedFileThread(5), 'openai').stats.thisMessage.compressedTokens;
  assert(decayed <= plain * 1.05, `decay must not undo the elision (${decayed} vs ${plain})`);
});

test('a block that appears only once is never elided', () => {
  // The marker costs tokens; applying it to a non-repeated block would be a
  // pure loss, and would also destroy content the model needs.
  const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
  const unique = [
    { role: 'user', content: `First file:\n\n\`\`\`js\n${codeSample.slice(0, 3000)}\n\`\`\`` },
    { role: 'assistant', content: 'ok' },
    { role: 'user', content: `Different file:\n\n\`\`\`js\n${codeSample.slice(3000, 6000)}\n\`\`\`` },
  ];
  const body = JSON.stringify(gc.compressMessages(unique, 'openai').messages);
  assert(!body.includes('identical code block repeated later'), 'distinct blocks must survive untouched');
});

// ─── Compression level normalization ───────────────────────────
// `provider` and `trustPolicy` have always resolved their input and reported
// the resolved value. `level` was stored verbatim, so a capital letter was
// enough to miss every `level === 'ultra'` check while sourceMap.level,
// stats.selectedLevel, and the CLI's --explain all echoed the typo back as
// though it had been applied.

function realSavingFor(level) {
  const gc = new GlyphCompressor({ level, provider: 'openai' });
  const out = gc.compressText(codeSample, 'openai');
  return { resolved: gc.level, trust: gc.trustPolicy, tokens: out.stats.compressedTokens };
}

test("a differently-cased level resolves to the real one, not to silent degradation", () => {
  const canonical = realSavingFor('ultra');
  const shouty = realSavingFor('Ultra');
  const padded = realSavingFor('  ULTRA  ');

  assert.strictEqual(shouty.resolved, 'ultra', "'Ultra' must resolve to 'ultra', not be stored verbatim");
  assert.strictEqual(padded.resolved, 'ultra', "surrounding whitespace must not change the level");
  assert.strictEqual(
    shouty.tokens,
    canonical.tokens,
    `'Ultra' produced ${shouty.tokens} real tokens vs 'ultra' at ${canonical.tokens} — a capitalization difference is silently costing compression`,
  );
  assert.strictEqual(shouty.trust, canonical.trust, 'the derived trust policy must follow the resolved level');
});

test('an unrecognized level resolves to the default and reports that, rather than echoing the input', () => {
  const bogus = realSavingFor('totally-bogus');
  const standard = realSavingFor('standard');
  assert.strictEqual(bogus.resolved, 'standard', 'an unknown level must resolve to the documented default');
  assert.strictEqual(
    bogus.tokens,
    standard.tokens,
    'an unknown level must behave exactly like the default it resolved to',
  );
});

test("'auto' survives normalization", () => {
  // Regression guard: normalizing too aggressively would collapse 'auto' into
  // 'standard' and silently disable per-content level selection entirely.
  const gc = new GlyphCompressor({ level: 'auto', provider: 'openai' });
  assert.strictEqual(gc.level, 'auto', "'auto' must not be normalized away");
  const auto = gc.compressText(codeSample, 'openai').stats.compressedTokens;
  const ultra = realSavingFor('ultra').tokens;
  assert.strictEqual(auto, ultra, 'auto should still select ultra for this code-heavy sample');
});

// ─── Budget planning behavior ──────────────────────────────────

test('a generous budget spends no fidelity it does not need', () => {
  const plan = planCompressionForBudget(codeSample, { budget: 1000000, provider: 'raw' });
  assert.strictEqual(plan.level, 'light', 'should stop at the lightest level once it fits');
  assert.strictEqual(plan.withinBudget, true);
  assert.strictEqual(plan.trials.length, 1, 'should not keep trying heavier levels after one fits');
});

test('a tight-but-reachable budget escalates to a heavier level', () => {
  const light = planCompressionForBudget(codeSample, { budget: 1000000, provider: 'raw' });
  // Ask for less than 'light' produces, but still reachable by a heavier level.
  const target = light.tokens - 100;
  const plan = planCompressionForBudget(codeSample, { budget: target, provider: 'raw' });

  assert.notStrictEqual(plan.level, 'light', 'must escalate past light when light does not fit');
  assert(plan.trials.length > 1, 'should record the levels it rejected');
  if (plan.withinBudget) {
    assert(plan.tokens <= target, 'a plan reported as within budget must actually be within budget');
  }
});

test('escalation genuinely changes the output — ultra is materially smaller than standard', () => {
  const plan = planCompressionForBudget(codeSample, { budget: 1, provider: 'raw' });
  assert.strictEqual(plan.trials.length, 4, 'an impossible budget should try every level');

  const ultra = plan.trials.find((t) => t.level === 'ultra');
  const standard = plan.trials.find((t) => t.level === 'standard');

  // Deliberately compared against *standard*, not *light*. Under the
  // level/trust coupling bug, ultra collapses to exactly standard's output
  // while light still differs by a couple of tokens for unrelated reasons —
  // so a "levels are not all identical" check passes while the bug is fully
  // present. Only a real margin over standard actually detects it.
  const shrink = 1 - ultra.bodyTokens / standard.bodyTokens;
  assert(
    shrink > 0.05,
    `ultra shrank the body by only ${(shrink * 100).toFixed(1)}% vs standard (${ultra.bodyTokens} vs ${standard.bodyTokens}) — ultra's summarization is not running, which is the level/trust coupling bug`,
  );
});

test('an impossible budget reports the overflow instead of silently failing', () => {
  const plan = planCompressionForBudget(codeSample, { budget: 10, provider: 'raw' });
  assert.strictEqual(plan.withinBudget, false);
  assert(plan.overflowTokens > 0, 'overflow must be quantified');
  assert.strictEqual(plan.overflowTokens, plan.tokens - 10, 'overflow must equal the actual excess');
  assert(plan.compressed.length > 0, 'must still return usable output, not nothing');
});

test('the codebook is counted against the budget by default', () => {
  const withBook = planCompressionForBudget(codeSample, { budget: 1, provider: 'raw' });
  const withoutBook = planCompressionForBudget(codeSample, { budget: 1, provider: 'raw', includeCodebook: false });

  assert(withBook.codebookTokens > 0, 'codebook cost must be counted by default');
  assert.strictEqual(withoutBook.codebookTokens, 0, 'includeCodebook:false must exclude it');
  assert(
    withBook.tokens > withoutBook.tokens,
    'budgeting on the body alone would under-report what is actually transmitted',
  );
});

test('a non-positive or missing budget is rejected rather than silently defaulted', () => {
  const gc = new GlyphCompressor({ provider: 'raw' });
  for (const bad of [undefined, 0, -5, 'lots']) {
    assert.throws(
      () => gc.compressToBudget(codeSample, { budget: bad }),
      /positive numeric `budget`/,
      `budget=${String(bad)} should throw`,
    );
  }
});

test('a custom escalation ladder is honored', () => {
  const plan = planCompressionForBudget(codeSample, { budget: 1, provider: 'raw', levels: ['standard', 'ultra'] });
  assert.deepStrictEqual(plan.trials.map((t) => t.level), ['standard', 'ultra']);
});

// ─── State hygiene ─────────────────────────────────────────────

test('discarded trials do not inflate lifetime telemetry', () => {
  const gc = new GlyphCompressor({ provider: 'raw' });
  const before = { ...gc.stats };

  // Budget of 1 forces all four levels to run, three of which are discarded.
  const plan = gc.compressToBudget(codeSample, { budget: 1 });

  assert.strictEqual(plan.trials.length, 4, 'precondition: all four levels ran');
  assert.strictEqual(
    gc.stats.messagesProcessed,
    before.messagesProcessed + 1,
    'a single logical compression must count once, not once per trial',
  );
  assert.strictEqual(
    gc.stats.totalCompressedTokens,
    before.totalCompressedTokens + plan.bodyTokens,
    'only the winning trial should contribute to lifetime compressed tokens',
  );
});

test('planning restores the compressor level and trust policy', () => {
  const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
  const policyBefore = gc.trustPolicy;
  gc.compressToBudget(codeSample, { budget: 1 });
  assert.strictEqual(gc.level, 'standard', 'level must be restored after the search');
  assert.strictEqual(gc.trustPolicy, policyBefore, 'trust policy must be restored after the search');
});

test('the standalone planner does not touch the caller session or write a cache', () => {
  const gc = new GlyphCompressor({ provider: 'raw' });
  const dictBefore = gc.dynamicDict.size;
  const processedBefore = gc.stats.messagesProcessed;

  planCompressionForBudget(codeSample, { budget: 1, provider: 'raw' });

  assert.strictEqual(gc.dynamicDict.size, dictBefore, 'standalone planning must not mutate an unrelated compressor');
  assert.strictEqual(gc.stats.messagesProcessed, processedBefore);

  const throwaway = new GlyphCompressor({ provider: 'raw' });
  assert.strictEqual(throwaway.cacheFile, null, 'a compressor with no workspacePath must not bind an on-disk cache');
});

test('reported token arithmetic is internally consistent', () => {
  const plan = planCompressionForBudget(codeSample, { budget: 1000000, provider: 'raw' });
  assert.strictEqual(plan.tokens, plan.bodyTokens + plan.codebookTokens, 'total must equal body + codebook');
  assert.strictEqual(plan.overflowTokens, 0, 'a met budget has no overflow');
  const winner = plan.trials.find((t) => t.level === plan.level);
  assert.strictEqual(winner.totalTokens, plan.tokens, 'headline tokens must match the winning trial');
});

console.log(`\ncontext-budget-planner: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('context-budget-planner suite ok');
}
