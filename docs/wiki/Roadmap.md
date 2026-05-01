# Roadmap

This page summarizes the current roadmap. The canonical roadmap is maintained in `ROADMAP.md` in the main repository.

## Current Stable Release

`v1.9.3`: Proxy Diagnostics Hotfix.

Delivered in `v1.9.3`:

- Provider/trust/privacy-aware CLI proxy startup.
- Provider/trust-aware VS Code proxy startup.
- Gemini-compatible `/v1/*` to `/v1beta/openai/*` route mapping.
- ESM middleware export through `src/glyph-middleware.js`.
- Focused npm package allowlist for runtime files and essential docs.
- Upstream status, redacted error-body, response-completion, and early client-close proxy diagnostics.

## Verified Through v1.9.3

- npm `latest` is `1.9.3`.
- GitHub release `v1.9.3` exists.
- GitHub release includes `glyph-compress-1.9.3.vsix`.
- VS Code Marketplace lists `neolambo.glyph-compress@1.9.3`.
- Local VS Code metadata verifies as `neolambo.glyph-compress@1.9.3`.
- `npm run check` should pass during release validation.

## Real Remaining Work

- Automate release consistency checks.
- Automate Marketplace post-release verification.
- Extend diagnostics beyond the current proxy status/error/completion logging into structured log sinks and timestamps.
- Add README badge, deleted-link, VS Code settings, and compressed payload regression fixtures.
- Extend provider profiles to tune code block minification, context-router behavior, and provider-specific trust warnings.
- Wire workspace-intelligence file ranking into normal compression calls.
- Add expression-level AST spans where language-specific parsers are available.
- Expand `doctor` to validate installed extension version, proxy config, provider credentials, local VS Code settings, and Marketplace-visible extension id/version.
- Refresh Continue/Cursor proxy examples to match current configuration formats.

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
