import assert from 'assert';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = require('../package.json');

assert(pkg.version === '1.3.0', 'package should be v1.3.0');
assert(pkg.scripts['test:unit'], 'unit test script should exist');
assert(pkg.scripts['test:cli'], 'CLI test script should exist');
assert(pkg.scripts['test:workspace'], 'workspace test script should exist');
assert(pkg.exports['.'].types === './src/index.d.ts', 'root export should expose types');

for (const file of ['NOTICE', 'docs/licensing.md', 'COMMERCIAL_LICENSE.md', 'scripts/check-links.js']) {
  assert(fs.existsSync(path.join(root, file)), `${file} should exist`);
}

console.log('metadata suite ok');