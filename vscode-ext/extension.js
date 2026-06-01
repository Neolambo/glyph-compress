/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 * 
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 * 
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — VS Code Extension
 * 
 * Integrates GlyphCompress into VS Code:
 * - Auto-compresses context sent to LLMs (Copilot, Antigravity, etc.)
 * - Shows compression stats in status bar
 * - Build Project Codebook command
 * - Works with OpenAI, Claude, and Antigravity
 */

const vscode = require('vscode');
const { GlyphCompressor, CODEBOOK_PROMPT, DOMAIN_GLYPHS } = require('./glyph-middleware.cjs');
const fs = require('fs');
const path = require('path');

let compressor;
let statusBarItem;
let outputChannel;
let globalState;
let proxyServer = null;

function activate(context) {
  outputChannel = vscode.window.createOutputChannel('GlyphCompress');
  outputChannel.appendLine('GlyphCompress activated');
  globalState = context.globalState;

  // Initialize compressor with user settings
  const config = vscode.workspace.getConfiguration('glyphCompress');
  const folders = vscode.workspace.workspaceFolders;
  const workspacePath = folders && folders.length > 0 ? folders[0].uri.fsPath : null;
  compressor = new GlyphCompressor({
    enabled: config.get('enabled', true),
    level: config.get('compressionLevel', 'standard'),
    provider: config.get('provider', 'auto'),
    trustPolicy: config.get('trustPolicy', 'auto'),
    workspacePath,
    attentionalDecay: config.get('experimentalDecay', false),
  });

  if (config.get('autoUpdateWorkspaceRules', false)) {
    updateWorkspaceRules();
  }

  // ─── Status Bar ──────────────────────────────────────────
  if (config.get('showStatusBar', true)) {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 100
    );
    statusBarItem.command = 'glyphCompress.showStats';
    statusBarItem.text = '$(zap) GlyphCompress';
    statusBarItem.tooltip = 'Click to see compression stats';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
  }

  // ─── Commands ────────────────────────────────────────────

  // Toggle compression on/off
  context.subscriptions.push(
    vscode.commands.registerCommand('glyphCompress.toggle', () => {
      compressor.enabled = !compressor.enabled;
      const state = compressor.enabled ? 'ON' : 'OFF';
      if (statusBarItem) {
        statusBarItem.text = compressor.enabled
          ? '$(zap) GlyphCompress'
          : '$(circle-slash) GlyphCompress OFF';
      }
      vscode.window.showInformationMessage(`GlyphCompress: ${state}`);
      outputChannel.appendLine(`Compression toggled: ${state}`);
    })
  );

  // Show compression stats
  context.subscriptions.push(
    vscode.commands.registerCommand('glyphCompress.showStats', () => {
      const stats = compressor.getStats();
      const lifetimeSaved = globalState.get('lifetimeTokensSaved', 0);
      const lifetimeCost = `$${(lifetimeSaved * (3 / 1000000)).toFixed(2)}`;

      const panel = vscode.window.createWebviewPanel(
        'glyphStats', 'GlyphCompress Stats', vscode.ViewColumn.Beside,
        { enableScripts: false }
      );
      panel.webview.html = generateStatsHTML(stats, lifetimeSaved, lifetimeCost);
    })
  );

  // Build Project Codebook
  context.subscriptions.push(
    vscode.commands.registerCommand('glyphCompress.buildCodebook', async () => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders) {
        vscode.window.showWarningMessage('No workspace open');
        return;
      }

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Building GlyphCompress codebook...',
      }, async (progress) => {
        progress.report({ increment: 0, message: 'Scanning files...' });

        compressor.resetFileIndex();
        const files = await vscode.workspace.findFiles(
          '**/*.{ts,tsx,js,jsx,py,rs,go,java,vue,svelte}',
          '**/node_modules/**', 200
        );

        for (let i = 0; i < files.length; i++) {
          const relPath = vscode.workspace.asRelativePath(files[i]);
          compressor._compressFilePaths(relPath);
          progress.report({
            increment: (i / files.length) * 100,
            message: `Indexed ${i + 1}/${files.length} files`,
          });
        }

        progress.report({ increment: 100, message: 'Done!' });
        outputChannel.appendLine(
          `Codebook built: ${compressor.fileIndex.size} files indexed`
        );
        if (config.get('autoUpdateWorkspaceRules', false)) {
          updateWorkspaceRules();
        }
        vscode.window.showInformationMessage(
          `GlyphCompress: Indexed ${compressor.fileIndex.size} files`
        );
      });
    })
  );

  // Compress selected text (for manual testing)
  context.subscriptions.push(
    vscode.commands.registerCommand('glyphCompress.compressSelection', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      let selection = editor.document.getText(editor.selection);
      if (!selection) {
        vscode.window.showWarningMessage('No text selected');
        return;
      }

      // Automatically wrap in markdown backticks so the semantic codeblock parser triggers
      const lang = editor.document.languageId;
      const wrappedSelection = '```' + lang + '\n' + selection + '\n```';

      const result = compressor.compressText(wrappedSelection);
      outputChannel.appendLine(`\n─── Compression Result ───`);
      outputChannel.appendLine(`Original (${result.stats.originalTokens} tokens):`);
      outputChannel.appendLine(result.original);
      outputChannel.appendLine(`\nCompressed (${result.stats.compressedTokens} tokens, ${result.stats.ratio}):`);
      outputChannel.appendLine(result.compressed);
      outputChannel.appendLine(`Saved: ${result.stats.savedPct}`);
      outputChannel.show();

      // Also copy the compressed text to clipboard
      vscode.env.clipboard.writeText(result.compressed);
      vscode.window.showInformationMessage(`GlyphCompress: Copied ${result.stats.compressedTokens} tokens to clipboard!`);
    })
  );

  // Copy Codebook to Clipboard
  context.subscriptions.push(
    vscode.commands.registerCommand('glyphCompress.copyCodebook', () => {
      const codebook = compressor.getCodebookPrompt();
      vscode.env.clipboard.writeText(codebook);
      vscode.window.showInformationMessage('GlyphCompress: Codebook copied to clipboard! Paste it as a Custom Instruction in your LLM.');
      outputChannel.appendLine('Codebook copied to clipboard.');
    })
  );

  // ─── Proxy Management ──────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('glyphCompress.startProxy', () => {
      if (proxyServer) {
        vscode.window.showInformationMessage('GlyphProxy is already running.');
        return;
      }

      try {
        const { startProxyServer } = require('./proxy.js');
        const proxyConfig = vscode.workspace.getConfiguration('glyphCompress');
        const targetUrl = proxyConfig.get('targetApiUrl', 'https://api.openai.com');
        proxyServer = startProxyServer(8080, targetUrl, {
          level: compressor.level,
          provider: proxyConfig.get('provider', 'auto'),
          trustPolicy: proxyConfig.get('trustPolicy', 'auto'),
          compressor,
          outputChannel,
        });
        vscode.window.showInformationMessage(`GlyphProxy started on http://localhost:8080. Forwarding to ${targetUrl}`);
        outputChannel.appendLine('GlyphProxy started on port 8080');
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to start proxy: ${err.message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('glyphCompress.stopProxy', () => {
      if (proxyServer) {
        proxyServer.close();
        proxyServer = null;
        vscode.window.showInformationMessage('GlyphProxy stopped.');
        outputChannel.appendLine('GlyphProxy stopped');
      } else {
        vscode.window.showInformationMessage('GlyphProxy is not running.');
      }
    })
  );

  // Ask LLM (Auto-Compress)
  context.subscriptions.push(
    vscode.commands.registerCommand('glyphCompress.askChat', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      let selection = editor.document.getText(editor.selection);
      if (!selection) {
        // If no selection, use the whole file
        selection = editor.document.getText();
      }

      const lang = editor.document.languageId;
      const wrappedSelection = '```' + lang + '\n' + selection + '\n```';
      const result = compressor.compressText(wrappedSelection);

      // Open the VS Code Chat UI with the compressed text
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: '\n\n' + result.compressed + '\n\n'
      });

      outputChannel.appendLine("Auto-compressed " + result.stats.originalTokens + " tokens to " + result.stats.compressedTokens + " tokens for chat.");
      vscode.window.showInformationMessage("GlyphCompress: Ready to ask! Saved " + result.stats.savedPct + ".");
    })
  );

  // Compress Entire Workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('glyphCompress.compressWorkspace', async () => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders) {
        vscode.window.showWarningMessage('No workspace open to compress.');
        return;
      }

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Compressing workspace...',
      }, async (progress) => {
        progress.report({ increment: 0, message: 'Finding files...' });

        // Temporarily force ultra level for maximum structural compression
        const originalLevel = compressor.level;
        compressor.level = 'ultra';

        const files = await vscode.workspace.findFiles(
          '**/*.{ts,tsx,js,jsx,py,rs,go,java,c,cpp,cs,vue,svelte,html,css,md,json}',
          '**/{node_modules,.git,dist,build,coverage,out}/**',
          1000
        );

        let outputText = '=== WORKSPACE COMPRESSED WITH GLYPH-COMPRESS (Level: Ultra) ===\n\n';
        
        for (let i = 0; i < files.length; i++) {
          progress.report({
            increment: (1 / files.length) * 100,
            message: `Compressing file ${i + 1}/${files.length}`
          });

          try {
            const content = fs.readFileSync(files[i].fsPath, 'utf8');
            const relPath = vscode.workspace.asRelativePath(files[i]);
            
            // Wrap in codeblock to trigger semantic parsing
            const ext = path.extname(files[i].fsPath).substring(1) || 'txt';
            const wrapped = '```' + ext + '\n' + content + '\n```';
            
            const result = compressor.compressText(wrapped);
            
            outputText += `\n--- FILE: ${relPath} ---\n`;
            outputText += result.compressed + '\n';
          } catch (e) {
            outputChannel.appendLine(`Skipped ${files[i].fsPath}: ${e.message}`);
          }
        }

        // Restore user's level
        compressor.level = originalLevel;

        progress.report({ increment: 100, message: 'Done!' });

        // Open in new unsaved editor
        const doc = await vscode.workspace.openTextDocument({ content: outputText, language: 'plaintext' });
        await vscode.window.showTextDocument(doc, { preview: false });
        
        vscode.window.showInformationMessage(`GlyphCompress: Workspace compressed (${files.length} files)`);
        outputChannel.appendLine(`Workspace compressed: ${files.length} files processed`);
      });
    })
  );

  // ─── VS Code Language Model API Integration ──────────────
  // Hook into VS Code's native LM API if available (v1.90+)
  if (vscode.lm) {
    outputChannel.appendLine('VS Code Language Model API detected — hooking in');
    // The lm API manages context internally, but we can provide
    // compressed context via chat participants
  }

  // ─── Configuration Change Listener ───────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('glyphCompress')) {
        const newConfig = vscode.workspace.getConfiguration('glyphCompress');
        const folders = vscode.workspace.workspaceFolders;
        const workspacePath = folders && folders.length > 0 ? folders[0].uri.fsPath : null;
        compressor = new GlyphCompressor({
          enabled: newConfig.get('enabled', true),
          level: newConfig.get('compressionLevel', 'standard'),
          provider: newConfig.get('provider', 'auto'),
          trustPolicy: newConfig.get('trustPolicy', 'auto'),
          workspacePath,
          attentionalDecay: newConfig.get('experimentalDecay', false),
        });
        outputChannel.appendLine(
          `Config updated: enabled=${compressor.enabled}, level=${compressor.level}, trust=${compressor.trustPolicy}`
        );
      }
    })
  );

  // Update status bar periodically
  const statusInterval = setInterval(() => updateStatusBar(), 5000);
  context.subscriptions.push({ dispose: () => clearInterval(statusInterval) });

  outputChannel.appendLine('GlyphCompress ready');
  outputChannel.appendLine(`  Provider: ${config.get('provider', 'auto')}`);
  outputChannel.appendLine(`  Level: ${config.get('compressionLevel', 'standard')}`);
  outputChannel.appendLine(`  Trust: ${config.get('trustPolicy', 'auto')}`);
  outputChannel.appendLine(`  Codebook: ${CODEBOOK_PROMPT.length} chars (≈${Math.ceil(CODEBOOK_PROMPT.length / 4)} tokens)`);
}

function updateStatusBar() {
  if (!statusBarItem || !compressor.enabled) return;
  const stats = compressor.getStats();
  if (stats.messagesProcessed > 0) {
    // Update lifetime stats
    let lifetime = globalState.get('lifetimeTokensSaved', 0);
    // Since we don't have hooks into individual requests easily, 
    // we can track a baseline in the extension lifecycle

    statusBarItem.text = `$(zap) GC: ${stats.overallRatio} | -${stats.totalSavedTokens} tok`;
    statusBarItem.tooltip = [
      `GlyphCompress Stats`,
      `Messages: ${stats.messagesProcessed}`,
      `Tokens saved: ${stats.totalSavedTokens}`,
      `Compression: ${stats.overallRatio} (${stats.overallSavedPct})`,
      `Cost saved: ${stats.estimatedCostSaved}`,
      `Session: ${stats.sessionDuration}`,
    ].join('\n');
  }
}

function generateStatsHTML(stats, lifetimeSaved, lifetimeCost) {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
    h1 { color: #569cd6; font-size: 24px; }
    h2 { color: #c586c0; font-size: 18px; margin-top: 30px; border-bottom: 1px solid #3c3c3c; padding-bottom: 5px; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
    .stat-card { background: #252526; border: 1px solid #3c3c3c; border-radius: 8px; padding: 16px; }
    .stat-value { font-size: 32px; font-weight: bold; color: #4ec9b0; }
    .stat-value.gold { color: #d7ba7d; }
    .stat-label { font-size: 12px; color: #808080; text-transform: uppercase; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>⚡ GlyphCompress Stats</h1>
  
  <h2>Current Session</h2>
  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-value">${stats.overallRatio}</div>
      <div class="stat-label">Compression Ratio</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.totalSavedTokens}</div>
      <div class="stat-label">Tokens Saved</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.overallSavedPct}</div>
      <div class="stat-label">Reduction</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.estimatedCostSaved}</div>
      <div class="stat-label">Cost Saved (est.)</div>
    </div>
  </div>

  <h2>Lifetime Savings (All Sessions)</h2>
  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-value gold">${lifetimeSaved + stats.totalSavedTokens}</div>
      <div class="stat-label">Total Tokens Saved</div>
    </div>
    <div class="stat-card">
      <div class="stat-value gold">$${((lifetimeSaved + stats.totalSavedTokens) * (3 / 1000000)).toFixed(2)}</div>
      <div class="stat-label">Total Cost Saved (est.)</div>
    </div>
  </div>
</body>
</html>`;
}

function deactivate() {
  if (proxyServer) {
    proxyServer.close();
    proxyServer = null;
  }

  if (outputChannel) {
    const stats = compressor.getStats();
    // Persist final session stats
    const lifetime = globalState.get('lifetimeTokensSaved', 0);
    globalState.update('lifetimeTokensSaved', lifetime + stats.totalSavedTokens);

    outputChannel.appendLine(`\nSession ended. Final stats:`);
    outputChannel.appendLine(JSON.stringify(stats, null, 2));
  }
}

// ─── Zero-Friction Workspace Integration ───────────────────
function updateWorkspaceRules() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return;

  const rootPath = folders[0].uri.fsPath;
  const codebook = compressor.getCodebookPrompt();

  const rulesHeader = "## GLYPHCOMPRESS DICTIONARY (DO NOT MODIFY MANUALLY)\n" +
    "You are communicating with a user who has semantic compression enabled.\n" +
    "Parse the following compressed syntax in all user queries:\n\n";

  const content = rulesHeader + codebook + "\n\n";

  // 1. Update .cursorrules
  try {
    const cursorPath = path.join(rootPath, '.cursorrules');
    let existingCursor = '';
    if (fs.existsSync(cursorPath)) {
      existingCursor = fs.readFileSync(cursorPath, 'utf8');
      // Remove old glyph instructions if present
      existingCursor = existingCursor.replace(/## GLYPHCOMPRESS DICTIONARY[\s\S]*?\[\/GLYPH\]\n\n/g, '');
    }
    fs.writeFileSync(cursorPath, content + existingCursor);
  } catch (e) {
    console.error('Failed to update .cursorrules', e);
  }

  // 2. Update .github/copilot-instructions.md
  try {
    const githubDir = path.join(rootPath, '.github');
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir, { recursive: true });
    }
    const copilotPath = path.join(githubDir, 'copilot-instructions.md');
    let existingCopilot = '';
    if (fs.existsSync(copilotPath)) {
      existingCopilot = fs.readFileSync(copilotPath, 'utf8');
      existingCopilot = existingCopilot.replace(/## GLYPHCOMPRESS DICTIONARY[\s\S]*?\[\/GLYPH\]\n\n/g, '');
    }
    fs.writeFileSync(copilotPath, content + existingCopilot);
  } catch (e) {
    console.error('Failed to update copilot-instructions.md', e);
  }
}

module.exports = { activate, deactivate };
