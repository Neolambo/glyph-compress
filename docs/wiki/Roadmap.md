# Roadmap

This page summarizes the current roadmap. The canonical roadmap is maintained in `ROADMAP.md` in the main repository.

## Current Stable Release

`v1.8.0`: Safe Compression Trust Policies.

Delivered in `v1.8.0`:

- `lossless`, `reversible`, `privacy`, and `lossy` trust policies.
- `sourceMap.trustPolicy` and `sourceMap.trust` metadata.
- Policy gates for prompt, tech, file, diagnostic, dynamic dictionary, privacy, code minification, code summary, and redundancy stripping transformations.
- CLI `--trust <policy>` and `--policy <policy>`.
- VS Code `glyphCompress.trustPolicy` setting.
- `TRUST_POLICY_PROFILES` and `TrustPolicyProfile` public exports.

## Verified Through v1.8.0

- npm latest is `1.8.0`.
- GitHub release `v1.8.0` exists.
- GitHub release includes `glyph-compress-1.8.0.vsix`.
- VS Code Marketplace lists `Neolambo.glyph-compress` at `1.8.0`.
- Local VS Code install verified as `neolambo.glyph-compress@1.8.0`.
- `npm run check` passed during release validation.

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
