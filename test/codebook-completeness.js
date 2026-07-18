/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Codebook Completeness Suite
 *
 * Every glyph the compressor can emit into a payload MUST be documented in
 * whatever codebook text ships alongside that payload — otherwise the
 * receiving LLM has no way to decode it and the "zero information loss"
 * guarantee silently breaks. This suite would have caught two real bugs:
 *   1. TECH_GLYPHS had 28 entries but the printed codebook only documented
 *      15 of them (Java, C#, Swift, Ruby, Angular, Svelte, Django, Rails,
 *      Express, FastAPI, MySQL, MongoDB, "prompt" were silently undocumented).
 *   2. getCodebookPrompt() (the CLI's codebook source) never included the
 *      DYN: line, so standalone compressText() output could contain §N
 *      dynamic-dictionary glyphs the model was never told the meaning of.
 *
 * Rather than only fuzzing random corpora (which can miss rarely-triggered
 * glyphs by chance), this suite deterministically exercises every entry in
 * TECH_GLYPHS plus a larger synthetic multi-topic corpus for the dynamic
 * dictionary and prompt/diagnostic glyph families.
 */
import assert from 'assert';
import { GlyphCompressor, TECH_GLYPHS, DOMAIN_GLYPHS } from '../src/glyph-middleware.js';

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

// ─── 1. Every TECH_GLYPHS entry must be documented once emitted ──────────

for (const [name, glyph] of Object.entries(TECH_GLYPHS)) {
  test(`TECH glyph for "${name}" (${glyph}) is documented when emitted [raw]`, () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
    const r = gc.compressText(`We should use ${name} for this project.`);
    if (!r.compressed.includes(glyph)) return; // breakeven skipped this glyph; nothing to document
    const codebook = gc.getCodebookPrompt();
    assert(codebook.includes(glyph), `codebook is missing "${glyph}"=${name}\ncodebook: ${codebook}`);
  });

  test(`TECH glyph for "${name}" (${glyph}) is documented when emitted [openai compact codebook]`, () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
    const messages = [{ role: 'user', content: `We should use ${name} for this project.` }];
    const { messages: compressed } = gc.compressMessages(messages, 'openai');
    const systemMsg = compressed.find((m) => m.role === 'system');
    const userMsg = compressed.find((m) => m.role === 'user');
    if (!systemMsg || !userMsg.content.includes(glyph)) return;
    assert(systemMsg.content.includes(glyph), `compact codebook is missing "${glyph}"=${name}\ncodebook: ${systemMsg.content}`);
  });
}

// ─── 2. Every DOMAIN_GLYPHS entry the file indexer can assign is documented ──

test('Every DOMAIN_GLYPHS value used as a file-ref prefix is documented', () => {
  const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
  const paths = [
    'src/components/Widget.tsx', 'src/services/order.service.ts', 'test/widget.test.ts',
    'src/pipeline.py', 'infra/deployment.yaml', 'db/migration_001.sql',
    'README.md', 'src/auth/guard.ts', 'src/styles/app.css',
  ];
  let text = '';
  for (const p of paths) text += `Check ${p} for issues. `;
  const r = gc.compressText(text);
  const codebook = gc.getCodebookPrompt();
  for (const glyph of Object.values(DOMAIN_GLYPHS)) {
    if (r.compressed.includes(glyph)) {
      assert(codebook.includes(`${glyph}=`), `codebook is missing domain glyph "${glyph}"`);
    }
  }
});

// ─── 3. Dynamic dictionary (§N) glyphs are always documented ─────────────

test('Dynamic dictionary glyphs from compressText() are documented via getCodebookPrompt()', () => {
  const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
  const paragraph = `
    The AuthenticationManager validates AuthenticationManager tokens before AuthenticationManager
    grants access. The RateLimiterService throttles RateLimiterService requests, and the
    RateLimiterService logs every RateLimiterService decision to the AuditTrailRecorder,
    which the AuditTrailRecorder later replays for the AuditTrailRecorder compliance report.
  `;
  const r = gc.compressText(paragraph);
  const dynGlyphsUsed = [...r.compressed.matchAll(/§\d+/g)].map((m) => m[0]);
  assert(dynGlyphsUsed.length > 0, 'fixture should trigger the dynamic dictionary');
  const codebook = gc.getCodebookPrompt();
  for (const glyph of new Set(dynGlyphsUsed)) {
    assert(codebook.includes(`${glyph}=`), `codebook is missing dynamic entry "${glyph}"\ncodebook: ${codebook}`);
  }
});

test('Dynamic dictionary glyphs from compressMessages() are documented in the injected system prompt', () => {
  const gc = new GlyphCompressor({ level: 'standard', provider: 'openai' });
  // Long enough (and repetitive enough) that in-body savings clear the
  // codebook-skip threshold — a short message legitimately falls back to
  // the original text (see the adaptive fallback covered elsewhere), which
  // would make this fixture vacuously pass for the wrong reason.
  const clause = (n) => `OrderReconciliationWorker instance ${n} retried the OrderReconciliationWorker job queue while `
    + `PaymentSettlementGateway and PaymentSettlementGateway confirmed the PaymentSettlementGateway ledger entry.`;
  const messages = [{
    role: 'user',
    content: Array.from({ length: 6 }, (_, i) => clause(i)).join(' '),
  }];
  const { messages: compressed, stats } = gc.compressMessages(messages, 'openai');
  const systemMsg = compressed.find((m) => m.role === 'system');
  const userMsg = compressed.find((m) => m.role === 'user');
  assert(stats.thisMessage.fallback === false, 'fixture should be large enough to clear the codebook-skip threshold');
  const dynGlyphsUsed = [...userMsg.content.matchAll(/§\d+/g)].map((m) => m[0]);
  assert(dynGlyphsUsed.length > 0, 'fixture should trigger the dynamic dictionary');
  for (const glyph of new Set(dynGlyphsUsed)) {
    assert(systemMsg.content.includes(`${glyph}=`), `injected system prompt is missing dynamic entry "${glyph}"\nsystem: ${systemMsg.content}`);
  }
});

// ─── 4. No dynamic glyph ever collides with a reserved TECH_GLYPHS symbol ─

test('Dynamic dictionary never assigns a glyph that is also a reserved TECH_GLYPHS symbol', () => {
  const reserved = new Set(Object.values(TECH_GLYPHS));
  const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
  // Force the dictionary to fill up to exercise every possible index, not
  // just the first couple of entries.
  const words = Array.from({ length: 90 }, (_, i) => `UniqueRepeatedIdentifier${i}`);
  const text = words.map((w) => `${w} ${w} appears twice near ${w}.`).join(' ');
  const r = gc.compressText(text);
  for (const entry of r.sourceMap.dynamic) {
    assert(!reserved.has(entry.glyph), `dynamic glyph "${entry.glyph}" collides with a reserved TECH_GLYPHS symbol`);
  }
});

console.log(`\ncodebook-completeness: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('codebook-completeness suite ok');
}
