import assert from 'assert';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const currentVersion = require('../package.json').version;
const root = fileURLToPath(new URL('..', import.meta.url));
const cliPath = fileURLToPath(new URL('../bin/cli.js', import.meta.url));

const explain = execFileSync(process.execPath, [cliPath, 'package.json', '--level', 'standard', '--explain'], {
  cwd: root,
  encoding: 'utf8',
});
assert(explain.includes('Compression explanation'), 'CLI should print explanation output');

const sourceMap = execFileSync(process.execPath, [cliPath, 'package.json', '--level', 'standard', '--source-map'], {
  cwd: root,
  encoding: 'utf8',
});
assert(sourceMap.includes(`"version": "${currentVersion}"`), 'CLI should print source maps for the current release version');
assert(sourceMap.includes('"symbols"'), 'CLI should print source map symbol spans');

const providerMap = execFileSync(process.execPath, [cliPath, 'package.json', '--level', 'standard', '--provider', 'anthropic', '--source-map', '--explain'], {
  cwd: root,
  encoding: 'utf8',
});
assert(providerMap.includes('Provider:          anthropic'), 'CLI should print selected provider in explanations');
assert(providerMap.includes('"provider": "anthropic"'), 'CLI source map should include normalized provider');
assert(providerMap.includes('"strategy": "cache-stable"'), 'CLI source map should include provider compression profile');

const trustMap = execFileSync(process.execPath, [cliPath, 'package.json', '--level', 'aggressive', '--trust', 'reversible', '--source-map', '--explain'], {
  cwd: root,
  encoding: 'utf8',
});
assert(trustMap.includes('Trust policy:      reversible'), 'CLI should print selected trust policy');
assert(trustMap.includes('"trustPolicy": "reversible"'), 'CLI source map should include trust policy');

const privacyMap = execFileSync(process.execPath, [cliPath, 'package.json', '--level', 'standard', '--privacy', '--source-map'], {
  cwd: root,
  encoding: 'utf8',
});
assert(privacyMap.includes('"privacy"'), 'CLI should print privacy redaction metadata when privacy mode is enabled');

const routeJson = execFileSync(process.execPath, [cliPath, 'route', 'fix the dynamic dictionary bug', '--budget', '1500', '--max-files', '6', '--json'], {
  cwd: root,
  encoding: 'utf8',
});
const routeResult = JSON.parse(routeJson);
assert(Array.isArray(routeResult.selectedFiles), 'route --json should return a selectedFiles array');
assert(Array.isArray(routeResult.intents) && routeResult.intents.includes('fix_error'), 'route should detect fix_error intent for this query');
assert(routeResult.tokensUsed <= routeResult.tokenBudget, 'route should respect the requested token budget');

const routeText = execFileSync(process.execPath, [cliPath, 'route', 'fix the dynamic dictionary bug', '--budget', '1500'], {
  cwd: root,
  encoding: 'utf8',
});
assert(routeText.includes('Context Router'), 'route should print a human-readable report by default');

console.log('cli suite ok');