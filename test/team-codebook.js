/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Team Codebook Registry Suite
 *
 * The per-session dynamic dictionary and its cross-session cache
 * (~/.glyphcompress/cache/<hash>.json) are both per-machine, so two
 * teammates working on the same repo independently learn different §N
 * assignments for the same identifiers — wasted relearning, and it
 * defeats org-wide provider-side prompt caching (which needs byte-
 * identical prefixes). glyphcompress.team.json (git-committable, unlike
 * the gitignored .glyphcompress/ cache dir) lets a team commit a shared,
 * priority-ordered dictionary that every GlyphCompressor instance seeds
 * from before any local learning happens.
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { GlyphCompressor } from '../src/glyph-middleware.js';
import { loadTeamCodebook, saveTeamCodebook, mergeTeamCodebook, teamCodebookPath } from '../src/team-codebook.js';
import { loadEncoder } from './helpers/optional-tokenizer.js';

const cliPath = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

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

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-team-suite-'));

try {
  test('saveTeamCodebook / loadTeamCodebook round-trip', () => {
    saveTeamCodebook(dir, ['AuthenticationManager', 'PaymentGateway']);
    const loaded = loadTeamCodebook(dir);
    assert.deepStrictEqual(loaded.entries, ['AuthenticationManager', 'PaymentGateway']);
    assert(fs.existsSync(teamCodebookPath(dir)), 'should write glyphcompress.team.json at the workspace root, not under .glyphcompress/');
  });

  test('loadTeamCodebook returns null when no file exists', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-team-empty-'));
    assert.strictEqual(loadTeamCodebook(emptyDir), null);
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  test('mergeTeamCodebook preserves existing priority order and appends new words', () => {
    saveTeamCodebook(dir, ['First', 'Second']);
    const result = mergeTeamCodebook(dir, ['Second', 'Third', 'Fourth']);
    assert.deepStrictEqual(result.entries, ['First', 'Second', 'Third', 'Fourth'], 'existing order must be preserved; only genuinely new words appended');
    assert.strictEqual(result.addedCount, 2, 'should report only the 2 genuinely new words as added');
  });

  test('GlyphCompressor seeds §N indices from the team codebook, in file order', () => {
    saveTeamCodebook(dir, ['AuthenticationManager', 'PaymentGateway']);
    const gc = new GlyphCompressor({ level: 'standard', provider: 'raw', workspacePath: dir });
    assert.strictEqual(gc.dynamicDict.get('AuthenticationManager'), '§1');
    assert.strictEqual(gc.dynamicDict.get('PaymentGateway'), '§2');
    const info = gc.getTeamCodebookInfo();
    assert.strictEqual(info.loaded, true);
    assert.strictEqual(info.entriesLoaded, 2);
  });

  test('Team-seeded glyphs are used during compression and documented in the codebook', () => {
    saveTeamCodebook(dir, ['AuthenticationManager']);
    const gc = new GlyphCompressor({ level: 'standard', provider: 'raw', workspacePath: dir });
    const r = gc.compressText('The AuthenticationManager validates AuthenticationManager tokens.');
    assert(r.compressed.includes('§1'), `should use the team-assigned §1, got: ${r.compressed}`);
    assert(gc.getCodebookPrompt().includes('§1=AuthenticationManager'), 'codebook must document the team-seeded entry');
  });

  test('Session-local learning continues indices after team entries without colliding', () => {
    saveTeamCodebook(dir, ['AuthenticationManager']);
    const gc = new GlyphCompressor({ level: 'standard', provider: 'raw', workspacePath: dir });
    // NotificationDispatcher is 2 real tokens against a 2-token §N glyph, so
    // since v1.33.8 it can never be worth learning; ReconciliationWorkerIdentifier
    // is 4, and repeated enough to amortise its own definition. The team entry
    // itself is seeded regardless of economics — that is the point of a team
    // codebook — so AuthenticationManager stays as the seeded word.
    const r = gc.compressText('AuthenticationManager calls ' + 'ReconciliationWorkerIdentifierRegistry '.repeat(12) + 'now.');
    assert(r.compressed.includes('§1'), 'team entry should still be used');
    // The newly-learned word must get its own, later index — never reuse
    // §1, which the team codebook already claimed for a different word.
    assert.strictEqual(gc.dynamicDict.get('AuthenticationManager'), '§1', 'team entry keeps its assigned index');
    const newGlyph = gc.dynamicDict.get('ReconciliationWorkerIdentifierRegistry');
    assert(newGlyph && newGlyph !== '§1', `session-learned word must get a fresh index, not reuse §1, got: ${newGlyph}`);
  });

  test('Compressor with no workspacePath is unaffected (opt-in via workspacePath only)', () => {
    const gc = new GlyphCompressor({ level: 'standard', provider: 'raw' });
    assert.strictEqual(gc.getTeamCodebookInfo().loaded, false);
  });

  test('CLI: team-codebook show reports "no team codebook" before sync', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-team-cli-'));
    try {
      const out = execFileSync(process.execPath, [cliPath, 'team-codebook', 'show'], { cwd: emptyDir, encoding: 'utf8' });
      assert(out.includes('No team codebook found'), `expected "no team codebook" message, got: ${out}`);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  test('CLI: team-codebook sync promotes locally-learned words, then show lists them', () => {
    const cliDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-team-cli-sync-'));
    try {
      // Eight occurrences, not two. RepeatedIdentifierWord is 4 real tokens
      // against a 2-token §N glyph, so each substitution saves 2 while the
      // entry's own definition costs ~7 — two occurrences is a net loss, and
      // since v1.33.8 the dictionary correctly declines to learn it, leaving
      // `team-codebook sync` with nothing to promote.
      fs.writeFileSync(path.join(cliDir, 'sample.txt'), `${'RepeatedIdentifierWordForTesting '.repeat(12)}appears often.\n`, 'utf8');
      execFileSync(process.execPath, [cliPath, 'sample.txt', '--level', 'standard'], { cwd: cliDir, encoding: 'utf8' });
      const syncOut = execFileSync(process.execPath, [cliPath, 'team-codebook', 'sync', '--json'], { cwd: cliDir, encoding: 'utf8' });
      const syncResult = JSON.parse(syncOut);
      assert(syncResult.totalEntries > 0, 'sync should promote at least one learned word');
      const showOut = execFileSync(process.execPath, [cliPath, 'team-codebook', 'show', '--json'], { cwd: cliDir, encoding: 'utf8' });
      const team = JSON.parse(showOut);
      assert(Array.isArray(team.entries) && team.entries.length === syncResult.totalEntries, 'show should reflect what sync wrote');
    } finally {
      fs.rmSync(cliDir, { recursive: true, force: true });
    }
  });
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

// A provider cache keys on bytes, so a compressed body is only reusable across
// sessions if identical input yields identical output. It does not by default:
// §N indices are handed out in session learning order, so the same file emits
// `const §1 = 'raw'` from a fresh compressor and `const §36 = 'raw'` from one
// that had already handled other content.
//
// Setting `workspacePath` is what fixes it — the cross-session dictionary cache
// (v1.13.0) persists the assignments and reloads them, so learning order stops
// mattering. Measured across all four combinations, the team registry makes no
// difference to this on its own; `workspacePath` is the whole factor. (The
// registry is loaded *from* workspacePath, and its job is cross-machine
// agreement, which is a different property.)
//
// Untested until now, and invisible if it breaks: output would stay valid and
// simply never hit a cache again.
// Requires the real tokenizer, and not for convenience.
//
// The property under test is that §N indices are handed out in session
// learning order, so a warmed session numbers them differently from a fresh
// one unless workspacePath persists the assignments. Under the conservative
// pricing that applies when js-tiktoken is absent the dictionary admits
// almost nothing — measured, 0 entries on src/proxy.js — so no index exists
// whose numbering could differ, and the control assertion below becomes
// vacuously true. That is unobservable, not passing.
const determinismEncoder = await loadEncoder();
if (!determinismEncoder) {
  console.log('  ~ workspacePath determinism: SKIPPED (needs js-tiktoken; without it the dictionary admits no entries, so §N ordering is unobservable)');
} else {
test('workspacePath makes the compressed body byte-identical across differently-warmed sessions', () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-determinism-'));
  try {
    // src/proxy.js, not src/token-estimator.js: the target has to actually
    // compress, and under the conservative pricing that applies when
    // js-tiktoken is absent the smaller file falls back in both arms —
    // making them trivially identical and the control assertion below
    // vacuous. Verified: proxy.js compresses in both configurations.
    const target = fs.readFileSync(path.join(repoRoot, 'src', 'proxy.js'), 'utf8');
    const unrelated = fs.readFileSync(path.join(repoRoot, 'src', 'logger.js'), 'utf8');

    const warmDifferently = (opts) => {
      // 'aggressive', not 'standard'. Measured, 'standard' no longer clears the
      // margin on real source once compression is priced in real tokens, so
      // BOTH arms fell back to the identical uncompressed text — which the
      // control assertion below correctly flagged as proving nothing.
      const gc = new GlyphCompressor({ level: 'aggressive', provider: 'openai', ...opts });
      gc.compressText(unrelated, 'openai');
      // Warming content that actually TEACHES the dictionary something. The
      // short prompt that used to sit here no longer does: with admission
      // priced in real tokens (v1.33.8) none of its words qualify, so the
      // §N counter never advanced and both arms produced identical output —
      // which the control assertion below correctly flagged as proving
      // nothing. These identifiers are 4+ real tokens and repeated enough to
      // pay for their own definitions.
      gc.compressText(
        `${'UnrelatedWarmupIdentifierAlphaRegistry '.repeat(12)}${'UnrelatedWarmupIdentifierBetaRegistry '.repeat(12)}`,
        'openai',
      );
      return gc.compressText(target, 'openai').compressed;
    };
    const fromFresh = (opts) =>
      new GlyphCompressor({ level: 'aggressive', provider: 'openai', ...opts }).compressText(target, 'openai').compressed;

    assert.strictEqual(
      warmDifferently({ workspacePath: ws }),
      fromFresh({ workspacePath: ws }),
      'identical input produced different bytes depending on what the session had already seen — the compressed body cannot be a cache prefix across sessions',
    );

    // Control: without workspacePath there is nothing to persist assignments,
    // so the divergence is expected. Asserting it keeps the test honest about
    // which mechanism is actually responsible.
    assert.notStrictEqual(
      warmDifferently({}),
      fromFresh({}),
      'without workspacePath the output should still be session-order dependent — if this now matches, determinism comes from somewhere else and the assertion above proves nothing',
    );
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});
}


console.log(`\nteam-codebook: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('team-codebook suite ok');
}
