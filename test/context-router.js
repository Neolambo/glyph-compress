/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Context Router Suite
 *
 * GlyphCompressor.routeAndCompress() (v1.17.0) wires workspace-intelligence
 * file ranking directly into compression: instead of the IDE caller
 * manually picking which open files to send, GlyphCompress ranks files by
 * relevance to the query and compresses as many as fit inside a token
 * budget, returning which files were selected/excluded and why.
 *
 * Building this exposed a real, pre-existing bug: extractDiagnostics()'s
 * TODO/FIXME/HACK regex had no word boundaries, so "HACK" matched inside
 * "Hacker News" and made unrelated marketing docs outrank the actual
 * relevant source file for a bug-fix query. This suite locks in the fix.
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { GlyphCompressor } from '../src/glyph-middleware.js';
import { buildWorkspaceCodebook } from '../src/workspace-intelligence.js';

let passed = 0;
let failed = 0;

// Async tests rejected *after* fn() returned, so the try/catch never saw the
// failure: the suite printed a green tick and reported "0 failed". Verified by
// forcing a false assertion inside the async test below — it still passed.
// Their results are collected here and awaited before the summary instead.
const pending = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      pending.push(result.then(
        () => { passed++; console.log(`  ✓ ${name}`); },
        (err) => { failed++; console.log(`  ✗ ${name}: ${err.message}`); },
      ));
      return;
    }
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-router-suite-'));

try {
  fs.mkdirSync(path.join(dir, 'src', 'services'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'src', 'services', 'auth.ts'),
    "export function AuthenticationManager() {\n  // error TS2339: Property 'name' does not exist\n  return true;\n}\n",
    'utf8',
  );
  fs.writeFileSync(
    path.join(dir, 'src', 'services', 'unrelated.ts'),
    "export function unrelatedHelper() { return 42; }\n",
    'utf8',
  );
  fs.writeFileSync(
    path.join(dir, 'docs', 'outreach.md'),
    'This announcement is for Hacker News, LinkedIn, and Product Hunt communities.\n'.repeat(20),
    'utf8',
  );

  test('routeAndCompress selects the file relevant to the bug-fix query, not the marketing doc', () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
    const result = gc.routeAndCompress('fix the AuthenticationManager error', { rootDir: dir, tokenBudget: 5000, maxFiles: 6 });
    assert(result.intents.includes('fix_error'), 'should detect fix_error intent');
    assert(result.selectedFiles.some((f) => f.path === 'src/services/auth.ts'), `auth.ts should be selected, got: ${JSON.stringify(result.selectedFiles)}`);
    assert(!result.selectedFiles.some((f) => f.path === 'docs/outreach.md'), '"Hacker News" prose must not be mistaken for a HACK diagnostic and outrank the real file');
  });

  test('routeAndCompress respects the token budget and reports excluded files with a reason', () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
    const result = gc.routeAndCompress('fix the AuthenticationManager error', { rootDir: dir, tokenBudget: 1, maxFiles: 6 });
    assert(result.tokensUsed <= result.tokenBudget, 'tokensUsed should never exceed the budget');
    assert(result.excludedFiles.length > 0, 'an unreasonably small budget should exclude files');
    assert(result.excludedFiles.every((f) => f.reason), 'every excluded file should carry a reason');
  });

  test('routeAndCompress exposes a per-file sourceMap for auditability', () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
    const result = gc.routeAndCompress('fix the AuthenticationManager error', { rootDir: dir, tokenBudget: 5000, maxFiles: 6 });
    const authFile = result.selectedFiles.find((f) => f.path === 'src/services/auth.ts');
    assert(authFile, 'auth.ts should be selected');
    assert(authFile.sourceMap && Array.isArray(authFile.sourceMap.files), 'selected file should carry its own sourceMap');
  });

  test('routeAndCompress with gitDiffOnly restricts to staged/unstaged files, ignoring query relevance', () => {
    const gitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-router-git-'));
    try {
      const git = (...cmdArgs) => execFileSync('git', cmdArgs, { cwd: gitDir, encoding: 'utf8' });
      git('init', '-q');
      git('config', 'user.email', 'test@example.com');
      git('config', 'user.name', 'Test');
      fs.writeFileSync(path.join(gitDir, 'committed.ts'), 'export const committed = 1;\n', 'utf8');
      fs.writeFileSync(path.join(gitDir, 'changed.ts'), 'export const original = 1;\n', 'utf8');
      // A committed, *unmodified* decoy that scores high on the query. Without
      // it this test passed even with the gitDiffOnly filter fully disabled:
      // the only other unchanged file scored zero, and workspace intelligence
      // already boosts git-dirty files during ranking, so the filter made no
      // observable difference. The decoy is what forces the two paths apart —
      // it wins on relevance and must still be excluded.
      fs.writeFileSync(
        path.join(gitDir, 'authentication-review.ts'),
        'export function reviewAuthentication() { /* review authentication changes */ }\n',
        'utf8',
      );
      git('add', '.');
      git('commit', '-q', '-m', 'initial');
      // Modify one tracked file (unstaged) and add a brand-new one (staged) —
      // neither mentions the query terms at all, so only gitDiffOnly can surface them.
      fs.writeFileSync(path.join(gitDir, 'changed.ts'), 'export const updated = 2;\n', 'utf8');
      fs.writeFileSync(path.join(gitDir, 'new-staged.ts'), 'export const brandNew = 3;\n', 'utf8');
      git('add', 'new-staged.ts');

      const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
      const query = 'review authentication changes';
      const result = gc.routeAndCompress(query, { rootDir: gitDir, tokenBudget: 5000, maxFiles: 10, gitDiffOnly: true });
      const paths = result.selectedFiles.map((f) => f.path).sort();
      assert.deepStrictEqual(paths, ['changed.ts', 'new-staged.ts'], `gitDiffOnly should only include changed files, got: ${JSON.stringify(paths)}`);

      // Same query without the flag must reach the decoy, proving the
      // assertion above is discriminating rather than incidental.
      const unfiltered = gc.routeAndCompress(query, { rootDir: gitDir, tokenBudget: 5000, maxFiles: 10 });
      assert(
        unfiltered.selectedFiles.some((f) => f.path === 'authentication-review.ts'),
        'control: without gitDiffOnly the relevant unchanged file must be selected, otherwise the filtered assertion proves nothing',
      );
    } finally {
      fs.rmSync(gitDir, { recursive: true, force: true });
    }
  });

  test('extractDiagnostics regression: "Hacker" prose is not treated as a HACK marker', async () => {
    const { buildWorkspaceCodebook } = await import('../src/workspace-intelligence.js');
    const codebook = buildWorkspaceCodebook(dir);
    const outreachDiagnostics = codebook.diagnostics.filter((d) => d.file === 'docs/outreach.md');
    assert.strictEqual(outreachDiagnostics.length, 0, `"Hacker News" should not produce false-positive diagnostics, got: ${JSON.stringify(outreachDiagnostics)}`);
  });
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

// A file added after the workspace codebook was last persisted must still be
// reachable. selectRelevantFiles() used to take loadWorkspaceCodebook() as-is
// whenever a saved codebook existed, so routing ran against whatever the last
// `glyph-compress inspect` left behind. Measured on this repository before the
// fix: an 8-day-old snapshot listed 119 files where a rebuild found 136 — 17
// files, including src/anthropic-bridge.js, could never be selected. The
// router still returned a confident scored list, so the omission was silent.
test('routing sees files added after the codebook was persisted', () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-router-stale-'));
  try {
    fs.writeFileSync(path.join(ws, 'alpha.js'), 'export function alphaHandler() { return 1; }\n');

    // Persist a codebook that knows only about alpha.js.
    const first = new GlyphCompressor({ level: 'standard', provider: 'raw' });
    first.routeAndCompress('alpha', { rootDir: ws, tokenBudget: 2000, maxFiles: 5 });

    // Now add a file the persisted snapshot has never seen.
    fs.writeFileSync(path.join(ws, 'betaSpecialMarker.js'), 'export function betaSpecialMarker() { return 2; }\n');

    const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
    const result = gc.routeAndCompress('betaSpecialMarker', { rootDir: ws, tokenBudget: 2000, maxFiles: 5 });
    const paths = result.selectedFiles.map((f) => f.path);

    assert(
      paths.some((p) => p.includes('betaSpecialMarker')),
      `a file created after the codebook was saved was invisible to routing; selected: ${paths.join(', ') || '(none)'}`,
    );
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

// readTextFile() returned '' for any file over maxFileBytes rather than
// reading a prefix, so an oversized file contributed no symbols, no imports
// and no diagnostics — it could never be selected, while the router still
// returned a confident scored list without it. Measured on this repository at
// the default 120,000-byte limit, exactly one file crossed it:
// vscode-ext/glyph-middleware.js at 122,875 bytes, indexing as 0 lines and 0
// symbols despite holding the compressor, the privacy patterns and the decay
// zones. A query for a symbol unique to it went unranked; it now ranks first.
//
// Same silent-omission shape as the stale index above: valid output, one file
// permanently missing from it.
test('a file larger than maxFileBytes is indexed from its prefix, not skipped', () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-router-big-'));
  try {
    // Distinctive symbol near the top, then padding past the limit. Padding is
    // varied rather than one repeated line so it cannot be mistaken for the
    // kind of degenerate input a scanner might special-case.
    const header = 'export function oversizedUniqueMarker() { return 1; }\n';
    const padding = Array.from({ length: 4000 }, (_, i) => `const filler${i} = ${i};`).join('\n');
    const bigPath = path.join(ws, 'oversized.js');
    fs.writeFileSync(bigPath, header + padding, 'utf8');
    fs.writeFileSync(path.join(ws, 'small.js'), 'export function unrelatedSmall() { return 2; }\n', 'utf8');

    const maxFileBytes = 2000;
    assert(
      fs.statSync(bigPath).size > maxFileBytes,
      'fixture must exceed the limit or this test proves nothing',
    );

    const codebook = buildWorkspaceCodebook(ws, { incremental: false, maxFileBytes });
    const entry = codebook.files.find((f) => f.path === 'oversized.js');

    assert(entry, 'the oversized file should still appear in the codebook');
    assert(
      entry.symbols.includes('oversizedUniqueMarker'),
      `an oversized file must be indexed from its prefix; got symbols: ${JSON.stringify(entry.symbols)}`,
    );
    assert(entry.lines > 0, `an oversized file should report a real line count, got ${entry.lines}`);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

await Promise.all(pending);

console.log(`\ncontext-router: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('context-router suite ok');
}
