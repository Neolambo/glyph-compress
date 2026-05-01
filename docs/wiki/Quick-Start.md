# Quick Start

## Install the CLI

Run directly with `npx`:

```bash
npx glyph-compress --help
```

Or install globally:

```bash
npm install -g glyph-compress
glyph-compress --help
```

## Compress a File

```bash
npx glyph-compress src/app.ts --level standard
```

For stronger compression:

```bash
npx glyph-compress src/app.ts --level ultra --explain
```

## Use the Library

```javascript
import { GlyphCompressor } from 'glyph-compress';

const compressor = new GlyphCompressor({ level: 'standard' });
const result = compressor.compressText(
  'Fix the TypeScript error in src/components/UserProfile.tsx line 42'
);

console.log(result.compressed);
console.log(result.stats);
console.log(result.sourceMap);
```

## Install the VS Code Extension

Marketplace id:

```text
neolambo.glyph-compress
```

Install from VS Code or from the command line:

```powershell
code.cmd --install-extension neolambo.glyph-compress --force
code.cmd --list-extensions --show-versions | Select-String -Pattern 'neolambo.glyph-compress'
```

## Verify Release Alignment

```bash
npm view glyph-compress version dist-tags --json
npx @vscode/vsce show Neolambo.glyph-compress
gh release view v1.11.0 --json tagName,isDraft,isPrerelease,assets,url
```
