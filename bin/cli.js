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

import { GlyphCompressor } from '../vscode-ext/glyph-middleware.js';
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
let explain = false;
let printSourceMap = false;

// Simple argument parser
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--level' || arg === '-l') {
    level = args[++i];
  } else if (arg === '--copy' || arg === '-c') {
    copyToClipboard = true;
  } else if (arg === '--explain' || arg === '-x') {
    explain = true;
  } else if (arg === '--source-map') {
    printSourceMap = true;
  } else if (arg === '--proxy' || arg === '-p') {
    startProxy = true;
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      proxyPort = parseInt(args[++i], 10);
    }
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
GlyphCompress CLI
Usage: npx glyph-compress [file] [options]

Options:
  -l, --level <level>   Compression level: light, standard, aggressive, ultra (default: standard)
  -c, --copy            Copy compressed output to clipboard
  -x, --explain         Explain what changed during compression
  --source-map          Print the reversible source map JSON
  -p, --proxy [port]    Start the Zero-Command Transparent Proxy server (default port: 8080)
  -h, --help            Show this help message
    `);
    process.exit(0);
  } else if (!arg.startsWith('-')) {
    fileToCompress = arg;
  }
}

if (startProxy) {
  import('../src/proxy.js').then(({ startProxyServer }) => {
    startProxyServer(proxyPort, 'https://api.openai.com', level);
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

const gc = new GlyphCompressor({ level });
// Wrap in backticks to trigger full semantic code block compression if in aggressive/ultra mode
const { compressed, stats, sourceMap } = gc.compressText(`File: ${fileToCompress}\n\n\`\`\`${ext}\n${content}\n\`\`\``);

const output = `${gc.getCodebookPrompt()}\n\n${compressed}`;
const explanation = explain ? buildExplanation({
  level,
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

function buildExplanation({ level, fileToCompress, ext, original, compressed, stats, compressor }) {
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
