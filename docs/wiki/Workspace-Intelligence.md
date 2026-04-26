# Workspace Intelligence

Workspace intelligence helps GlyphCompress understand a repository before compression.

## Inspect a Repository

```bash
npx glyph-compress inspect "fix authentication error"
```

This writes:

```text
.glyphcompress/codebook.json
```

## JSON Output

```bash
npx glyph-compress inspect "review staged diff" --json
```

## What the Codebook Contains

- Files
- Symbols
- Imports
- Diagnostics
- Ownership hints
- Git context
- Intent classification
- Relevant file rankings

## Supported Intents

GlyphCompress detects common workflows including:

- Fix error
- Review diff
- Implement feature
- Explain architecture
- Write tests
- Optimize performance

## Doctor Command

```bash
npx glyph-compress doctor
npx glyph-compress doctor --json
```

`doctor` validates repository readiness for GlyphCompress workflows. Future work includes validating proxy config, VS Code settings, installed extension version, provider credentials, and Marketplace-visible extension id/version.

## Roadmap

The next major workspace goal is wiring ranked context selection directly into normal compression calls behind an explicit option and token budget.
