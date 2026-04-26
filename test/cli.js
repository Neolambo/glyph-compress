import assert from 'assert';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

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
assert(sourceMap.includes('"version": "1.6.0"'), 'CLI should print v1.6.0 source maps');
assert(sourceMap.includes('"symbols"'), 'CLI should print source map symbol spans');

const privacyMap = execFileSync(process.execPath, [cliPath, 'package.json', '--level', 'standard', '--privacy', '--source-map'], {
  cwd: root,
  encoding: 'utf8',
});
assert(privacyMap.includes('"privacy"'), 'CLI should print privacy redaction metadata when privacy mode is enabled');

console.log('cli suite ok');