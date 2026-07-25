/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Token Estimator Accuracy Suite (v1.30.0)
 *
 * Building test/benchmark-alternatives.js (v1.29.0) surfaced a real,
 * previously undetected bug: src/token-estimator.js's Unicode-glyph
 * penalty double-counted every astral-plane character (surrogate pairs
 * count as 2 UTF-16 code units) and applied a flat, uncalibrated +1.5
 * penalty regardless of character class, badly overestimating Unicode-
 * heavy prose. Worse, that overestimation dominated a SEPARATE, larger
 * issue: `charsPerToken: 3.8` for OpenAI was itself only accurate for
 * code (real: ~3.8-3.9), not prose (real: ~4.2-5.3) — confirmed with
 * real js-tiktoken measurement across five real files from this
 * repository, three of which real-token-regressed after "standard"
 * compression while the heuristic reported `fallback: false`.
 *
 * The fix has three parts, all locked in here:
 *   1. Codepoint-aware, class-calibrated Unicode penalty
 *      (estimateGlyphTokenCost / estimateProviderTokens).
 *   2. A recalibrated OpenAI charsPerToken (3.8 -> 4.2), the char-weighted
 *      blended average across the same five real files.
 *   3. A fallback safety margin (isCompressionTrusted, requiring a real
 *      10% heuristic-measured improvement, not just any nonzero one) —
 *      because even the recalibrated heuristic's ORIGINAL-vs-COMPRESSED
 *      *ratio* still overstated real improvement by ~10-14% on the same
 *      five files, a single point comparison isn't reliable enough on
 *      marginal content.
 *
 * Also locks in a real build-pipeline gap found while verifying the fix
 * actually took effect in the built CJS output: src/token-estimator.cjs
 * (which src/index.cjs, the root package's CJS entry point, requires
 * directly) was never rebuilt by scripts/build-middleware.js at all —
 * only the separate vscode-ext/token-estimator.cjs copy was. This suite
 * needs no network access or API key — js-tiktoken (already a
 * devDependency) runs entirely offline.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { getEncoding } from 'js-tiktoken';
import { estimateProviderTokens, estimateGlyphTokenCost, PROVIDER_TOKEN_PROFILES } from '../src/token-estimator.js';
import { GlyphCompressor } from '../src/glyph-middleware.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const enc = getEncoding('o200k_base');
const require = createRequire(import.meta.url);

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

// ─── Unicode codepoint counting: no double-counting surrogate pairs ────

test('estimateGlyphTokenCost does not double-count astral-plane (surrogate-pair) characters', () => {
  const astralChar = '𝒟'; // math-alphanumeric: 2 UTF-16 code units, 1 codepoint
  const charsPerToken = 3.8;
  const oldBuggyFormula = (glyph, cpt) => {
    let nonAsciiUnits = 0;
    for (let i = 0; i < glyph.length; i++) if (glyph.charCodeAt(i) > 127) nonAsciiUnits++;
    return glyph.length / cpt + 1.5 * nonAsciiUnits; // pre-v1.30.0 formula
  };
  const oldCost = oldBuggyFormula(astralChar, charsPerToken);
  const newCost = estimateGlyphTokenCost(astralChar, charsPerToken);
  // The old formula counted UTF-16 units (2, for one surrogate-pair
  // character) and multiplied by a flat 1.5 regardless of character
  // class — inflating every astral-plane character (emoji, and this
  // project's own math-alphanumeric substitution glyphs) beyond a
  // calibrated per-codepoint cost.
  assert(newCost < oldCost, `recalibrated cost (${newCost}) should be lower than the old double-counting formula's (${oldCost}) for an astral-plane character`);
});

test('estimateGlyphTokenCost treats a 2-codepoint BMP string and a 1-codepoint astral string differently, not by UTF-16 length alone', () => {
  const twoBmpChars = '——'; // 2 codepoints, 2 UTF-16 units
  const oneAstralChar = '𝒟'; // 1 codepoint, 2 UTF-16 units
  const twoBmpCost = estimateGlyphTokenCost(twoBmpChars, 3.8);
  const oneAstralCost = estimateGlyphTokenCost(oneAstralChar, 3.8);
  assert.notStrictEqual(twoBmpCost, oneAstralCost, 'equal UTF-16 length must not imply equal cost when the codepoint composition differs — that was the old bug, which counted UTF-16 units blindly');
});

// ─── Real-tokenizer cross-check: the heuristic should now track reality ──

const realFileCases = [
  'docs/architecture.md',
  'README.md',
  'ROADMAP.md',
  'src/compressor.js',
  'src/workspace-intelligence.js',
];

for (const relPath of realFileCases) {
  test(`estimateProviderTokens(openai) is within 30% of real js-tiktoken count for ${relPath}`, () => {
    const text = fs.readFileSync(path.join(root, relPath), 'utf8');
    const real = enc.encode(text).length;
    const heuristic = estimateProviderTokens([{ content: text }], 'openai');
    const errorPct = Math.abs(heuristic - real) / real;
    // Pre-fix, docs/architecture.md alone was off by ~40%. 30% is a loose
    // but meaningful ceiling — this is a heuristic, not a real tokenizer,
    // and no flat constant is exactly right for every file, but it must
    // not regress back toward the old, much larger error.
    assert(errorPct < 0.3, `heuristic ${heuristic} vs real ${real} (${(errorPct * 100).toFixed(1)}% error) exceeds the 30% ceiling`);
  });
}

// ─── The actual bug: compression must never survive as real-token-worse ──

for (const relPath of ['docs/architecture.md', 'README.md', 'ROADMAP.md']) {
  test(`GlyphCompressor never sends real-token-worse output for ${relPath} (openai, standard) — the original bug`, () => {
    const text = fs.readFileSync(path.join(root, relPath), 'utf8');
    const compressor = new GlyphCompressor({ level: 'standard', provider: 'openai' });
    const result = compressor.compressText(text, 'openai');
    const realOriginal = enc.encode(text).length;
    const realFinal = enc.encode(result.compressed).length;
    assert(realFinal <= realOriginal, `${relPath}: sent output measures ${realFinal} real tokens vs ${realOriginal} original — a real regression the fallback should have caught (fallback=${result.stats.fallback})`);
  });
}

test('GlyphCompressor still compresses real code files that genuinely benefit (no false-positive fallback)', () => {
  const text = fs.readFileSync(path.join(root, 'src/compressor.js'), 'utf8');
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'openai' });
  const result = compressor.compressText(text, 'openai');
  assert.strictEqual(result.stats.fallback, false, 'a file with a comfortable real compression margin should not be rejected by the new safety margin');
  const realOriginal = enc.encode(text).length;
  const realCompressed = enc.encode(result.compressed).length;
  assert(realCompressed < realOriginal, 'the accepted compression must be a genuine real-token improvement');
});

// ─── Build-pipeline gap: src/token-estimator.cjs must stay in sync ─────

test('src/token-estimator.cjs exists and is not silently stale relative to src/token-estimator.js', () => {
  const cjsPath = path.join(root, 'src', 'token-estimator.cjs');
  assert(fs.existsSync(cjsPath), 'src/token-estimator.cjs must exist — src/index.cjs (the root CJS entry point) requires it directly');
  const cjsSource = fs.readFileSync(cjsPath, 'utf8');
  // Cross-check a live-computed value against the ESM module's own
  // exported PROVIDER_TOKEN_PROFILES rather than hardcoding "4.2" here —
  // if the calibration constant changes again, this test should track it
  // automatically instead of needing a manual update every time.
  const expectedCharsPerToken = PROVIDER_TOKEN_PROFILES.openai.charsPerToken;
  assert(
    cjsSource.includes(String(expectedCharsPerToken)),
    `src/token-estimator.cjs does not contain the current openai charsPerToken (${expectedCharsPerToken}) — it was likely not rebuilt after src/token-estimator.js changed (this is exactly the gap found in v1.29.0/v1.30.0: only vscode-ext/token-estimator.cjs was rebuilt by scripts/build-middleware.js, not this file)`,
  );
});

test('src/token-estimator.cjs and vscode-ext/token-estimator.cjs report identical estimates (same build, not independently drifted copies)', () => {
  const srcCjs = require('../src/token-estimator.cjs');
  const vscodeCjs = require('../vscode-ext/token-estimator.cjs');
  const sample = [{ content: 'Fix the — bug in 𝒟ocker config, please review carefully.' }];
  assert.strictEqual(
    srcCjs.estimateProviderTokens(sample, 'openai'),
    vscodeCjs.estimateProviderTokens(sample, 'openai'),
    'both built CJS copies must agree — a mismatch means one was rebuilt and the other was not',
  );
});

console.log(`\ntoken-estimator-accuracy: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('token-estimator-accuracy suite ok');
}
