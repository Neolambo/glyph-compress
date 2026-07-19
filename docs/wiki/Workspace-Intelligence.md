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
- Per-file usage history (count, last-used timestamp) — see Adaptive Workspace Memory below
- Incremental build stats (`reused`/`rescanned`/`total` file counts)

## Adaptive Workspace Memory (v1.23.0)

Rebuilding the codebook is incremental by default: a file whose mtime hasn't changed since the last saved build reuses its previous symbols/imports/diagnostics instead of being re-parsed. Only changed files are rescanned. Pass `{ incremental: false }` to `buildWorkspaceCodebook()` to force a full rescan.

`GlyphCompressor.routeAndCompress(query, options)` ranks workspace files by relevance to a query and compresses as many as fit inside a token budget — and automatically records which files it actually selected via `recordFileUsage()`. Future ranking calls give a repeatedly-selected file a decaying relevance boost (14-day half-life, capped), so files that have proven useful in past sessions can surface again even for a query with no direct keyword match. This requires no setup: the first `routeAndCompress()` call on a workspace builds and persists the codebook itself if `inspect` was never run.

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

See the [Roadmap](Roadmap) page for what's next — currently real task evaluation across multiple LLM providers, blocked on maintainer-provided API keys.
