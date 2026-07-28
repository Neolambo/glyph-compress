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
import { loadEncoder, skipSuite } from './helpers/optional-tokenizer.js';

const root = fileURLToPath(new URL('..', import.meta.url));

let passed = 0;
let failed = 0;

// Async tests reject AFTER fn() returns, so a plain try/catch never sees the
// failure and the suite prints a green tick — the reporting bug fixed in
// v1.33.4 elsewhere. Collected and awaited before the summary instead.
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

// Real BPE counting, in THIS process — the packaged artifact under test
// deliberately runs where js-tiktoken cannot resolve, but the judge of its
// output must not be the estimator the artifact itself falls back to.
// This suite has two halves with opposite requirements: one runs the packaged
// artifact where the tokenizer must be ABSENT, and judges its output from
// here, where the tokenizer must be PRESENT. Without it there is no honest
// judge, so the whole suite skips rather than grade itself with the estimator.
const encoder = await loadEncoder();
if (!encoder) {
  skipSuite('npm-pack-smoke', 'js-tiktoken not installed; the packaged artifact could only be judged by the estimator it is meant to outrank');
}
const countTokens = (text) => (text ? encoder.encode(text).length : 0);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-npm-pack-smoke-'));

try {
  const packOutput = execFileSync('npm', ['pack', '--pack-destination', tmpDir], { cwd: root, encoding: 'utf8', shell: true });
  const tarballName = packOutput.trim().split('\n').pop().trim();
  const tarballPath = path.join(tmpDir, tarballName);
  assert(fs.existsSync(tarballPath), `expected npm pack to produce ${tarballPath}`);

  // Two tar implementations answer to the name `tar`, and they disagree about
  // this exact invocation:
  //
  //   GNU tar   reads a drive-letter colon (C:\...) as "host:path" remote-shell
  //             syntax and fails with "Cannot execute remote shell" unless
  //             --force-local is passed.
  //   bsdtar    handles Windows paths natively and rejects --force-local
  //             outright: "Option --force-local is not supported".
  //
  // So neither form works everywhere, and which binary answers depends on the
  // shell rather than the OS. A Git Bash session on Windows resolves to GNU
  // tar 1.35; a GitHub windows-latest runner resolves to bsdtar in System32.
  // That difference is why adding Windows to the CI matrix turned this suite
  // red while it stayed green locally — the local run was never exercising the
  // binary CI uses.
  //
  // Try the GNU form, fall back to the portable one. The fallback is not a
  // blind retry: it runs only when tar rejected the flag itself, so a genuine
  // extraction failure still fails instead of being retried into a
  // confusing second error.
  try {
    execFileSync('tar', ['--force-local', '-xf', tarballPath, '-C', tmpDir], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    const complaint = `${error.stderr || ''}${error.stdout || ''}${error.message || ''}`;
    if (!/force-local/i.test(complaint)) throw error;
    execFileSync('tar', ['-xf', tarballPath, '-C', tmpDir], { encoding: 'utf8', stdio: 'pipe' });
  }
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

  // js-tiktoken is an OPTIONAL dependency, so the packaged artifact routinely
  // runs without it — a VSIX ships no node_modules at all, which is how most
  // users get this code. The never-inflate guarantee has to hold on that path,
  // and it did not: v1.33.8 gave `raw` a bare `compressed <= original` check on
  // ESTIMATED numbers, and the estimator overstates improvement by 10-14%, so
  // payloads that actually grew were waved through. Measured on the packaged
  // VSIX: +0.15% via compressText and +5.54% via compressMessages.
  //
  // Every earlier measurement had been taken in the development tree, where
  // the optional dependency IS installed — so nothing covered the shipped
  // path. This runs from the extracted tarball, where `require('js-tiktoken')`
  // cannot resolve, and refuses to pass if the tokenizer turns out to be
  // reachable after all.
  test('the packaged artifact never inflates even without the optional tokenizer', () => {
    const middlewarePath = path.join(extractedRoot, 'vscode-ext', 'glyph-middleware.cjs');
    const counterPath = path.join(extractedRoot, 'vscode-ext', 'real-token-counter.cjs');
    const esc = (p) => p.replace(/\\/g, '\\\\');
    // src/proxy.js and README.md specifically, not just compressor.js: those
    // are the two files the regression actually showed up on (+5.54% via
    // compressMessages and +0.15% via compressText). A fixture that does not
    // reproduce the bug turns this into a test that cannot fail — verified by
    // restoring the bug and watching an earlier version of it stay green.
    const samples = ['src/proxy.js', 'README.md', 'src/compressor.js'].map((rel) => ({
      name: rel,
      text: fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8').slice(0, 20000),
    }));

    // The child produces the output; THIS process counts it.
    //
    // A first version of this test judged the child's work using
    // `stats.compressedTokens`, which is the estimator — the very instrument
    // whose 10-14% overstatement causes the bug. It passed with the bug
    // deliberately restored. The counting has to happen here, where
    // js-tiktoken resolves, on the bytes the child actually emitted.
    // Samples go through a file, not the command line: three 20,000-character
    // sources inlined into `node -e` exceed the OS argument limit (ENAMETOOLONG).
    const samplesPath = path.join(tmpDir, 'inflation-samples.json');
    fs.writeFileSync(samplesPath, JSON.stringify(samples), 'utf8');

    const raw = execFileSync(process.execPath, ['-e', `
      const fsChild = require('fs');
      const { GlyphCompressor } = require('${esc(middlewarePath)}');
      const counter = require('${esc(counterPath)}');
      if (counter.hasRealTokenizer()) throw new Error('precondition: js-tiktoken must NOT resolve here, or this proves nothing about the shipped path');
      const samples = JSON.parse(fsChild.readFileSync('${esc(samplesPath)}', 'utf8'));
      const out = [];
      for (const sample of samples) {
        const body = sample.text;
        const convo = [{ role: 'user', content: 'Review:\\n' + body }, { role: 'assistant', content: 'Found issues.' }, { role: 'user', content: 'Fix them.' }];
        for (const provider of ['raw', 'openai', 'anthropic', 'gemini', 'local']) {
          for (const level of ['light', 'standard', 'aggressive', 'ultra']) {
            const single = new GlyphCompressor({ level, provider }).compressText(body, provider);
            const many = new GlyphCompressor({ level, provider }).compressMessages(convo.map((m) => ({ ...m })), provider);
            out.push({
              provider,
              level,
              file: sample.name,
              singleIn: body,
              singleOut: single.compressed,
              manyIn: convo.map((m) => m.content).join('\\n'),
              manyOut: many.messages.map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))).join('\\n'),
            });
          }
        }
      }
      console.log(JSON.stringify(out));
    `], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

    const cases = JSON.parse(raw.trim().split('\n').pop());
    assert(cases.length === 60, `expected 60 file/provider/level combinations, got ${cases.length}`);

    // Without the tokenizer the guarantee is bounded by the estimator's own
    // accuracy, not absolute — and the honest thing is to pin the bound rather
    // than claim a zero that does not hold. Measured across these 20
    // combinations, the worst case is raw/ultra at +4 real tokens on a 3,230
    // token payload (+0.12%): the estimator believes it saved over 10% there,
    // and reality is a fractional loss. Widening the margin far enough to
    // absorb that would start rejecting genuine savings.
    //
    // 0.5% is the ceiling this asserts. Anything worse is a regression, and
    // installing js-tiktoken removes the uncertainty entirely — with it, the
    // same sweep measures exactly 0 (see the assertion below).
    const TOLERANCE = 0.005;
    for (const c of cases) {
      const singleIn = countTokens(c.singleIn);
      const manyIn = countTokens(c.manyIn);
      const singleDelta = countTokens(c.singleOut) - singleIn;
      const manyDelta = countTokens(c.manyOut) - manyIn;
      assert(
        singleDelta <= singleIn * TOLERANCE,
        `compressText inflated by ${singleDelta} real tokens (${((singleDelta / singleIn) * 100).toFixed(2)}%) at ${c.file} ${c.provider}/${c.level} without the tokenizer`,
      );
      assert(
        manyDelta <= manyIn * TOLERANCE,
        `compressMessages inflated by ${manyDelta} real tokens (${((manyDelta / manyIn) * 100).toFixed(2)}%) at ${c.file} ${c.provider}/${c.level} without the tokenizer`,
      );
    }
  });

  // The counterpart: with the optional dependency installed — which is how the
  // npm package resolves it, and how the development tree runs — the bound
  // above collapses to nothing. Asserted so the tolerance can never quietly
  // become the normal operating point.
  test('with the optional tokenizer installed, the guarantee is exact', async () => {
    const { GlyphCompressor } = await import('../src/glyph-middleware.js');
    const { hasRealTokenizer } = await import('../src/real-token-counter.js');
    assert(hasRealTokenizer(), 'precondition: js-tiktoken must resolve here, or this proves nothing');

    const body = fs.readFileSync(new URL('../src/compressor.js', import.meta.url), 'utf8').slice(0, 12000);
    const convo = [{ role: 'user', content: body }, { role: 'assistant', content: 'Noted.' }, { role: 'user', content: 'Now fix it.' }];

    for (const provider of ['raw', 'openai', 'anthropic', 'gemini', 'local']) {
      for (const level of ['light', 'standard', 'aggressive', 'ultra']) {
        const single = new GlyphCompressor({ level, provider }).compressText(body, provider);
        assert(
          countTokens(single.compressed) <= countTokens(body),
          `compressText inflated at ${provider}/${level} WITH the tokenizer — the exact guarantee is broken`,
        );
        const many = new GlyphCompressor({ level, provider }).compressMessages(convo.map((m) => ({ ...m })), provider);
        const after = many.messages.map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))).join('\n');
        assert(
          countTokens(after) <= countTokens(convo.map((m) => m.content).join('\n')),
          `compressMessages inflated at ${provider}/${level} WITH the tokenizer — the exact guarantee is broken`,
        );
      }
    }
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
