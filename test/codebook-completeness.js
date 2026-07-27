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
import { Compressor, Codebook } from '../src/compressor.js';
import { generateSystemPrompt } from '../src/system-prompt-generator.js';
import { STRUCTURE_GLYPHS } from '../src/radical-alphabet.js';

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
  // Repeated eight times, not four, and AuthenticationManager is gone.
  // Since v1.33.8 dictionary admission is priced in real tokens: an entry has
  // to save more than it costs to define. RateLimiterService and
  // AuditTrailRecorder are 3 tokens against a 2-token §N glyph, so each
  // occurrence saves 1 and the definition costs ~6 — seven occurrences is the
  // break-even. AuthenticationManager measures at 2 tokens and can never
  // qualify: substituting it would cost exactly as much as leaving it.
  const paragraph = `
    The RateLimiterService throttles RateLimiterService requests, and the
    RateLimiterService logs every RateLimiterService decision to the AuditTrailRecorder,
    which the AuditTrailRecorder later replays for the AuditTrailRecorder compliance report.
  `.repeat(3);
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
  // Sixteen clauses, not six. The threshold this fixture has to clear became a
  // real-token one in v1.33.8 rather than a character one, and six clauses of
  // English prose no longer reach it — long phrases are already close to
  // optimal for BPE, so the codebook cannot pay for itself over that little
  // body text. The identifiers still qualify (OrderReconciliationWorker is 4
  // real tokens, PaymentSettlementGateway 5, against a 2-token §N glyph); what
  // was missing is enough of them to amortise the injected codebook.
  const messages = [{
    role: 'user',
    content: Array.from({ length: 16 }, (_, i) => clause(i)).join(' '),
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

// ─── The legacy engine (src/compressor.js) ─────────────────────
// `Compressor` and `Codebook` are exported from the package root, so this is
// public API, not demo-only code — but this suite only ever checked the main
// engine. v1.16.0 fixed 19/33 undocumented TECH glyphs here once; by v1.32.8
// the line directly beneath that fix had drifted the same way, leaving 12 of
// STRUCTURE_GLYPHS' 21 entries, every ERROR_CODES symbol, the PROMPT_PATTERNS
// action glyphs, and the ₍N₎ file-reference notation itself undefined in the
// prompt the model receives.

test('legacy engine: every glyph it emits is defined in the prompt it ships', () => {
  const codebook = new Codebook();
  const compressor = new Compressor(codebook);

  // Exercise the whole public surface, including the diagnostic codes whose
  // composite glyphs (⏱timeout, ○denied) appear in no other table.
  const emitted = [
    compressor.compressPrompt('Fix the error in the React component and deploy to Kubernetes'),
    compressor.compressPrompt('review src/app.ts'),
    compressor.compressPrompt('explain how the auth flow works'),
    compressor.compressFile({ path: 'src/components/App.tsx', content: 'import React from "react";\nexport function App(){ return null; }' }),
    compressor.compressDiagnostic({ code: 'TS2339', message: "Property 'x' does not exist on type 'Y'", file: 'src/a.ts', line: 42 }),
    compressor.compressDiagnostic({ code: 'ETIMEDOUT', message: 'timed out', file: 'src/b.ts', line: 9 }),
    compressor.compressDiagnostic({ code: 'EACCES', message: 'denied', file: 'src/c.ts', line: 1 }),
    compressor.compressHistory([{ role: 'user', content: 'deploy the python service with docker' }]),
    compressor.compress({
      prompt: 'Review this Django backend and the Postgres schema',
      files: [{ path: 'api/views.py', content: 'def index(): pass' }],
      diagnostics: [{ code: 'E501', message: 'line too long', file: 'api/views.py', line: 3 }],
    }),
  ].map((out) => (typeof out === 'string' ? out : JSON.stringify(out))).join('\n');

  const prompt = generateSystemPrompt(codebook);
  const glyphs = [...new Set([...emitted].filter((ch) => ch.charCodeAt(0) > 127))];
  assert(glyphs.length > 10, `precondition: the fixture must actually exercise the glyph vocabulary, got ${glyphs.length}`);

  const undocumented = glyphs.filter((g) => !prompt.includes(g));
  assert.deepStrictEqual(
    undocumented,
    [],
    `the legacy engine emits ${undocumented.length} glyph(s) the model is never given a definition for: ${undocumented.join(' ')}`,
  );
});

test('legacy engine: the SYM line covers STRUCTURE_GLYPHS, not a hand-picked subset', () => {
  // The specific failure mode: a literal string listing a subset silently
  // falls behind the table it is meant to describe. Assert against the source
  // of truth rather than against one sampled payload.
  const prompt = generateSystemPrompt(new Codebook());
  const missing = Object.values(STRUCTURE_GLYPHS).filter((g) => !prompt.includes(g));
  assert.deepStrictEqual(missing, [], `STRUCTURE_GLYPHS entries absent from the prompt: ${missing.join(' ')}`);
});

console.log(`\ncodebook-completeness: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('codebook-completeness suite ok');
}
