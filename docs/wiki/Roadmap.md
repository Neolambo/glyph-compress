# Roadmap

This page summarizes the current roadmap. The canonical roadmap is maintained in `ROADMAP.md` in the main repository.

## Current Stable Release

`v1.9.0`: Proxy and Packaging Hardening.

Delivered in `v1.9.0`:

- Provider/trust/privacy-aware CLI proxy startup.
- Provider/trust-aware VS Code proxy startup.
- Gemini-compatible `/v1/*` to `/v1beta/openai/*` route mapping.
- ESM middleware export through `src/glyph-middleware.js`.
- Focused npm package allowlist for runtime files and essential docs.

## Verified Through v1.9.0

- npm latest is `1.9.0` after publish.
- GitHub release `v1.9.0` exists after publish.
- GitHub release includes `glyph-compress-1.9.0.vsix`.
- VS Code Marketplace should list `Neolambo.glyph-compress` at `1.9.0` after publish.
- Local VS Code install should verify as `neolambo.glyph-compress@1.9.0` after install.
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
