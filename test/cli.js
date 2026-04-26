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
assert(sourceMap.includes('"version": "1.2.0"'), 'CLI should print v1.2.0 source maps');

console.log('cli suite ok');