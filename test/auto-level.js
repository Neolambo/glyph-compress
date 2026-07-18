/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Automatic Level Selection Suite
 *
 * compressMessages() already trials the user-configured level against
 * 'light' and keeps whichever is cheaper, but it never tries
 * 'aggressive'/'ultra' — a user who never changes the default 'standard'
 * never discovers that a code-heavy payload would compress much better
 * under code minification/summary. compressText() (the CLI's method) has
 * no trial mechanism at all. selectCompressionLevel() / level: 'auto' give
 * both paths a content-informed starting point instead of a fixed default.
 */
import assert from 'assert';
import { GlyphCompressor, selectCompressionLevel } from '../src/glyph-middleware.js';

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

test('selectCompressionLevel: very short text stays light', () => {
  assert.strictEqual(selectCompressionLevel('fix the bug'), 'light');
  assert.strictEqual(selectCompressionLevel(''), 'light');
});

test('selectCompressionLevel: prose-heavy text stays standard', () => {
  const prose = 'Can you review the security of our authentication module and summarize any risks you find, '
    + 'focusing on how session tokens are issued and rotated across the login and refresh flows, and note '
    + 'whether the rate limiting on failed attempts looks adequate for a public-facing API.';
  assert.strictEqual(selectCompressionLevel(prose), 'standard');
});

test('selectCompressionLevel: moderately code-heavy text goes aggressive', () => {
  // A short code fence (well under the 600-char "large enough to
  // amortize a full ultra summary" floor) plus surrounding prose: enough
  // code density to justify minification, not enough size/density to
  // justify architectural summarization.
  const code = 'Here is the failing handler, can you spot the bug in the response shape?\n\n'
    + '```ts\nfunction handler(req, res) {\n  return res.json({ ok: true });\n}\n```\n\n'
    + "It's returning 500 for valid requests and I'm not sure why.";
  assert.strictEqual(selectCompressionLevel(code), 'aggressive');
});

test('selectCompressionLevel: large, dense, mostly-code text goes ultra', () => {
  const bigCode = '```ts\n'
    + Array.from({ length: 40 }, (_, i) => (
      `import { dep${i} } from './dep${i}';\n`
      + `export class Service${i} {\n`
      + `  constructor(private readonly repo: Repo${i}) {}\n`
      + `  async run() {\n`
      + `    return this.repo.find();\n`
      + `  }\n`
      + `}`
    )).join('\n')
    + '\n```';
  assert.strictEqual(selectCompressionLevel(bigCode), 'ultra');
});

test("GlyphCompressor({ level: 'auto' }): compressText() resolves and reports selectedLevel", () => {
  const gc = new GlyphCompressor({ level: 'auto', provider: 'raw' });
  const r = gc.compressText('fix the bug');
  assert.strictEqual(r.stats.selectedLevel, 'light');
  // The instance's configured level stays 'auto' across calls — each text
  // gets its own resolution rather than the first call permanently pinning
  // the instance to a concrete level.
  assert.strictEqual(gc.level, 'auto');
});

test("GlyphCompressor({ level: 'auto' }): a second, code-heavy call on the same instance resolves independently", () => {
  const gc = new GlyphCompressor({ level: 'auto', provider: 'raw' });
  gc.compressText('fix the bug');
  const bigCode = '```ts\n'
    + Array.from({ length: 40 }, (_, i) => (
      `import { dep${i} } from './dep${i}';\n`
      + `export class Service${i} {\n`
      + `  constructor(private readonly repo: Repo${i}) {}\n`
      + `  async run() {\n`
      + `    return this.repo.find();\n`
      + `  }\n`
      + `}`
    )).join('\n')
    + '\n```';
  const r2 = gc.compressText(bigCode);
  assert.strictEqual(r2.stats.selectedLevel, 'ultra');
});

test("GlyphCompressor({ level: 'auto' }): compressMessages() resolves a base level from user content", () => {
  const gc = new GlyphCompressor({ level: 'auto', provider: 'openai' });
  const bigCode = '```ts\n'
    + Array.from({ length: 40 }, (_, i) => (
      `import { dep${i} } from './dep${i}';\n`
      + `export class Service${i} {\n`
      + `  constructor(private readonly repo: Repo${i}) {}\n`
      + `  async run() {\n`
      + `    return this.repo.find();\n`
      + `  }\n`
      + `}`
    )).join('\n')
    + '\n```';
  const { stats } = gc.compressMessages([{ role: 'user', content: bigCode }], 'openai');
  assert.strictEqual(stats.thisMessage.selectedLevel, 'ultra');
});

console.log(`\nauto-level: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('auto-level suite ok');
}
