import assert from 'assert';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Module = require('module');
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
  }

  assert(outputLines.includes('GlyphCompress activated'), 'extension should log activation');
  assert(outputLines.includes('GlyphCompress ready'), 'extension should reach ready state');
  assert(context.subscriptions.length >= manifestCommands.length, 'commands should be tracked as subscriptions');

  extension.deactivate();
} finally {
  Module._load = originalLoad;
  global.setInterval = originalSetInterval;
}

console.log('extension smoke suite ok');