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
import { loadTeamCodebook, mergeTeamCodebook, readLocalDynamicDictWords, teamCodebookPath } from '../src/team-codebook.js';
import { measureSession } from '../src/session-measure.js';
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
let tokenBudget = 2000;
// `route` has always defaulted to 2000, so the value alone cannot tell us
// whether the user asked for a budget. Plain file compression only engages
// the Context Budget Planner when they explicitly did.
let budgetSet = false;
let maxFiles = 8;
let sessionTurns = 10;
let gitDiffOnly = false;
let logFile = null;

// Simple argument parser
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!command && ['inspect', 'doctor', 'benchmark', 'measure', 'route', 'team-codebook', 'mcp'].includes(arg)) {
    command = arg;
  } else if (arg === '--level' || arg === '-l') {
    level = args[++i];
  } else if (arg === '--copy' || arg === '-c') {
    copyToClipboard = true;
  } else if (arg === '--explain' || arg === '-x') {
    explain = true;
  } else if (arg === '--budget') {
    tokenBudget = parseInt(args[++i], 10) || tokenBudget;
    budgetSet = true;
  } else if (arg === '--max-files') {
    maxFiles = parseInt(args[++i], 10) || maxFiles;
  } else if (arg === '--turns') {
    sessionTurns = parseInt(args[++i], 10) || sessionTurns;
  } else if (arg === '--git-diff-only') {
    gitDiffOnly = true;
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
  } else if (arg === '--log-file') {
    logFile = args[++i] || logFile;
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
  measure <file>        Measure what a session costs on YOUR file: simulate an IDE
                        re-attaching it every turn and report tokens sent and tokens
                        billed, raw vs compressed (see --turns)
  route <query>         Rank relevant workspace files for a query and compress as many
                        as fit inside a token budget (Context Router, v1.17.0)
  team-codebook show    Print the shared team codebook (glyphcompress.team.json), if any
  team-codebook sync    Promote this machine's locally-learned dynamic dictionary into
                        glyphcompress.team.json for the whole team (commit it to git)
  mcp                   Start the MCP stdio server (same as npx glyph-compress-mcp)

Options:
  -l, --level <level>   Compression level: light, standard, aggressive, ultra, auto (default: standard)
                        'auto' picks a level from content signals (length, code density)
  -c, --copy            Copy compressed output to clipboard
  -x, --explain         Explain what changed during compression
  --budget <tokens>     Token budget. For 'route': how many tokens of file context to
                        select. For a single file: engage the Context Budget Planner —
                        escalate light→standard→aggressive→ultra and use the lightest
                        level whose payload (codebook included) fits the budget.
  --max-files <n>       Max candidate files to rank for the 'route' command (default: 8)
  --turns <n>           Turns to simulate for the 'measure' command (default: 10)
  --git-diff-only       Restrict 'route' to git staged/unstaged files ("review what I changed")
  --source-map          Print the reversible source map JSON
  --privacy             Redact secrets and sensitive identifiers before compression
  --decay               Enable experimental attentional decay compaction for history
  --folding             Enable holographic context folding for overlapping files
  --intents             Enable generative intent diffs compression for code changes
  --provider <provider> Provider profile: raw, openai, anthropic, gemini, local (default: raw)
  --trust <policy>      Trust policy: lossless, reversible, privacy, lossy (default: auto)
  --target <url>        Proxy upstream base URL (default: https://api.openai.com)
  --log-file <path>     Append structured, redacted JSONL diagnostics from the proxy to this file
  --json                Print command output as JSON
  -p, --proxy [port]    Start the Zero-Command Transparent Proxy server (default port: 8080)
  -h, --help            Show this help message
    `);
    process.exit(0);
  } else if (!arg.startsWith('-')) {
    fileToCompress = arg;
  }
}

// Validate enum-valued flags before doing any work. The library resolves an
// unrecognized level to the default (mirroring how an unknown provider
// resolves to 'raw'), but at the command line a value that matches nothing is
// a typo, not a choice — and silently degrading it is how `--level Ultra`
// used to cost 4.7 percentage points of real compression without saying so.
const VALID_LEVELS = ['light', 'standard', 'aggressive', 'ultra', 'auto'];
if (level !== undefined && !VALID_LEVELS.includes(String(level).trim().toLowerCase())) {
  console.error(`Error: unknown compression level "${level}". Valid levels: ${VALID_LEVELS.join(', ')}.`);
  process.exit(1);
}
level = String(level ?? 'standard').trim().toLowerCase();

if (command === 'mcp') {
  // Delegates to bin/mcp-server.js so both `npx glyph-compress-mcp` (the
  // dedicated bin) and `npx glyph-compress mcp` (a single-bin-resolvable
  // subcommand, needed for MCP registry auto-discovery — see server.json)
  // start the exact same stdio server.
  import('./mcp-server.js').catch((err) => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
  });
} else if (command) {
  runCommand(command, args, { jsonOutput, level, provider, trustPolicy, tokenBudget, maxFiles, gitDiffOnly });
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
      logFile,
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
const payload = `File: ${fileToCompress}\n\n\`\`\`${ext}\n${content}\n\`\`\``;

// --budget engages the Context Budget Planner: instead of applying the
// configured level once, escalate until the transmitted payload (codebook
// included) fits, and report which level that turned out to be.
const budgetPlan = budgetSet ? gc.compressToBudget(payload, { budget: tokenBudget, provider }) : null;
const { compressed, stats, sourceMap } = budgetPlan || gc.compressText(payload, provider);

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
  trustWarnings: sourceMap.trustWarnings,
}) : '';

console.log('\n⚡ GlyphCompress Results:');
console.log('----------------------------------------------------');
console.log(`Original tokens:   ~${stats.originalTokens}`);
console.log(`Compressed tokens: ~${stats.compressedTokens}`);
console.log(`Compression ratio: ${stats.ratio}`);
console.log(`Saved:             ${stats.savedPct}`);
if (budgetPlan) {
  console.log('----------------------------------------------------');
  console.log(`Token budget:      ${budgetPlan.budget}`);
  console.log(`Level chosen:      ${budgetPlan.level}  (${budgetPlan.withinBudget ? 'lightest that fits' : 'smallest available'})`);
  console.log(`Payload sent:      ~${budgetPlan.tokens} (body ~${budgetPlan.bodyTokens} + codebook ~${budgetPlan.codebookTokens})`);
  if (budgetPlan.withinBudget) {
    console.log('Budget:            ✅ within budget');
  } else {
    console.log(`Budget:            ⚠️  OVER by ~${budgetPlan.overflowTokens} tokens — no level fits; sending the smallest.`);
    console.log('                   Consider splitting the file or raising --budget.');
  }
  console.log('Levels tried:      ' + budgetPlan.trials.map((t) => `${t.level}=${t.totalTokens}${t.withinBudget ? '✓' : ''}`).join('  '));
  // Escalating to meet a budget can reach 'ultra', which replaces a whole
  // file with a structural summary. That is a real fidelity cliff, and the
  // user did not pick the level here — the planner did — so surface what
  // the chosen level actually permits rather than letting it pass silently.
  const budgetWarnings = budgetPlan.sourceMap?.trustWarnings || [];
  if (budgetWarnings.length) {
    console.log('Fidelity:          ⚠️  ' + budgetWarnings.join('\n                   ⚠️  '));
  }
}
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

function runCommand(command, args, { jsonOutput, level, provider, trustPolicy, tokenBudget, maxFiles, gitDiffOnly }) {
  if (command === 'team-codebook') {
    const action = args.find((arg) => arg !== 'team-codebook' && !arg.startsWith('-')) || 'show';
    const root = process.cwd();

    if (action === 'sync') {
      const localWords = readLocalDynamicDictWords(root);
      if (localWords.length === 0) {
        console.log('No locally-learned dynamic dictionary found for this workspace yet. Compress a few files first, then run sync again.');
        return;
      }
      const result = mergeTeamCodebook(root, localWords);
      const output = { path: path.relative(root, result.path), totalEntries: result.entries.length, addedCount: Math.max(0, result.addedCount) };
      if (jsonOutput) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log('\nTeam Codebook — sync');
        console.log('----------------------------------------------------');
        console.log(`File:          ${output.path}`);
        console.log(`Total entries: ${output.totalEntries}`);
        console.log(`New this run:  ${output.addedCount}`);
        console.log('----------------------------------------------------');
        console.log(`Commit ${output.path} to git so your whole team assigns the same §N glyphs to shared vocabulary.\n`);
      }
      return;
    }

    // action === 'show'
    const team = loadTeamCodebook(root);
    if (!team) {
      console.log(`No team codebook found at ${path.relative(root, teamCodebookPath(root))}. Run "glyph-compress team-codebook sync" to create one from this machine's learned dictionary.`);
      return;
    }
    if (jsonOutput) {
      console.log(JSON.stringify(team, null, 2));
    } else {
      console.log('\nTeam Codebook');
      console.log('----------------------------------------------------');
      console.log(`Generated:     ${team.generatedAt}`);
      console.log(`Entries:       ${team.entries.length}`);
      team.entries.slice(0, 20).forEach((word, i) => console.log(`  §${i + 1}  ${word}`));
      if (team.entries.length > 20) console.log(`  ... and ${team.entries.length - 20} more`);
      console.log('----------------------------------------------------\n');
    }
    return;
  }

  if (command === 'route') {
    const query = args.filter((arg) => !['route', '--json'].includes(arg) && !arg.startsWith('-') && arg !== String(tokenBudget) && arg !== String(maxFiles)).join(' ');
    const gc = new GlyphCompressor({ level, provider, trustPolicy, workspacePath: process.cwd() });
    const result = gc.routeAndCompress(query, { rootDir: process.cwd(), tokenBudget, maxFiles, provider, gitDiffOnly });
    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\nContext Router');
      console.log('----------------------------------------------------');
      console.log(`Query:             ${query}`);
      if (gitDiffOnly) console.log('Scope:             git staged/unstaged files only');
      console.log(`Intent:            ${result.intents.join(', ')}`);
      console.log(`Token budget:      ${result.tokensUsed} / ${result.tokenBudget}`);
      console.log('Selected files:');
      for (const file of result.selectedFiles) {
        console.log(`  ${String(file.score).padStart(2, ' ')}  ${file.path}  (${file.tokens} tok)`);
      }
      if (result.excludedFiles.length) {
        console.log('Excluded files:');
        for (const file of result.excludedFiles) {
          console.log(`  ${String(file.score).padStart(2, ' ')}  ${file.path}  (${file.reason})`);
        }
      }
      console.log('----------------------------------------------------');
      console.log(result.compressed);
      console.log('----------------------------------------------------\n');
    }
    return;
  }

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

  if (command === 'measure') {
    if (!fileToCompress) {
      console.error('Error: measure needs a file. Usage: glyph-compress measure <file> [--turns 10] [--provider openai]');
      process.exit(1);
    }
    if (!fs.existsSync(fileToCompress)) {
      console.error(`Error: file not found: ${fileToCompress}`);
      process.exit(1);
    }

    const text = fs.readFileSync(fileToCompress, 'utf8');
    const ext = path.extname(fileToCompress).replace('.', '') || 'txt';
    let result;
    try {
      result = measureSession({
        text,
        turns: sessionTurns,
        provider: providerSet ? provider : 'openai',
        language: ext,
      });
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }

    if (jsonOutput) {
      console.log(JSON.stringify({ file: fileToCompress, ...result }, null, 2));
      process.exit(0);
    }

    const pct = (n) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
    console.log(`\nSession cost for ${fileToCompress}`);
    console.log(`${result.turns} turns, re-attached every turn, provider ${result.provider}, cached input at ${result.cachedRate}x`);
    console.log('----------------------------------------------------');
    console.log(`Tokens sent      ${String(result.raw.sent).padStart(9)} -> ${String(result.glyph.sent).padStart(9)}   ${pct(result.sentDeltaPct)}`);
    console.log(`Billed w/ cache  ${String(result.raw.billed).padStart(9)} -> ${String(result.glyph.billed).padStart(9)}   ${pct(result.billedDeltaPct)}`);
    console.log(`Prefix breaks    ${String(result.raw.prefixBreaks).padStart(9)} -> ${String(result.glyph.prefixBreaks).padStart(9)}   out of ${result.raw.requests - 1}`);
    console.log('----------------------------------------------------');
    console.log('Negative is cheaper. "Sent" is what leaves your machine; "billed" prices it');
    console.log('after the provider matches the repeated prefix, and the two can disagree —');
    console.log('a prefix broken by re-compression can cost more than the compression saved.');
    if (!result.exact) {
      console.log('\nNOTE: js-tiktoken is not installed, so these are ESTIMATES, not real token');
      console.log('counts. Install it for exact numbers:  npm install js-tiktoken');
    }
    process.exit(0);
  }

  if (command === 'benchmark') {
    execSync('npm run benchmark', { cwd: process.cwd(), stdio: 'inherit' });
  }
}

function buildExplanation({ level, provider, trustPolicy, fileToCompress, ext, original, compressed, stats, compressor, trustWarnings = [] }) {
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

  const lines = [
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
  ];
  if (trustWarnings.length) {
    lines.push('Trust warnings:');
    for (const warning of trustWarnings) lines.push(`  - ${warning}`);
  }
  lines.push('----------------------------------------------------\n');
  return lines.join('\n');
}
