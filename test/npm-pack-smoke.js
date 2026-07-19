/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — NPM Pack Smoke Suite
 *
 * Every other suite requires files by repo-relative path
 * (require('../vscode-ext/glyph-middleware.cjs')), which resolves fine
 * inside a full checkout regardless of what package.json's `files`
 * allowlist actually includes. That blind spot let two real packaging
 * bugs ship: vscode-ext/glyph-middleware.cjs required
 * "../src/workspace-intelligence.cjs" and "../src/team-codebook.cjs" —
 * fine inside this repo, fine even inside the published npm tarball
 * (which does include the whole src/ directory) — but the equivalent
 * VSIX-packaging bug was only caught by manually extracting a real
 * VSIX and starting the proxy from it (see test/extension.js for that
 * regression guard). Turning the same authoritative check around for
 * npm: actually run `npm pack`, extract the real tarball to a temp
 * directory with none of the rest of the repo present, and require()
 * the published entry points from there. If anything the entry points
 * transitively require is missing from package.json's `files`
 * allowlist, this fails with MODULE_NOT_FOUND, exactly like a real
 * `npm install glyph-compress` consumer would see.
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('..', import.meta.url));

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

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-npm-pack-smoke-'));

try {
  const packOutput = execFileSync('npm', ['pack', '--pack-destination', tmpDir], { cwd: root, encoding: 'utf8', shell: true });
  const tarballName = packOutput.trim().split('\n').pop().trim();
  const tarballPath = path.join(tmpDir, tarballName);
  assert(fs.existsSync(tarballPath), `expected npm pack to produce ${tarballPath}`);

  // --force-local: without it, bsdtar (Windows' bundled tar) misreads a
  // Windows path with a drive-letter colon (C:\...) as "host:path" remote-
  // shell syntax and fails with "Cannot execute remote shell".
  execFileSync('tar', ['--force-local', '-xf', tarballPath, '-C', tmpDir], { encoding: 'utf8' });
  const extractedRoot = path.join(tmpDir, 'package');
  assert(fs.existsSync(extractedRoot), 'expected npm pack tarball to extract a package/ directory');

  test('CJS entry point (require("glyph-compress")) resolves with no missing local dependencies', () => {
    const out = execFileSync(process.execPath, ['-e', `
      const pkg = require('${extractedRoot.replace(/\\/g, '\\\\')}');
      if (typeof pkg.GlyphCompressor !== 'function') throw new Error('GlyphCompressor missing from CJS entry point');
      const gc = new pkg.GlyphCompressor({ level: 'standard', provider: 'raw' });
      const r = gc.compressText('fix the error in AuthenticationManager AuthenticationManager AuthenticationManager');
      if (typeof r.compressed !== 'string') throw new Error('compressText did not return compressed text');
      console.log('OK');
    `], { encoding: 'utf8' });
    assert(out.includes('OK'), `expected the CJS entry point smoke script to print OK, got: ${out}`);
  });

  test('CJS middleware sub-export (require("glyph-compress/middleware")) resolves with no missing local dependencies', () => {
    const middlewarePath = path.join(extractedRoot, 'vscode-ext', 'glyph-middleware.cjs');
    const out = execFileSync(process.execPath, ['-e', `
      const { GlyphCompressor, buildTrustWarnings } = require('${middlewarePath.replace(/\\/g, '\\\\')}');
      const gc = new GlyphCompressor({ level: 'ultra', provider: 'raw', trustPolicy: 'lossy', workspacePath: '${extractedRoot.replace(/\\/g, '\\\\')}' });
      const r = gc.compressText('\`\`\`js\\nfunction run() { return 1; }\\n\`\`\`');
      if (!Array.isArray(r.sourceMap.trustWarnings)) throw new Error('trustWarnings missing from sourceMap');
      console.log('OK');
    `], { encoding: 'utf8' });
    assert(out.includes('OK'), `expected the middleware smoke script to print OK, got: ${out}`);
  });

  test('routeAndCompress (which requires workspace-intelligence.cjs and team-codebook.cjs transitively) works from the packaged tarball', () => {
    const middlewarePath = path.join(extractedRoot, 'vscode-ext', 'glyph-middleware.cjs');
    const out = execFileSync(process.execPath, ['-e', `
      const { GlyphCompressor } = require('${middlewarePath.replace(/\\/g, '\\\\')}');
      const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
      const result = gc.routeAndCompress('review my changes', { rootDir: '${extractedRoot.replace(/\\/g, '\\\\')}', tokenBudget: 1000 });
      if (!Array.isArray(result.selectedFiles)) throw new Error('routeAndCompress did not return selectedFiles');
      console.log('OK');
    `], { encoding: 'utf8' });
    assert(out.includes('OK'), `expected routeAndCompress to work from the packaged tarball, got: ${out}`);
  });
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`\nnpm-pack-smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('npm-pack-smoke suite ok');
}
