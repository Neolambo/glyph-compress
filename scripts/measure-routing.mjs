/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Context Router retrieval measurement
 *
 * Run with:  npm run measure:routing
 *
 * Reports how often the router puts the right file in its top 3 for six
 * queries with unambiguous ground truth on this repository.
 *
 * This script exists because two published retrieval figures turned out not
 * to reproduce. Both came from running an ad-hoc harness against the working
 * tree, which is not a stable measurement environment for two reasons:
 *
 *  1. **git dirtiness.** Ranking gives +3 to any file git reports as staged or
 *     unstaged. Editing src/workspace-intelligence.js — the target of query 6
 *     — therefore boosted the very file being measured. Every "after" run had
 *     it dirty; every "before" run, taken via `git stash`, had it clean. That
 *     alone accounted for a whole retrieval point, and it survived a first
 *     round of diagnosis because `sed`-ing a file to mutate it makes it dirty
 *     again.
 *
 *  2. **usage history.** routeAndCompress() records usage for everything it
 *     selects, so simply running the router changes what the next run returns.
 *     A measurement taken on a workspace with months of history is not
 *     comparable to one taken on a fresh checkout.
 *
 * So this script controls both: it refuses to run on a dirty tree, and it
 * seeds a deterministic usage history (or none) rather than inheriting
 * whatever is on disk.
 *
 * Flags:
 *   --seed-usage[=N]   build a usage history first by routing N rounds
 *                      (default 40) of ordinary queries, reproducing the
 *                      feedback loop described in RELEASE_NOTES v1.33.3.
 *   --allow-dirty      measure anyway, and label the output untrusted.
 *   --verbose          print per-query results.
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { buildWorkspaceCodebook, saveWorkspaceCodebook, selectRelevantFiles } from '../src/workspace-intelligence.js';
import { GlyphCompressor } from '../src/glyph-middleware.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TOP_N = 3;

const args = process.argv.slice(2);
const has = (name) => args.some((a) => a === name || a.startsWith(`${name}=`));
const valueOf = (name, fallback) => {
  const found = args.find((a) => a.startsWith(`${name}=`));
  return found ? Number(found.slice(name.length + 1)) : fallback;
};

/**
 * Six queries whose correct answer is not in dispute. Deliberately phrased the
 * way someone would actually ask, not in terms lifted from the target file's
 * path — a query that quotes the filename measures nothing.
 */
const CASES = [
  { query: 'dashboard escapeHtml crashes on a number', want: 'src/dashboard.js' },
  { query: 'native anthropic request loses its system prompt', want: 'src/anthropic-bridge.js' },
  { query: 'token estimator undercounts against tiktoken', want: 'src/token-estimator.js' },
  // Both live in the ESM source of truth; src/glyph-middleware.js is a shim.
  { query: 'privacy redaction pattern for api keys', want: 'vscode-ext/glyph-middleware.js' },
  { query: 'attentional decay compaction zones', want: 'vscode-ext/glyph-middleware.js' },
  { query: 'workspace codebook file usage ranking', want: 'src/workspace-intelligence.js' },
];

/** Ordinary development queries, deliberately not the six above, so the seeded
 *  history is not tuned toward or against what is being measured. */
const SEED_QUERIES = [
  'fix the failing test',
  'why is compression slow',
  'add a new provider',
  'review my changes',
  'explain the architecture',
  'update the readme',
  'debug the proxy',
  'improve the benchmark',
];

function gitDirtyCount() {
  try {
    const out = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
    // Untracked files do not get the ranking boost, so they cannot skew this.
    return out.split('\n').filter((line) => line.trim() && !line.startsWith('??')).length;
  } catch {
    return 0;
  }
}

const dirty = gitDirtyCount();
if (dirty > 0 && !has('--allow-dirty')) {
  console.error(`Refusing to measure: ${dirty} tracked file(s) modified.`);
  console.error('Ranking gives +3 to git-dirty files, so a modified file scores higher than it will');
  console.error('for any user. Commit or stash first, or pass --allow-dirty to measure anyway.');
  process.exit(2);
}

const codebookDir = path.join(ROOT, '.glyphcompress');
fs.rmSync(codebookDir, { recursive: true, force: true });

let seededRounds = 0;
if (has('--seed-usage')) {
  seededRounds = valueOf('--seed-usage', 40);
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'raw' });
  for (let round = 0; round < seededRounds; round++) {
    for (const query of SEED_QUERIES) {
      compressor.routeAndCompress(query, { rootDir: ROOT, tokenBudget: 4000, maxFiles: 6 });
    }
  }
} else {
  // Pin an empty history explicitly rather than leaving it to whatever a
  // previous run left behind.
  const codebook = buildWorkspaceCodebook(ROOT, { incremental: false });
  codebook.usage = {};
  saveWorkspaceCodebook(ROOT, codebook);
}

let hits = 0;
let noise = 0;
let slots = 0;

for (const { query, want } of CASES) {
  const { files } = selectRelevantFiles(ROOT, query, { limit: TOP_N });
  const paths = files.map((file) => file.path.replace(/\\/g, '/'));
  const hit = paths.includes(want);
  if (hit) hits++;
  slots += paths.length;
  noise += paths.filter((p) => p !== want).length;
  if (has('--verbose')) {
    console.log(`${hit ? 'HIT ' : 'MISS'} ${query}`);
    console.log(`     want ${want}`);
    console.log(`     got  ${files.map((f) => `${f.path} (${f.score})`).join(', ') || '(none)'}`);
  }
}

const usage = seededRounds
  ? `seeded (${seededRounds} rounds x ${SEED_QUERIES.length} queries)`
  : 'none';
console.log(`\nretrieval ${hits}/${CASES.length}   noise ${noise}/${slots}`);
console.log(`usage history: ${usage}   tree: ${dirty > 0 ? `DIRTY (${dirty}) — untrusted` : 'clean'}`);
