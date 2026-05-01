# Welcome to the glyph-compress wiki!

GlyphCompress is a semantic compression layer for IDE-to-LLM communication. It compresses repeated developer prompts, file paths, diagnostics, code blocks, provider payloads, and workspace metadata so coding assistants can receive richer context with fewer tokens.

Current stable release: `v1.10.0`.

## What GlyphCompress Does

- Compresses verbose IDE and repository context into compact semantic glyph payloads.
- Injects a shared codebook so LLMs can decode compressed context back into normal development meaning.
- Supports CLI usage, library usage, OpenAI and Anthropic wrappers, VS Code commands, and an OpenAI-compatible local proxy.
- Emits source maps for inspection, audit, and reversible references.
- Provides explicit trust policies: `lossless`, `reversible`, `privacy`, and `lossy`.

## Release Status

- npm: `glyph-compress@1.10.0`
- GitHub release: `v1.10.0`
- VS Code Marketplace id: `neolambo.glyph-compress`
- VSIX artifact: `glyph-compress-1.10.0.vsix`
- Marketplace verification: `npx @vscode/vsce show Neolambo.glyph-compress`

## Start Here

- [[Quick Start]]
- [[Command Line CLI]]
- [[VS Code Extension]]
- [[Safe Compression Trust Policies]]
- [[Source Maps]]
- [[Workspace Intelligence]]
- [[Proxy Integration]]
- [[Release and Distribution]]
- [[Licensing and Commercial Use]]
- [[Roadmap]]
