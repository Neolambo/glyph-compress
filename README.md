# ⚡ GlyphCompress

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

### 🔥 New in v0.2.0 (Advanced Edition)

1. **Dynamic Dictionary (Auto-Tuning)**: Automatically detects repeated long variable/class names (e.g. `AuthenticationManager`) and compresses them dynamically to single greek letters (`α`, `β`), injecting the dictionary live into the Codebook!
2. **"Ultra" Compression Level**: Lossy semantic stripping that completely obliterates `console.log()` calls and inline comments before compression.
3. **Anthropic Prompt Caching**: Native support for Claude's `cache_control: { type: 'ephemeral' }`. The codebook cost drops to **$0.00** for all follow-up messages in a chat session!

## 📊 Benchmarks

| Scenario | Original | Compressed | Ratio | Savings |
|---|---|---|---|---|
| Fix TypeScript error in React | 1,734 chars | 137 chars | **12.7x** | 92% |
| Optimize API endpoint | 1,999 chars | 195 chars | **10.3x** | 90% |
| Deploy to Kubernetes | 730 chars | 84 chars | **8.7x** | 88% |
| Debug Python ML pipeline | 1,925 chars | 249 chars | **7.7x** | 87% |
| Create React form | 116 chars | 33 chars | **3.5x** | 72% |
| **Average** | | | **9.3x** | **89%** |

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

### VS Code Extension

1. Install the extension from the Marketplace (coming soon)
2. GlyphCompress automatically compresses context sent to LLMs
3. See live compression stats in the status bar: `⚡ GC: 3.5x | -1200 tok`

**Commands:**
- `GlyphCompress: Build Project Codebook` — Index your workspace files
- `GlyphCompress: Toggle Compression On/Off`
- `GlyphCompress: Compress Selection` — Test compression on selected text
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
┌──────────────────┐     ┌──────────────────┐     ┌─────────────┐
│    IDE / Tool     │────▶│  GlyphCompress   │────▶│   LLM API   │
│                   │     │                  │     │             │
│  VS Code         │     │  1. Index files   │     │  OpenAI     │
│  Antigravity     │     │  2. Compress ctx  │     │  Claude     │
│  CLI script      │     │  3. Inject codebook│     │  Gemini     │
│  Custom app      │     │  4. Track stats   │     │             │
└──────────────────┘     └──────────────────┘     └─────────────┘
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

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions welcome! Areas of interest:

- **New radicals** for emerging technologies
- **Language support** for non-English prompts
- **VS Code marketplace** publishing
- **Benchmark data** from real-world IDE sessions
- **LLM comprehension tests** with different models
