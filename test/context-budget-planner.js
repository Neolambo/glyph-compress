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
