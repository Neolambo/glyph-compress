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

- npm package metadata is aligned to `1.9.3`.
- GitHub release target is `v1.9.3`.
- GitHub release target includes `glyph-compress-1.9.3.vsix`.
- VS Code Marketplace publishing requires completing `vsce publish` with the Neolambo publisher PAT.
- Local VS Code metadata verifies as `neolambo.glyph-compress@1.9.3`.
- `npm run check` should pass during release validation.

## Real Remaining Work

- Automate release consistency checks.
- Automate Marketplace post-release verification.
- Add README badge, deleted-link, VS Code settings, and compressed payload regression fixtures.
- Extend provider profiles to tune code block minification, context-router behavior, and provider-specific trust warnings.
- Wire workspace-intelligence file ranking into normal compression calls.
- Add expression-level AST spans where language-specific parsers are available.
- Expand `doctor` to validate installed extension version, proxy config, provider credentials, local VS Code settings, and Marketplace-visible extension id/version.

## Longer-Term Ideas

- Glyph Negotiation Protocol.
- Context Budget Planner.
- Semantic Diff Compression.
- Team Codebook Registry.
- Real LLM comprehension tests across providers.
