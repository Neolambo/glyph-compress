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
      git('add', '.');
      git('commit', '-q', '-m', 'initial');
      // Modify one tracked file (unstaged) and add a brand-new one (staged) —
      // neither mentions the query terms at all, so only gitDiffOnly can surface them.
      fs.writeFileSync(path.join(gitDir, 'changed.ts'), 'export const updated = 2;\n', 'utf8');
      fs.writeFileSync(path.join(gitDir, 'new-staged.ts'), 'export const brandNew = 3;\n', 'utf8');
      git('add', 'new-staged.ts');

      const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
      const result = gc.routeAndCompress('review my changes please', { rootDir: gitDir, tokenBudget: 5000, maxFiles: 10, gitDiffOnly: true });
      const paths = result.selectedFiles.map((f) => f.path).sort();
      assert.deepStrictEqual(paths, ['changed.ts', 'new-staged.ts'], `gitDiffOnly should only include changed files, got: ${JSON.stringify(paths)}`);
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

console.log(`\ncontext-router: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('context-router suite ok');
}
