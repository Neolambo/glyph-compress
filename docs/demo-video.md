# GlyphCompress Demo Video

This demo asset is designed for outreach posts, GitHub, Product Hunt, Hacker News, LinkedIn, X/Twitter, and AI tooling communities.

## Current Asset

- **Video file: `assets/demo-video/glyphcompress-session-cost.mp4`**
- Cover image: `assets/demo-video/glyphcompress-session-cost-cover.png`
- Duration: 70 seconds, 6 scenes
- Format: 1920x1080 MP4, H.264, silent audio track
- Render with: `node scripts/render-demo-video.js`

Every figure on screen is a **token** count that a command in this repository prints, and each scene names the command that produces the number it shows. Nothing on screen is a character count.

**Published: https://youtu.be/mow1lKr6TKw**

### Superseded renders

The earlier cuts (`glyphcompress-demo-pro-75s.mp4`, `glyphcompress-demo-75s.mp4` and their cover) were removed from the working tree — they are 1.9 MB every clone had to download for files nobody should use, and git history still has them if one is ever needed. The script for the published one is kept below as the record of what that upload says.

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

## Scene Script (current asset)

The scenes are data at the top of `scripts/render-demo-video.js`; edit them there and re-render. Order is the argument, so it is worth stating why:

| # | Beat | On screen | Where the number comes from |
| --- | --- | --- | --- |
| 1 | **The Problem** | Turn 1 / 4 / 8 at 3,499 / 14,062 / 28,146 tokens | The raw column of the re-attachment session |
| 2 | **The Reframe** | "Making a file 25% smaller is worth 25% of it. Not sending it again is worth all of it." | — |
| 3 | **What Actually Pays** | -78.5% billed, -32.9% at 42 turns, 26% aggregate | `measure:differential`, `measure:cache`, `npm run benchmark` |
| 4 | **The Honest Part** | "We measured our own headline feature. It lost." | The tokenizer comparison that gated glyph substitution off |
| 5 | **Proof You Can Run** | 283,525 -> 57,472 sent, 167,547 -> 34,304 billed | `npx glyph-compress measure` on this repository's own compressor |
| 6 | **Where It Runs** | CLI, VS Code, MCP, proxy, licence | — |

Scene 4 is the one that matters. Nothing else in the category admits that the technique in its own name was measured and lost, and it is what makes the numbers in scenes 3 and 5 worth believing.

## Archived Script (previous cut, as published)

> The section below describes the video currently on YouTube. It is kept verbatim as the record of what that upload says — editing it would make this file describe a video that does not exist. Do not derive new copy from it.

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
## Why The Cut Changed

The published video and the script above are kept as a record. This section is the current framing, and it is what any new copy should be derived from.

### What the previous cut got wrong

The demo leads on glyph substitution, and closes on "12.7x compression, 92% saved". Both of those are now the wrong emphasis:

- The numbers are **characters**, from the most favourable fixture in the set. Measured in real BPE tokens against provider tokenizers, glyph substitution *costs* 5.8 to 10.5 percentage points on real files. It is gated off by default.
- The savings that survived measurement come from somewhere else entirely: **not re-sending a file the model already has** (−78.5% billed over ten turns), and **placing the provider cache breakpoint where it actually covers the request** (−32.9% at 42 turns). Neither compresses anything.

A viewer who watches the current cut and installs the tool may see it decline to compress a short prompt and conclude it is broken. It is not — that is the never-inflate guard doing its job — but the video sets an expectation the tool deliberately does not meet.

### Published Metadata

What was used for the upload, kept so a re-upload or a second platform starts from the same copy:

| Field | Value |
| --- | --- |
| `title` | GlyphCompress — stop paying to re-send the same file to your LLM |
| `categoryId` | `28` (Science & Technology) |
| `privacyStatus` | `unlisted` first, then `public` once the frames have been checked on the platform |
| `tags` | `llm`, `tokens`, `openai`, `anthropic`, `prompt caching`, `developer tools`, `vscode`, `mcp`, `cli`, `cost optimization` |
| `videoFilePath` | `assets/demo-video/glyphcompress-session-cost.mp4` |

`description`:

```text
Your IDE re-sends the same open files to the model on every turn, and you are billed for them every time. GlyphCompress cuts what a coding session actually costs, measured against real provider tokenizers rather than character counts.

The two biggest wins compress nothing at all: transmitting a re-attached file once instead of ten times (-78.5% billed over ten turns), and putting the provider cache breakpoint where it actually covers the request (-32.9% at 42 turns). Compressing the content itself is a third, smaller effect at 26%.

We also measured the glyph encoding this project is named after. It cost tokens instead of saving them, so it is off by default.

Don't take our number. Run it on your own code:
  npx glyph-compress measure src/your-biggest-file.ts --turns 10

GitHub: https://github.com/Neolambo/glyph-compress
Releases: https://github.com/Neolambo/glyph-compress/releases
npm: https://www.npmjs.com/package/glyph-compress
VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=neolambo.glyph-compress
```

**The Composio route does not work for this upload, and the reason is worth recording.**

Tried end to end with a valid API key. OAuth connects and the channel becomes visible — `YOUTUBE_LIST_USER_PLAYLISTS` succeeds against `@dcorrendo77`. The upload then fails, and not for any of the reasons that first appear:

1. The first attempt returned HTTP 401 with a message about channel verification. The real cause was `channelNotFound`: the Google account that granted consent did not own the channel. Consent from the owning account fixes that — if the channel is a Brand Account, it must be picked explicitly in Google's account chooser.
2. With the right account connected, the upload fails with `[Errno 2] No such file or directory`. `videoFilePath` is declared as a plain string — no `file_uploadable` flag — and the tool opens that path on **Composio's own executor**, not on the machine holding the file.

Every workaround was tried and rejected on evidence: a public URL (the raw GitHub URL of the file in this repository) is treated as a literal path and fails; uploading the file to Composio's own presigned store via `POST /api/v3/files/upload/request` succeeds (HTTP 200, 920,309 bytes), but neither the returned S3 key, nor an `s3://` form, nor a file-reference object is accepted — the object form is rejected by the schema, the string forms by the filesystem.

**So the upload is manual.** The metadata above is written out precisely so that dragging the file into the YouTube web uploader and pasting the fields is a two-minute job. An earlier version of this note claimed the URL form worked; that was inferred from a run whose 401 fired before the file was ever read, and it was wrong.

**A caveat if the Composio route is used:** `YOUTUBE_UPLOAD_VIDEO` takes `videoFilePath` as a path local to the *executing* environment. A path on a developer machine is not visible to a hosted runner, so the file has to be reachable from wherever the tool actually runs. Confirm that before assuming the API route is less work than dragging the file into the web uploader.

### The beats, and why they are in this order

The honest story is stronger material than the old one, which is why this was an opportunity rather than damage control:

1. **The problem, felt.** A session counter climbing while the developer types nothing new. Turn 10 is not one message; it is the whole conversation, re-uploaded.
2. **The reframe.** "Everyone optimises the compression ratio. The compression ratio is not the bill."
3. **The honest turn — the strongest beat.** We measured the technique in our own name. It lost. It is off by default. Nothing else in the category says this.
4. **The proof the viewer can run.** `npx glyph-compress measure <their file>`, showing sent and billed as two separate columns, and admitting they can disagree.
5. **Close.** CLI, VS Code, MCP server, zero-config proxy.

Two rules for whoever writes it: quote token counts, never character counts; and never state a figure that no command in the repository prints.
