import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { buildWorkspaceCodebook, detectIntent, runDoctor, saveWorkspaceCodebook, selectRelevantFiles } from '../src/index.js';

const require = createRequire(import.meta.url);
const currentVersion = require('../package.json').version;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-workspace-suite-'));

try {
  fs.mkdirSync(path.join(dir, 'src', 'services'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'test'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.vscode'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'node test/integration.js', benchmark: 'node test/benchmark.js' } }), 'utf8');
  fs.writeFileSync(path.join(dir, 'README.md'), '# fixture\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'LICENSE'), 'fixture\n', 'utf8');
  fs.writeFileSync(path.join(dir, '.vscode', 'settings.json'), JSON.stringify({
    'glyphCompress.enabled': true,
    'glyphCompress.targetApiUrl': 'https://generativelanguage.googleapis.com',
    'glyphCompress.trustPolicy': 'privacy',
  }, null, 2), 'utf8');
  fs.writeFileSync(path.join(dir, 'src', 'services', 'auth.ts'), "export function AuthenticationManager() { return true; }\n// error TS2339: Property 'name' does not exist\n", 'utf8');
  fs.writeFileSync(path.join(dir, 'test', 'auth.test.ts'), "import { AuthenticationManager } from '../src/services/auth';\n", 'utf8');

  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-doctor-home-'));
  const previousDoctorHome = process.env.GLYPHCOMPRESS_DOCTOR_HOME;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  process.env.GLYPHCOMPRESS_DOCTOR_HOME = fakeHome;
  process.env.OPENAI_API_KEY = 'test-key';
  fs.mkdirSync(path.join(fakeHome, '.continue'), { recursive: true });
  fs.mkdirSync(path.join(fakeHome, '.vscode', 'extensions', `neolambo.glyph-compress-${currentVersion}`), { recursive: true });
  fs.writeFileSync(path.join(fakeHome, '.continue', 'config.yaml'), 'apiBase: http://localhost:8080/v1\n', 'utf8');
  fs.writeFileSync(path.join(fakeHome, '.vscode', 'extensions', `neolambo.glyph-compress-${currentVersion}`, 'package.json'), JSON.stringify({
    name: 'glyph-compress',
    publisher: 'Neolambo',
    version: currentVersion,
  }, null, 2), 'utf8');

  const codebook = buildWorkspaceCodebook(dir);
  const codebookPath = saveWorkspaceCodebook(dir, codebook);
  const selection = selectRelevantFiles(dir, 'fix AuthenticationManager error', { codebook });
  const doctor = runDoctor(dir);

  assert(codebook.version === currentVersion, 'workspace codebook should use the current schema version');
  assert(fs.existsSync(codebookPath), 'workspace codebook should be written');
  assert(selection.files.some((file) => file.path === 'src/services/auth.ts'), 'workspace selection should rank auth service');
  assert(detectIntent('write unit tests').includes('write_tests'), 'intent detection should include tests');
  assert(doctor.ok, 'doctor should pass fixture repository');
  assert(doctor.checks.some((check) => check.name === 'installed VS Code extension version' && check.ok), 'doctor should detect installed extension version');
  assert(doctor.checks.some((check) => check.name === 'VS Code settings' && check.ok), 'doctor should detect glyph settings');
  assert(doctor.checks.some((check) => check.name === 'proxy config' && check.ok), 'doctor should detect proxy config');
  assert(doctor.checks.some((check) => check.name === 'provider credentials' && check.ok), 'doctor should detect provider credentials');

  // ── Indexing defects found by measuring retrieval, not by these tests ──
  //
  // The router scored 2/6 on queries with unambiguous answers while every
  // suite here passed. Nothing below is a refactor: each assertion pins a
  // reason a correct answer was unreachable.

  fs.mkdirSync(path.join(dir, 'ext'), { recursive: true });
  // A bundle emitted next to its source — obvious from the layout.
  fs.writeFileSync(path.join(dir, 'src', 'paired.js'), 'export const paired = 1;\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'src', 'paired.cjs'), 'module.exports = { paired: 1 };\n', 'utf8');
  // A bundle emitted into a different directory from its source, where the
  // layout says nothing and only the bundler's own preamble does.
  fs.writeFileSync(
    path.join(dir, 'ext', 'compiled.cjs'),
    'var __create = Object.create;\nvar __defProp = Object.defineProperty;\nfunction PaymentReconciler() {}\n',
    'utf8',
  );
  // Hand-written CommonJS, which must survive: nothing about it is generated.
  fs.writeFileSync(
    path.join(dir, 'test', 'harness.cjs'),
    "const { AuthenticationManager } = require('../src/services/auth');\nfunction PaymentReconciler() {}\n",
    'utf8',
  );
  // A class whose behaviour lives in methods — the shape the extractor could
  // not see, since a method has no `function` or `const` in front of it.
  //
  // The filler methods are load-bearing. Symbols are collected in file order,
  // so a per-file cap does not sample a class — it keeps the top of it. The
  // method this test looks for is declared last, which is the only way to
  // notice that the cap is set too low: with a handful of symbols any cap
  // passes, and the defect only appears on the real files that motivated it.
  const filler = Array.from(
    { length: 40 },
    (_, i) => `  handleLedgerEvent${i}(event) { return event; }\n`,
  ).join('');
  fs.writeFileSync(
    path.join(dir, 'src', 'services', 'billing.ts'),
    'export class BillingService {\n'
    + filler
    + '  settle(account) { return account; }\n'
    + '  async reconcileOutstandingInvoices(account) {\n'
    + '    if (account) { return this.settle(account); }\n'
    + '    for (const x of []) { return x; }\n'
    + '  }\n'
    + '}\n',
    'utf8',
  );

  const rebuilt = buildWorkspaceCodebook(dir, { incremental: false });
  const indexed = new Set(rebuilt.files.map((file) => file.path));

  assert(!indexed.has('src/paired.cjs'), 'a .cjs beside a .js of the same name is a build artifact and must not be indexed');
  assert(indexed.has('src/paired.js'), 'the source it was generated from must still be indexed');
  assert(!indexed.has('ext/compiled.cjs'), "a .cjs opening with a bundler's helper preamble must not be indexed, wherever it sits");
  assert(indexed.has('test/harness.cjs'), 'hand-written CommonJS has no sibling and no preamble, so it must be kept');

  const billing = rebuilt.files.find((file) => file.path === 'src/services/billing.ts');
  assert(billing, 'the billing fixture should be indexed');
  assert(
    billing.symbols.includes('reconcileOutstandingInvoices'),
    `class methods must be extracted as symbols, or a class-shaped file is invisible to routing; got ${JSON.stringify(billing.symbols)}`,
  );
  assert(billing.symbols.includes('settle'), 'a single-line method is still a method');
  for (const keyword of ['if', 'for']) {
    assert(
      !billing.symbols.includes(keyword),
      `${keyword}( opens a block and is not a declaration; harvesting it wastes the symbol budget on something no query can match`,
    );
  }

  // Field weighting: naming a topic is weaker evidence than implementing it.
  // Before this, both were worth a flat 4 and the file merely named after the
  // subject won on the alphabetical tie-break.
  // The doc is placed where it sorts BEFORE the implementation. Ties are
  // broken by path, so a doc under test/ would win this comparison on the
  // alphabet alone and the test would pass without the weighting doing any
  // work — which is exactly what happened the first time it was written.
  fs.mkdirSync(path.join(dir, 'aaa-notes'), { recursive: true });
  const doc = 'aaa-notes/reconcileOutstandingInvoices.md';
  fs.writeFileSync(path.join(dir, doc), 'Notes about reconciling.\n', 'utf8');
  const withDoc = buildWorkspaceCodebook(dir, { incremental: false });
  const ranked = selectRelevantFiles(dir, 'reconcileOutstandingInvoices', { codebook: withDoc }).files;
  const rankOf = (target) => ranked.findIndex((file) => file.path === target);
  assert(rankOf('src/services/billing.ts') !== -1, 'the file defining the symbol must be selectable at all');
  assert(rankOf(doc) !== -1, 'the doc named after the symbol must be a candidate, or the comparison proves nothing');
  assert(
    rankOf('src/services/billing.ts') < rankOf(doc),
    `the file that defines the symbol must outrank the file merely named after it; got ${JSON.stringify(ranked.map((f) => [f.path, f.score]))}`,
  );

  fs.rmSync(fakeHome, { recursive: true, force: true });
  if (previousDoctorHome === undefined) delete process.env.GLYPHCOMPRESS_DOCTOR_HOME;
  else process.env.GLYPHCOMPRESS_DOCTOR_HOME = previousDoctorHome;
  if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = previousOpenAiKey;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log('workspace suite ok');