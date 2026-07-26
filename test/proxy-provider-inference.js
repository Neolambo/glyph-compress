/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Proxy Provider Inference & Error-Body Redaction Suite (v1.32.4)
 *
 * Both behaviors here were found by mutation testing: breaking them left
 * `npm test` fully green.
 *
 * 1. `inferProviderFromTarget()` had *no* test coverage at all. It is what
 *    turns the proxy's default `provider: 'auto'` into a real provider, and
 *    every provider-specific decision downstream depends on it — measured
 *    tokenizer gating (v1.17.0/v1.21.0/v1.26.0/v1.28.0), the Anthropic
 *    cache_control strategy, and the net-negative fallback. Getting it wrong
 *    does not fail loudly; it silently applies the wrong provider's
 *    calibration.
 *
 * 2. The upstream error-body log is the one call site that motivated the
 *    v1.19.0 logger refactor, because provider error responses routinely echo
 *    request context back. `test/logger.js` covers `redactForLog()` itself,
 *    but nothing checked that the proxy actually calls it here — replacing it
 *    with a bare String() survived the whole suite.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { inferProviderFromTarget } from '../src/proxy.js';

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

// Every target the README documents for IDE integration, plus the shapes a
// user realistically types (trailing slash, /v1 suffix, mixed case).
const TARGETS = [
  ['https://api.anthropic.com', 'anthropic'],
  ['https://api.anthropic.com/', 'anthropic'],
  ['https://API.Anthropic.com/v1', 'anthropic'],
  ['https://generativelanguage.googleapis.com', 'gemini'],
  ['https://generativelanguage.googleapis.com/v1beta/openai', 'gemini'],
  ['https://api.openai.com', 'openai'],
  ['https://api.openai.com/v1', 'openai'],
  ['http://localhost:11434', 'local'],
  ['http://127.0.0.1:8000/v1', 'local'],
];

for (const [target, expected] of TARGETS) {
  test(`infers ${expected} from ${target}`, () => {
    assert.strictEqual(inferProviderFromTarget(target), expected);
  });
}

test('an unrecognised target falls back to a measured-gated provider, never raw', () => {
  // The fallback must not be 'raw': raw deliberately skips both the
  // net-negative fallback and the measured-loss gating, so defaulting to it
  // would make an unknown upstream the *least* safe configuration.
  const fallback = inferProviderFromTarget('https://some-unknown-gateway.example.com');
  assert.notStrictEqual(fallback, 'raw', 'unknown targets must not default to the unguarded raw profile');
  assert.strictEqual(fallback, 'openai');
});

test('missing or empty input does not throw', () => {
  assert.doesNotThrow(() => inferProviderFromTarget());
  assert.doesNotThrow(() => inferProviderFromTarget(''));
  assert.doesNotThrow(() => inferProviderFromTarget(null));
});

test('inference distinguishes providers rather than returning one constant', () => {
  // A constant-returning implementation would satisfy several assertions
  // above by luck; this fails unless the function genuinely discriminates.
  const distinct = new Set(TARGETS.map(([t]) => inferProviderFromTarget(t)));
  assert.strictEqual(distinct.size, 4, `expected anthropic/gemini/openai/local, got: ${[...distinct]}`);
});

test('the proxy redacts the upstream error body before logging it', () => {
  // Asserted against the source rather than by driving a failing upstream:
  // the concern is specifically that this call site keeps using the redactor,
  // which is exactly what a refactor can silently drop.
  const source = fs.readFileSync(path.join(root, 'src', 'proxy.js'), 'utf8');
  const line = source.split('\n').find((l) => l.includes('Upstream error body'));
  assert(line, 'could not find the upstream error-body log — this guard needs updating');
  assert(
    line.includes('redactForLog('),
    `upstream error bodies must be redacted before logging; provider errors echo request context back. Got: ${line.trim()}`,
  );
});

test('every proxy log call routes through the structured logger', () => {
  // v1.19.0's finding was that redaction applied at one call site only. A
  // bare console.log in the proxy would bypass redaction entirely.
  const source = fs.readFileSync(path.join(root, 'src', 'proxy.js'), 'utf8');
  const bareConsole = source
    .split('\n')
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => /(^|[^.\w])console\.(log|error|warn)\s*\(/.test(l) && !l.trim().startsWith('*') && !l.trim().startsWith('//'));
  assert.deepStrictEqual(
    bareConsole.map(([n]) => n),
    [],
    `proxy must log through the structured logger so redaction always applies; bare console calls at lines: ${bareConsole.map(([n, l]) => `${n}: ${l.trim()}`).join(' | ')}`,
  );
});

console.log(`\nproxy-provider-inference: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('proxy-provider-inference suite ok');
}
