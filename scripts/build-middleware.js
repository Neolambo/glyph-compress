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

console.log('Building middleware (CJS & ESM)...');

try {
  // 1. Build token-estimator.cjs
  execSync(`npx esbuild "${estimatorJs}" --platform=node --format=cjs --outfile="${estimatorCjs}"`, { stdio: 'inherit' });

  // 2. Build glyph-middleware.cjs
  execSync(`npx esbuild "${middlewareJs}" --bundle --external:node:crypto --external:node:fs --external:node:path --external:node:os --external:../src/token-estimator.js --platform=node --format=cjs --outfile="${middlewareCjs}"`, { stdio: 'inherit' });

  // 3. Rewrite require in glyph-middleware.cjs
  let content = fs.readFileSync(middlewareCjs, 'utf8');
  content = content.replace('require("../src/token-estimator.js")', 'require("./token-estimator.cjs")');
  fs.writeFileSync(middlewareCjs, content, 'utf8');

  console.log('Middleware build successful!');
} catch (e) {
  console.error('Middleware build failed:', e.message);
  process.exit(1);
}
