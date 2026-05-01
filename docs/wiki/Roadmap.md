# Roadmap

This page summarizes the current roadmap. The canonical roadmap is maintained in `ROADMAP.md` in the main repository.

## Current Stable Release

`v1.11.0`: Doctor and Integration Refresh.

Delivered in `v1.11.0`:

- `glyph-compress doctor` validates installed extension version, local VS Code settings, Continue proxy configuration, and provider credentials when discoverable.
- Continue and Cursor proxy setup examples were refreshed for current Gemini-compatible configuration formats.
- Regression coverage now includes VS Code settings snapshots, README link snapshots, and compressed payload snapshots.

## Verified Through v1.11.0

- npm `latest` is `1.11.0`.
- GitHub release `v1.11.0` exists.
- GitHub release includes `glyph-compress-1.11.0.vsix`.
- VS Code Marketplace lists `neolambo.glyph-compress@1.11.0`.
- Local VS Code metadata verifies as `neolambo.glyph-compress@1.11.0`.
- `npm run check` should pass during release validation.

## Prepared Next Release

`v1.12.0`: Anthropic Hybrid Payloads and Realistic Benchmarks.

Prepared in `v1.12.0`:

- adaptive chat strategy selection with automatic fallback when a compressed payload is net-negative
- Anthropic first-turn lightweight system prompts plus structured cacheable blocks only for multi-turn transcripts
- realistic benchmark coverage for enterprise IDE workloads, throughput, and Anthropic cache-adjusted estimates

## Real Remaining Work

- Reduce the remaining manual release steps for commit, tag, publish, and GitHub release publication.
- Extend diagnostics beyond the current proxy status/error/completion logging into structured log sinks and timestamps.
- Extend provider profiles to tune code block minification, context-router behavior, and provider-specific trust warnings.
- Wire workspace-intelligence file ranking into normal compression calls.
- Add expression-level AST spans where language-specific parsers are available.
- Expand `doctor` beyond the current installed-extension, settings, Continue proxy, and credential checks.
- Polish broader IDE-specific walkthrough coverage beyond the current Continue/Cursor refresh.

## Proposed Future Versions

- `v1.13.0`: context router wiring.
- `v1.14.0`: structured diagnostics and payload snapshots.
- `v1.15.0`: expression-level source maps.
- `v1.16.0`: provider trust and UX.
- `v1.17.0`: real task evaluation.
- `v1.17.0`: adaptive workspace memory.

## Longer-Term Ideas

- Glyph Negotiation Protocol.
- Context Budget Planner.
- Semantic Diff Compression.
- Team Codebook Registry.
- Real LLM comprehension tests across providers.
