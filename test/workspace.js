import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildWorkspaceCodebook, detectIntent, runDoctor, saveWorkspaceCodebook, selectRelevantFiles } from '../src/index.js';

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
  fs.mkdirSync(path.join(fakeHome, '.vscode', 'extensions', 'neolambo.glyph-compress-1.10.0'), { recursive: true });
  fs.writeFileSync(path.join(fakeHome, '.continue', 'config.yaml'), 'apiBase: http://localhost:8080/v1\n', 'utf8');
  fs.writeFileSync(path.join(fakeHome, '.vscode', 'extensions', 'neolambo.glyph-compress-1.10.0', 'package.json'), JSON.stringify({
    name: 'glyph-compress',
    publisher: 'Neolambo',
    version: '1.10.0',
  }, null, 2), 'utf8');

  const codebook = buildWorkspaceCodebook(dir);
  const codebookPath = saveWorkspaceCodebook(dir, codebook);
  const selection = selectRelevantFiles(dir, 'fix AuthenticationManager error', { codebook });
  const doctor = runDoctor(dir);

  assert(codebook.version === '1.10.0', 'workspace codebook should use v1.10.0 schema');
  assert(fs.existsSync(codebookPath), 'workspace codebook should be written');
  assert(selection.files.some((file) => file.path === 'src/services/auth.ts'), 'workspace selection should rank auth service');
  assert(detectIntent('write unit tests').includes('write_tests'), 'intent detection should include tests');
  assert(doctor.ok, 'doctor should pass fixture repository');
  assert(doctor.checks.some((check) => check.name === 'installed VS Code extension version' && check.ok), 'doctor should detect installed extension version');
  assert(doctor.checks.some((check) => check.name === 'VS Code settings' && check.ok), 'doctor should detect glyph settings');
  assert(doctor.checks.some((check) => check.name === 'proxy config' && check.ok), 'doctor should detect proxy config');
  assert(doctor.checks.some((check) => check.name === 'provider credentials' && check.ok), 'doctor should detect provider credentials');

  fs.rmSync(fakeHome, { recursive: true, force: true });
  if (previousDoctorHome === undefined) delete process.env.GLYPHCOMPRESS_DOCTOR_HOME;
  else process.env.GLYPHCOMPRESS_DOCTOR_HOME = previousDoctorHome;
  if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = previousOpenAiKey;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log('workspace suite ok');