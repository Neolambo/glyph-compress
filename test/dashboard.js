/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Dashboard Suite (v1.32.4)
 *
 * src/dashboard.js was the largest completely untested file in the repo
 * (755 lines) despite being live: src/proxy.js imports it and serves it at
 * GET /dashboard. This suite covers the parts that are actually logic
 * rather than styling — the client-side render helpers embedded in the
 * template — by extracting and evaluating them.
 *
 * Not a claim of full coverage: the CSS and layout are untested by design.
 */
import assert from 'assert';
import { getDashboardHTML } from '../src/dashboard.js';

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

const html = getDashboardHTML();

// Pull escapeHtml out of the template and evaluate it, so the test exercises
// the function the browser actually runs rather than a copy that could drift.
function extractEscapeHtml() {
  const match = html.match(/function escapeHtml\(value\) \{[\s\S]*?\n    \}/);
  assert(match, 'could not locate escapeHtml in the dashboard template');
  // eslint-disable-next-line no-new-func
  return new Function(`${match[0]}; return escapeHtml;`)();
}

test('the template is served as a complete HTML document', () => {
  assert(html.startsWith('<!DOCTYPE html>'), 'must be a full document');
  assert(html.includes('</html>'), 'must be closed');
});

test('escapeHtml neutralises every HTML-significant character', () => {
  const escapeHtml = extractEscapeHtml();
  assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
  assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
  assert.strictEqual(escapeHtml('say "hi"'), 'say &quot;hi&quot;');
  assert.strictEqual(escapeHtml("it's"), 'it&#039;s');
});

test('escapeHtml escapes the ampersand first, so escapes are not double-encoded', () => {
  // Replacing < before & would turn "<" into "&lt;" and then the & of that
  // entity into "&amp;lt;". Order matters and is easy to break silently.
  const escapeHtml = extractEscapeHtml();
  assert.strictEqual(escapeHtml('<a>'), '&lt;a&gt;');
});

test('escapeHtml tolerates the non-string values the render loop passes it', () => {
  // History entries carry numbers (token counts, ids) and fields that can be
  // absent. A bare str.replace() throws on those, and because the render loop
  // is wrapped in try/catch the dashboard would silently stop updating.
  const escapeHtml = extractEscapeHtml();
  assert.strictEqual(escapeHtml(1234), '1234');
  assert.strictEqual(escapeHtml(0), '0');
  assert.strictEqual(escapeHtml(undefined), '');
  assert.strictEqual(escapeHtml(null), '');
});

test('both render paths escape their interpolated data', () => {
  // The logs path always escaped; the history path interpolated six fields
  // raw. Those fields are internally generated today, so this was latent
  // rather than exploitable — but the asymmetry itself was the defect.
  const historyBlock = html.match(/data\.history\.forEach\([\s\S]*?listContainer\.innerHTML/);
  assert(historyBlock, 'could not locate the history render path');
  const interpolations = historyBlock[0].match(/\$\{[^}]+\}/g) || [];
  const unescaped = interpolations.filter((i) => !i.includes('escapeHtml'));
  assert.deepStrictEqual(unescaped, [], `history path interpolates unescaped values: ${unescaped.join(', ')}`);

  const logsBlock = html.match(/data\.logs\.forEach\([\s\S]*?logsContainer\.innerHTML/);
  assert(logsBlock, 'could not locate the logs render path');
  assert(logsBlock[0].includes('escapeHtml(log.text)'), 'logs path must escape log text');
});

test('the dashboard polls the stats endpoint the proxy actually serves', () => {
  assert(html.includes("'/stats'") || html.includes('"/stats"') || html.includes('/stats'),
    'dashboard must fetch /stats — the endpoint src/proxy.js exposes');
});

console.log(`\ndashboard: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('dashboard suite ok');
}
