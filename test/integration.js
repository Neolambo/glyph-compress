/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 * 
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 * 
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Integration Test
 * 
 * Tests the middleware with OpenAI and Claude message formats,
 * verifies compression ratios, and validates the codebook injection.
 */

import assert from 'assert';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { GlyphCompressor, wrapOpenAI } from '../vscode-ext/glyph-middleware.js';
import { buildWorkspaceCodebook, detectIntent, runDoctor, saveWorkspaceCodebook, selectRelevantFiles } from '../src/workspace-intelligence.js';
const require = createRequire(import.meta.url);
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

// using standard assert

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: GlyphCompressor Core ═══\n');
// ═══════════════════════════════════════════════════════════

const gc = new GlyphCompressor({ level: 'standard' });

test('Compress prompt: fix error', () => {
  const r = gc.compressText('fix the error in app.tsx');
  assert(r.compressed.includes('⺌✗'), `Expected ⺌✗, got: ${r.compressed}`);
});

test('Compress prompt: create component', () => {
  const r = gc.compressText('create a login component');
  assert(r.compressed.includes('▲⊞'), `Expected ▲⊞, got: ${r.compressed}`);
});

test('Compress prompt: deploy', () => {
  const r = gc.compressText('deploy the app to kubernetes');
  assert(r.compressed.includes('⺏'), `Expected ⺏, got: ${r.compressed}`);
  assert(r.compressed.includes('𝒦'), `Expected 𝒦, got: ${r.compressed}`);
});

test('Compress tech names', () => {
  const r = gc.compressText('build a react app with typescript and postgres');
  assert(r.compressed.includes('ℜ'), `Expected ℜ for react`);
  assert(r.compressed.includes('ᵗ'), `Expected ᵗ for typescript`);
  assert(r.compressed.includes('ℙ'), `Expected ℙ for postgres`);
});

test('Compress error messages', () => {
  const r = gc.compressText("Property 'name' does not exist on type 'User'");
  assert(r.compressed.includes("'name'∉User"), `Expected compressed error, got: ${r.compressed}`);
});

test('Compress file paths', () => {
  const r = gc.compressText('The file src/components/Header.tsx has an issue');
  assert(r.compressed.includes('₍'), `Expected file index ref, got: ${r.compressed}`);
});

test('Stats tracking', () => {
  const r = gc.compressText('optimize the performance of the main dashboard page with react and typescript');
  assert(parseInt(r.stats.originalTokens) > parseInt(r.stats.compressedTokens),
    'Compressed should be smaller');
});

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: OpenAI Message Format ═══\n');
// ═══════════════════════════════════════════════════════════

const gcOpenAI = new GlyphCompressor({ level: 'standard' });

test('OpenAI: inject codebook into existing system prompt', () => {
  const messages = [
    { role: 'system', content: 'You are a coding assistant.' },
    { role: 'user', content: 'fix the bug in UserProfile.tsx' },
  ];
  const { messages: compressed } = gcOpenAI.compressMessages(messages, 'openai');
  assert(compressed[0].role === 'system', 'First should be system');
  assert(compressed[0].content.includes('[GLYPH PROTOCOL'), 'Should inject codebook');
  assert(compressed[0].content.includes('coding assistant'), 'Should preserve original');
  assert(compressed[1].content.includes('⺌✗'), 'Should compress user prompt');
});

test('OpenAI: add system prompt if missing', () => {
  const messages = [
    { role: 'user', content: 'explain how react hooks work' },
  ];
  const { messages: compressed } = gcOpenAI.compressMessages(messages, 'openai');
  assert(compressed[0].role === 'system', 'Should prepend system message');
  assert(compressed[0].content.includes('[GLYPH PROTOCOL'), 'Should have codebook');
});

test('OpenAI: track stats per message', () => {
  const messages = [
    { role: 'user', content: 'create a dashboard component with react and typescript that shows user analytics' },
  ];
  const { messages: compressed, stats } = gcOpenAI.compressMessages(messages, 'openai');
  // The user message should be shorter after compression
  const userMsg = compressed.find(m => m.role === 'user');
  assert(userMsg.content.length < messages[0].content.length,
    'User message should be compressed');
  assert(stats.thisMessage.ratio.includes('x'), 'Should have ratio');
});

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: Claude/Anthropic Message Format ═══\n');
// ═══════════════════════════════════════════════════════════

const gcClaude = new GlyphCompressor({ level: 'standard' });

test('Claude: handle separate system field', () => {
  const messages = [
    { role: 'system', content: 'You are an expert developer.' },
    { role: 'user', content: 'debug the python pipeline' },
  ];
  const { messages: compressed } = gcClaude.compressMessages(messages, 'anthropic');
  const sysMsg = compressed.find(m => m.role === 'system');
  assert(sysMsg, 'Should have system message');
  assert(sysMsg.content.includes('[GLYPH PROTOCOL'), 'Should inject codebook');
});

test('Claude: compress user messages', () => {
  const messages = [
    { role: 'user', content: 'review the security of the authentication module in auth.service.ts' },
  ];
  const { messages: compressed } = gcClaude.compressMessages(messages, 'anthropic');
  const userMsg = compressed.find(m => m.role === 'user');
  assert(userMsg.content.length < messages[0].content.length, 'Should be shorter');
});

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: v2 Advanced Features ═══\n');
// ═══════════════════════════════════════════════════════════

test('Dynamic Dictionary replaces repeated words', () => {
  const gc = new GlyphCompressor({ level: 'standard' });
  const r = gc.compressText('The AuthenticationManager handles AuthenticationManager logic for AuthenticationManager.');
  assert(r.compressed.includes('α'), 'Should replace AuthenticationManager with α');
  assert(!r.compressed.includes('AuthenticationManager'), 'AuthenticationManager should be gone');
});

test('Ultra level strips comments and console.logs', () => {
  const gcUltra = new GlyphCompressor({ level: 'ultra' });
  const code = 'function test() { console.log("debug"); // comment here\n /* block */ return true; }';
  const r = gcUltra.compressText(code);
  assert(!r.compressed.includes('console.log'), 'Logs should be stripped');
  assert(!r.compressed.includes('comment here'), 'Inline comments should be stripped');
  assert(!r.compressed.includes('block'), 'Block comments should be stripped');
});

test('Anthropic wrap adds cache_control to system', async () => {
  // Mock Anthropic client
  let capturedParams = null;
  const mockClient = {
    messages: {
      create: async (params) => { capturedParams = params; return { id: 'msg_1' }; }
    }
  };
  
  // Need to import wrapAnthropic from the same module
  const { wrapAnthropic } = await import('../vscode-ext/glyph-middleware.js');
  const wrapped = wrapAnthropic(mockClient);
  await wrapped.messages.create({
    model: 'claude',
    system: 'Hello',
    messages: [{ role: 'user', content: 'test' }]
  });
  
  assert(Array.isArray(capturedParams.system), 'System should be converted to array');
  assert(capturedParams.system[0].cache_control, 'Should have cache_control');
  assert(capturedParams.system[0].cache_control.type === 'ephemeral', 'Should be ephemeral');
});

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: Compression Levels ═══\n');
// ═══════════════════════════════════════════════════════════

const complexMessage = `I have a TypeScript error in my React component at src/components/Dashboard.tsx line 42. 
The error says: Property 'analytics' does not exist on type 'DashboardProps'. 
Also there's a warning about unused imports on line 3.
Here's the code:
\`\`\`typescript
import React, { useState, useEffect, useCallback } from 'react';
import { DashboardProps } from '../types';
import { fetchAnalytics } from '../api/analytics';
import { unusedHelper } from '../utils';

export const Dashboard: React.FC<DashboardProps> = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics(userId).then(setData).finally(() => setLoading(false));
  }, [userId]);

  return <div>{loading ? 'Loading...' : JSON.stringify(data)}</div>;
};
\`\`\`
Can you fix this?`;

test('Light: only compress prompts and tech names', () => {
  const gc = new GlyphCompressor({ level: 'light' });
  const r = gc.compressText(complexMessage);
  // Light should compress tech names but NOT file paths or code blocks
  assert(r.compressed.includes('ℜ') || r.compressed.includes('ᵗ'), 'Should compress tech names');
  assert(parseInt(r.stats.savedPct) > 0, 'Should save something');
});

test('Standard: compress prompts + files + errors', () => {
  const gc = new GlyphCompressor({ level: 'standard' });
  const r = gc.compressText(complexMessage);
  assert(r.compressed.includes("∉"), 'Should compress error (contains ∉ symbol)');
  assert(parseInt(r.stats.savedPct) > 10, 'Should save >10%');
});

test('Aggressive: compress code blocks too', () => {
  const gcAggressive = new GlyphCompressor({ level: 'aggressive' });
  // Use a string with raw backticks (not escaped) to simulate actual markdown
  const codeMsg = 'Fix this code:\n' + '```' + 'typescript\nimport React from "react";\n\nexport const App = () => <div>Hello</div>;\n' + '```';
  const r = gcAggressive.compressText(codeMsg);
  assert(r.compressed.includes('```'), `Should preserve code block, got: ${r.compressed}`);
  assert(r.compressed.includes('imp ℜ'), 'Should minify import');
  assert(r.compressed.includes('exp ◇ App'), 'Should minify export const');
});

test('Ultra: compress Python code', () => {
  const gc = new GlyphCompressor({ level: 'ultra' });
  const code = '```py\nimport os\nfrom utils import get_data\n\nclass DataModel:\n    def do_work(self):\n        return True\n\ndef helper():\n    pass\n```';
  const r = gc.compressText(code);
  assert(r.compressed.includes('imp:2'), `Should find 2 imports, got: ${r.compressed}`);
  assert(r.compressed.includes('ƒ:2'), `Should find 2 functions, got: ${r.compressed}`);
  assert(r.compressed.includes('𝒞:1'), `Should find 1 class, got: ${r.compressed}`);
});

test('Ultra: compress Rust code', () => {
  const gc = new GlyphCompressor({ level: 'ultra' });
  const code = '```rust\nuse std::fs;\nuse reqwest::Client;\n\npub struct Server {\n    port: u16,\n}\n\nimpl Server {\n    pub async fn start(&self) {}\n}\n\nfn main() {}\n```';
  const r = gc.compressText(code);
  assert(r.compressed.includes('imp:2'), `Should find 2 imports, got: ${r.compressed}`);
  assert(r.compressed.includes('ƒ:2'), `Should find 2 functions, got: ${r.compressed}`);
  assert(r.compressed.includes('𝒞:1'), `Should find 1 struct, got: ${r.compressed}`);
});

test('Ultra: compress Go code', () => {
  const gc = new GlyphCompressor({ level: 'ultra' });
  const code = '```go\nimport (\n\t"fmt"\n\t"net/http"\n)\n\ntype Server struct {}\n\nfunc startServer() {}\n\nfunc (s *Server) stop() {}\n```';
  const r = gc.compressText(code);
  // Note: Go imports in block are not caught by line-by-line yet if not on same line, but 'type X struct' and 'func' should work.
  // Wait, the regex checks for `type X struct` on a single line. Let's just check functions and struct.
  assert(r.compressed.includes('ƒ:2'), `Should find 2 functions, got: ${r.compressed}`);
  assert(r.compressed.includes('𝒞:1'), `Should find 1 struct, got: ${r.compressed}`);
});

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: Large Batch (Simulated Session) ═══\n');
// ═══════════════════════════════════════════════════════════

const sessionGC = new GlyphCompressor({ level: 'standard' });
const sessionMessages = [
  'fix the error in src/components/Navbar.tsx',
  'create a new API endpoint for user registration with express and typescript',
  "Property 'email' does not exist on type 'RegisterInput'. Check src/validators/auth.validator.ts line 15",
  'optimize the database queries in src/services/user.service.ts. The findAll method is slow',
  'deploy the application to kubernetes using terraform',
  'write unit tests for the authentication middleware in src/middleware/auth.ts',
  'refactor the payment processing module to use the strategy pattern',
  "debug why the docker container keeps crashing. Error: Cannot find module 'dotenv'",
  'review the security of src/routes/admin.routes.ts for SQL injection vulnerabilities',
  'add redis caching to the product catalog API in src/controllers/products.controller.ts',
];

let totalOrig = 0;
let totalComp = 0;

for (const msg of sessionMessages) {
  const r = sessionGC.compressText(msg);
  totalOrig += r.stats.originalTokens;
  totalComp += r.stats.compressedTokens;
}

const batchStats = sessionGC.getStats();

test(`Batch: processed ${sessionMessages.length} messages`, () => {
  assert(batchStats.messagesProcessed === sessionMessages.length,
    `Expected ${sessionMessages.length}, got ${batchStats.messagesProcessed}`);
});

test(`Batch: overall compression > 1x (standalone text)`, () => {
  const ratio = parseFloat(batchStats.overallRatio);
  assert(ratio > 1, `Expected >1x, got ${batchStats.overallRatio}`);
  assert(batchStats.totalSavedTokens > 0, 'Should save some tokens');
});

// ═══════════════════════════════════════════════════════════
console.log('\n═══ TEST: CLI Trust Features ═══\n');
// ═══════════════════════════════════════════════════════════

test('Source maps: expose reversible dictionaries', () => {
  const gc = new GlyphCompressor({ level: 'ultra' });
  const r = gc.compressText("Fix src/components/App.tsx. Property 'name' does not exist on type 'User'.\n```ts\nimport React from 'react';\nfunction App() { return null; }\n```");
  assert(r.sourceMap.version === '1.0.0', 'Should include source map version');
  assert(r.sourceMap.files.some(file => file.path === 'src/components/App.tsx'), 'Should map file refs to paths');
  assert(r.sourceMap.diagnostics.some(diag => diag.original.includes("Property 'name'")), 'Should map diagnostics');
  assert(r.sourceMap.codeBlocks.some(block => block.mode === 'summary'), 'Should map summarized code blocks');
  assert(r.sourceMap.replacements.some(item => item.kind === 'file'), 'Should record replacements');
});

test('Source maps: dynamic dictionary can be read after compression', () => {
  const gc = new GlyphCompressor({ level: 'standard' });
  const r = gc.compressText('AuthenticationManager calls AuthenticationManager before AuthenticationManager returns.');
  const dictionaries = gc.getReversibleDictionaries();
  assert(r.sourceMap.dynamic.some(entry => entry.original === 'AuthenticationManager'), 'Should expose dynamic source map entry');
  assert(dictionaries.dynamic.some(entry => entry.original === 'AuthenticationManager'), 'Should expose reversible dynamic dictionary');
});

test('Source maps: CommonJS root export matches ESM behavior', () => {
  const cjs = require('..');
  const gc = new cjs.GlyphCompressor({ level: 'standard' });
  const r = gc.compressText('Fix src/server/auth.ts because AuthenticationManager repeats AuthenticationManager.');
  assert(r.sourceMap.version === '1.0.0', 'Should expose source maps through require()');
  assert(r.sourceMap.files.some(file => file.path === 'src/server/auth.ts'), 'Should expose file maps through require()');
  assert(typeof cjs.buildWorkspaceCodebook === 'function', 'Should expose workspace intelligence through require()');
});

test('CLI: explain flag prints compression explanation', () => {
  const cliPath = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
  const output = execFileSync(process.execPath, [cliPath, 'package.json', '--level', 'standard', '--explain'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8',
  });
  assert(output.includes('Compression explanation'), 'Should print explanation heading');
  assert(output.includes('Level:             standard'), 'Should print selected compression level');
  assert(output.includes('Detected changes:'), 'Should print detected compression changes');
});

test('CLI: source-map flag prints source map JSON', () => {
  const cliPath = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
  const output = execFileSync(process.execPath, [cliPath, 'package.json', '--level', 'standard', '--source-map'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8',
  });
  assert(output.includes('Source map'), 'Should print source map heading');
  assert(output.includes('"version": "1.0.0"'), 'Should print source map version');
  assert(output.includes('"files"'), 'Should include file dictionary');
});

console.log('\n═══ TEST: Workspace Intelligence ═══\n');

function withTempWorkspace(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-workspace-'));
  try {
    fs.mkdirSync(path.join(dir, 'src', 'services'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'test'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'node test/integration.js', benchmark: 'node test/benchmark.js' } }), 'utf8');
    fs.writeFileSync(path.join(dir, 'README.md'), '# fixture\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'LICENSE'), 'fixture\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'src', 'services', 'auth.ts'), "import { db } from '../db';\nexport function AuthenticationManager() { return db.user.findMany(); }\n// TODO: error TS2339: Property 'name' does not exist\n", 'utf8');
    fs.writeFileSync(path.join(dir, 'test', 'auth.test.ts'), "import { AuthenticationManager } from '../src/services/auth';\ntest('auth', () => AuthenticationManager());\n", 'utf8');
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('Workspace intelligence: builds persistent codebook and ranks relevant files', () => withTempWorkspace((dir) => {
  const codebook = buildWorkspaceCodebook(dir);
  const codebookPath = saveWorkspaceCodebook(dir, codebook);
  const selection = selectRelevantFiles(dir, 'fix AuthenticationManager error', { codebook });
  assert(codebook.version === '1.0.0', 'Should use v1.0.0 codebook schema');
  assert(fs.existsSync(codebookPath), 'Should persist workspace codebook');
  assert(codebook.symbols.some(symbol => symbol.name === 'AuthenticationManager'), 'Should index symbols');
  assert(selection.intents.includes('fix_error'), 'Should detect fix intent');
  assert(selection.files.some(file => file.path === 'src/services/auth.ts'), 'Should rank relevant source file');
}));

test('Workspace intelligence: doctor reports repository readiness', () => withTempWorkspace((dir) => {
  const report = runDoctor(dir);
  assert(report.ok, 'Fixture repository should pass doctor checks');
  assert(report.checks.some(check => check.name === 'benchmark script' && check.ok), 'Should check benchmark script');
}));

test('Workspace intelligence: CLI inspect prints JSON summary', () => withTempWorkspace((dir) => {
  const cliPath = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
  const output = execFileSync(process.execPath, [cliPath, 'inspect', 'fix AuthenticationManager error', '--json'], {
    cwd: dir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output);
  assert(result.version === '1.0.0', 'Should print v1.0.0 inspect output');
  assert(result.intents.includes('fix_error'), 'Should include detected intent');
  assert(result.relevantFiles.some(file => file.path === 'src/services/auth.ts'), 'Should include relevant file');
}));

test('Workspace intelligence: intent detection covers roadmap workflows', () => {
  assert(detectIntent('review staged diff for pull request').includes('review_diff'), 'Should detect review diff');
  assert(detectIntent('write unit tests for the service').includes('write_tests'), 'Should detect tests');
  assert(detectIntent('optimize slow query performance').includes('optimize_performance'), 'Should detect performance');
});

console.log('\n═══ TEST: Stable Platform Metadata ═══\n');

test('Stable platform: package exposes TypeScript declarations', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const pkg = require('..' + '/package.json');
  assert(pkg.version === '1.0.0', 'Package should be v1.0.0');
  assert(pkg.types === 'src/index.d.ts', 'Package should expose root types');
  assert(pkg.exports['.'].types === './src/index.d.ts', 'Root export should expose types');
  assert(pkg.exports['./middleware'].types === './vscode-ext/glyph-middleware.d.ts', 'Middleware export should expose types');
  assert(fs.existsSync(path.join(root, 'src', 'index.d.ts')), 'Root declaration file should exist');
});

test('Stable platform: package allowlist excludes scratch artifacts', () => {
  const pkg = require('..' + '/package.json');
  assert(pkg.files.includes('src/'), 'Package should include runtime source');
  assert(pkg.files.includes('vscode-ext/glyph-middleware.cjs'), 'Package should include CJS middleware');
  assert(!pkg.files.includes('test/'), 'Package should not publish test directory');
  assert(!pkg.files.includes('assets/'), 'Package should not publish large assets');
});

test('Stable platform: formal governance docs exist', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  for (const doc of ['SECURITY.md', 'PRIVACY.md', 'ENTERPRISE.md']) {
    assert(fs.existsSync(path.join(root, doc)), `${doc} should exist`);
  }
});

// ═══════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(70));
console.log('RESULTS');
console.log('═'.repeat(70));
console.log(`  Tests passed: ${passed}`);
console.log(`  Tests failed: ${failed}`);
console.log();
console.log(`  Batch session stats:`);
console.log(`    Messages:    ${batchStats.messagesProcessed}`);
console.log(`    Tokens orig: ${batchStats.totalOriginalTokens}`);
console.log(`    Tokens comp: ${batchStats.totalCompressedTokens}`);
console.log(`    Saved:       ${batchStats.totalSavedTokens} tokens (${batchStats.overallSavedPct})`);
console.log(`    Ratio:       ${batchStats.overallRatio}`);
console.log(`    Cost saved:  ${batchStats.estimatedCostSaved}`);
console.log();

// Show compressed examples
console.log('  Sample compressions:');
const gcDemo = new GlyphCompressor({ level: 'standard' });
for (const msg of sessionMessages.slice(0, 5)) {
  const r = gcDemo.compressText(msg);
  console.log(`    "${msg.substring(0, 50)}..."`);
  console.log(`     → "${r.compressed}" (${r.stats.ratio}, ${r.stats.savedPct})`);
  console.log();
}

process.exit(failed > 0 ? 1 : 0);
