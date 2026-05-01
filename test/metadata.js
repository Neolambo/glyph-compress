import assert from 'assert';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = require('../package.json');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const vscodeSettingsSnapshot = JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures', 'vscode-settings.snapshot.json'), 'utf8'));
const readmeLinksSnapshot = JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures', 'readme-links.snapshot.json'), 'utf8'));

assert(pkg.version === '1.10.0', 'package should be v1.10.0');
assert(pkg.scripts['test:unit'], 'unit test script should exist');
assert(pkg.scripts['test:cli'], 'CLI test script should exist');
assert(pkg.scripts['test:workspace'], 'workspace test script should exist');
assert(pkg.scripts['test:extension'], 'extension smoke test script should exist');
assert(pkg.scripts['test:proxy'], 'proxy smoke test script should exist');
assert(pkg.scripts['release:prepare'], 'release helper script should exist');
assert(pkg.exports['.'].types === './src/index.d.ts', 'root export should expose types');
assert(pkg.exports['./middleware'].import === './src/glyph-middleware.js', 'middleware ESM export should avoid the VS Code package scope');
assert(!pkg.files.includes('docs/'), 'package should not publish the entire docs directory');
assert(!pkg.files.includes('scripts/'), 'package should not publish the entire scripts directory');

for (const file of [
  'NOTICE',
  'docs/licensing.md',
  'COMMERCIAL_LICENSE.md',
  'scripts/check-links.js',
  'scripts/release-helper.js',
  '.github/workflows/post-release-verify.yml',
  'test/fixtures/compressed-payloads.snapshot.json',
  'test/fixtures/readme-links.snapshot.json',
  'test/fixtures/vscode-settings.snapshot.json',
]) {
  assert(fs.existsSync(path.join(root, file)), `${file} should exist`);
}

for (const key of Object.keys(vscodeSettingsSnapshot)) {
  assert(readme.includes(`"${key}"`), `README should document ${key}`);
}

for (const link of readmeLinksSnapshot.mustInclude) {
  assert(readme.includes(link), `README should include ${link}`);
}

for (const link of readmeLinksSnapshot.mustExclude) {
  assert(!readme.includes(link), `README should not include stale entry ${link}`);
}

assert(readme.includes('~/.continue/config.yaml'), 'README should document Continue config.yaml');
assert(!readme.includes('~/.continue/config.json'), 'README should not point to stale Continue config.json');

console.log('metadata suite ok');