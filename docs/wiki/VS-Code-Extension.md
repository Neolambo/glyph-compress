# VS Code Extension

The VS Code extension is published on the Marketplace and also distributed as a VSIX artifact on GitHub releases.

## Install from Marketplace

Extension id:

```text
neolambo.glyph-compress
```

Command-line install:

```powershell
code.cmd --install-extension neolambo.glyph-compress --force
code.cmd --list-extensions --show-versions | Select-String -Pattern 'neolambo.glyph-compress'
```

Marketplace verification:

```powershell
npx @vscode/vsce show Neolambo.glyph-compress
```

## Install a Specific VSIX

```powershell
code.cmd --install-extension vscode-ext\glyph-compress-1.9.3.vsix --force
```

## Commands

- `GlyphCompress: Ask LLM (Auto-Compress)`
- `GlyphCompress: Copy System Codebook`
- `GlyphCompress: Compress Selection`
- `GlyphCompress: Build Project Codebook`
- `GlyphCompress: Toggle Compression On/Off`
- `GlyphCompress: Show Compression Stats`
- `GlyphCompress: Start Zero-Command Proxy`
- `GlyphCompress: Stop Zero-Command Proxy`
- `GlyphCompress: Compress Entire Workspace`

## Settings

```json
{
  "glyphCompress.enabled": true,
  "glyphCompress.provider": "auto",
  "glyphCompress.compressionLevel": "standard",
  "glyphCompress.trustPolicy": "auto",
  "glyphCompress.showStatusBar": true,
  "glyphCompress.autoUpdateWorkspaceRules": false,
  "glyphCompress.targetApiUrl": "https://api.openai.com"
}
```

## Recommended Trust Settings

- Use `lossless` when exact prompt preservation matters.
- Use `reversible` for normal coding workflows where lossy summaries should be blocked.
- Use `privacy` when content may include secrets or customer identifiers.
- Use `lossy` only when maximum compression is more important than exact structure.
