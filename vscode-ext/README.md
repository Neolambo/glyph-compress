# GlyphCompress — Cut Your LLM Token Bill

**Your IDE re-sends the same open files to the model on every turn, and you pay for them every time.**

GlyphCompress cuts what a coding session is actually **billed** — measured against real provider tokenizers (OpenAI's `cl100k_base`/`o200k_base`), never a character count. It works on four fronts, and the two largest **compress nothing at all**: it stops re-transmitting files the model already has (**−78.5% billed** over ten turns), places provider cache breakpoints where they genuinely cover the request, compresses the content that does need sending (**26%** aggregate), and condenses old turns once they stop earning their keep.

> **We measured the glyph encoding this project is named after, and it lost.** Against real tokenizers it *costs* tokens on real files instead of saving them, so it is off by default — held there by a rule that refuses any transformation that would send more tokens than it received.

Don't take those numbers on faith. Get your own, from your own code:

```bash
npx glyph-compress measure src/your-biggest-file.ts --turns 10
```

## What this extension does

- **Compress Selection**: compress the currently selected text/code and copy the result to your clipboard.
- **Ask LLM (Auto-Compress)**: automatically compress context before it reaches VS Code's built-in Language Model API (Copilot Chat and compatible extensions), with zero manual steps.
- **Zero-Command Transparent Proxy**: a local proxy that sits between your IDE (Cursor, Continue, Cline, and other OpenAI/Anthropic/Gemini-compatible tools) and the real provider API, compressing every request automatically. Point your IDE's API base URL at `http://localhost:8080`, then see the two setup notes below.
- **Build Project Codebook**: scan your workspace to rank files by relevance to a task and build a persistent index used by the Context Router.
- **Compress Entire Workspace**: batch-compress every open/relevant file at once.
- **Show Compression Stats** / status bar: live token-savings numbers for your current session.

## Using the proxy: two things that are easy to miss

**Start it first.** Nothing is compressed until the proxy is listening, and clients do not say so helpfully — Continue reports a bare `Connection error`. Run **GlyphCompress: Start Zero-Command Proxy** from the Command Palette, then check:

```
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/stats
```

`200` means it is up; `000` means nothing is listening. Starting it from the palette (rather than a terminal) is also what makes **Show Compression Stats** move — a terminal-started proxy keeps a separate counter and reports to `http://localhost:8080/dashboard` instead.

**One proxy forwards to one upstream.** `glyphCompress.targetApiUrl` picks it. If your client lists both an OpenAI model and a Gemini model against `localhost:8080`, only the family matching the current target will work, and the other fails with an upstream error that looks like a credential problem. Your client's own `provider` field should stay `openai` regardless — it describes the format spoken to the proxy, not the company at the far end.

## Providers and trust policies

Works with **OpenAI**, **Anthropic Claude**, **Gemini**, and **Antigravity** — each has its own compression profile, calibrated separately since tokenizers behave differently across providers.

Trust policies control what compression is allowed to do to your data:

| Policy | Reversible | What it allows |
|---|---|---|
| `lossless` | Yes | No lossy transforms at all |
| `reversible` | Yes | Prompt patterns, tech names, file paths, diagnostics, dynamic dictionary |
| `privacy` | Yes | Everything in `reversible`, plus redaction of API keys, tokens, emails, and IPs before compression |
| `lossy` | No | Everything, including code minification, structural summaries, and redundancy stripping |

When a level/policy combination allows something irreversible (like `ultra`-level code summarization), the extension surfaces a plain-language trust warning in its output channel — derived directly from what that policy actually permits, not a guess about how the model will behave.

## Settings

| Setting | Default | Purpose |
|---|---|---|
| `glyphCompress.enabled` | `true` | Enable/disable compression |
| `glyphCompress.provider` | `auto` | `auto`, `raw`, `openai`, `anthropic`, `antigravity`, `gemini`, `local` |
| `glyphCompress.compressionLevel` | `standard` | `light`, `standard`, `aggressive`, `ultra`, `auto` (auto picks per request) |
| `glyphCompress.trustPolicy` | `auto` | `lossless`, `reversible`, `privacy`, `lossy` |
| `glyphCompress.targetApiUrl` | `https://api.openai.com` | Upstream API the proxy forwards to |
| `glyphCompress.showStatusBar` | `true` | Show live compression stats in the status bar |
| `glyphCompress.experimentalDecay` | `false` | Progressively compact older chat history for long-running conversations |
| `glyphCompress.holographicFolding` | `false` | Group overlapping related files and shared imports into layered blocks |
| `glyphCompress.intentDiffs` | `false` | Condense verbose diffs into short, declarative change-action lines |

## Also available as

- **CLI**: `npx glyph-compress <file>` — same engine, usable outside VS Code, plus `route`/`team-codebook`/`inspect`/`doctor` commands.
- **MCP server**: `npx glyph-compress-mcp` — use GlyphCompress from Claude Code, Claude Desktop, or any other MCP-compatible client.
- **Library**: `npm install glyph-compress` for direct `GlyphCompressor`/`wrapOpenAI`/`wrapAnthropic` usage in your own code.

## Links

- [Full documentation, benchmarks, and architecture](https://github.com/Neolambo/glyph-compress#readme)
- [Roadmap](https://github.com/Neolambo/glyph-compress/blob/master/ROADMAP.md)
- [Security](https://github.com/Neolambo/glyph-compress/blob/master/SECURITY.md) · [Privacy](https://github.com/Neolambo/glyph-compress/blob/master/PRIVACY.md) · [Enterprise](https://github.com/Neolambo/glyph-compress/blob/master/ENTERPRISE.md)
- [Report an issue](https://github.com/Neolambo/glyph-compress/issues)

Dual-licensed: [AGPL-3.0](https://github.com/Neolambo/glyph-compress/blob/master/LICENSE) for open-source use, [commercial license](https://github.com/Neolambo/glyph-compress/blob/master/COMMERCIAL_LICENSE.md) available for proprietary use.
