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

## Longer-Term Ideas

- Glyph Negotiation Protocol.
- Context Budget Planner.
- Semantic Diff Compression.
- Team Codebook Registry.
- Real LLM comprehension tests across providers.
