#!/usr/bin/env node

/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 * 
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 * 
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — CLI Tool
 * Compress files from the terminal and copy to clipboard.
 */

import { GlyphCompressor } from '../src/glyph-middleware.js';
import { buildWorkspaceCodebook, saveWorkspaceCodebook, selectRelevantFiles, runDoctor } from '../src/workspace-intelligence.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
let level = 'standard';
let copyToClipboard = false;
let fileToCompress = null;
let startProxy = false;
let proxyPort = 8080;
let proxyTarget = 'https://api.openai.com';
let explain = false;
let printSourceMap = false;
let command = null;
let jsonOutput = false;
let privacyFirewall = false;
let provider = 'raw';
let providerSet = false;
let trustPolicy = undefined;
let attentionalDecay = false;
let holographicFolding = false;
let intentDiffs = false;

// Simple argument parser
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!command && ['inspect', 'doctor', 'benchmark'].includes(arg)) {
    command = arg;
  } else if (arg === '--level' || arg === '-l') {
    level = args[++i];
  } else if (arg === '--copy' || arg === '-c') {
    copyToClipboard = true;
  } else if (arg === '--explain' || arg === '-x') {
    explain = true;
  } else if (arg === '--source-map') {
    printSourceMap = true;
  } else if (arg === '--privacy') {
    privacyFirewall = true;
  } else if (arg === '--decay' || arg === '--experimental-decay') {
    attentionalDecay = true;
  } else if (arg === '--folding' || arg === '--holographic-folding') {
    holographicFolding = true;
  } else if (arg === '--intents' || arg === '--intent-diffs') {
    intentDiffs = true;
  } else if (arg === '--provider') {
    provider = args[++i] || provider;
    providerSet = true;
  } else if (arg === '--trust' || arg === '--policy') {
    trustPolicy = args[++i] || trustPolicy;
  } else if (arg === '--target' || arg === '--target-api-url') {
    proxyTarget = args[++i] || proxyTarget;
  } else if (arg === '--json') {
    jsonOutput = true;
  } else if (arg === '--proxy' || arg === '-p') {
    startProxy = true;
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      proxyPort = parseInt(args[++i], 10);
    }
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
GlyphCompress CLI
Usage: npx glyph-compress [file|command] [options]

Commands:
  inspect [query]       Build .glyphcompress/codebook.json and rank relevant files
  doctor                Check repository readiness for GlyphCompress workflows
  benchmark             Run the repository benchmark script

Options:
  -l, --level <level>   Compression level: light, standard, aggressive, ultra, auto (default: standard)
                        'auto' picks a level from content signals (length, code density)
  -c, --copy            Copy compressed output to clipboard
  -x, --explain         Explain what changed during compression
  --source-map          Print the reversible source map JSON
  --privacy             Redact secrets and sensitive identifiers before compression
  --decay               Enable experimental attentional decay compaction for history
  --folding             Enable holographic context folding for overlapping files
  --intents             Enable generative intent diffs compression for code changes
  --provider <provider> Provider profile: raw, openai, anthropic, gemini, local (default: raw)
  --trust <policy>      Trust policy: lossless, reversible, privacy, lossy (default: auto)
  --target <url>        Proxy upstream base URL (default: https://api.openai.com)
  --json                Print command output as JSON
  -p, --proxy [port]    Start the Zero-Command Transparent Proxy server (default port: 8080)
  -h, --help            Show this help message
    `);
    process.exit(0);
  } else if (!arg.startsWith('-')) {
    fileToCompress = arg;
  }
}

if (command) {
  runCommand(command, args, { jsonOutput });
} else if (startProxy) {
  import('../src/proxy.js').then(({ startProxyServer }) => {
    startProxyServer(proxyPort, proxyTarget, {
      level,
      provider: providerSet ? provider : 'auto',
      trustPolicy,
      privacyFirewall,
      attentionalDecay,
      holographicFolding,
      intentDiffs,
    });
  }).catch(err => {
    console.error('Failed to start proxy:', err);
    process.exit(1);
  });
} else {
  if (!fileToCompress) {
    console.error('Error: No file specified. Use --help for usage.');
    process.exit(1);
  }

const targetPath = path.resolve(process.cwd(), fileToCompress);
if (!fs.existsSync(targetPath)) {
  console.error(`Error: File not found: ${targetPath}`);
  process.exit(1);
}

const content = fs.readFileSync(targetPath, 'utf8');
const ext = path.extname(targetPath).substring(1);

const gc = new GlyphCompressor({ level, privacyFirewall, provider, trustPolicy, workspacePath: process.cwd(), attentionalDecay, holographicFolding, intentDiffs });
// Wrap in backticks to trigger full semantic code block compression if in aggressive/ultra mode
const { compressed, stats, sourceMap } = gc.compressText(`File: ${fileToCompress}\n\n\`\`\`${ext}\n${content}\n\`\`\``, provider);

const output = `${gc.getCodebookPrompt()}\n\n${compressed}`;
const explanation = explain ? buildExplanation({
  level,
  provider,
  trustPolicy,
  fileToCompress,
  ext,
  original: content,
  compressed,
  stats,
  compressor: gc,
}) : '';

console.log('\n⚡ GlyphCompress Results:');
console.log('----------------------------------------------------');
console.log(`Original tokens:   ~${stats.originalTokens}`);
console.log(`Compressed tokens: ~${stats.compressedTokens}`);
console.log(`Compression ratio: ${stats.ratio}`);
console.log(`Saved:             ${stats.savedPct}`);
console.log('----------------------------------------------------\n');

if (explanation) {
  console.log(explanation);
}

if (printSourceMap) {
  console.log('Source map');
  console.log('----------------------------------------------------');
  console.log(JSON.stringify(sourceMap, null, 2));
  console.log('----------------------------------------------------\n');
}

if (copyToClipboard) {
  try {
    const platform = os.platform();
    if (platform === 'darwin') {
      execSync('pbcopy', { input: output });
    } else if (platform === 'win32') {
      execSync('clip', { input: output });
    } else if (platform === 'linux') {
      execSync('xclip -selection clipboard', { input: output });
    }
    console.log('✅ Compressed output copied to clipboard!');
  } catch (err) {
    console.error('❌ Failed to copy to clipboard (is xclip/pbcopy/clip installed?)');
    console.log(output);
  }
} else {
  console.log(output);
}
}

function runCommand(command, args, { jsonOutput }) {
  if (command === 'inspect') {
    const query = args.filter((arg) => !['inspect', '--json'].includes(arg) && !arg.startsWith('-')).join(' ');
    const root = process.cwd();
    const codebook = buildWorkspaceCodebook(root);
    const codebookPath = saveWorkspaceCodebook(root, codebook);
    const selection = selectRelevantFiles(root, query, { codebook });
    const result = {
      version: codebook.version,
      codebookPath: path.relative(root, codebookPath),
      filesScanned: codebook.files.length,
      symbolsIndexed: codebook.symbols.length,
      importsIndexed: codebook.importGraph.length,
      diagnosticsIndexed: codebook.diagnostics.length,
      owners: codebook.owners.slice(0, 8),
      intents: selection.intents,
      relevantFiles: selection.files,
    };
    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\nWorkspace intelligence');
      console.log('----------------------------------------------------');
      console.log(`Codebook:          ${result.codebookPath}`);
      console.log(`Files scanned:     ${result.filesScanned}`);
      console.log(`Symbols indexed:   ${result.symbolsIndexed}`);
      console.log(`Imports indexed:   ${result.importsIndexed}`);
      console.log(`Diagnostics:       ${result.diagnosticsIndexed}`);
      console.log(`Intent:            ${result.intents.join(', ')}`);
      console.log('Relevant files:');
      for (const file of result.relevantFiles.slice(0, 8)) {
        console.log(`  ${file.score.toString().padStart(2, ' ')}  ${file.path}`);
      }
      console.log('----------------------------------------------------\n');
    }
    return;
  }

  if (command === 'doctor') {
    const report = runDoctor(process.cwd());
    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log('\nGlyphCompress doctor');
      console.log('----------------------------------------------------');
      for (const check of report.checks) {
        const status = check.ok ? 'OK ' : check.optional ? 'WARN' : 'ERR';
        console.log(`${status} ${check.name}: ${check.detail}`);
      }
      console.log('----------------------------------------------------');
      console.log(report.ok ? 'Repository looks ready.' : 'Repository needs attention.');
    }
    process.exit(report.ok ? 0 : 1);
  }

  if (command === 'benchmark') {
    execSync('npm run benchmark', { cwd: process.cwd(), stdio: 'inherit' });
  }
}

function buildExplanation({ level, provider, trustPolicy, fileToCompress, ext, original, compressed, stats, compressor }) {
  const originalLines = original.split(/\r?\n/).length;
  const compressedLines = compressed.split(/\r?\n/).length;
  const fileRefs = compressor.fileIndex ? compressor.fileIndex.size : 0;
  const dynamicEntries = compressor.dynamicDict ? compressor.dynamicDict.size : 0;
  const detected = [];

  if (/```[\s\S]*```/.test(compressed) || /\[[^\]]*(imp|ƒ|𝒞|exp):/u.test(compressed)) {
    detected.push('code block handling');
  }
  if (/₍\d+₎/.test(compressed)) detected.push('file path indexing');
  if (/[ᵗʲˢᵖʳᵍℜℕ𝕍𝒟𝒦𝒯ℙᵣℒα]/u.test(compressed)) detected.push('technology and dynamic glyphs');
  if (/[✗⚠∉∅]/u.test(compressed)) detected.push('diagnostic/error compression');
  if (/[⺌⺋⺎⺃⺏▲●►■]/u.test(compressed)) detected.push('intent/action compression');

  const modeDescription = {
    light: 'Prompt patterns and technology names only.',
    standard: 'Prompt patterns, technology names, file paths, diagnostics, and dynamic dictionary entries.',
    aggressive: 'Standard compression plus syntax minification inside code blocks.',
    ultra: 'Aggressive compression plus structural summaries and redundancy stripping.',
  }[level] || 'Custom compression level.';

  return [
    'Compression explanation',
    '----------------------------------------------------',
    `File:              ${fileToCompress}`,
    `Language:          ${ext || 'text'}`,
    `Level:             ${level}`,
    `Provider:          ${stats.provider || provider}`,
    `Profile:           ${stats.profile || 'balanced'}`,
    `Trust policy:      ${stats.trustPolicy || trustPolicy || 'auto'}`,
    `Mode:              ${modeDescription}`,
    `Original lines:    ${originalLines}`,
    `Compressed lines:  ${compressedLines}`,
    `Original tokens:   ~${stats.originalTokens}`,
    `Compressed tokens: ~${stats.compressedTokens}`,
    `Ratio:             ${stats.ratio}`,
    `Saved:             ${stats.savedPct}`,
    `File refs indexed: ${fileRefs}`,
    `Dynamic entries:   ${dynamicEntries}`,
    `Detected changes:  ${detected.length ? detected.join(', ') : 'none detected'}`,
    '----------------------------------------------------\n',
  ].join('\n');
}
