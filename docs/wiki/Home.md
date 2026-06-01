# Welcome to the glyph-compress wiki!

GlyphCompress is a semantic compression layer for IDE-to-LLM communication. It compresses repeated developer prompts, file paths, diagnostics, code blocks, provider payloads, and workspace metadata so coding assistants can receive richer context with fewer tokens.

Current stable release: `v1.13.0`.

## What GlyphCompress Does

- Compresses verbose IDE and repository context into compact semantic glyph payloads.
- Injects a shared codebook so LLMs can decode compressed context back into normal development meaning.
- Supports CLI usage, library usage, OpenAI and Anthropic wrappers, VS Code commands, and an OpenAI-compatible local proxy.
- Emits source maps for inspection, audit, and reversible references.
- Provides explicit trust policies: `lossless`, `reversible`, `privacy`, and `lossy`.
- Strips multilingual filler phrases (English, Italian, German, French) for international developer workflows.

## Release Status

- npm: `glyph-compress@1.13.0`
- GitHub release: `v1.13.0`
- VS Code Marketplace id: `neolambo.glyph-compress`
- VSIX artifact: `glyph-compress-1.13.0.vsix`
- Marketplace verification: `npx @vscode/vsce show Neolambo.glyph-compress`

### v1.13.0 Highlights (Cross-Session Dictionary Caching)

- Cross-session dictionary caching persists dynamicDict and fileIndex on disk under `~/.glyphcompress/cache/<sha256>.json` to enable instant warm-starts.
- Isolated caching keying computes SHA-256 hashes of workspace paths and working directories.
- Auto-save cache triggers inside successful `compressText` and `compressMessages` executions.
- ESM and CommonJS middleware compilation synchronization with full public profile and trust policy exports.
- Passing 51/51 automated integration and snapshot tests.

### v1.12.0 Highlights (Performance Engine Overhaul)

- Codebook-skip threshold eliminates negative compression on short requests.
- Unicode token accuracy with 1.5× penalty per non-ASCII glyph.
- Per-glyph breakeven checks for tech name and dynamic dictionary substitutions.
- Multilingual verbose phrase compression (EN/IT/DE/FR).
- ~70% latency reduction from eliminating JSON.parse/stringify state cloning.
- Source map entries capped at 500 to prevent unbounded memory growth.
- Benchmark: 1.4× aggregate ratio, 28% genuine savings, 100% fidelity, 0 hallucinated refs.

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
