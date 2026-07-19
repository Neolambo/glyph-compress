# GlyphCompress — Semantic Token Compression

Compress the context your IDE sends to an LLM — file contents, diagnostics, chat history, diffs — using a compositional glyph system, so you spend fewer tokens per request without losing the information the model needs to help you.

A shared codebook is injected once into the system prompt so the model can decode the compressed glyphs back into full concepts. Compression is calibrated against real provider tokenizers (OpenAI's cl100k_base/o200k_base) rather than character-count heuristics, so reported savings are real, measured token reductions — not guesses.

## What this extension does

- **Compress Selection**: compress the currently selected text/code and copy the result to your clipboard.
- **Ask LLM (Auto-Compress)**: automatically compress context before it reaches VS Code's built-in Language Model API (Copilot Chat and compatible extensions), with zero manual steps.
- **Zero-Command Transparent Proxy**: a local proxy that sits between your IDE (Cursor, Continue, Cline, and other OpenAI/Anthropic/Gemini-compatible tools) and the real provider API, compressing every request automatically. Point your IDE's API base URL at `http://localhost:8080` and nothing else changes.
- **Build Project Codebook**: scan your workspace to rank files by relevance to a task and build a persistent index used by the Context Router.
- **Compress Entire Workspace**: batch-compress every open/relevant file at once.
- **Show Compression Stats** / status bar: live token-savings numbers for your current session.

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
