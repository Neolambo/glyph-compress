# Roadmap

This page summarizes the current roadmap. The canonical roadmap is maintained in `ROADMAP.md` in the main repository.

## Current Stable Release

`v1.10.0`: Release Automation Foundation.

Delivered in `v1.10.0`:

- Root release helper with version checks, validation, packaging, and exact next-step commands.
- Marketplace verification through the helper and post-release CI workflow.
- Structured release-note scaffolding from repository history.

## Verified Through v1.10.0

- npm `latest` is `1.10.0`.
- GitHub release `v1.10.0` exists.
- GitHub release includes `glyph-compress-1.10.0.vsix`.
- VS Code Marketplace lists `neolambo.glyph-compress@1.10.0`.
- Local VS Code metadata verifies as `neolambo.glyph-compress@1.10.0`.
- `npm run check` should pass during release validation.

## Real Remaining Work

- Reduce the remaining manual release steps for commit, tag, publish, and GitHub release publication.
- Extend diagnostics beyond the current proxy status/error/completion logging into structured log sinks and timestamps.
- Add stable compressed payload regression fixtures.
- Extend provider profiles to tune code block minification, context-router behavior, and provider-specific trust warnings.
- Wire workspace-intelligence file ranking into normal compression calls.
- Add expression-level AST spans where language-specific parsers are available.
- Expand `doctor` beyond the current installed-extension, settings, Continue proxy, and credential checks.
- Polish broader IDE-specific walkthrough coverage beyond the current Continue/Cursor refresh.

## Proposed Future Versions

- `v1.10.0`: release automation foundation.
- `v1.11.0`: doctor and integration refresh.
- `v1.12.0`: context router wiring.
- `v1.13.0`: structured diagnostics and payload snapshots.
- `v1.14.0`: expression-level source maps.
- `v1.15.0`: provider trust and UX.
- `v1.16.0`: real task evaluation.
- `v1.17.0`: adaptive workspace memory.

## Longer-Term Ideas

- Glyph Negotiation Protocol.
- Context Budget Planner.
- Semantic Diff Compression.
- Team Codebook Registry.
- Real LLM comprehension tests across providers.
