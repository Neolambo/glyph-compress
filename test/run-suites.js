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
  ['integration', 'test/integration.js'],
];

for (const [name, file] of suites) {
  console.log(`\n═══ SUITE: ${name} ═══`);
  execFileSync(process.execPath, [file], { cwd: root, stdio: 'inherit' });
}

console.log('\nAll test suites passed');