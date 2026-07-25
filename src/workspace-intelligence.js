import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

const VERSION = '1.31.0';
const CODEBOOK_DIR = '.glyphcompress';
const CODEBOOK_FILE = 'codebook.json';
const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.rs', '.go', '.java', '.cs',
  '.vue', '.svelte', '.css', '.scss', '.json', '.md', '.yml', '.yaml',
]);
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.turbo', '.cache', 'assets']);

const INTENT_PATTERNS = [
  ['fix_error', /\b(fix|bug|error|exception|failing|broken|crash|typeerror|trace)\b/i],
  ['review_diff', /\b(review|diff|pr|pull request|staged|unstaged|changes?)\b/i],
  ['implement_feature', /\b(add|create|implement|feature|build|support)\b/i],
  ['explain_architecture', /\b(explain|architecture|flow|design|overview|how does)\b/i],
  ['write_tests', /\b(test|spec|coverage|assert|unit|integration)\b/i],
  ['optimize_performance', /\b(optimi[sz]e|performance|slow|latency|memory|speed|perf)\b/i],
];

export function detectIntent(text = '') {
  const matches = INTENT_PATTERNS
    .filter(([, pattern]) => pattern.test(text))
    .map(([intent]) => intent);
  return matches.length ? matches : ['general'];
}

/**
 * Incremental by default: reuses a previous codebook's per-file data
 * (symbols/imports/diagnostics) for any file whose mtime hasn't changed
 * since that codebook was built, instead of re-reading and re-parsing
 * every file in the workspace on every `inspect`/`route` call — the
 * previous behavior on a large repository. Pass `{ incremental: false }`
 * to force a full rebuild, or `{ previousCodebook }` to reuse a codebook
 * already in memory instead of reading `.glyphcompress/codebook.json`
 * again. `usage` (per-file selection counts, see recordFileUsage/
 * usageBoost below) is always carried forward across rebuilds.
 */
export function buildWorkspaceCodebook(rootDir = process.cwd(), options = {}) {
  const root = path.resolve(rootDir);
  const files = listWorkspaceFiles(root, options);
  const symbolCounts = new Map();
  const importGraph = [];
  const diagnostics = [];
  const owners = new Map();
  const fileSummaries = [];

  const previous = options.incremental === false ? null : (options.previousCodebook || loadWorkspaceCodebook(root));
  const previousByPath = new Map((previous?.files || []).map((f) => [f.path, f]));
  const previousDiagnosticsByPath = new Map();
  for (const diag of previous?.diagnostics || []) {
    if (!previousDiagnosticsByPath.has(diag.file)) previousDiagnosticsByPath.set(diag.file, []);
    previousDiagnosticsByPath.get(diag.file).push(diag);
  }

  let reused = 0;
  let rescanned = 0;

  for (const filePath of files) {
    const rel = normalizePath(path.relative(root, filePath));
    const mtimeMs = statMtimeMs(filePath);
    const prevSummary = previousByPath.get(rel);

    if (prevSummary && prevSummary.mtimeMs != null && prevSummary.mtimeMs === mtimeMs) {
      reused++;
      fileSummaries.push(prevSummary);
      for (const symbol of prevSummary.symbols || []) symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
      for (const target of prevSummary.imports || []) importGraph.push({ from: rel, to: target });
      for (const diag of previousDiagnosticsByPath.get(rel) || []) diagnostics.push(diag);
      const owner = prevSummary.owner || inferOwner(rel);
      owners.set(owner, (owners.get(owner) || 0) + 1);
      continue;
    }

    rescanned++;
    const text = readTextFile(filePath, options.maxFileBytes || 120_000);
    const symbols = extractSymbols(text);
    const imports = extractImports(text);
    for (const symbol of symbols) {
      symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
    }
    for (const target of imports) {
      importGraph.push({ from: rel, to: target });
    }
    for (const diagnostic of extractDiagnostics(text)) {
      diagnostics.push({ file: rel, ...diagnostic });
    }
    const owner = inferOwner(rel);
    owners.set(owner, (owners.get(owner) || 0) + 1);
    fileSummaries.push({
      path: rel,
      ext: path.extname(rel).slice(1) || 'text',
      owner,
      symbols: symbols.slice(0, 20),
      imports: imports.slice(0, 20),
      lines: text ? text.split(/\r?\n/).length : 0,
      mtimeMs,
    });
  }

  return {
    version: VERSION,
    root,
    generatedAt: new Date().toISOString(),
    files: fileSummaries,
    symbols: [...symbolCounts.entries()]
      .map(([name, frequency]) => ({ name, frequency }))
      .sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name))
      .slice(0, options.maxSymbols || 200),
    importGraph: importGraph.slice(0, options.maxImports || 300),
    diagnostics: diagnostics.slice(0, options.maxDiagnostics || 100),
    owners: [...owners.entries()].map(([name, files]) => ({ name, files })).sort((a, b) => b.files - a.files),
    git: getGitContext(root),
    usage: previous?.usage || {},
    incrementalStats: { reused, rescanned, total: files.length },
  };
}

/**
 * Record that these files were selected/sent for a task, so future
 * relevance ranking can weight files that have proven useful before —
 * "decay or weighting from repeated repository usage." Called by
 * GlyphCompressor.routeAndCompress() after budgeting, so the signal is
 * "this file actually got sent," not just "this file was a candidate."
 *
 * routeAndCompress() never required a pre-built on-disk codebook (only the
 * CLI's `inspect` command persisted one), so without this fallback usage
 * would silently go unrecorded on a workspace nobody had inspected yet.
 * Building one here also seeds the incremental cache, so the next call's
 * buildWorkspaceCodebook() can start reusing unchanged files immediately.
 */
export function recordFileUsage(rootDir = process.cwd(), filePaths = []) {
  if (!filePaths.length) return null;
  const root = path.resolve(rootDir);
  const codebook = loadWorkspaceCodebook(root) || buildWorkspaceCodebook(root);
  codebook.usage = codebook.usage || {};
  const now = new Date().toISOString();
  for (const filePath of filePaths) {
    const entry = codebook.usage[filePath] || { count: 0, lastUsedAt: null };
    entry.count += 1;
    entry.lastUsedAt = now;
    codebook.usage[filePath] = entry;
  }
  saveWorkspaceCodebook(root, codebook);
  return codebook.usage;
}

// A file used many times recently is more likely to matter again than one
// used once months ago. Half-life decay (not a hard cutoff) so the boost
// fades smoothly rather than a usage record suddenly stops counting at an
// arbitrary age. Count is capped so a file selected 50 times can't
// permanently dominate every future ranking regardless of relevance.
const USAGE_DECAY_HALF_LIFE_DAYS = 14;
const USAGE_COUNT_CAP = 10;

function usageBoost(usageEntry) {
  if (!usageEntry || !usageEntry.lastUsedAt) return 0;
  const ageDays = (Date.now() - new Date(usageEntry.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (!Number.isFinite(ageDays) || ageDays < 0) return 0;
  const decay = Math.pow(0.5, ageDays / USAGE_DECAY_HALF_LIFE_DAYS);
  return Math.min(usageEntry.count, USAGE_COUNT_CAP) * decay;
}

function statMtimeMs(filePath) {
  try {
    return Math.floor(fs.statSync(filePath).mtimeMs);
  } catch {
    return null;
  }
}

export function saveWorkspaceCodebook(rootDir, codebook) {
  const dir = path.join(path.resolve(rootDir), CODEBOOK_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, CODEBOOK_FILE);
  fs.writeFileSync(filePath, JSON.stringify(codebook, null, 2) + '\n', 'utf8');
  return filePath;
}

export function loadWorkspaceCodebook(rootDir = process.cwd()) {
  const filePath = path.join(path.resolve(rootDir), CODEBOOK_DIR, CODEBOOK_FILE);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function selectRelevantFiles(rootDir = process.cwd(), query = '', options = {}) {
  const root = path.resolve(rootDir);
  const codebook = options.codebook || loadWorkspaceCodebook(root) || buildWorkspaceCodebook(root, options);
  const intents = detectIntent(query);
  const terms = extractQueryTerms(query);
  const gitPaths = new Set([...(codebook.git?.staged || []), ...(codebook.git?.unstaged || [])]);

  // gitDiffOnly restricts candidates to files git already reports as
  // staged/unstaged — for "review what I changed" / "explain this diff"
  // workflows where relevance comes from being part of the change, not
  // from matching query keywords. A changed file is kept even if it
  // scores 0 against the query terms below, since the diff membership
  // itself is what makes it relevant here.
  const candidateFiles = options.gitDiffOnly
    ? codebook.files.filter((file) => gitPaths.has(file.path))
    : codebook.files;

  const usage = codebook.usage || {};

  const ranked = candidateFiles.map((file) => {
    let score = 0;
    const haystack = `${file.path} ${file.owner} ${(file.symbols || []).join(' ')} ${(file.imports || []).join(' ')}`.toLowerCase();
    for (const term of terms) {
      if (haystack.includes(term)) score += 4;
    }
    if (gitPaths.has(file.path)) score += intents.includes('review_diff') ? 10 : 3;
    if (intents.includes('write_tests') && /(?:test|spec)\./i.test(file.path)) score += 6;
    if (intents.includes('fix_error') && codebook.diagnostics.some((diag) => diag.file === file.path)) score += 8;
    if (intents.includes('explain_architecture') && /(readme|package|index|main|app|route|schema)/i.test(file.path)) score += 4;
    if (intents.includes('optimize_performance') && /(perf|benchmark|cache|query|service|worker)/i.test(file.path)) score += 5;
    // Adaptive workspace memory: a file selected repeatedly and recently
    // in past routing calls gets a modest, decaying boost — capped and
    // half-lifed (see usageBoost) so proven-useful files can surface even
    // for a generic query, without permanently outranking a real keyword
    // or intent match.
    score += usageBoost(usage[file.path]);
    return { ...file, score };
  }).filter((file) => file.score > 0 || options.gitDiffOnly)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, options.limit || 12);

  return { intents, files: ranked, codebook };
}

/**
 * Rank relevant files for a query AND read their content, ready to hand
 * to a compressor's token-budgeted context router. Kept separate from
 * compression itself (this module has no dependency on the compressor) —
 * GlyphCompressor.routeAndCompress() in glyph-middleware.js is the
 * consumer that turns this into compressed, budgeted output.
 */
export function routeContext(rootDir = process.cwd(), query = '', options = {}) {
  const root = path.resolve(rootDir);
  const { intents, files, codebook } = selectRelevantFiles(root, query, options);
  const withContent = files.map((file) => ({
    ...file,
    content: readTextFile(path.join(root, file.path), options.maxFileBytes || 120_000),
  }));
  return { intents, files: withContent, codebook };
}

export function runDoctor(rootDir = process.cwd()) {
  const root = path.resolve(rootDir);
  const checks = [];
  checks.push(checkFile(root, 'package.json', 'package metadata'));
  checks.push(checkFile(root, 'README.md', 'README documentation'));
  checks.push(checkFile(root, 'LICENSE', 'license file'));
  const pkg = readJson(path.join(root, 'package.json'));
  checks.push({ name: 'test script', ok: Boolean(pkg?.scripts?.test), detail: pkg?.scripts?.test || 'missing' });
  checks.push({ name: 'benchmark script', ok: Boolean(pkg?.scripts?.benchmark), detail: pkg?.scripts?.benchmark || 'missing' });
  checks.push({ name: 'git repository', ok: fs.existsSync(path.join(root, '.git')), detail: fs.existsSync(path.join(root, '.git')) ? 'present' : 'missing' });
  const homeDir = getDoctorHomeDir();
  const extPkg = readJson(path.join(root, 'vscode-ext', 'package.json'));
  const desiredVersion = extPkg?.version || pkg?.version || VERSION;
  const installedVersion = findInstalledExtensionVersion(homeDir);
  checks.push({
    name: 'installed VS Code extension version',
    ok: Boolean(installedVersion && installedVersion === desiredVersion),
    detail: installedVersion ? `${installedVersion} (expected ${desiredVersion})` : 'not found',
    optional: true,
  });

  const settingsInfo = findVsCodeSettings(root, homeDir);
  const glyphSettings = Object.keys(settingsInfo?.settings || {}).filter((key) => key.startsWith('glyphCompress.'));
  checks.push({
    name: 'VS Code settings',
    ok: glyphSettings.length > 0,
    detail: settingsInfo ? `${normalizePath(path.relative(root, settingsInfo.source)) || normalizePath(settingsInfo.source)}: ${glyphSettings.join(', ') || 'no glyphCompress.* keys'}` : 'not found',
    optional: true,
  });
  checks.push({
    name: 'proxy target setting',
    ok: Boolean(settingsInfo?.settings?.['glyphCompress.targetApiUrl']),
    detail: settingsInfo?.settings?.['glyphCompress.targetApiUrl'] || 'missing glyphCompress.targetApiUrl',
    optional: true,
  });

  const proxyConfig = findProxyConfig(root, homeDir);
  checks.push({
    name: 'proxy config',
    ok: Boolean(proxyConfig?.ok),
    detail: proxyConfig ? `${normalizePath(path.relative(root, proxyConfig.path)) || normalizePath(proxyConfig.path)}: ${proxyConfig.detail}` : 'not found',
    optional: true,
  });

  const credentials = detectProviderCredentials();
  checks.push({
    name: 'provider credentials',
    ok: credentials.length > 0,
    detail: credentials.length ? credentials.join(', ') : 'missing supported provider env vars',
    optional: true,
  });
  return {
    version: VERSION,
    root,
    checks,
    ok: checks.filter((check) => check.name !== 'git repository' && !check.optional).every((check) => check.ok),
  };
}

function listWorkspaceFiles(root, options) {
  const maxFiles = options.maxFiles || 250;
  const files = [];
  const stack = [root];
  while (stack.length && files.length < maxFiles) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name) && entry.name !== CODEBOOK_DIR) stack.push(fullPath);
      } else if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(fullPath);
        if (files.length >= maxFiles) break;
      }
    }
  }
  return files;
}

function readTextFile(filePath, maxBytes) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > maxBytes) return '';
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function extractSymbols(text) {
  const symbols = new Set();
  const patterns = [
    /\b(?:function|class|interface|type|const|let|var|def|fn|func|struct)\s+([A-Za-z_][A-Za-z0-9_]*)/g,
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(?:async\s*)?\(/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) symbols.add(match[1]);
  }
  return [...symbols].slice(0, 80);
}

function extractImports(text) {
  const imports = new Set();
  const patterns = [
    /\bimport\s+(?:[^'";]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /\brequire\(['"]([^'"]+)['"]\)/g,
    /\bfrom\s+([A-Za-z0-9_./-]+)\s+import\b/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) imports.add(match[1]);
  }
  return [...imports];
}

function extractDiagnostics(text) {
  const diagnostics = [];
  const patterns = [
    /(error TS\d+:[^\n]+)/gi,
    /(warning:[^\n]+)/gi,
    /\b(TODO|FIXME|HACK)\b:?\s*([^\n]+)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) diagnostics.push({ message: match[0].trim() });
  }
  return diagnostics;
}

function inferOwner(relPath) {
  const parts = normalizePath(relPath).split('/');
  if (parts[0] === 'src' && parts[1]) return `src/${parts[1]}`;
  if (parts[0] === 'test' || parts[0] === 'tests') return 'tests';
  if (parts[0] === 'vscode-ext') return 'vscode-extension';
  if (parts[0] === 'bin') return 'cli';
  return parts[0] || 'root';
}

function getGitContext(root) {
  try {
    const output = execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const staged = [];
    const unstaged = [];
    for (const line of output.split(/\r?\n/).filter(Boolean)) {
      const status = line.slice(0, 2);
      const file = normalizePath(line.slice(3).trim().replace(/^.* -> /, ''));
      if (status[0] && status[0] !== ' ') staged.push(file);
      if (status[1] && status[1] !== ' ') unstaged.push(file);
    }
    return { staged, unstaged };
  } catch {
    return { staged: [], unstaged: [] };
  }
}

function extractQueryTerms(query) {
  return (query.toLowerCase().match(/[a-z0-9_./-]{3,}/g) || [])
    .filter((term) => !['the', 'and', 'for', 'with', 'this', 'that'].includes(term));
}

function checkFile(root, relPath, name) {
  const ok = fs.existsSync(path.join(root, relPath));
  return { name, ok, detail: ok ? relPath : 'missing' };
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function getDoctorHomeDir() {
  return process.env.GLYPHCOMPRESS_DOCTOR_HOME || os.homedir();
}

function compareVersions(left, right) {
  const leftParts = String(left).split('.').map((part) => parseInt(part, 10) || 0);
  const rightParts = String(right).split('.').map((part) => parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function findInstalledExtensionVersion(homeDir) {
  const candidates = [
    path.join(homeDir, '.vscode', 'extensions'),
    path.join(homeDir, '.vscode-insiders', 'extensions'),
    path.join(homeDir, '.cursor', 'extensions'),
  ];
  const versions = [];
  for (const dir of candidates) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || !/^neolambo\.glyph-compress-/i.test(entry.name)) continue;
      const pkg = readJson(path.join(dir, entry.name, 'package.json'));
      const version = pkg?.version || entry.name.replace(/^neolambo\.glyph-compress-/i, '');
      if (version) versions.push(version);
    }
  }
  return versions.sort((a, b) => compareVersions(b, a))[0] || '';
}

function findVsCodeSettings(root, homeDir) {
  const candidates = [
    path.join(root, '.vscode', 'settings.json'),
    path.join(homeDir, 'AppData', 'Roaming', 'Code', 'User', 'settings.json'),
    path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
    path.join(homeDir, '.config', 'Code', 'User', 'settings.json'),
  ];
  for (const candidate of candidates) {
    const settings = readJson(candidate);
    if (settings && typeof settings === 'object') return { source: candidate, settings };
  }
  return null;
}

function findProxyConfig(root, homeDir) {
  const candidates = [
    path.join(root, '.continue', 'config.yaml'),
    path.join(root, '.continue', 'config.json'),
    path.join(homeDir, '.continue', 'config.yaml'),
    path.join(homeDir, '.continue', 'config.json'),
  ];
  for (const candidate of candidates) {
    const text = readTextFile(candidate, 256 * 1024);
    if (!text) continue;
    if (/localhost:8080|127\.0\.0\.1:8080|localhost:\$\{?PORT\}?/i.test(text)) {
      return { path: candidate, ok: true, detail: 'references local proxy' };
    }
    return { path: candidate, ok: false, detail: 'present but missing local proxy reference' };
  }
  return null;
}

function detectProviderCredentials() {
  const supported = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GEMINI_API_KEY',
    'GOOGLE_API_KEY',
    'ANTIGRAVITY_API_KEY',
  ];
  return supported.filter((name) => Boolean(process.env[name]));
}
