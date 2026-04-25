# ⚡ GlyphCompress

[![NPM Version](https://img.shields.io/npm/v/glyph-compress)](https://www.npmjs.com/package/glyph-compress)
[![License: AGPL 3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/Neolambo.glyph-compress?label=VS%20Code%20Extension)](https://marketplace.visualstudio.com/items?itemName=Neolambo.glyph-compress)

**Semantic compression for IDE↔LLM communication. Save 80%+ tokens with zero information loss.**

GlyphCompress uses a compositional radical-based encoding system (inspired by Chinese logograms) to compress the verbose context exchanged between IDEs and Large Language Models. A shared codebook injected into the LLM's system prompt enables it to decode compact glyph sequences back into full semantic concepts.

---

## 🎯 The Problem

Every IDE→LLM request carries massive, redundant context:

```
System prompt:        ~2,000 tokens (repeated every time)
Open files:           ~3,000 tokens
Errors/diagnostics:   ~500 tokens  
Chat history:         ~2,000 tokens
User prompt:          ~500 tokens
─────────────────────────────────────
TOTAL:                ~8,000 tokens/request
```

At 50 requests/day → **400K tokens/day** → $6-12/day on Claude/GPT-4.

## ✨ The Solution

GlyphCompress intercepts outgoing LLM requests, compresses context using a shared codebook, and saves **80-90% of tokens**:

```
BEFORE (1,734 chars):
  { prompt: "Fix the error in UserProfile.tsx",
    files: [{ path: "src/components/UserProfile.tsx", content: "...44 lines..." }],
    diagnostics: [{ code: "TS2339", message: "Property 'department' does not exist on type 'User'" }] }

AFTER (137 chars):
  [F: ◈₍1₎=src/components/UserProfile.tsx]
  ⺌✗ ◈₍1₎
  ◈₍1₎ᵗ [imp:5 exp:1 ◇:4 ⟿:2 ⟳:5 44L]
  ◈₍1₎:42 ✗∉prop 'department'∉User

→ 12.7x compression, 92% saved
```

### 🔥 New in v0.3.4 (Next-Gen Features)

1. **Global CLI Tool (`npx glyph-compress`)**: Compress files straight from your terminal! Use `--level ultra --copy` to get a highly optimized codebook ready to paste into ChatGPT or Claude web interfaces.
2. **Multi-Language Ultra Parser**: The "Ultra" semantic codeblock compressor now understands **Python, Rust, Go, Java, and C#** out of the box, reducing huge backend files to `[imp:3 ƒ:3 𝒞:1 13L]` effortlessly.
3. **Persistent Telemetry**: The VS Code extension now tracks your *Lifetime Savings* across all sessions, showing exactly how many millions of tokens (and dollars) you've saved overall.
4. **Dynamic Dictionary (Auto-Tuning)** (from v0.2): Automatically detects repeated long variable/class names and compresses them to single greek letters (`α`, `β`).
5. **Anthropic Prompt Caching** (from v0.2): Native support for Claude's `cache_control: { type: 'ephemeral' }`. Codebook cost drops to **$0.00**!

## 📊 Benchmarks

| Scenario | Original | Compressed | Ratio | Savings |
|---|---|---|---|---|
| Fix TypeScript error in React | 1,734 chars | 137 chars | **12.7x** | 92% |
| Optimize API endpoint | 1,999 chars | 195 chars | **10.3x** | 90% |
| Deploy to Kubernetes | 730 chars | 84 chars | **8.7x** | 88% |
| Debug Python ML pipeline | 1,925 chars | 249 chars | **7.7x** | 87% |
| Create React form | 116 chars | 33 chars | **3.5x** | 72% |
| **Average** | | | **9.3x** | **89%** |

## 🚀 Usage: Command Line (CLI)

You can run GlyphCompress directly from your terminal to quickly compress files for ChatGPT or Claude.

```bash
# Compress a Python/Rust/JS file and copy it to your clipboard
npx glyph-compress src/app.ts --level ultra --copy

# Check the built-in help
npx glyph-compress --help
```

**Cost savings**: ~$200/month at 50 requests/day with Claude Sonnet.

## 🚀 Quick Start

### Standalone (any project)

```javascript
import { GlyphCompressor } from 'glyph-compress';

const gc = new GlyphCompressor({ level: 'standard' });
const { compressed, stats } = gc.compressText(
  "Fix the TypeScript error in src/components/UserProfile.tsx line 42: " +
  "Property 'name' does not exist on type 'User'"
);

console.log(compressed);
// → "⺌✗ ◈₍1₎:42 'name'∉User"
console.log(stats);
// → { ratio: '5.5x', savedPct: '82%' }
```

### With OpenAI

```javascript
import OpenAI from 'openai';
import { wrapOpenAI } from 'glyph-compress';

const client = wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

// Every call is automatically compressed — the codebook is injected into the system prompt
const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are a senior developer.' },
    { role: 'user', content: 'Fix the error in UserProfile.tsx' },
  ],
});
```

### With Anthropic Claude

```javascript
import Anthropic from '@anthropic-ai/sdk';
import { wrapAnthropic } from 'glyph-compress';

const client = wrapAnthropic(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: 'You are a senior developer.',
  messages: [
    { role: 'user', content: 'Fix the error in UserProfile.tsx' },
  ],
});
```

### With Antigravity (AI Coding Assistant)

For agentic IDEs like Antigravity, you can compress massive context payloads locally before passing them into the AI's prompt:

```javascript
import { GlyphCompressor } from 'glyph-compress';

// Use "ultra" level to obliterate code bodies and comments into semantic summaries
const gc = new GlyphCompressor({ level: 'ultra' });

// 1. Inject this ONCE into your Antigravity System Prompt:
console.log(gc.getCodebookPrompt());

// 2. Compress and send massive files to Antigravity:
const { compressed, stats } = gc.compressText(massiveProjectContext);
console.log(compressed); // Send this to the LLM
console.log(stats);      // → { ratio: '12.7x', savedPct: '92%' }
```

### VS Code Extension

1. Install directly from the **[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=Neolambo.glyph-compress)** (Search for `GlyphCompress`).
2. See live compression stats in the status bar: `⚡ GC: 3.5x | -1200 tok`

#### Zero-Friction Chat Integration (Copilot / Claude)
GlyphCompress provides an incredibly fluid workflow for native IDE chats (like GitHub Copilot Chat or Claude in VS Code). 

**The 3-Step Magic Workflow:**
1. **Feed the Codebook:** Open the Command Palette (`Ctrl+Shift+P`) and run **`GlyphCompress: Copy System Codebook`**. Go to your Copilot/Claude chat, paste it, and say: *"This is the dictionary. From now on, my code will be in this format."* *(Tip: You can also paste this into your AI's global "Custom Instructions" so you only do it once).*
2. **Compress Code:** Highlight a massive chunk of code in your editor and run **`GlyphCompress: Compress Selection`**. 
3. **Paste & Ask:** The compressed result is **automatically copied to your clipboard**. Just paste it (`Ctrl+V`) into your chat, type your question (e.g., *"Find the bug"*), and hit enter! The AI will parse the `[imp:3 ƒ:2 34L]` glyphs perfectly, saving you 90% of your context window.

**Available Commands:**
- `GlyphCompress: Copy System Codebook` — Instantly copy instructions for any LLM
- `GlyphCompress: Compress Selection` — Compress code and auto-copy to clipboard
- `GlyphCompress: Build Project Codebook` — Index your workspace files
- `GlyphCompress: Toggle Compression On/Off`
- `GlyphCompress: Show Stats` — Dashboard with session statistics

**Settings:**
```json
{
  "glyphCompress.enabled": true,
  "glyphCompress.provider": "auto",        // "openai" | "anthropic" | "antigravity"
  "glyphCompress.compressionLevel": "standard"  // "light" | "standard" | "aggressive"
}
```

## 🔤 The Glyph Protocol

The system is built on 16 **base radicals** that encode fundamental semantic dimensions:

```
DOMAINS:    ◈ Frontend   ◉ AI/ML     ◊ DevOps    ◆ Database
            ◇ Language   ⊕ Auto      ⊗ Arch      ⊙ Mobile
            ⊘ Cloud      ⊚ Data      ⊛ Testing   ⊜ Backend
            ⊝ Security   ⊞ Docs      ⊟ Perf      ⊠ Network

ACTIONS:    ▲ Create     ▼ Analyze   ► Test      ◄ Monitor
            ■ Document   □ Connect   ▪ Deploy    ▫ Optimize
            ● Transform  ○ Protect

TECH:       ᵗ TypeScript  ᵖ Python   ʳ Rust     ℜ React
            ℕ Next.js     𝒟 Docker   𝒦 K8s      ℙ Postgres

STRUCTURE:  ✗ Error   ⚠ Warning   ∉ Type mismatch   ∅ Not found
            → Returns   ƒ Function   𝒞 Class   ◇ State   ⟿ Effect
```

### Compression Levels

| Level | What it compresses | Use case |
|---|---|---|
| **light** | Prompt patterns, tech names | Low-risk, minimal changes |
| **standard** | + file paths, error messages, diagnostics | **Recommended** |
| **aggressive** | + code blocks → semantic summaries | Heavy compression |
| **ultra** (New) | + removes `console.log()` and comments | Maximum token savings |

## 🏗️ Architecture

```
+------------------+     +--------------------+     +-------------+
|    IDE / Tool    |---->|   GlyphCompress    |---->|   LLM API   |
|                  |     |                    |     |             |
| VS Code          |     | 1. Index files     |     | OpenAI      |
| Antigravity      |     | 2. Compress ctx    |     | Claude      |
| CLI script       |     | 3. Inject codebook |     | Gemini      |
| Custom app       |     | 4. Track stats     |     |             |
+------------------+     +--------------------+     +-------------+
```

The **codebook** (~150 tokens) is injected once into the system prompt. The LLM learns to decode the glyphs from it and responds normally in natural language.

## 📦 Project Structure

```
glyph-compress/
├── src/
│   ├── index.js                  # Library entry point (ESM)
│   ├── radical-alphabet.js       # 96 symbols: radicals + glyphs
│   ├── compressor.js             # Multi-level compression engine
│   └── system-prompt-generator.js# Codebook system prompt generator
├── vscode-ext/
│   ├── package.json              # VS Code extension manifest
│   ├── extension.js              # Extension activation & commands
│   └── glyph-middleware.js       # Core middleware (OpenAI/Claude/Antigravity)
├── test/
│   ├── demo.js                   # Interactive demo with 5 scenarios
│   └── integration.cjs           # 17 automated tests
├── examples/
│   ├── openai-example.js         # OpenAI usage example
│   └── claude-example.js         # Claude usage example
├── package.json
├── LICENSE
└── README.md
```

## 🧪 Tests

```bash
# Run all tests (17/17 ✓)
npm test

# Run interactive demo
npm run demo
```

## 🔬 Theory

GlyphCompress is grounded in information theory:

- **Shannon entropy** tells us the theoretical compression limit for character-level encoding
- **Kolmogorov complexity** tells us that compression = understanding
- **Semantic compression** captures structural redundancy that standard algorithms (GZIP, Brotli) miss

The key insight: development communication is **highly structured** — the same patterns (`fix error`, `deploy to`, `create component`) repeat thousands of times with different parameters. By encoding these patterns as composable radicals, we achieve compression ratios far beyond what byte-level algorithms can reach.

> **Fundamental Law**: Perfect compression is equivalent to perfect understanding. Information is redistributed — not lost — among the message, the codebook, and the receiver's context.

## 📜 Version History (Changelog)

### v0.3.4 (Current Release)
- **Zero-Friction LLM Chat Integration**: Added `GlyphCompress: Copy System Codebook` command. You can now instantly copy the codebook to your clipboard and paste it into Copilot/Claude Chat custom instructions, making GlyphCompress seamlessly interoperable with any built-in IDE chat.

### v0.3.3 (VS Code Selection Fix)
- **VS Code Extension Fix**: The `Compress Selection` command now automatically detects the editor language and wraps raw text in markdown backticks, ensuring the "Ultra" semantic compressor triggers correctly for code snippets.

### v0.3.2 (Monetization & Legal)
- **Monetization & Legal**: Migrated to Dual Licensing model (AGPL-3.0 for open source, Enterprise for commercial).
- **Marketplace Publishing**: Added official support and documentation for the Visual Studio Code Marketplace.
- **Funding Support**: Enabled GitHub Sponsors and NPM funding links natively.

### v0.3.0 & v0.3.1 (Next-Gen Features)
- **Global CLI Tool (`npx glyph-compress`)**: Added the ability to compress and copy code directly from your terminal.
- **Multi-Language Ultra Parser**: Extended the "Ultra" semantic codeblock compressor to support Python, Rust, Go, Java, and C# natively.
- **Persistent Telemetry**: Added `globalState` tracking in VS Code to calculate *Lifetime Savings* across all sessions.

### v0.2.0 (Advanced Edition)
- **Dynamic Dictionary (Auto-Tuning)**: Implemented runtime frequency analysis to map repeated long variable/class names to single greek letters (`α`, `β`).
- **"Ultra" Compression Level**: Introduced lossy semantic stripping that completely removes `console.log()` calls and inline/block comments before compression.
- **Anthropic Prompt Caching**: Added native support for Claude's `cache_control: { type: 'ephemeral' }` to drastically reduce the codebook cost in long chat sessions.
- **Antigravity Support**: Verified full compatibility with the Google Antigravity platform.

### v0.1.0 (Initial Release)
- **Glyph Protocol v0.1**: Defined the core 96-symbol dictionary mapping tech stacks, domains, and common actions to Unicode symbols.
- **Codeblock Summarizer**: Introduced the `[imp:3 ƒ:2 44L]` structural summary format for code blocks.
- **Middleware API**: Created wrappers for OpenAI and Anthropic SDKs to automatically inject the codebook and compress user messages.

## ⚖️ Dual Licensing Model

GlyphCompress is distributed under a **Dual License** model:

1. **Open Source (AGPL-3.0)**: Free for individuals, non-profits, and open-source projects. If you use it, you must share your changes and the source code of your derivative works.
2. **Commercial License**: For enterprises and businesses integrating GlyphCompress into closed-source or commercial products (e.g., custom IDEs, internal developer portals, SaaS platforms). Contact the author for a dedicated enterprise license.

See the [LICENSE](LICENSE) file for the full AGPL-3.0 text.

## 🤝 Contributing

Contributions welcome! Areas of interest:

- **New radicals** for emerging technologies
- **Language support** for non-English prompts
- **VS Code marketplace** publishing
- **Benchmark data** from real-world IDE sessions
- **LLM comprehension tests** with different models
