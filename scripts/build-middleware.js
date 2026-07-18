import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const middlewareJs = path.join(rootDir, 'vscode-ext', 'glyph-middleware.js');
const middlewareCjs = path.join(rootDir, 'vscode-ext', 'glyph-middleware.cjs');
const estimatorJs = path.join(rootDir, 'src', 'token-estimator.js');
const estimatorCjs = path.join(rootDir, 'vscode-ext', 'token-estimator.cjs');
const alphabetJs = path.join(rootDir, 'src', 'radical-alphabet.js');
const alphabetCjs = path.join(rootDir, 'src', 'radical-alphabet.cjs');
const compressorJs = path.join(rootDir, 'src', 'compressor.js');
const compressorCjs = path.join(rootDir, 'src', 'compressor.cjs');
const promptJs = path.join(rootDir, 'src', 'system-prompt-generator.js');
const promptCjs = path.join(rootDir, 'src', 'system-prompt-generator.cjs');
const workspaceJs = path.join(rootDir, 'src', 'workspace-intelligence.js');
const workspaceCjs = path.join(rootDir, 'src', 'workspace-intelligence.cjs');

console.log('Building middleware & core (CJS & ESM)...');

try {
  // 1. Build token-estimator.cjs
  execSync(`npx esbuild "${estimatorJs}" --platform=node --format=cjs --outfile="${estimatorCjs}"`, { stdio: 'inherit' });

  // 2. Build core files to CJS
  execSync(`npx esbuild "${alphabetJs}" --platform=node --format=cjs --bundle --outfile="${alphabetCjs}"`, { stdio: 'inherit' });
  execSync(`npx esbuild "${compressorJs}" --platform=node --format=cjs --bundle --outfile="${compressorCjs}"`, { stdio: 'inherit' });
  execSync(`npx esbuild "${promptJs}" --platform=node --format=cjs --bundle --outfile="${promptCjs}"`, { stdio: 'inherit' });
  execSync(`npx esbuild "${workspaceJs}" --platform=node --format=cjs --bundle --outfile="${workspaceCjs}"`, { stdio: 'inherit' });

  // 3. Build glyph-middleware.cjs
  execSync(`npx esbuild "${middlewareJs}" --bundle --external:node:crypto --external:node:fs --external:node:path --external:node:os --external:../src/token-estimator.js --platform=node --format=cjs --outfile="${middlewareCjs}"`, { stdio: 'inherit' });

  // 4. Rewrite require in glyph-middleware.cjs
  let content = fs.readFileSync(middlewareCjs, 'utf8');
  content = content.replace('require("../src/token-estimator.js")', 'require("./token-estimator.cjs")');
  fs.writeFileSync(middlewareCjs, content, 'utf8');

  console.log('Middleware build successful!');
} catch (e) {
  console.error('Middleware build failed:', e.message);
  process.exit(1);
}
