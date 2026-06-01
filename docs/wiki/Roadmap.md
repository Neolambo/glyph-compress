# Roadmap
This page summarizes the current roadmap. The canonical roadmap is maintained in `ROADMAP.md` in the main repository.

## Current Stable Release

`v1.13.0`: Cross-Session Dictionary Caching.

Delivered in `v1.13.0`:

- Cross-session dictionary caching persists dynamicDict and fileIndex on disk under `~/.glyphcompress/cache/<sha256>.json` to enable instant warm-starts.
- Isolated caching keying computes SHA-256 hashes of workspace paths and working directories.
- Auto-save cache triggers inside successful `compressText` and `compressMessages` executions.
- ESM and CommonJS middleware compilation synchronization with full public profile and trust policy exports.
- Passing 51/51 automated integration and snapshot tests.

Delivered in `v1.12.0`:

- Codebook-skip threshold: skip the ~400-token protocol header when text-level savings are below 80 tokens.
- Unicode token cost accuracy with 1.5× penalty per non-ASCII glyph across all token-estimator variants.
- Per-glyph breakeven checks for tech name and dynamic dictionary substitutions.
- Multilingual verbose phrase compression for English, Italian, German, and French filler/polite patterns.
- Eliminated all `JSON.parse(JSON.stringify())` state cloning (~70% latency reduction).
- Source map `replacements` capped at 500 entries to prevent unbounded memory growth.
- Cached compiled regexes for tech names, dynamic dictionary words, and file paths.
- Expanded file path regex for `@scoped/package`, Windows backslashes, and 10+ new extensions.
- Adaptive chat strategy selection with automatic fallback when a compressed payload is net-negative.
- Anthropic hybrid wrapper: first-turn lightweight, multi-turn structured cacheable blocks.
- ESM and CJS middleware are fully synchronized.

## Verified Through v1.13.0

- npm `latest` is `1.13.0`.
- GitHub release `v1.13.0` exists with `glyph-compress-1.13.0.vsix` attached.
- VS Code Marketplace lists `neolambo.glyph-compress`.
- `npm run benchmark` reports 1.4× aggregate ratio, 28% genuine savings, 100% fidelity, 0 hallucinated refs.
- `npm test` passes 51/51 integration tests.

## Real Remaining Work

- Wire workspace-intelligence file ranking into normal compression calls behind an explicit option and token budget.
- Extend provider profiles to tune code block minification, context-router behavior, and provider-specific trust warnings.
- Add expression-level AST spans where language-specific parsers are available.
- Expand multilingual verbose phrase coverage to Spanish, Portuguese, and Japanese.
- Reduce the remaining manual release steps for commit, tag, publish, and GitHub release publication.
- Extend diagnostics beyond the current proxy status/error/completion logging into structured log sinks and timestamps.

## Proposed Future Versions

- `v1.14.0`: context router wiring.
- `v1.15.0`: structured diagnostics and payload snapshots.
- `v1.16.0`: expression-level source maps.
- `v1.17.0`: provider trust and UX.
- `v1.18.0`: real task evaluation.
- `v1.19.0`: adaptive workspace memory.

## Longer-Term Ideas

- Glyph Negotiation Protocol.
- Context Budget Planner.
- Semantic Diff Compression.
- Team Codebook Registry.
- Real LLM comprehension tests across providers.
