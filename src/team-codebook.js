/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Team Codebook Registry
 *
 * The per-session dynamic dictionary (see glyph-middleware.js) and the
 * cross-session cache (~/.glyphcompress/cache/<hash>.json, v1.13.0) are
 * both PER-MACHINE — two developers working on the same repository build
 * up two different, unshared §N assignments. That means the same
 * repeated identifier can map to a different glyph on each teammate's
 * machine, which both wastes the learning (everyone re-teaches the
 * dictionary independently) and defeats organization-wide provider-side
 * prompt caching (implicit caching keys off byte-identical prefixes,
 * which requires the SAME word to produce the SAME glyph everywhere).
 *
 * The team codebook is a small, git-committable file
 * (glyphcompress.team.json, at the repository root — NOT under the
 * gitignored .glyphcompress/ directory) listing dictionary entries in
 * priority order. When present, GlyphCompressor seeds its dynamic
 * dictionary from it before any per-session learning happens, so every
 * team member's compressor assigns the exact same §N indices for shared
 * vocabulary — deliberately, not by chance.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';

export const TEAM_CODEBOOK_FILENAME = 'glyphcompress.team.json';

export function teamCodebookPath(rootDir) {
  return path.join(path.resolve(rootDir), TEAM_CODEBOOK_FILENAME);
}

/**
 * @param {string} rootDir
 * @returns {{ version: number, generatedAt: string, entries: string[] } | null}
 */
export function loadTeamCodebook(rootDir) {
  const filePath = teamCodebookPath(rootDir);
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(data.entries)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * @param {string} rootDir
 * @param {string[]} entries - ordered by priority, index 0 = highest priority = §1
 */
export function saveTeamCodebook(rootDir, entries) {
  const filePath = teamCodebookPath(rootDir);
  const deduped = [...new Set(entries.filter(Boolean))];
  const data = {
    version: 1,
    generatedAt: new Date().toISOString(),
    entries: deduped,
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return filePath;
}

/**
 * Merge additional entries (e.g. from a developer's locally-learned
 * dynamic dictionary cache) into the existing team codebook, preserving
 * the existing priority order and appending genuinely new words after it.
 * @param {string} rootDir
 * @param {string[]} newEntries - already in priority order
 */
export function mergeTeamCodebook(rootDir, newEntries) {
  const existing = loadTeamCodebook(rootDir);
  const merged = [...(existing?.entries || [])];
  const seen = new Set(merged);
  for (const word of newEntries) {
    if (!word || seen.has(word)) continue;
    merged.push(word);
    seen.add(word);
  }
  return { path: saveTeamCodebook(rootDir, merged), entries: merged, addedCount: merged.length - (existing?.entries.length || 0) };
}

/**
 * Read a developer's local per-workspace dynamic-dictionary cache (the
 * same file _initCache()/_loadCache() in glyph-middleware.js use) and
 * return its learned words in their existing priority order, without
 * requiring a GlyphCompressor instance.
 * @param {string} workspacePath
 * @param {string} [homeDir]
 * @returns {string[]}
 */
export function readLocalDynamicDictWords(workspacePath, homeDir = os.homedir()) {
  try {
    const hash = createHash('sha256').update(workspacePath).digest('hex').slice(0, 16);
    const cacheFile = path.join(homeDir, '.glyphcompress', 'cache', `${hash}.json`);
    if (!fs.existsSync(cacheFile)) return [];
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (!Array.isArray(data.dynamicDict)) return [];
    return data.dynamicDict.map(([word]) => word);
  } catch {
    return [];
  }
}
