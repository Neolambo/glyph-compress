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
const estimatorCjsSrc = path.join(rootDir, 'src', 'token-estimator.cjs');
const alphabetJs = path.join(rootDir, 'src', 'radical-alphabet.js');
const alphabetCjs = path.join(rootDir, 'src', 'radical-alphabet.cjs');
const compressorJs = path.join(rootDir, 'src', 'compressor.js');
const compressorCjs = path.join(rootDir, 'src', 'compressor.cjs');
const promptJs = path.join(rootDir, 'src', 'system-prompt-generator.js');
const promptCjs = path.join(rootDir, 'src', 'system-prompt-generator.cjs');
const workspaceJs = path.join(rootDir, 'src', 'workspace-intelligence.js');
const workspaceCjs = path.join(rootDir, 'src', 'workspace-intelligence.cjs');
const workspaceCjsVsix = path.join(rootDir, 'vscode-ext', 'workspace-intelligence.cjs');
const teamCodebookJs = path.join(rootDir, 'src', 'team-codebook.js');
const teamCodebookCjs = path.join(rootDir, 'src', 'team-codebook.cjs');
const teamCodebookCjsVsix = path.join(rootDir, 'vscode-ext', 'team-codebook.cjs');
const proxyJs = path.join(rootDir, 'src', 'proxy.js');
const proxyCjs = path.join(rootDir, 'vscode-ext', 'proxy.js');

console.log('Building middleware & core (CJS & ESM)...');

try {
  // 1. Build token-estimator.cjs — both the vscode-ext/ copy the packaged
  // VSIX needs and src/token-estimator.cjs, which src/index.cjs (the root
  // package's CJS entry point) requires directly. The src/ copy was never
  // rebuilt by this script at all until this was found: a real drift bug
  // where src/token-estimator.cjs could silently fall out of sync with
  // src/token-estimator.js, the same class of issue as the vscode-ext/
  // proxy.js and CJS-export-shim drift bugs found earlier — caught while
  // verifying the Unicode token-estimation fix actually took effect in the
  // built CJS output, not just the ESM source.
  execSync(`npx esbuild "${estimatorJs}" --platform=node --format=cjs --outfile="${estimatorCjs}"`, { stdio: 'inherit' });
  execSync(`npx esbuild "${estimatorJs}" --platform=node --format=cjs --outfile="${estimatorCjsSrc}"`, { stdio: 'inherit' });

  // 2. Build core files to CJS
  execSync(`npx esbuild "${alphabetJs}" --platform=node --format=cjs --bundle --outfile="${alphabetCjs}"`, { stdio: 'inherit' });
  execSync(`npx esbuild "${compressorJs}" --platform=node --format=cjs --bundle --outfile="${compressorCjs}"`, { stdio: 'inherit' });
  execSync(`npx esbuild "${promptJs}" --platform=node --format=cjs --bundle --outfile="${promptCjs}"`, { stdio: 'inherit' });
  execSync(`npx esbuild "${workspaceJs}" --platform=node --format=cjs --bundle --outfile="${workspaceCjs}"`, { stdio: 'inherit' });
  execSync(`npx esbuild "${teamCodebookJs}" --platform=node --format=cjs --bundle --outfile="${teamCodebookCjs}"`, { stdio: 'inherit' });
  // Also build LOCAL copies inside vscode-ext/, matching token-estimator.cjs's
  // existing pattern: `@vscode/vsce package` only includes files physically
  // inside vscode-ext/ (see vscode-ext/.vscodeignore), so a glyph-middleware.cjs
  // that requires "../src/workspace-intelligence.cjs" resolves fine inside
  // this repo but throws MODULE_NOT_FOUND in the packaged VSIX, where src/
  // does not exist at all — found by actually starting the proxy from an
  // extracted VSIX, not from repo-relative tests (which never exercise the
  // packaged file layout).
  execSync(`npx esbuild "${workspaceJs}" --platform=node --format=cjs --bundle --outfile="${workspaceCjsVsix}"`, { stdio: 'inherit' });
  execSync(`npx esbuild "${teamCodebookJs}" --platform=node --format=cjs --bundle --outfile="${teamCodebookCjsVsix}"`, { stdio: 'inherit' });

  // 3. Build glyph-middleware.cjs
  execSync(`npx esbuild "${middlewareJs}" --bundle --external:node:crypto --external:node:fs --external:node:path --external:node:os --external:node:child_process --external:../src/token-estimator.js --external:../src/workspace-intelligence.js --external:../src/team-codebook.js --platform=node --format=cjs --outfile="${middlewareCjs}"`, { stdio: 'inherit' });

  // 4. Rewrite requires in glyph-middleware.cjs to local, self-contained
  // vscode-ext/ copies — never a "../src/..." path, so the packaged VSIX
  // (which only ships vscode-ext/*) always resolves everything it needs.
  let content = fs.readFileSync(middlewareCjs, 'utf8');
  content = content.replace('require("../src/token-estimator.js")', 'require("./token-estimator.cjs")');
  content = content.replace('require("../src/workspace-intelligence.js")', 'require("./workspace-intelligence.cjs")');
  content = content.replace('require("../src/team-codebook.js")', 'require("./team-codebook.cjs")');
  fs.writeFileSync(middlewareCjs, content, 'utf8');

  // 5. Build vscode-ext/proxy.js from src/proxy.js (was a hand-maintained
  // duplicate that had drifted — missing attentionalDecay/holographicFolding/
  // intentDiffs options and structured logging the ESM version already had).
  // dashboard.js and logger.js are small/self-contained so they're bundled
  // in directly; only glyph-middleware stays external, rewritten to the
  // sibling .cjs file already in vscode-ext/.
  execSync(`npx esbuild "${proxyJs}" --bundle --external:./glyph-middleware.js --platform=node --format=cjs --outfile="${proxyCjs}"`, { stdio: 'inherit' });
  let proxyContent = fs.readFileSync(proxyCjs, 'utf8');
  proxyContent = proxyContent.replace('require("./glyph-middleware.js")', 'require("./glyph-middleware.cjs")');
  fs.writeFileSync(proxyCjs, proxyContent, 'utf8');

  console.log('Middleware build successful!');
} catch (e) {
  console.error('Middleware build failed:', e.message);
  process.exit(1);
}
