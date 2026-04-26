import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildWorkspaceCodebook, detectIntent, runDoctor, saveWorkspaceCodebook, selectRelevantFiles } from '../src/index.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-workspace-suite-'));

try {
  fs.mkdirSync(path.join(dir, 'src', 'services'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'test'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'node test/integration.js', benchmark: 'node test/benchmark.js' } }), 'utf8');
  fs.writeFileSync(path.join(dir, 'README.md'), '# fixture\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'LICENSE'), 'fixture\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'src', 'services', 'auth.ts'), "export function AuthenticationManager() { return true; }\n// error TS2339: Property 'name' does not exist\n", 'utf8');
  fs.writeFileSync(path.join(dir, 'test', 'auth.test.ts'), "import { AuthenticationManager } from '../src/services/auth';\n", 'utf8');

  const codebook = buildWorkspaceCodebook(dir);
  const codebookPath = saveWorkspaceCodebook(dir, codebook);
  const selection = selectRelevantFiles(dir, 'fix AuthenticationManager error', { codebook });
  const doctor = runDoctor(dir);

  assert(codebook.version === '1.3.0', 'workspace codebook should use v1.3.0 schema');
  assert(fs.existsSync(codebookPath), 'workspace codebook should be written');
  assert(selection.files.some((file) => file.path === 'src/services/auth.ts'), 'workspace selection should rank auth service');
  assert(detectIntent('write unit tests').includes('write_tests'), 'intent detection should include tests');
  assert(doctor.ok, 'doctor should pass fixture repository');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log('workspace suite ok');