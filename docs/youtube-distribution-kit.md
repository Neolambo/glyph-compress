# YouTube Distribution Kit

Use this kit to distribute the published GlyphCompress video as the main public outreach asset.

## Primary Video

- YouTube: `https://www.youtube.com/watch?v=XRwRYEsReJU`
- Short link: `https://youtu.be/XRwRYEsReJU`
- GitHub: `https://github.com/Neolambo/glyph-compress`
- Wiki: `https://github.com/Neolambo/glyph-compress/wiki`
- npm: `https://www.npmjs.com/package/glyph-compress`
- VS Code Marketplace: `https://marketplace.visualstudio.com/items?itemName=neolambo.glyph-compress`
- Feedback issue: `https://github.com/Neolambo/glyph-compress/issues/1`

## Composio MCP Workflow

VS Code is configured with a remote `composio` MCP server for outreach actions. The server URL is:

```text
https://connect.composio.dev/mcp
```

The required `X-CONSUMER-API-KEY` is requested through a secure VS Code MCP input prompt and must not be committed to the repository.

Use the reusable VS Code prompt:

```text
/distribute-glyphcompress-with-composio
```

Recommended use:

1. Reload VS Code so the `composio` MCP server is available.
2. Run `/distribute-glyphcompress-with-composio` from Copilot Chat.
3. Insert the Composio key only when VS Code asks through the secure input prompt.
4. Ask Composio which connected tools are available before publishing anything.
5. Confirm every irreversible public post before sending it.
6. Track each outreach action in the table at the end of this document.

Do not use Composio for bulk unsolicited messages. Treat it as a workflow accelerator for tailored posts, tracking, community research, and approved publishing.

## Core Positioning

GlyphCompress is semantic compression for IDE-to-LLM context. The video should be shared as a quick visual explanation of how verbose coding context can be transformed into compact semantic glyph payloads while preserving auditability through source maps, provider profiles, privacy mode, and trust policies.

## Short Share Copy

```text
I published a new GlyphCompress video showing semantic compression for IDE-to-LLM context.

The idea: compress repeated coding-agent context into compact semantic glyphs, keep it auditable with source maps and trust policies, and reduce token waste in AI developer workflows.

Video: https://www.youtube.com/watch?v=XRwRYEsReJU
GitHub: https://github.com/Neolambo/glyph-compress
```

## LinkedIn Post

```text
I published a new video for GlyphCompress, a developer tool for semantic compression of IDE-to-LLM context.

Coding agents often send large, repetitive context: open files, diagnostics, file paths, symbols, chat history, and task intent. GlyphCompress turns that context into compact semantic glyph payloads with a shared codebook, while preserving auditability through source maps, provider-aware profiles, privacy redaction, and explicit trust policies.

The goal is simple: help AI coding tools send richer context while spending fewer tokens.

Watch the video:
https://www.youtube.com/watch?v=XRwRYEsReJU

GitHub:
https://github.com/Neolambo/glyph-compress

I am looking for feedback from AI engineers, coding-agent builders, VS Code extension authors, and LLM infrastructure maintainers.
```

## X/Twitter Thread

```text
1/ I published a new video for GlyphCompress: semantic compression for IDE-to-LLM context.

Video:
https://www.youtube.com/watch?v=XRwRYEsReJU

2/ The problem: coding agents send huge repeated context to LLMs: files, diagnostics, symbols, paths, chat history, and task intent.

That gets expensive and noisy fast.

3/ GlyphCompress maps that context into compact semantic glyph payloads using a shared codebook.

It is not normal byte compression. It is context-aware compression for developer workflows.

4/ Current package includes CLI, npm API, VS Code Marketplace extension, local proxy, provider profiles, source maps, privacy redaction, and trust policies.

5/ I am looking for real-world benchmark feedback and integration ideas from coding-agent and LLM tooling builders.

GitHub:
https://github.com/Neolambo/glyph-compress
```

## Hacker News / Show HN

```text
Show HN: GlyphCompress - semantic compression for IDE-to-LLM context

I published a short video showing GlyphCompress, an open-source developer tool that compresses repeated IDE/coding-agent context into compact semantic glyph payloads.

Video: https://www.youtube.com/watch?v=XRwRYEsReJU
GitHub: https://github.com/Neolambo/glyph-compress

It supports CLI, npm, VS Code Marketplace, local OpenAI-compatible proxy workflows, source maps, provider-aware token estimates, privacy redaction, and explicit trust policies for lossless, reversible, privacy-first, and lossy compression.

I would especially like feedback on whether the source-map/trust-policy model is useful for real coding-agent workflows, and where this should integrate first.
```

## Reddit Post

```text
Title: GlyphCompress: semantic compression for IDE-to-LLM context

I published a video showing GlyphCompress, a tool I am building to reduce repeated context sent from IDEs and coding agents to LLMs.

Video: https://www.youtube.com/watch?v=XRwRYEsReJU
GitHub: https://github.com/Neolambo/glyph-compress

It compresses file paths, diagnostics, tech names, repeated identifiers, prompt intent, and code structure into compact semantic glyph payloads. The v1.8.0 release includes CLI, npm, VS Code Marketplace, source maps, privacy redaction, provider profiles, and explicit trust policies.

I am looking for technical feedback, especially from people building or using coding agents.
```

## Newsletter / Curator Pitch

```text
Hi <name>, I published a new video for GlyphCompress, an open-source developer tool for semantic compression of IDE-to-LLM context.

The project targets a practical AI engineering problem: coding agents repeatedly send large context payloads to LLMs. GlyphCompress turns those payloads into compact semantic glyphs with source maps, provider profiles, privacy redaction, and trust policies so compression can stay inspectable.

Video: https://www.youtube.com/watch?v=XRwRYEsReJU
GitHub: https://github.com/Neolambo/glyph-compress

It may be relevant for your coverage of coding agents, context engineering, developer tools, and LLM cost optimization.
```

## Communities To Prioritize

1. AI Engineer community.
2. LangChain and LlamaIndex communities.
3. Continue, Cline, Roo Code, Aider, OpenHands, Cursor-style coding-agent communities.
4. VS Code extension developer groups.
5. Hacker News `Show HN`.
6. Product Hunt after the benchmark image is ready.
7. Reddit: `r/LocalLLaMA`, `r/programming`, `r/vscode`, `r/OpenAI`, `r/ClaudeAI`.
8. Newsletters: TLDR AI, Ben's Bites, The Batch, Latent Space, AI Engineer.

## First Composio Task

Use this prompt after `/distribute-glyphcompress-with-composio` starts:

```text
Check which connected Composio tools are available for community outreach. I want to promote this YouTube video responsibly: https://www.youtube.com/watch?v=XRwRYEsReJU. Start by preparing a Hacker News Show HN submission and tailored posts for AI Engineer, LangChain, LlamaIndex, Continue, Cline/Roo Code, and Reddit communities. Do not publish anything until I confirm the channel and final text.
```

## Posting Cadence

- Day 1: LinkedIn, X/Twitter thread, GitHub issue comment.
- Day 2: AI Engineer and coding-agent communities.
- Day 3: Reddit posts, staggered by community rules.
- Day 4: Newsletter/curator outreach.
- Day 5: Hacker News `Show HN` once the benchmark image is ready.
- Day 6-7: Follow up only where people engaged.

## Tracking

Track every post in a simple table:

| Date | Channel | URL | Views | Replies | Stars | Notes |
|---|---|---|---:|---:|---:|---|
| 2026-04-26 | YouTube | https://www.youtube.com/watch?v=XRwRYEsReJU | | | | Primary video asset |
