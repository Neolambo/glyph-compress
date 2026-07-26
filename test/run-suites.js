import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('..', import.meta.url));
const suites = [
  ['unit', 'test/unit.js'],
  ['cli', 'test/cli.js'],
  ['workspace', 'test/workspace.js'],
  ['extension', 'test/extension.js'],
  ['proxy', 'test/proxy.js'],
  ['metadata', 'test/metadata.js'],
  ['snapshots', 'test/snapshots.js'],
  ['integration', 'test/integration.js'],
  ['holographic', 'test/holographic-test.js'],
  ['intent', 'test/intent-test.js'],
  ['codebook-completeness', 'test/codebook-completeness.js'],
  ['auto-level', 'test/auto-level.js'],
  ['cache-prefix-stability', 'test/cache-prefix-stability.js'],
  ['tech-glyph-economics', 'test/tech-glyph-economics.js'],
  ['context-router', 'test/context-router.js'],
  ['mcp-server', 'test/mcp-server.js'],
  ['privacy-redaction', 'test/privacy-redaction.js'],
  ['context-budget-planner', 'test/context-budget-planner.js'],
  ['team-codebook', 'test/team-codebook.js'],
  ['logger', 'test/logger.js'],
  ['ast-spans', 'test/ast-spans.js'],
  ['code-minify-economics', 'test/code-minify-economics.js'],
  ['trust-warnings', 'test/trust-warnings.js'],
  ['npm-pack-smoke', 'test/npm-pack-smoke.js'],
  ['adaptive-workspace-memory', 'test/adaptive-workspace-memory.js'],
  ['anthropic-bridge', 'test/anthropic-bridge.js'],
  ['token-estimator-accuracy', 'test/token-estimator-accuracy.js'],
];

for (const [name, file] of suites) {
  console.log(`\n═══ SUITE: ${name} ═══`);
  execFileSync(process.execPath, [file], { cwd: root, stdio: 'inherit' });
}

console.log('\nAll test suites passed');