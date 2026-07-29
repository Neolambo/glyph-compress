# YouTube Distribution Kit

Use this kit to distribute the published GlyphCompress video as the main public outreach asset.

## Primary Video

- YouTube: `https://www.youtube.com/watch?v=-8UbO2atFp8`
- Short link: `https://youtu.be/-8UbO2atFp8`
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

GlyphCompress reduces what an IDE-to-LLM coding session is **billed** for. Share the video as the short explanation of why that is a different quantity from the compression ratio, and why the two largest savings compress nothing at all.

One rule for every piece of copy below: quote **token** figures that a command in the repository prints. No character counts, and no ratio from a hand-picked file — that is the claim the video exists to retire.

## Short Share Copy

```text
Your IDE re-sends the same file to the model on every turn, and you pay for it every time.

New 70-second video on what a coding session actually gets billed, measured against real tokenizers instead of character counts. Includes the part most tools leave out: we measured the technique in our own project's name, it lost, and it is off by default.

Video: https://www.youtube.com/watch?v=-8UbO2atFp8
GitHub: https://github.com/Neolambo/glyph-compress
```

## LinkedIn Post

```text
Most tools in this space optimise the compression ratio. The compression ratio is not the bill.

Your IDE re-attaches open files to every request, so a long coding session is mostly content the model has already been given. Making that content 25% smaller is worth 25% of it. Not sending it again is worth all of it.

That is what GlyphCompress does, and the two biggest wins compress nothing at all: transmitting a re-attached file once instead of ten times (-78.5% billed over ten turns), and putting the provider cache breakpoint where it actually covers the request.

The video also includes the uncomfortable part, which I think is the most useful thing in it: I measured the glyph encoding this project is named after against real provider tokenizers. It costs tokens rather than saving them, so it is off by default.

Watch the video:
https://www.youtube.com/watch?v=-8UbO2atFp8

GitHub:
https://github.com/Neolambo/glyph-compress

I am looking for feedback from AI engineers, coding-agent builders, VS Code extension authors, and LLM infrastructure maintainers.
```

## X/Twitter Thread

```text
1/ Your IDE sends the model the same file on every single turn. You pay for it every single time.

Video:
https://www.youtube.com/watch?v=-8UbO2atFp8

2/ Everyone optimises the compression ratio. The compression ratio is not the bill.

Making a file 25% smaller is worth 25% of it. Not sending it again is worth all of it.

3/ So the two biggest wins in GlyphCompress compress nothing at all: send a re-attached file once (-78.5% billed over 10 turns), and place the cache breakpoint where it actually covers the request.

4/ The part I would want to read in someone else's thread: I measured the glyph encoding this project is NAMED after. It costs tokens instead of saving them. It is off by default.

Don't take my number either - run it on your own code:
  npx glyph-compress measure src/your-biggest-file.ts

5/ I am looking for real-world benchmark feedback and integration ideas from coding-agent and LLM tooling builders.

GitHub:
https://github.com/Neolambo/glyph-compress
```

## Hacker News / Show HN

```text
Show HN: GlyphCompress - cut what an IDE-to-LLM session is billed, not its compression ratio

Short video on the thing I got wrong for several releases: I was optimising how small a payload is, when what costs money is how often the same payload is sent again. An IDE re-attaches open files to every request, so most of a session's cumulative tokens are content the model already has.

Video: https://www.youtube.com/watch?v=-8UbO2atFp8
GitHub: https://github.com/Neolambo/glyph-compress

The two largest measured wins compress nothing: transmitting a re-attached file once instead of ten times (-78.5% billed over ten turns, js-tiktoken), and placing the Anthropic cache breakpoint at the end of the prefix rather than on the largest block. Content compression is a third, smaller effect at 26% aggregate.

It also contains a result against itself: the glyph encoding in the project's name was measured against real tokenizers, costs tokens rather than saving them, and is gated off by default. Every figure above is printed by a command in the repo, and `npx glyph-compress measure <file>` gives you the same measurement on your own code rather than mine.

I would especially like to be told where the measurement methodology is wrong.
```

## Reddit Post

```text
Title: GlyphCompress: semantic compression for IDE-to-LLM context

I published a video showing GlyphCompress, a tool I am building to reduce repeated context sent from IDEs and coding agents to LLMs.

Video: https://www.youtube.com/watch?v=-8UbO2atFp8
GitHub: https://github.com/Neolambo/glyph-compress

It cuts what an IDE-to-LLM session is billed for: it stops re-transmitting files the model already has, places provider cache breakpoints where they cover the request, and compresses the content that genuinely needs sending. Ships as CLI, npm package, VS Code extension, MCP server, and an OpenAI-compatible local proxy, with source maps, privacy redaction, provider profiles, and explicit trust policies.

I am looking for technical feedback, especially from people building or using coding agents.
```

## Newsletter / Curator Pitch

```text
Hi <name>, I published a new video for GlyphCompress, an open-source tool that reduces what an IDE-to-LLM coding session is billed for.

The angle that may interest your readers is not the compression: it is that the two largest measured savings compress nothing at all. An IDE re-attaches the same open files to every request, so a long session is mostly content the model already has - transmitting it once instead of ten times is worth -78.5% of the bill, and placing the provider cache breakpoint correctly is worth another -32.9% on a long session.

The video also reports a result against the project itself: the glyph encoding it is named after was measured against real provider tokenizers, turned out to cost tokens rather than save them, and is off by default.

Video: https://www.youtube.com/watch?v=-8UbO2atFp8
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
Check which connected Composio tools are available for community outreach. I want to promote this YouTube video responsibly: https://www.youtube.com/watch?v=-8UbO2atFp8. Start by preparing a Hacker News Show HN submission and tailored posts for AI Engineer, LangChain, LlamaIndex, Continue, Cline/Roo Code, and Reddit communities. Do not publish anything until I confirm the channel and final text.
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
| 2026-04-26 | YouTube | https://www.youtube.com/watch?v=-8UbO2atFp8 | | | | Primary video asset |
| 2026-04-26 | Slack `#tutta-glipho` | slack://channel?team=T0B0BS2CHA5&id=C0AVAT5A05U | | | | Posted via Composio after approval; ts `1777238429.488239` |
