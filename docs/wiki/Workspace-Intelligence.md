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

`GlyphCompressor.routeAndCompress(query, options)` ranks workspace files by relevance to a query and compresses as many as fit inside a token budget — and automatically records which files it actually selected via `recordFileUsage()`. Future ranking calls give a repeatedly-selected file a decaying relevance boost (14-day half-life, capped). This requires no setup: the first `routeAndCompress()` call on a workspace builds and persists the codebook itself if `inspect` was never run.

**The boost breaks ties; it cannot create relevance.** It applies only to files that already matched the query, and a file matching nothing can never be lifted into the results by it. Until v1.33.3 it could, and that was unsound: `routeAndCompress()` records usage for everything it selects while *nothing* records whether the selection was any good, so the boost fed on the router's own output. Measured on this repository, `examples/test-dashboard.tsx` reached a usage count of 318 and won the query *"dashboard escapeHtml crashes"* on one generic path match, beating `src/dashboard.js`, which matched the rare term.

### How a file is scored

A term is worth more where it is stronger evidence, rather than the same everywhere:

| Where the term matched | Points | What it means |
| --- | --- | --- |
| A symbol defined in the file | 5 | The file implements it |
| The file's path or owner | 3 | The file is *named* after it — often a test, script or doc |
| An import | 2 | The file is a caller |

The strongest field wins rather than the fields summing, so a symbol whose name also appears in the path is not counted twice for saying one thing. Generated bundles (a `.cjs` beside a same-named `.js`, or any `.cjs` opening with a bundler's helper preamble) are excluded from the index entirely: they duplicate their source, split the evidence for a topic, and spend the token budget on minified code the user cannot edit.

Retrieval on six queries with unambiguous answers, measured on this repository with a clean tree and no usage history: **5/6**. Reproduce with `npm run measure:routing -- --verbose`.

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
