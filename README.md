# ⚡ GlyphCompress

<p align="center">
  <img src="./assets/logo.png" alt="GlyphCompress Logo" width="300">
</p>

[![NPM Version](https://img.shields.io/npm/v/glyph-compress)](https://www.npmjs.com/package/glyph-compress)
[![License: AGPL 3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/Neolambo.glyph-compress?label=VS%20Code%20Extension)](https://marketplace.visualstudio.com/items?itemName=Neolambo.glyph-compress)

**Semantic compression for IDE↔LLM communication. Save 80%+ tokens with zero information loss.**

GlyphCompress uses a compositional radical-based encoding system (inspired by Chinese logograms) to compress the verbose context exchanged between IDEs and Large Language Models. A shared codebook injected into the LLM's system prompt enables it to decode compact glyph sequences back into full semantic concepts.

### 🎬 See it in Action

Watch the latest YouTube video to see how GlyphCompress achieves 90% token savings:

- ⚙️ **[Data Flow Architecture](https://youtu.be/XRwRYEsReJU)**: A graphical animation showing how the engine minifies and translates verbose code into dense semantic glyphs.

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

### 🔥 New in v0.6.1 (Packaging & VS Code Hardening)

1. **Root API Alignment**: The documented `GlyphCompressor`, `wrapOpenAI`, and `wrapAnthropic` imports are now exported from the package root.
2. **CommonJS Entry Point**: Added the missing CommonJS package entry so `require('glyph-compress')` works for CJS consumers.
3. **VS Code Proxy Configuration**: The extension proxy now respects `glyphCompress.targetApiUrl` instead of using a hardcoded provider URL.
4. **Opt-In Workspace Rules**: Automatic writes to `.cursorrules` and `.github/copilot-instructions.md` are gated behind `glyphCompress.autoUpdateWorkspaceRules`.

### 🔥 v0.6.0 (Project "Rosetta")

1. **Adaptive Payload Dictionary (APD)**: Analyzes term frequency in real-time and maps the highest token-consuming strings (classes, functions, variables) to a dynamic Unicode "Rosetta Stone" on the fly.
2. **Semantic Context Elision (Blackout Algorithm)**: Intelligently analyzes user intent (e.g., "fix", "deploy"). The new `_elideIrrelevantContext` function strips the bodies of unrelated functions across massive payloads (`[✂]`), keeping structural signatures while slashing token noise.
3. **Prompt Caching for Anthropic**: Automatic injection of `cache_control: { type: 'ephemeral' }` into the heaviest blocks of context (dictionary and files) to minimize repeated token costs and latency for Claude users.
4. **Indentation Minification**: Converts spaces to tabs or strips them automatically to scale down structural byte and token counts before final compression.

### ⚡ Previous Highlights (v0.5.x & Below)

1. **Workspace Compression (VS Code & Antigravity)**: A brand new command `GlyphCompress: Compress Entire Workspace` scans your entire project, removes boilerplate, and generates a single semantic map (Level: Ultra) in an unsaved tab! Perfect for feeding massive architectures to Claude or Antigravity.
2. **Zero-Command Transparent Proxy**: Intercept LLM API calls from your IDE (Continue, Cursor, Cline) automatically. No more shortcuts or copy-pasting—everything happens transparently in the background on `localhost:8080`.
3. **Universal Syntax Minification**: The `aggressive` compression level now actively removes comments and blank lines for **C-family (JS, TS, C#, Java, C++, Go, Rust), Python, Ruby, HTML, and CSS**, slashing token counts drastically.
4. **Google Gemini Native Support**: The proxy seamlessly reroutes OpenAI-formatted requests to Gemini's official `v1beta/openai` compatible endpoints.
5. **Persistent Telemetry**: The VS Code extension tracks your *Lifetime Savings* across all sessions, showing exactly how many millions of tokens (and dollars) you've saved overall.

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

#### Zero-Friction Chat Integration (Copilot / Claude / Cursor)
GlyphCompress provides a fluid workflow for native IDE chats. The extension can optionally write workspace rules so Copilot and Cursor understand compressed glyph context.

**The Magic Workflow:**
1. **Optional Codebook Injection:** Enable `glyphCompress.autoUpdateWorkspaceRules` to let GlyphCompress create/update `.github/copilot-instructions.md` and `.cursorrules` in your project root. Copilot and Cursor can then learn the Glyph dictionary from workspace rules.
2. **One-Click Ask (`Ctrl+Alt+G`):** Highlight a massive chunk of code (or leave unselected to compress the whole file) and press `Ctrl+Alt+G` (or run `GlyphCompress: Ask LLM (Auto-Compress)`).
3. **Seamless Chat:** The extension instantly compresses the code and **automatically opens your VS Code Chat** with the compressed text pre-filled. Just type your question and hit enter! The AI will parse the `[imp:3 ƒ:2 34L]` glyphs perfectly, saving you 90% of your context window.

**Available Commands:**
- `GlyphCompress: Ask LLM (Auto-Compress)` (`Ctrl+Alt+G`) — Instantly compress and open VS Code Chat
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
  "glyphCompress.compressionLevel": "standard", // "light" | "standard" | "aggressive" | "ultra"
  "glyphCompress.autoUpdateWorkspaceRules": false,
  "glyphCompress.targetApiUrl": "https://api.openai.com"
}
```

## 👻 The Ultimate Magic: Zero-Command Transparent Proxy (v0.5.0+)

If you want **100% automatic, invisible** compression without pressing *any* shortcuts, you can use the GlyphProxy. It intercepts the API calls made by your IDE, compresses the prompt on the fly, and saves your API tokens.

### How to use the Proxy:
1. Start the proxy server using the CLI or VS Code:
   ```bash
   # From terminal
   npx glyph-compress --proxy 8080
   ```
   *(Or from VS Code Command Palette: `GlyphCompress: Start Zero-Command Proxy`)*
2. Configure your AI coding assistant to use the custom local endpoint:
   - **API Base URL / Override API URL**: `http://localhost:8080/v1`
   - **API Key**: *Your real OpenAI/Anthropic key*

### 🛠️ Step-by-Step IDE Integration Guide

**Cursor IDE**
1. Open Cursor Settings (`Ctrl+Shift+J` or `Cmd+Shift+J`).
2. Go to **Models**.
3. Under **OpenAI API Key**, enter your real API key.
4. Toggle **Override OpenAI Base URL** and set it to: `http://localhost:8080/v1`
5. *Magic!* All Chat and Cmd+K requests will now be silently compressed.

**Cline / RooCode (VS Code Extensions)**
1. Open the Cline/RooCode settings panel.
2. Select **OpenAI Compatible** as your API Provider.
3. **Base URL**: `http://localhost:8080/v1`
4. **API Key**: *Your real API key*
5. **Model ID**: `gpt-4o` (or whichever you prefer).

**Continue.dev**
1. Open `~/.continue/config.json`.
2. Add or edit your model configuration:
```json
{
  "title": "GPT-4o (Glyph Proxy)",
  "provider": "openai",
  "model": "gpt-4o",
  "apiKey": "YOUR_REAL_API_KEY",
  "apiBase": "http://localhost:8080/v1"
}
```

**GitHub Copilot Chat**
*Note: Microsoft locks the API URL for the official Copilot extension for security reasons. To use GlyphCompress with the official Copilot, please use the `Ctrl+Alt+G` (One-Click Ask) shortcut provided by the GlyphCompress VS Code Extension.*

### 3. Done! 
You don't need to do anything else. When your IDE sends huge blocks of code to the LLM, the proxy intercepts the JSON request, minifies the code blocks, injects the codebook, and forwards the heavily compressed request to the real LLM API. 

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
- **`standard`**: (Default) Compresses prompts, error messages, and file paths. Leaves code blocks mostly intact.
- **`aggressive`**: Applies **Multi-Language Syntax Minification** to code blocks. Preserves the logic and structure (great for debugging) but replaces verbose keywords (`function`, `public`, `return`, `def`, `#include`) with ultra-short glyphs (`ƒ`, `+`, `→`, `imp`). Supports C, Python, JS/TS, Rust, Go, Java, and C#.
- **`ultra`**: Fully destructive semantic compression. Replaces entire code blocks with pure architectural summaries (e.g. `[imp:3 ƒ:2 34L]`). Only use this when you need absolute maximum context saving and the AI doesn't need to read the inner logic.

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
│   └── integration.js            # 23 automated tests
├── examples/
│   ├── openai-example.js         # OpenAI usage example
│   └── claude-example.js         # Claude usage example
├── package.json
├── LICENSE
└── README.md
```

## 🧪 Tests

```bash
# Run all tests (23/23 ✓)
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

### v0.6.1 (Packaging & VS Code Hardening)
- **Root API Alignment**: Exported `GlyphCompressor`, `wrapOpenAI`, `wrapAnthropic`, and `CODEBOOK_PROMPT` from the package root to match the README examples.
- **CommonJS Entry Point**: Added `src/index.cjs` so the declared `require` entry works for CommonJS consumers.
- **VS Code Extension Fixes**: The proxy now uses `glyphCompress.targetApiUrl`, workspace rule injection is opt-in, `ultra` is exposed in settings, and the extension test script points to the existing integration suite.

### v0.6.0 (Project "Rosetta")
- **Adaptive Payload Dictionary (APD)**: Introduced a real-time frequency analyzer that identifies and maps the heaviest token-consuming strings to a dynamic Unicode dictionary.
- **Semantic Context Elision (Blackout Algorithm)**: Implemented `_elideIrrelevantContext` to intelligently strip out unrelated function bodies based on the intent of the user query.
- **Anthropic Prompt Caching**: Auto-injects `cache_control: { type: 'ephemeral' }` into heavily weighted blocks for Claude optimization.
- **Indentation Minification**: Added an explicit layer to minimize spaces to tabs for all structural context blocks.

### v0.5.1 (Universal Minification & Gemini Integration)
- **Universal Minification**: Expanded the `aggressive` minification to aggressively remove comments (`//`, `/* */`, `<!-- -->`, `#`) and empty lines across all supported languages (C-family, Python, Ruby, Web markup, CSS, etc.).
- **Gemini Compatibility**: Enhanced the zero-command proxy to dynamically route standard OpenAI requests (`/v1/`) to Google Gemini's official OpenAI-compatible endpoint (`/v1beta/openai/`).

### v0.5.0 (Zero-Command Transparent Proxy)
- **Invisible Proxy Middleware**: Added `src/proxy.js`, a local HTTP server that intercepts OpenAI-compatible API requests.
- **True Zero Commands**: Configured your IDE's API Base URL to point to `localhost:8080`, and GlyphCompress automatically intercepts, parses, and minifies your code blocks before they hit the real API.
- Added Proxy start/stop commands in both CLI (`--proxy`) and VS Code Extension.

### v0.4.0 (Multi-Language Syntax Minification)
- **Intelligent Minification**: Upgraded the `aggressive` compression level. Instead of destructively summarizing code blocks, it now applies intelligent syntax minification to preserve logic and structure for debugging.
- **Broad Language Support**: Added targeted RegEx parsing for C, C++, Python, Java, C#, Rust, Go, JavaScript, and TypeScript.
- **Enhanced Codebook**: Expanded the glyph dictionary to include universal concepts like variables (`◇`), returns (`→`), and types (`◇t`).

### v0.3.6 (Zero-Friction Base)
- **True Zero-Friction UX**: The extension now automatically creates and updates `.cursorrules` and `.github/copilot-instructions.md` with the dynamic codebook, teaching AI assistants the semantic dictionary completely in the background.
- **One-Click Ask (`Ctrl+Alt+G`)**: Added a new command to instantly compress the current file/selection and automatically open the native VS Code Chat sidebar, eliminating all copy-paste steps.

### v0.3.4 (Zero-Friction Base)
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
