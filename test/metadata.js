import assert from 'assert';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = require('../package.json');
const extPkg = require('../vscode-ext/package.json');
const serverJson = require('../server.json');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const vscodeSettingsSnapshot = JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures', 'vscode-settings.snapshot.json'), 'utf8'));
const readmeLinksSnapshot = JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures', 'readme-links.snapshot.json'), 'utf8'));

assert(pkg.version === extPkg.version, 'root package and VS Code extension should share the same release version');
// Asserts the version is advertised, NOT that it appears under a heading
// shaped `New in vX`. Requiring that phrasing is what made the README grow a
// changelog: each release added a "New in" section and demoted the previous
// one to "Also recent" rather than removing it, until 15 sections and ~170
// lines of history sat on the repository's front page — which is precisely
// what GitHub Releases is for, and what the project had deliberately moved
// there. The version must be visible; where the history lives is a separate
// decision this test should not force.
assert(
  readme.includes(`v${pkg.version}`),
  `README should advertise the current release version (v${pkg.version})`,
);
assert(pkg.scripts['test:unit'], 'unit test script should exist');
assert(pkg.scripts['test:cli'], 'CLI test script should exist');
assert(pkg.scripts['test:workspace'], 'workspace test script should exist');
assert(pkg.scripts['test:extension'], 'extension smoke test script should exist');
assert(pkg.scripts['test:proxy'], 'proxy smoke test script should exist');
assert(pkg.scripts['benchmark:realistic'], 'realistic benchmark script should exist');
assert(pkg.scripts['release:prepare'], 'release helper script should exist');
assert(pkg.exports['.'].types === './src/index.d.ts', 'root export should expose types');
assert(pkg.exports['./middleware'].import === './src/glyph-middleware.js', 'middleware ESM export should avoid the VS Code package scope');
assert(!pkg.files.includes('docs/'), 'package should not publish the entire docs directory');
assert(!pkg.files.includes('scripts/'), 'package should not publish the entire scripts directory');

for (const file of [
  'llms.txt',
  'CODE_OF_CONDUCT.md',
  'CASE_STUDY.md',
  'server.json',
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

assert(pkg.mcpName === serverJson.name, 'package.json mcpName must match server.json name (MCP registry ownership verification)');
assert(serverJson.version === pkg.version, 'server.json version should track the current release');
assert(pkg.files.includes('server.json'), 'server.json should be published in the npm package');
const mcpPackageEntry = serverJson.packages?.find((p) => p.registryType === 'npm');
assert(mcpPackageEntry, 'server.json should declare an npm package entry');
assert(mcpPackageEntry.identifier === pkg.name, 'server.json npm package identifier must match package.json name');
assert(mcpPackageEntry.version === pkg.version, 'server.json npm package version should track the current release');
assert(
  mcpPackageEntry.packageArguments?.some((a) => a.type === 'positional' && a.value === 'mcp'),
  'server.json must pass the "mcp" positional argument — plain `npx glyph-compress` resolves to the CLI bin, not the MCP server, since both share the same package',
);

// The VS Code extension manifest carries the same `name` as the npm package,
// so `npm publish` run from vscode-ext/ succeeds and ships the wrong thing:
// extension.js plus every stale .vsix, with no bin/ and no src/. That happened
// on 1.36.4 — `npx glyph-compress` was broken on latest until 1.36.5 replaced
// it. npm's own `private: true` does not stop it (publish proceeds), so the
// guard is a prepublishOnly script that exits non-zero, and this asserts the
// guard is still there.
assert(
  extPkg.scripts && typeof extPkg.scripts.prepublishOnly === 'string',
  'vscode-ext/package.json must keep a prepublishOnly guard: without it, npm publish from that directory ships the extension folder as the library',
);
assert(
  /repository ROOT/i.test(extPkg.scripts.prepublishOnly),
  'the prepublishOnly guard should tell the reader to publish from the repository root, since that is the whole point of it firing',
);

console.log('metadata suite ok');
