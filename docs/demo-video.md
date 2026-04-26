# GlyphCompress 75-Second Demo Video

This demo asset is designed for outreach posts, GitHub, Product Hunt, Hacker News, LinkedIn, X/Twitter, and AI tooling communities.

## Rendered Asset

- Video file: `assets/demo-video/glyphcompress-demo-75s.mp4`
- Duration: 75 seconds
- Format: 1920x1080 MP4, H.264, silent audio track
- Focus: installation plus one useful workflow using CLI compression, source maps, trust policies, VS Code, and proxy integration

## Render Command

The renderer uses a local or temporary ffmpeg binary. If `ffmpeg` is not installed globally, install the temporary renderer without saving it to package dependencies:

```powershell
$env:npm_config_package_lock='false'
npm install --no-save @ffmpeg-installer/ffmpeg
node scripts/render-demo-video.js
```

## Timeline And Voiceover

### 0:00-0:08 - Opening

Voiceover:

> This is GlyphCompress: semantic compression for IDE-to-LLM context. It helps coding agents send richer context while spending fewer tokens.

Visual:

- GlyphCompress title.
- CLI, npm, VS Code Marketplace, local proxy.
- Source maps, privacy redaction, provider profiles, trust policies.

### 0:08-0:19 - Installation

Voiceover:

> You can try it immediately with npx. Start with help, then compress a real project file with provider-aware and reversible settings.

Visual command:

```powershell
npx glyph-compress --help
npx glyph-compress README.md --level ultra --provider openai --trust reversible --explain
```

### 0:19-0:31 - Useful Workflow

Voiceover:

> The useful workflow is simple: take repeated project context, diagnostics, file paths, and identifiers, then turn them into compact semantic payloads the model can decode with the shared codebook.

Visual:

- Original context: README, diagnostics, file refs, repeated identifiers.
- Compressed context: shared glyph codebook plus compact semantic payload.
- Benchmark callouts: 12.7x compression, 92% saved, 0 hallucinated refs in benchmark.

### 0:31-0:43 - Auditability

Voiceover:

> For safer workflows, reversible mode blocks risky code minification and emits source-map metadata, so downstream tools can inspect what changed.

Visual command:

```powershell
npx glyph-compress src/app.ts --provider anthropic --trust reversible --source-map
```

### 0:43-0:54 - VS Code Extension

Voiceover:

> Inside VS Code, install the Marketplace extension and use commands like Ask LLM, Compress Selection, or Compress Entire Workspace.

Visual:

- Extension id: `neolambo.glyph-compress`
- Command: `GlyphCompress: Ask LLM (Auto-Compress)`
- Command: `GlyphCompress: Compress Entire Workspace`
- Setting: `glyphCompress.trustPolicy = reversible`

### 0:54-1:04 - Proxy Workflow

Voiceover:

> For tools that support OpenAI-compatible endpoints, the local proxy can compress outgoing context automatically.

Visual command:

```powershell
npx glyph-compress --proxy 8080
```

### 1:04-1:15 - Call To Action

Voiceover:

> GlyphCompress v1.8.0 is published on npm, GitHub, and the VS Code Marketplace. Try it, benchmark it, and challenge the trust model.

Visual:

- `github.com/Neolambo/glyph-compress`
- `github.com/Neolambo/glyph-compress/wiki`
- `github.com/Neolambo/glyph-compress/issues/1`

## Suggested Post Caption

```text
GlyphCompress v1.8.0 demo: semantic compression for IDE-to-LLM context.

Install with npx, compress a real project file, inspect source maps, choose explicit trust policies, and use it from CLI, VS Code, or an OpenAI-compatible local proxy.

GitHub: https://github.com/Neolambo/glyph-compress
Wiki: https://github.com/Neolambo/glyph-compress/wiki
Feedback: https://github.com/Neolambo/glyph-compress/issues/1
```