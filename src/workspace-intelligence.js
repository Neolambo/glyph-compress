import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const VERSION = '1.5.0';
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

export function buildWorkspaceCodebook(rootDir = process.cwd(), options = {}) {
  const root = path.resolve(rootDir);
  const files = listWorkspaceFiles(root, options);
  const symbolCounts = new Map();
  const importGraph = [];
  const diagnostics = [];
  const owners = new Map();
  const fileSummaries = [];

  for (const filePath of files) {
    const rel = normalizePath(path.relative(root, filePath));
    const text = readTextFile(filePath, options.maxFileBytes || 120_000);
    const symbols = extractSymbols(text);
    for (const symbol of symbols) {
      symbolCounts.set(symbol, (symbolCounts.get(symbol) || 0) + 1);
    }
    for (const target of extractImports(text)) {
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
      imports: extractImports(text).slice(0, 20),
      lines: text ? text.split(/\r?\n/).length : 0,
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
  };
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

  const ranked = codebook.files.map((file) => {
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
    return { ...file, score };
  }).filter((file) => file.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, options.limit || 12);

  return { intents, files: ranked, codebook };
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
  return {
    version: VERSION,
    root,
    checks,
    ok: checks.filter((check) => check.name !== 'git repository').every((check) => check.ok),
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
    /(TODO|FIXME|HACK):?\s*([^\n]+)/gi,
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
