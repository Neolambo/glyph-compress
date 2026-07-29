# Professional MCP Video Brief

Use this brief with the configured VS Code MCP servers:

- `nano-banana`: Google Gemini/Nano Banana image generation and Veo video generation.
- `fal-ai`: fal.ai image/video generation with models such as Veo, Kling, Sora, FLUX, and Recraft.

The goal is to create a professional outreach video for GlyphCompress that looks like a premium AI infrastructure product launch, not a static slide deck.

## MCP Setup

VS Code user MCP configuration is stored outside this repository at:

```text
%APPDATA%\Code\User\mcp.json
```

Configured servers:

```json
{
  "nano-banana": "npx -y @seungmanchoi/nano-banana-mcp",
  "fal-ai": "npx -y fal-ai-mcp"
}
```

The configuration prompts securely for API keys at runtime:

- `GEMINI_API_KEY` for Nano Banana / Gemini / Veo.
- `FAL_KEY` for fal.ai.

Do not commit API keys to this repository.

## Primary Video Prompt

Use this with Nano Banana / Veo or fal.ai `generate_video`.

```text
Create a professional 75-second launch video for GlyphCompress, an AI developer tool for semantic compression of IDE-to-LLM context.

Audience: AI engineers, coding-agent builders, LLM infrastructure maintainers, VS Code extension users, and developer-tool founders.

Style: premium AI infrastructure product video, dark clean interface, sharp typography, cinematic but restrained motion, real developer-tool feel, not a generic marketing ad. Use subtle animated code editor panels, terminal windows, context payloads, source-map overlays, glyph tokens, and LLM context windows. Color palette: deep navy/charcoal background, clean white text, green/cyan/amber accents. Avoid clutter, fake unreadable UI, random AI robot imagery, lens flares, excessive gradients, and stock-looking people.

Format: 16:9, 1920x1080, 75 seconds, suitable for GitHub, Product Hunt, Hacker News, LinkedIn, X/Twitter, and YouTube.

Narrative structure:

0:00-0:08 Opening:
Show a polished product title: "GlyphCompress" and subtitle: "Semantic compression for AI coding tools". Visualize large IDE context flowing into compact glyph tokens.

0:08-0:19 Installation:
Show a clean terminal with:
npx glyph-compress --help
npx glyph-compress README.md --level ultra --provider openai --trust reversible --explain
Animate a quick install/use flow.

0:19-0:31 Useful workflow:
Show repeated project context, diagnostics, file paths, and identifiers being transformed into a compact semantic payload. Callouts must quote **token** figures that a command in the repository prints — e.g. "−78.5% billed over 10 turns", "measured with js-tiktoken", "source-map aware". Do **not** reuse "12.7x compression" or "92% saved": those are character counts of a best-case fixture, and they describe the glyph substitution, which real tokenizers showed to be a net cost and which is gated off by default. See `docs/demo-video.md` → Positioning For A Re-record.

0:31-0:43 Auditability:
Show source-map metadata and trust policy cards: lossless, reversible, privacy, lossy. Emphasize that reversible mode blocks risky transformations and keeps metadata inspectable.

0:43-0:54 VS Code workflow:
Show a stylized VS Code command palette with:
GlyphCompress: Ask LLM (Auto-Compress)
GlyphCompress: Compress Entire Workspace
Setting: glyphCompress.trustPolicy = reversible

0:54-1:04 Proxy workflow:
Show an OpenAI-compatible local proxy diagram:
IDE -> http://localhost:8080/v1 -> compressed context -> LLM API
Mention Continue, Cline, Roo Code, and custom agent stacks as compatible workflows.

1:04-1:15 Call to action:
Show final clean screen:
github.com/Neolambo/glyph-compress
github.com/Neolambo/glyph-compress/wiki
github.com/Neolambo/glyph-compress/issues/1
Text: "Try it. Benchmark it. Challenge the trust model."

Audio direction: modern, precise, confident, light electronic pulse, no dramatic trailer feel.

Text constraints: all on-screen text must be readable at mobile size. Keep labels short. Do not invent endorsements, logos, adoption metrics, or fake customer names.
```

## Thumbnail Prompt

Use this with Nano Banana or fal.ai image generation for a public cover image.

```text
Create a professional 16:9 thumbnail for GlyphCompress, an AI developer tool for semantic compression of IDE-to-LLM context. Dark premium developer-tool UI, clean title "GlyphCompress", subtitle "Semantic compression for AI coding tools", visible code editor panel, terminal command, compact glyph tokens flowing into an LLM context window, green/cyan/amber accents, crisp typography, no fake company logos, no clutter, no unreadable tiny text, suitable for Product Hunt, GitHub, YouTube, LinkedIn, and Hacker News.
```

## Suggested MCP Requests

After VS Code asks for API keys, use one of these requests in an MCP-enabled chat.

### Nano Banana / Veo

```text
Using the nano-banana MCP server, generate a 75-second 16:9 professional launch video from the Professional MCP Video Brief in docs/professional-video-mcp-brief.md. Use model veo-3.1-generate-preview if available. Save the output under assets/demo-video/ with a descriptive filename.
```

### fal.ai

```text
Using the fal-ai MCP server, generate a 75-second 16:9 professional launch video from the Professional MCP Video Brief in docs/professional-video-mcp-brief.md. Prefer a high-quality video model such as fal-ai/veo3.1, fal-ai/kling-video/v3/pro/text-to-video, or fal-ai/sora-2 if available. Save the output under assets/demo-video/ with a descriptive filename.
```

### Two-Step Higher-Control Workflow

```text
1. Generate a polished 16:9 GlyphCompress thumbnail/key visual from the Thumbnail Prompt in docs/professional-video-mcp-brief.md.
2. Use that image as the first frame for an image-to-video generation based on the Primary Video Prompt.
3. Save the final MP4 under assets/demo-video/.
```

## Current Local Fallback

The repository already includes a local rendered fallback that does not require external API keys:

- `assets/demo-video/glyphcompress-session-cost.mp4`
- `assets/demo-video/glyphcompress-demo-pro-cover.png`

Use MCP-generated media as the final public version once API access is available.