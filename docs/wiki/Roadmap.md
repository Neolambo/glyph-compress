# Roadmap
This page summarizes the current roadmap. The canonical roadmap is maintained in `ROADMAP.md` in the main repository.

## Current Stable Release

`v1.17.0`: MCP Server, Context Router Wiring & Real-Tokenizer Economics.

## Delivered in v1.17.0

- Shipped an MCP server (`npx glyph-compress-mcp`) exposing `compress_text`, `compress_file`, `route_context`, and `get_codebook` tools for Claude Code, Claude Desktop, and other MCP-compatible clients.
- Wired ranked workspace file selection into compression: `GlyphCompressor.routeAndCompress(query, options)` and CLI `glyph-compress route <query>` rank files by relevance and compress as many as fit inside a token budget, reporting selected/excluded files with score and reason.
- Fixed a word-boundary bug in diagnostic extraction (`HACK` matching inside "Hacker News") found while building the router.
- Extended tokenizer calibration to compare each `TECH_GLYPHS` entry against the actual word it replaces: found all 28 are a net token loss on real OpenAI tokenizers, and wired a measured cost table into the breakeven check so tech-name substitution never fires there when it would lose tokens.
- 16 suites total, all passing, including a real end-to-end MCP protocol smoke test.

## Delivered in v1.16.0

- Fixed a dynamic-dictionary symbol collision: the Greek/Cyrillic glyph pool overlapped reserved `TECH_GLYPHS` symbols (`α` was both "Agent" and the first dynamic-dictionary assignment). Dynamic entries are now unbounded `§N` indexed references.
- Fixed codebook completeness: the printed `TECH:` codebook line is now generated directly from `TECH_GLYPHS`, so it cannot drift out of sync (13/28 glyphs were previously undocumented, including Java, C#, Swift, Ruby, Angular, Svelte, Django, Rails, Express, FastAPI, MySQL, MongoDB, and "prompt").
- Fixed `getCodebookPrompt()` (the CLI's codebook source) to always include dynamic-dictionary `DYN:` definitions.
- Fixed dynamic-dictionary economics: a word must repeat at least twice and net out its own definition cost before counting as a saving.
- Added a net-negative fallback to `compressText()`, matching `compressMessages()`.
- Added automatic level selection (`level: 'auto'`, CLI `--level auto`, VS Code setting `"auto"`).
- Added tokenizer-calibrated glyph cost measurement (`npm run calibrate:tokenizer`) against real OpenAI tokenizers.
- Added `test/codebook-completeness.js`, `test/auto-level.js`, and `test/cache-prefix-stability.js` as permanent regression suites (13 suites total, all passing).

## Delivered in v1.14.0

- Attentional Decay Compaction (ADC) progressively compacts older chat history based on distance `d` into Active (d=0), Warm (d=1-3), Cold (d=4-6), and Deep Freeze (d>6) zones.
- Keeps 100% active prompt fidelity intact to avoid LLM instruction regression.
- Experimental `experimentalDecay` configuration added natively to VS Code configurations.
- CLI arguments `--decay` and `--experimental-decay` support attentional decay from shell runs.
- Unicode-aware language tag parsing handles minified language tags like `ʲˢ` cleanly in the cold zone.
- Added comprehensive unit tests validating the 4 progressive decay zones.

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

## Verified Through v1.14.0

- npm `latest` is `1.14.0`.
- GitHub release `v1.14.0` exists with `glyph-compress-1.14.0.vsix` attached.
- VS Code Marketplace lists `neolambo.glyph-compress`.
- `npm run benchmark` reports 1.4× aggregate ratio, 28% genuine savings, 100% fidelity, 0 hallucinated refs.
- `npm test` passes all integration and unit tests.

## Real Remaining Work

- Wire workspace-intelligence file ranking into normal compression calls behind an explicit option and token budget.
- Extend provider profiles to tune code block minification, context-router behavior, and provider-specific trust warnings.
- Add expression-level AST spans where language-specific parsers are available.
- Expand multilingual verbose phrase coverage to Spanish, Portuguese, and Japanese.
- Reduce the remaining manual release steps for commit, tag, publish, and GitHub release publication.
- Extend diagnostics beyond the current proxy status/error/completion logging into structured log sinks and timestamps.

## Proposed Future Versions

- `v1.18.0`: structured diagnostics and payload snapshots.
- `v1.19.0`: expression-level source maps.
- `v1.20.0`: provider trust and UX.
- `v1.21.0`: real task evaluation.
- `v1.22.0`: adaptive workspace memory.

## Longer-Term Ideas

- Glyph Negotiation Protocol.
- Context Budget Planner.
- Semantic Diff Compression.
- Team Codebook Registry.
- Real LLM comprehension tests across providers.
