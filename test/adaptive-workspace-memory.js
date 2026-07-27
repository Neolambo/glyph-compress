/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Adaptive Workspace Memory Suite
 *
 * v1.23.0 makes buildWorkspaceCodebook() incremental by default: a file
 * whose mtime hasn't changed since the last build reuses its previous
 * symbols/imports/diagnostics instead of being re-parsed. It also adds
 * recordFileUsage()/usageBoost(), a half-life-decayed relevance boost for
 * files that were actually selected and sent in past routeAndCompress()
 * calls, so proven-useful files can outrank a cold keyword match over time.
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildWorkspaceCodebook,
  saveWorkspaceCodebook,
  loadWorkspaceCodebook,
  recordFileUsage,
  selectRelevantFiles,
} from '../src/workspace-intelligence.js';
import { GlyphCompressor } from '../src/glyph-middleware.js';

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

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-awm-suite-'));

try {
  fs.writeFileSync(path.join(dir, 'a.js'), 'export function alpha() { return 1; }\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'b.js'), 'export function beta() { return 2; }\n', 'utf8');

  test('buildWorkspaceCodebook rescans every file on a cold first build', () => {
    const codebook = buildWorkspaceCodebook(dir);
    assert.strictEqual(codebook.incrementalStats.reused, 0, 'nothing should be reused on the first build');
    assert.strictEqual(codebook.incrementalStats.rescanned, 2, 'both files should be rescanned');
    assert.strictEqual(codebook.incrementalStats.total, 2);
  });

  test('buildWorkspaceCodebook reuses unchanged files against a saved previous codebook', () => {
    const first = buildWorkspaceCodebook(dir);
    saveWorkspaceCodebook(dir, first);
    const second = buildWorkspaceCodebook(dir);
    assert.strictEqual(second.incrementalStats.reused, 2, 'both unchanged files should be reused');
    assert.strictEqual(second.incrementalStats.rescanned, 0, 'no file should be rescanned when nothing changed');
    const alphaSummary = second.files.find((f) => f.path === 'a.js');
    assert(alphaSummary.symbols.includes('alpha'), 'reused summary should still carry the original extracted symbols');
  });

  test('buildWorkspaceCodebook rescans only the file whose mtime changed', () => {
    const first = buildWorkspaceCodebook(dir);
    saveWorkspaceCodebook(dir, first);
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(path.join(dir, 'a.js'), future, future);
    const second = buildWorkspaceCodebook(dir, { previousCodebook: first });
    assert.strictEqual(second.incrementalStats.reused, 1, 'the untouched file should be reused');
    assert.strictEqual(second.incrementalStats.rescanned, 1, 'only the touched file should be rescanned');
  });

  test('buildWorkspaceCodebook rescans everything when incremental: false is passed', () => {
    const first = buildWorkspaceCodebook(dir);
    saveWorkspaceCodebook(dir, first);
    const second = buildWorkspaceCodebook(dir, { incremental: false });
    assert.strictEqual(second.incrementalStats.reused, 0, 'incremental: false should force a full rescan');
    assert.strictEqual(second.incrementalStats.rescanned, 2);
  });

  test('recordFileUsage persists usage counts onto the saved codebook', () => {
    const codebook = buildWorkspaceCodebook(dir);
    saveWorkspaceCodebook(dir, codebook);
    recordFileUsage(dir, ['a.js']);
    recordFileUsage(dir, ['a.js']);
    const reloaded = loadWorkspaceCodebook(dir);
    assert.strictEqual(reloaded.usage['a.js'].count, 2, 'usage count should accumulate across calls');
    assert(reloaded.usage['a.js'].lastUsedAt, 'usage entry should record a timestamp');
  });

  test('recordFileUsage builds and persists a codebook when none exists yet', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-awm-empty-'));
    try {
      fs.writeFileSync(path.join(emptyDir, 'x.js'), 'export const x = 1;\n', 'utf8');
      const result = recordFileUsage(emptyDir, ['x.js']);
      assert(result, 'recordFileUsage should build a codebook on the fly rather than no-op');
      assert.strictEqual(result['x.js'].count, 1);
      const persisted = loadWorkspaceCodebook(emptyDir);
      assert(persisted, 'the on-the-fly codebook should be persisted to disk for future incremental builds');
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  test('recordFileUsage returns null for an empty file list without touching disk', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-awm-empty2-'));
    try {
      const result = recordFileUsage(emptyDir, []);
      assert.strictEqual(result, null);
      assert.strictEqual(loadWorkspaceCodebook(emptyDir), null, 'no codebook should be created for an empty usage list');
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  // v1.23.0 let usage "outrank a cold keyword match" — a used file could
  // surface on a query it matched nothing in. That is unsound here, because
  // routeAndCompress() records usage for everything it selects and nothing
  // records whether the selection was correct, so the boost feeds on the
  // router's own output. Measured on this repository, examples/test-dashboard.tsx
  // reached count 318 and won "dashboard escapeHtml crashes" on one generic
  // path match, beating src/dashboard.js which matched the rare term.
  //
  // Since v1.33.3 usage breaks ties between files that already matched, and
  // cannot manufacture a match. Both halves are asserted below: without the
  // second, capping the boost to zero would still pass.
  test('usage breaks ties between matched files but cannot surface an unmatched one', () => {
    const tieDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-awm-tie-'));
    try {
      // alphaMarker and betaMarker each appear in exactly one file, so the two
      // score identically on the query and only usage can separate them.
      fs.writeFileSync(path.join(tieDir, 'a.js'), 'export function alphaMarker() { return 1; }\n', 'utf8');
      fs.writeFileSync(path.join(tieDir, 'b.js'), 'export function betaMarker() { return 2; }\n', 'utf8');
      fs.writeFileSync(path.join(tieDir, 'c.js'), 'export function unrelatedThing() { return 3; }\n', 'utf8');
      saveWorkspaceCodebook(tieDir, buildWorkspaceCodebook(tieDir));

      // c.js is used the most, and matches nothing in the query.
      for (let i = 0; i < 5; i++) recordFileUsage(tieDir, ['c.js']);
      recordFileUsage(tieDir, ['a.js']);
      recordFileUsage(tieDir, ['a.js']);
      recordFileUsage(tieDir, ['a.js']);

      const { files } = selectRelevantFiles(tieDir, 'alphaMarker betaMarker', { limit: 12 });
      const alpha = files.find((f) => f.path === 'a.js');
      const beta = files.find((f) => f.path === 'b.js');
      const unrelated = files.find((f) => f.path === 'c.js');

      assert(alpha && beta, `both matched files should rank, got: ${files.map((f) => f.path).join(', ')}`);
      assert(alpha.score > beta.score, 'among files that matched equally, the more-used one should rank higher');
      assert(
        !unrelated || unrelated.score === 0,
        `a file matching nothing in the query must earn no usage boost, got score=${unrelated?.score}`,
      );
      assert(
        !unrelated || unrelated.score < beta.score,
        'the heavily-used but unmatched file must not outrank a genuine keyword match',
      );
    } finally {
      fs.rmSync(tieDir, { recursive: true, force: true });
    }
  });

  // The gate above stops usage inventing relevance; this covers the other
  // half, that it cannot outweigh relevance either. USAGE_COUNT_CAP sits below
  // the points one term match earns, so a heavily-used weak match still loses
  // to an unused strong one. Raising the cap back to its pre-1.33.3 value of 10
  // is caught here, and is worth catching: measured against six ground-truth
  // queries on this repository, cap 10 retrieves 2/6 and cap 3 retrieves 3/6,
  // because scripts/build-middleware.js is used often enough to displace
  // src/workspace-intelligence.js on its own query.
  test('a heavily-used weak match does not outrank an unused strong match', () => {
    const capDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-awm-cap-'));
    try {
      // heavy.js matches one query term; exact.js matches that plus a rarer one.
      fs.writeFileSync(path.join(capDir, 'heavy.js'), 'export function serviceHandler() { return 1; }\n', 'utf8');
      fs.writeFileSync(path.join(capDir, 'exact.js'), 'export function serviceHandler() { return zzRareMarker; }\nexport const zzRareMarker = 2;\n', 'utf8');
      saveWorkspaceCodebook(capDir, buildWorkspaceCodebook(capDir));
      for (let i = 0; i < 10; i++) recordFileUsage(capDir, ['heavy.js']);

      const { files } = selectRelevantFiles(capDir, 'serviceHandler zzRareMarker', { limit: 12 });
      const heavy = files.find((f) => f.path === 'heavy.js');
      const exact = files.find((f) => f.path === 'exact.js');

      assert(heavy && exact, `both files should rank, got: ${files.map((f) => f.path).join(', ')}`);
      assert(
        exact.score > heavy.score,
        `the stronger match must win despite 10 recorded uses of the weaker one (exact=${exact.score.toFixed(2)}, heavy=${heavy.score.toFixed(2)})`,
      );
    } finally {
      fs.rmSync(capDir, { recursive: true, force: true });
    }
  });

  test('routeAndCompress records usage for every file it actually selects', () => {
    const routeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-awm-route-'));
    try {
      fs.writeFileSync(path.join(routeDir, 'auth.js'), "export function AuthenticationManager() {\n  // error: broken login\n  return true;\n}\n", 'utf8');
      const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
      const result = gc.routeAndCompress('fix the AuthenticationManager error', { rootDir: routeDir, tokenBudget: 5000, maxFiles: 6 });
      assert(result.selectedFiles.some((f) => f.path === 'auth.js'), 'auth.js should be selected for the bug-fix query');
      const codebook = loadWorkspaceCodebook(routeDir);
      assert(codebook.usage['auth.js'], 'routeAndCompress should have recorded usage for the selected file');
      assert.strictEqual(codebook.usage['auth.js'].count, 1);
    } finally {
      fs.rmSync(routeDir, { recursive: true, force: true });
    }
  });

  test('usage boost decays toward zero for old usage and never affects unrelated files', () => {
    const codebook = buildWorkspaceCodebook(dir);
    saveWorkspaceCodebook(dir, codebook);
    const stale = loadWorkspaceCodebook(dir);
    stale.usage = { 'a.js': { count: 10, lastUsedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() } };
    saveWorkspaceCodebook(dir, stale);
    const { files } = selectRelevantFiles(dir, 'random query with no keyword overlap', { limit: 12 });
    const alpha = files.find((f) => f.path === 'a.js');
    assert(!alpha || alpha.score < 0.01, `a year-old usage record should have decayed to a negligible boost, got score=${alpha?.score}`);
  });
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`\nadaptive-workspace-memory: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('adaptive-workspace-memory suite ok');
}
