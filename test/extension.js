import assert from 'assert';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Module = require('module');
const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = require('../vscode-ext/package.json');

const registeredCommands = new Map();
const outputLines = [];
const configValues = {
  enabled: true,
  compressionLevel: 'standard',
  showStatusBar: true,
  autoUpdateWorkspaceRules: false,
  provider: 'auto',
  targetApiUrl: 'https://api.openai.com',
};

const vscodeMock = {
  StatusBarAlignment: { Right: 2 },
  ViewColumn: { Beside: 2 },
  ProgressLocation: { Notification: 15 },
  window: {
    createOutputChannel() {
      return {
        appendLine(line) { outputLines.push(String(line)); },
        show() {},
      };
    },
    createStatusBarItem() {
      return {
        command: undefined,
        text: '',
        tooltip: '',
        show() { this.visible = true; },
        dispose() {},
      };
    },
    createWebviewPanel() {
      return { webview: { html: '' } };
    },
    showInformationMessage(message) {
      outputLines.push(`info:${message}`);
      return Promise.resolve(message);
    },
    showWarningMessage(message) {
      outputLines.push(`warn:${message}`);
      return Promise.resolve(message);
    },
    showErrorMessage(message) {
      outputLines.push(`error:${message}`);
      return Promise.resolve(message);
    },
    withProgress(_options, task) {
      return task({ report() {} });
    },
    showTextDocument() {
      return Promise.resolve();
    },
    activeTextEditor: undefined,
  },
  workspace: {
    workspaceFolders: undefined,
    getConfiguration() {
      return {
        get(key, fallback) {
          return Object.prototype.hasOwnProperty.call(configValues, key)
            ? configValues[key]
            : fallback;
        },
      };
    },
    onDidChangeConfiguration() {
      return { dispose() {} };
    },
    findFiles() {
      return Promise.resolve([]);
    },
    asRelativePath(value) {
      return String(value);
    },
    openTextDocument() {
      return Promise.resolve({});
    },
  },
  commands: {
    registerCommand(command, callback) {
      registeredCommands.set(command, callback);
      return { dispose() { registeredCommands.delete(command); } };
    },
    executeCommand() {
      return Promise.resolve();
    },
  },
  env: {
    clipboard: {
      writeText() {
        return Promise.resolve();
      },
    },
  },
};

const originalLoad = Module._load;
const originalSetInterval = global.setInterval;

Module._load = function load(request, parent, isMain) {
  if (request === 'vscode') return vscodeMock;
  return originalLoad.call(this, request, parent, isMain);
};
global.setInterval = () => ({ unref() {} });

try {
  const extension = require('../vscode-ext/extension.js');
  assert(typeof extension.activate === 'function', 'extension should export activate()');
  assert(typeof extension.deactivate === 'function', 'extension should export deactivate()');

  const state = new Map();
  const context = {
    subscriptions: [],
    globalState: {
      get(key, fallback) {
        return state.has(key) ? state.get(key) : fallback;
      },
      update(key, value) {
        state.set(key, value);
        return Promise.resolve();
      },
    },
  };

  extension.activate(context);

  const manifestCommands = manifest.contributes.commands.map((entry) => entry.command);
  for (const command of manifestCommands) {
    assert(registeredCommands.has(command), `extension should register ${command}`);
    assert(manifest.activationEvents.includes(`onCommand:${command}`), `extension should activate for ${command}`);
  }

  assert(outputLines.includes('GlyphCompress activated'), 'extension should log activation');
  assert(outputLines.includes('GlyphCompress ready'), 'extension should reach ready state');
  assert(context.subscriptions.length >= manifestCommands.length, 'commands should be tracked as subscriptions');

  const middlewarePath = path.join(root, 'vscode-ext', 'glyph-middleware.cjs');
  const middlewareSource = fs.readFileSync(middlewarePath, 'utf8');
  assert(fs.existsSync(path.join(root, 'vscode-ext', 'token-estimator.cjs')), 'VSIX should include local token estimator dependency');
  assert(!middlewareSource.includes('../src/token-estimator.cjs'), 'VSIX middleware should not require files outside the extension bundle');

  // Regression guard, generalized: `@vscode/vsce package` only includes
  // files physically inside vscode-ext/ (see vscode-ext/.vscodeignore).
  // A require("../something") anywhere in a packaged .cjs file resolves
  // fine inside this repo checkout (where src/ is a real sibling
  // directory) but throws MODULE_NOT_FOUND the moment the VSIX is
  // packaged and installed — a failure mode this repo's own tests never
  // exercised because they all require() files by repo-relative path,
  // not from an extracted VSIX. This shipped for real: workspace-
  // intelligence.cjs and team-codebook.cjs were wired into
  // glyph-middleware.cjs via "../src/*.cjs" externals (v1.17.0-v1.18.0)
  // and broke every packaged VSIX since, caught only by manually
  // extracting one and starting the proxy from it. The single hardcoded
  // check above (token-estimator only) would not have caught this — this
  // one scans every packaged CJS file for ANY escaping relative require.
  const packagedCjsFiles = fs.readdirSync(path.join(root, 'vscode-ext')).filter((name) => name.endsWith('.cjs') || name === 'proxy.js');
  for (const file of packagedCjsFiles) {
    const source = fs.readFileSync(path.join(root, 'vscode-ext', file), 'utf8');
    const escapingRequires = [...source.matchAll(/require\((["'])(\.\.\/[^"']+)\1\)/g)].map((m) => m[2]);
    assert.strictEqual(escapingRequires.length, 0, `vscode-ext/${file} must not require() anything outside vscode-ext/ (the packaged VSIX only ships vscode-ext/*), found: ${escapingRequires.join(', ')}`);
  }

  // Regression guard: vscode-ext/glyph-middleware.js hand-maintains a
  // second, manual `module.exports = {...}` block (a UMD-style dual
  // ESM/CJS shim) alongside its `export { ... }` statement — esbuild's
  // own auto-generated CJS export is dead code (`0 && (module.exports =
  // {...})`), so the manual block is the one that actually runs. Adding
  // a new export to the `export {...}` list without also adding it here
  // silently produces `undefined` for CJS consumers (require()), which
  // is exactly the failure mode that shipped once already (buildTrustWarnings
  // in v1.21.0) before this check existed. Compare both lists directly.
  const middlewareEsmSource = fs.readFileSync(path.join(root, 'vscode-ext', 'glyph-middleware.js'), 'utf8');
  const esmExportMatch = middlewareEsmSource.match(/^export \{([^}]+)\};/m);
  const cjsExportMatch = middlewareEsmSource.match(/\n {2}module\.exports = \{([^}]+)\};/);
  assert(esmExportMatch && cjsExportMatch, 'expected to find both the ESM export list and the manual CJS module.exports shim');
  const esmNames = new Set(esmExportMatch[1].split(',').map((s) => s.trim()).filter(Boolean));
  const cjsNames = new Set(cjsExportMatch[1].split(',').map((s) => s.trim()).filter(Boolean));
  const missingFromCjs = [...esmNames].filter((name) => !cjsNames.has(name));
  const missingFromEsm = [...cjsNames].filter((name) => !esmNames.has(name));
  assert.strictEqual(missingFromCjs.length, 0, `exported from ESM but missing from the manual CJS module.exports shim: ${missingFromCjs.join(', ')}`);
  assert.strictEqual(missingFromEsm.length, 0, `present in the manual CJS module.exports shim but not exported from ESM: ${missingFromEsm.join(', ')}`);

  extension.deactivate();
} finally {
  Module._load = originalLoad;
  global.setInterval = originalSetInterval;
}

console.log('extension smoke suite ok');