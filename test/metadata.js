import assert from 'assert';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = require('../package.json');

assert(pkg.version === '1.9.0', 'package should be v1.9.0');
assert(pkg.scripts['test:unit'], 'unit test script should exist');
assert(pkg.scripts['test:cli'], 'CLI test script should exist');
assert(pkg.scripts['test:workspace'], 'workspace test script should exist');
assert(pkg.scripts['test:extension'], 'extension smoke test script should exist');
assert(pkg.scripts['test:proxy'], 'proxy smoke test script should exist');
assert(pkg.exports['.'].types === './src/index.d.ts', 'root export should expose types');
assert(pkg.exports['./middleware'].import === './src/glyph-middleware.js', 'middleware ESM export should avoid the VS Code package scope');
assert(!pkg.files.includes('docs/'), 'package should not publish the entire docs directory');
assert(!pkg.files.includes('scripts/'), 'package should not publish the entire scripts directory');

for (const file of ['NOTICE', 'docs/licensing.md', 'COMMERCIAL_LICENSE.md', 'scripts/check-links.js']) {
  assert(fs.existsSync(path.join(root, file)), `${file} should exist`);
}

console.log('metadata suite ok');