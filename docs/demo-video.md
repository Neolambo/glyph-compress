# GlyphCompress 75-Second Demo Video

This demo asset is designed for outreach posts, GitHub, Product Hunt, Hacker News, LinkedIn, X/Twitter, and AI tooling communities.

> [!IMPORTANT]
> **The rendered video and the script below describe the project's earlier positioning and have not been re-recorded.**
>
> They lead on glyph substitution and quote "12.7x compression, 92% saved" — a **character** count, and a measurement of the one technique that real tokenizers later showed to be a net cost. That technique is now gated off by default, and the README leads on what a session is *billed* instead.
>
> The script is kept as the record of what the published video actually says, so nobody re-derives copy from it by mistake. **[Positioning for a re-record](#positioning-for-a-re-record)** at the end of this file carries the current framing, including title and description text that can be updated on the existing upload without re-rendering anything.

## Rendered Asset

- Video file: `assets/demo-video/glyphcompress-demo-pro-75s.mp4`
- Cover image: `assets/demo-video/glyphcompress-demo-pro-cover.png`
- Duration: 75 seconds
- Format: 1920x1080 MP4, H.264, silent audio track
- Focus: installation plus one useful workflow using CLI compression, source maps, trust policies, VS Code, and proxy integration

The repository also keeps the first simple render at `assets/demo-video/glyphcompress-demo-75s.mp4`; use the `pro` version for public outreach.

## Render Command

The renderer uses a local or temporary ffmpeg binary. If `ffmpeg` is not installed globally, install the temporary renderer without saving it to package dependencies:

```powershell
$env:npm_config_package_lock='false'
npm install --no-save @ffmpeg-installer/ffmpeg
node scripts/render-demo-video.js
```

## Optional Nano Banana Key Visual Prompt

Nano Banana and fal.ai MCP servers are configured in the VS Code user profile. For the full professional video prompt, model guidance, and runtime instructions, see `docs/professional-video-mcp-brief.md`.

If a Nano Banana MCP image-generation tool is available in your local VS Code setup, use this prompt to create a more cinematic first-frame background or social preview. Save the generated image as `assets/demo-video/nano-banana-key-visual.png` and use it as a launch thumbnail or as a future renderer background.

```text
Create a professional 16:9 launch key visual for GlyphCompress, a developer tool for semantic compression of IDE-to-LLM context. Style: premium AI infrastructure product, clean dark interface, subtle code editor panels, compact glowing glyph tokens flowing into an LLM context window, readable product title "GlyphCompress", small subtitle "Semantic compression for AI coding tools", accents in green, cyan, and warm amber, no clutter, no fake logos, no tiny illegible UI text, suitable for GitHub, Product Hunt, Hacker News, LinkedIn, and YouTube thumbnail.
```

Do not claim this key visual is a real product screenshot; label it as launch artwork when used publicly.

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
- Benchmark callouts: 12.7x compression, 92% saved, 0 hallucinated refs in benchmark. **(As published. Those first two are character counts of a best-case fixture, not token savings — see the note at the top of this file.)**

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
## Positioning For A Re-record

The published video and the script above are kept as a record. This section is the current framing, and it is what any new copy should be derived from.

### What changed, and why the old cut no longer represents the tool

The demo leads on glyph substitution, and closes on "12.7x compression, 92% saved". Both of those are now the wrong emphasis:

- The numbers are **characters**, from the most favourable fixture in the set. Measured in real BPE tokens against provider tokenizers, glyph substitution *costs* 5.8 to 10.5 percentage points on real files. It is gated off by default.
- The savings that survived measurement come from somewhere else entirely: **not re-sending a file the model already has** (−78.5% billed over ten turns), and **placing the provider cache breakpoint where it actually covers the request** (−32.9% at 42 turns). Neither compresses anything.

A viewer who watches the current cut and installs the tool may see it decline to compress a short prompt and conclude it is broken. It is not — that is the never-inflate guard doing its job — but the video sets an expectation the tool deliberately does not meet.

### The cheap fix, no re-render required

Title and description live on the upload and can be corrected today. Suggested replacements:

**Title**

```text
GlyphCompress — stop paying to re-send the same file to your LLM
```

**Description**

```text
Your IDE re-sends the same open files to the model on every turn, and you are billed for them every time. GlyphCompress cuts what a coding session actually costs — measured against real provider tokenizers, not character counts.

The two biggest wins compress nothing at all: transmitting a re-attached file once instead of ten times, and putting the provider cache breakpoint where it actually covers the request. Content compression is a third, smaller effect.

Don't take the number on faith — run it on your own code:
  npx glyph-compress measure src/your-biggest-file.ts

Note: this video predates the tokenizer measurements described above. It leads on the glyph encoding in the project's name, which was measured against real tokenizers, turned out to cost tokens rather than save them, and is now off by default. The README has the current numbers and the commands that reproduce them.

GitHub: https://github.com/Neolambo/glyph-compress
Releases: https://github.com/Neolambo/glyph-compress/releases
npm: https://www.npmjs.com/package/glyph-compress
VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=neolambo.glyph-compress
```

### If and when it is re-recorded

The new story is stronger material than the old one, so this is an opportunity rather than damage control. Beats, in order:

1. **The problem, felt.** A session counter climbing while the developer types nothing new. Turn 10 is not one message; it is the whole conversation, re-uploaded.
2. **The reframe.** "Everyone optimises the compression ratio. The compression ratio is not the bill."
3. **The honest turn — the strongest beat.** We measured the technique in our own name. It lost. It is off by default. Nothing else in the category says this.
4. **The proof the viewer can run.** `npx glyph-compress measure <their file>`, showing sent and billed as two separate columns, and admitting they can disagree.
5. **Close.** CLI, VS Code, MCP server, zero-config proxy.

Two rules for whoever writes it: quote token counts, never character counts; and never state a figure that no command in the repository prints.
