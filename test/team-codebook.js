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
    const r = gc.compressText('AuthenticationManager calls NotificationDispatcher NotificationDispatcher NotificationDispatcher now.');
    assert(r.compressed.includes('§1'), 'team entry should still be used');
    // The newly-learned word must get its own, later index — never reuse
    // §1, which the team codebook already claimed for a different word.
    assert.strictEqual(gc.dynamicDict.get('AuthenticationManager'), '§1', 'team entry keeps its assigned index');
    const newGlyph = gc.dynamicDict.get('NotificationDispatcher');
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
      fs.writeFileSync(path.join(cliDir, 'sample.txt'), 'RepeatedIdentifierWord RepeatedIdentifierWord appears twice.\n', 'utf8');
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

console.log(`\nteam-codebook: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('team-codebook suite ok');
}
