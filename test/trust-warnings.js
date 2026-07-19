/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Trust Warnings Suite (v1.21.0)
 *
 * "Add per-provider trust warnings or risk scoring for risky
 * transformations." Every warning buildTrustWarnings() produces is
 * derived strictly from the trust profile's own existing, already-true
 * flags (reversible/redacts/lossy/allows.*) — no new claims about
 * provider comprehension or model behavior, which would be
 * unverifiable. This suite checks the mapping is complete and that the
 * warnings actually reach the CLI (--explain) and sourceMap consumers.
 */
import assert from 'assert';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { GlyphCompressor, buildTrustWarnings, TRUST_POLICY_PROFILES } from '../src/glyph-middleware.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const cliPath = fileURLToPath(new URL('../bin/cli.js', import.meta.url));

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

test('lossless policy produces no warnings', () => {
  const warnings = buildTrustWarnings(TRUST_POLICY_PROFILES.lossless, 'standard');
  assert.deepStrictEqual(warnings, []);
});

test('lossy policy at ultra level warns about both irreversibility and code summarization', () => {
  const warnings = buildTrustWarnings(TRUST_POLICY_PROFILES.lossy, 'ultra');
  assert(warnings.some((w) => w.includes('irreversible')), 'should warn about irreversibility');
  assert(warnings.some((w) => w.includes('structural summaries')), 'should warn about code summarization at ultra');
});

test('lossy policy at aggressive level warns about code minification, not summarization', () => {
  const warnings = buildTrustWarnings(TRUST_POLICY_PROFILES.lossy, 'aggressive');
  assert(warnings.some((w) => w.includes('syntactically minified')), 'should warn about minification');
  assert(!warnings.some((w) => w.includes('structural summaries')), 'aggressive does not summarize, so should not claim it does');
});

test('privacy policy warns about redaction regardless of level', () => {
  const warnings = buildTrustWarnings(TRUST_POLICY_PROFILES.privacy, 'standard');
  assert(warnings.some((w) => w.includes('Privacy firewall')), 'should warn about redaction');
});

test('reversible policy at standard level (no lossy transforms allowed) produces no warnings', () => {
  const warnings = buildTrustWarnings(TRUST_POLICY_PROFILES.reversible, 'standard');
  assert.deepStrictEqual(warnings, []);
});

test('handles a missing/undefined trust profile without throwing', () => {
  assert.doesNotThrow(() => buildTrustWarnings(undefined, 'ultra'));
});

test('GlyphCompressor.compressText() sourceMap includes trustWarnings', () => {
  const gc = new GlyphCompressor({ level: 'ultra', provider: 'raw', trustPolicy: 'lossy' });
  const r = gc.compressText('```js\nfunction run() { return 1; }\n```\n');
  assert(Array.isArray(r.sourceMap.trustWarnings), 'sourceMap should expose trustWarnings');
  assert(r.sourceMap.trustWarnings.length > 0, 'lossy + ultra should produce at least one warning');
});

test('CLI --explain surfaces trust warnings for a risky level/policy combination', () => {
  const out = execFileSync(process.execPath, [cliPath, 'package.json', '--level', 'ultra', '--trust', 'lossy', '--explain'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert(out.includes('Trust warnings:'), `--explain should print a "Trust warnings:" section for lossy+ultra, got:\n${out}`);
});

test('CLI --explain omits the trust warnings section for a lossless run', () => {
  const out = execFileSync(process.execPath, [cliPath, 'package.json', '--level', 'light', '--trust', 'lossless', '--explain'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert(!out.includes('Trust warnings:'), `--explain should not print a warnings section when there is nothing to warn about, got:\n${out}`);
});

console.log(`\ntrust-warnings: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('trust-warnings suite ok');
}
