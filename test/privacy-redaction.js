/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Privacy Firewall Redaction Suite (v1.32.3)
 *
 * Found by mutation testing: deliberately breaking individual redaction
 * patterns and re-running `npm test` showed that only 3 of the 9 patterns
 * in PRIVACY_REDACTION_PATTERNS were covered. Disabling AWS-access-key, JWT, OpenAI-key,
 * GitHub-token, or Bearer-token redaction entirely left the whole suite green,
 * even though README/PRIVACY.md advertise all of them.
 *
 * `test/logger.js` was a false comfort here: it does cover AWS keys and
 * bearer tokens, but against `redactForLog()` — the *log sink* redactor, a
 * completely separate code path from the payload redaction that decides what
 * actually reaches the model. A payload-side regression would not have
 * touched it.
 *
 * Every secret below is a syntactically valid but fabricated credential,
 * constructed only to match a pattern.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { GlyphCompressor } from '../src/glyph-middleware.js';

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

// kind -> [sample text, the exact substring that must never survive]
const SECRETS = {
  openai_key: ['Use sk-abcdefghijklmnopqrstuvwxyz0123456789 for calls', 'sk-abcdefghijklmnopqrstuvwxyz0123456789'],
  github_token: ['Push with ghp_abcdefghijklmnopqrstuvwxyz0123456789', 'ghp_abcdefghijklmnopqrstuvwxyz0123456789'],
  aws_access_key: ['Deploy using AKIAIOSFODNN7EXAMPLE now', 'AKIAIOSFODNN7EXAMPLE'],
  jwt: [
    'Send eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk in the header',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk',
  ],
  bearer_token: ['Authorization: Bearer abcdefghijklmnopqrstuvwxyz012345', 'abcdefghijklmnopqrstuvwxyz012345'],
  secret_assignment: ['config has password=hunter2SuperSecretValue here', 'hunter2SuperSecretValue'],
  email: ['Contact admin@example.com about it', 'admin@example.com'],
  ipv4: ['Server lives at 192.168.10.22 internally', '192.168.10.22'],
};

// One test per pattern kind, so a regression names the exact credential type
// that started leaking instead of failing one combined assertion.
for (const [kind, [text, secret]] of Object.entries(SECRETS)) {
  test(`redacts ${kind} before the payload leaves the process`, () => {
    const gc = new GlyphCompressor({ level: 'standard', privacyFirewall: true });
    const result = gc.compressText(text);
    assert(
      !result.compressed.includes(secret),
      `${kind} survived redaction — the raw credential would be sent to the provider`,
    );
    assert(
      result.sourceMap.privacy.length > 0,
      `${kind} produced no privacy source-map entry, so the redaction is not auditable`,
    );
  });
}

test('the raw secret never appears anywhere in the source map', () => {
  // Redacting the payload but recording the secret in the audit trail would
  // just move the leak: source maps are written to disk and returned to
  // callers (CLI --source-map, MCP responses).
  const gc = new GlyphCompressor({ level: 'standard', privacyFirewall: true });
  const secrets = Object.values(SECRETS).map(([, s]) => s);
  const result = gc.compressText(Object.values(SECRETS).map(([t]) => t).join('\n'));
  const serialized = JSON.stringify(result.sourceMap);
  for (const secret of secrets) {
    assert(!serialized.includes(secret), `source map leaked the raw ${secret.slice(0, 12)}...`);
  }
});

test('every PRIVACY_REDACTION_PATTERNS kind has coverage in this suite', () => {
  // Data-driven against the implementation: adding a new redaction pattern
  // without a sample above fails here rather than shipping untested. This is
  // the guard whose absence let 6 of 9 kinds go uncovered.
  const source = fs.readFileSync(path.join(root, 'vscode-ext', 'glyph-middleware.js'), 'utf8');
  const block = source.match(/const PRIVACY_REDACTION_PATTERNS = \[([\s\S]*?)\n\];/);
  assert(block, 'could not locate PRIVACY_REDACTION_PATTERNS — this guard needs updating');

  const kinds = [...new Set([...block[1].matchAll(/kind: '([a-z_]+)'/g)].map((m) => m[1]))];
  assert(kinds.length > 0, 'parsed no kinds from PRIVACY_REDACTION_PATTERNS');

  const covered = Object.keys(SECRETS);
  const missing = kinds.filter((k) => !covered.includes(k));
  assert.deepStrictEqual(missing, [], `PRIVACY_REDACTION_PATTERNS kinds with no test coverage: ${missing.join(', ')}`);
});

test('redaction is off unless explicitly enabled', () => {
  // The firewall is opt-in; silently redacting for everyone would corrupt
  // payloads for users who never asked for it.
  const gc = new GlyphCompressor({ level: 'standard' });
  const result = gc.compressText('Contact admin@example.com about it');
  assert(result.compressed.includes('admin@example.com'), 'redaction must not fire without privacyFirewall/privacy trust policy');
});

test('redacted placeholders never become dynamic-dictionary entries', () => {
  // Placeholders like EMAIL_1 repeat across a payload, which makes them
  // attractive to the dynamic dictionary. Encoding them as §N would publish
  // "§N=EMAIL_1" in the codebook — noise that also makes the redaction
  // structure explicit to the model for no benefit.
  // The *same* address repeated, deliberately: distinct addresses each
  // produce a distinct placeholder seen once, which the economics filter
  // rejects anyway, so such a payload never exercises the guard at all.
  // Only a repeated placeholder (here EMAIL_1, six times) is economically
  // attractive enough for the dictionary to want it.
  const gc = new GlyphCompressor({ level: 'standard', privacyFirewall: true });
  const text = Array(6).fill('contact admin@example.com about the incident').join('\n');
  gc.compressText(text);
  for (const word of gc.dynamicDict.keys()) {
    assert(
      !/^(?:OPENAI_KEY|GITHUB_TOKEN|AWS_ACCESS_KEY|JWT|BEARER_TOKEN|SECRET_ASSIGNMENT|EMAIL|IPV4)_\d+$/.test(word),
      `redaction placeholder "${word}" leaked into the dynamic dictionary`,
    );
  }
});

// ─── Dynamic dictionary economics ──────────────────────────────
// The v1.16.0 correctness fix (a word must repeat before it earns a §N
// entry) moved this project's headline benchmark from a reported 25% to an
// honest 22%, and had no direct test. Worth noting precisely: the explicit
// `freq >= 2` filter is defensive redundancy rather than the load-bearing
// mechanism — the savings formula yields exactly -4 for any single-
// occurrence word regardless of its length, so the `save` threshold already
// excludes it. (Mutating `freq >= 2` to `freq >= 1` is therefore an
// equivalent mutation: no test can catch it, because behavior is unchanged.)
// These tests lock the observable contract, which is what actually matters,
// rather than either specific filter.

test('a word seen only once never earns a dynamic-dictionary entry', () => {
  const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
  // Long enough that the per-occurrence saving looks attractive, but present
  // exactly once, so it can never amortize its own "word=§N" definition.
  gc.compressText('Refactor ExtraordinarilyLongSingletonIdentifier before the release.');
  assert(
    !gc.dynamicDict.has('ExtraordinarilyLongSingletonIdentifier'),
    'a single-occurrence word was given a §N entry — it cannot pay for its own definition (v1.16.0 economics regression)',
  );
});

test('a repeated word does earn an entry, so the filter is not simply off', () => {
  const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
  const word = 'ExtraordinarilyLongRepeatedIdentifier';
  gc.compressText(`${word} calls ${word}, and later ${word} again in ${word}.`);
  assert(
    gc.dynamicDict.has(word),
    'a genuinely repeated word was rejected — the economics filter is too aggressive, not just correct',
  );
});

// The privacy firewall is a security boundary, so it must not be conditional
// on whether compression happened to pay off. Both entry points returned the
// RAW original when compression was net-negative — compressText() returned
// `text` instead of the filtered `safeText`, and compressMessages() returned
// the untouched input array — so every fallback shipped secrets verbatim while
// reporting the firewall as active.
//
// Reachable on the released code with no unusual input: a short message is
// exactly the case where compression does not pay, so it falls back, and short
// messages are where credentials get pasted.
for (const entry of ['compressText', 'compressMessages']) {
  test(`${entry}: a net-negative fallback still redacts, and never returns raw secrets`, () => {
    // High-entropy identifiers give the compressor nothing to work with, so
    // the payload reliably takes the fallback path. compressText() needs this
    // because its redaction placeholders are *shorter* than the secrets they
    // replace, which is enough to make an ordinary secret-bearing string look
    // like a compression win.
    const payload = entry === 'compressText'
      ? 'Trace 7f3a9c21-4b8e-11ee-be56-0242ac120002 and 9d2b4e77-1c3f-42aa-9b10-5e7c1d8a2f04 for API_KEY=sk-prodSECRETSECRETSECRETSECRETSECRET and admin@example.com from 192.168.10.22'
      : 'API_KEY=sk-prodSECRETSECRETSECRETSECRETSECRET and admin@example.com from 192.168.10.22';
    // An explicit provider matters: 'raw' is the default and trusts every
    // compression unconditionally, so it never reaches the fallback branch
    // this test exists to cover.
    const compressor = new GlyphCompressor({ level: 'standard', privacyFirewall: true, provider: 'openai' });

    let output;
    let fellBack;
    if (entry === 'compressText') {
      const result = compressor.compressText(payload, 'openai');
      output = result.compressed;
      fellBack = result.fallback;
    } else {
      const result = compressor.compressMessages([{ role: 'user', content: payload }], 'openai');
      output = result.messages.map((m) => (typeof m.content === 'string' ? m.content : '')).join(' ');
      fellBack = result.stats.thisMessage?.fallback;
    }

    assert(
      fellBack,
      'precondition: this payload must take the fallback path, otherwise the test proves nothing about it',
    );
    assert(!output.includes('sk-prodSECRET'), `raw API key survived the fallback: ${output}`);
    assert(!output.includes('admin@example.com'), `raw email survived the fallback: ${output}`);
    assert(!output.includes('192.168.10.22'), `raw IP survived the fallback: ${output}`);
    assert(
      output.includes('⟦SECRET_ASSIGNMENT_') && output.includes('⟦EMAIL_'),
      `redaction placeholders should be present, got: ${output}`,
    );
  });
}

console.log(`\nprivacy-redaction: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('privacy-redaction suite ok');
}
