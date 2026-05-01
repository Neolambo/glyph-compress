# ⚡ GlyphCompress

<p align="center">
  <img src="./assets/logo.png" alt="GlyphCompress Logo" width="300">
</p>

[![NPM Version](https://img.shields.io/npm/v/glyph-compress?cacheSeconds=60)](https://www.npmjs.com/package/glyph-compress)
[![License: AGPL-3.0-only](https://img.shields.io/badge/License-AGPL--3.0--only-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Commercial License](https://img.shields.io/badge/Commercial%20License-required%20for%20proprietary%20use-red.svg)](COMMERCIAL_LICENSE.md)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/neolambo.glyph-compress?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=neolambo.glyph-compress)
[![GitHub Release](https://img.shields.io/github/v/release/Neolambo/glyph-compress?label=GitHub%20Release)](https://github.com/Neolambo/glyph-compress/releases)

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

### New in v1.12.0 (Performance Engine Overhaul)

1. **Codebook-Skip Threshold**: Skips the ~400-token protocol header when text-level savings are below 80 tokens, eliminating negative compression on short requests.
2. **Unicode Token Accuracy**: All token estimators now apply a 1.5× penalty per non-ASCII glyph, preventing inflated savings metrics from cheap-looking Unicode substitutions.
3. **Per-Glyph Breakeven**: Tech name and dynamic dictionary substitutions are individually checked — if the glyph costs more tokens than the original word, the replacement is skipped.
4. **Multilingual Verbose Phrase Compression**: Strips filler/polite phrases in **English, Italian, German, and French** (e.g., "per favore", "bitte", "s'il vous plaît") for international developer workflows.
5. **Latency & Memory Optimization**: Eliminated all `JSON.parse(JSON.stringify())` state cloning (~70% faster), capped source map entries at 500, and cached compiled regexes.
6. **Adaptive Chat Strategy Selection**: Message compression evaluates multiple provider-aware strategies and falls back automatically when a compressed chat payload is not cheaper.
7. **Anthropic Hybrid Wrapper**: `wrapAnthropic()` keeps first-turn `system` prompts lightweight and switches to structured cacheable blocks only once assistant history exists.
8. **Expanded File Path Support**: File path regex now supports `@scoped/packages`, Windows backslashes, and 10+ new extensions (`.toml`, `.sql`, `.graphql`, `.proto`, etc.).
9. **ESM/CJS Sync**: All performance optimizations are applied to both the ESM and CommonJS middleware paths.

### v1.9.0 (Proxy and Packaging Hardening)

1. **Provider-Aware Proxy**: CLI and VS Code proxy flows now preserve provider, trust policy, privacy mode, and target API settings instead of falling back to a generic `auto` profile.
2. **Gemini-Compatible Routing**: The proxy maps OpenAI-compatible `/v1/*` requests to Gemini's `/v1beta/openai/*` endpoint when forwarding to `generativelanguage.googleapis.com`.
3. **Clean ESM Runtime Export**: The package middleware ESM export now resolves through `src/glyph-middleware.js`, avoiding Node package-scope warnings from the VS Code extension folder.
4. **Focused npm Package**: The npm allowlist now publishes runtime files and essential docs only, excluding outreach drafts, demo scripts, and broad internal documentation folders.
5. **VS Code Lifecycle Hardening**: Proxy startup uses the CommonJS extension path, status-bar toggling handles hidden status bars, and the status interval is disposed with the extension context.

### v1.8.0 (Safe Compression Trust Policies)

1. **Explicit Trust Policies**: Added `lossless`, `reversible`, `privacy`, and `lossy` trust policies so consumers can choose which transformations are allowed.
2. **Transformation Gating**: `lossless` preserves user text, `reversible` blocks code minification/summaries, `privacy` enables redaction, and `lossy` permits aggressive/ultra summaries.
3. **Trust Metadata**: Source maps now include `sourceMap.trustPolicy` and `sourceMap.trust` so downstream tools can audit compression guarantees.
4. **CLI Trust Flag**: Added `--trust <policy>` / `--policy <policy>` and explanation output for selected trust policy.
5. **VS Code Trust Setting**: Added `glyphCompress.trustPolicy` to the extension settings and wired it into compressor activation.

### 🔥 v1.7.0 (Provider-Aware Compression Profiles)

1. **Provider Compression Profiles**: Added provider-specific compression profiles for `raw`, `openai`, `anthropic`, `gemini`, and `local` model workflows.
2. **Estimator-Guided Dynamic Dictionaries**: Dynamic dictionary thresholds now adapt per provider so OpenAI/local profiles can be more compact while Anthropic stays more cache-stable.
3. **Source Map Profile Metadata**: Source maps now include `provider` and `profile` metadata, and dynamic entries record which provider strategy selected them.
4. **CLI Provider Flag**: Added `--provider <provider>` so command-line compression can estimate and profile output for OpenAI, Anthropic, Gemini-compatible, local, or raw text targets.
5. **Typed Public Profiles**: TypeScript declarations now expose `ProviderCompressionProfile` and `PROVIDER_COMPRESSION_PROFILES` for downstream tooling.

### 🔥 v1.6.0 (AST-Like Code Block Source Spans)

1. **Code Block Token Maps**: Minified and summarized code blocks now include `tokens` metadata for structural source tokens.
2. **Top-Level AST Map**: Added `sourceMap.ast` so downstream tools can inspect structural code spans without walking every code block.
3. **Language-Aware Tokens**: Tracks imports, exports, functions, classes, declarations, return/yield, package/use/using, visibility, and type markers across JS/TS, Python, Rust, Go, Java/C#, and C/C++ families.
4. **Typed AST Spans**: TypeScript declarations now include `GlyphAstTokenSpan`, and `getReversibleDictionaries()` exposes `ast` metadata.
5. **Release Metadata**: Updated source maps, workspace codebooks, tests, README, roadmap, issue templates, npm metadata, and VS Code extension metadata for v1.6.0.

### 🔥 v1.5.0 (Privacy Firewall Mode)

1. **Opt-In Privacy Firewall**: Added `privacyFirewall: true` / `privacy: true` to redact secrets and sensitive identifiers before prompt compression.
2. **Safe Redaction Placeholders**: API keys, tokens, secret assignments, emails, IP addresses, AWS keys, GitHub tokens, JWTs, and bearer tokens are replaced with stable placeholders such as `⟦SECRET_ASSIGNMENT_1⟧`.
3. **Non-Revealing Source Maps**: Added `sourceMap.privacy` entries with redaction kind, label, placeholder, line/column span, and short SHA-256 hash metadata without storing the raw secret.
4. **CLI Privacy Flag**: Added `--privacy` so command-line compression can redact sensitive values before output, clipboard copy, or source-map printing.
5. **Release Metadata**: Updated source maps, workspace codebooks, tests, README, roadmap, issue templates, npm metadata, and VS Code extension metadata for v1.5.0.

### 🔥 v1.4.0 (Extension & Proxy Smoke Suites)

1. **VS Code Activation Smoke Test**: Added a mocked VS Code host suite that verifies extension activation reaches ready state and registers every contributed command.
2. **Proxy Forwarding Smoke Test**: Added a local proxy suite that confirms chat payload compression, glyph protocol injection, upstream path preservation, and corrected `content-length` forwarding.
3. **Extension CJS Loading Hardening**: The VS Code extension now loads the CommonJS middleware artifact directly, preventing activation-path module format drift.
4. **Focused Test Scripts**: Added `test:extension` and `test:proxy`, and wired both into `npm test` and release validation.
5. **Release Metadata**: Updated source maps, workspace codebooks, tests, README, roadmap, issue templates, npm metadata, and VS Code extension metadata for v1.4.0.

### 🔥 v1.3.0 (Semantic Source Map Spans)

1. **Line/Column Source Spans**: Source map entries now include `span.start` and `span.end` with line, column, and offset metadata for tracked replacements.
2. **Symbol-Level Mappings**: Added a `sourceMap.symbols` array that maps generated glyphs back to their original prompt, tech name, file path, diagnostic, dynamic dictionary, or code block source.
3. **Reversible Span Access**: `getReversibleDictionaries()` now exposes `symbols` alongside files, dynamic entries, diagnostics, and code blocks.
4. **Typed Source Maps**: TypeScript declarations now include `GlyphSourcePosition`, `GlyphSourceSpan`, and `GlyphSymbolSpan`.
5. **Release Metadata**: Updated source maps, workspace codebooks, tests, README, roadmap, and VS Code extension metadata for v1.3.0.

### 🔥 v1.2.0 (Provider Accuracy & Test Suites)

1. **Provider-Aware Token Estimates**: Added OpenAI, Anthropic, Gemini-compatible, local-model, and raw text estimator profiles for more realistic savings metrics.
2. **Public Estimator API**: Added `estimateProviderTokens()`, `compareTokenEstimates()`, `normalizeProvider()`, and `PROVIDER_TOKEN_PROFILES` to the stable package exports.
3. **Split Test Suites**: Added focused `test:unit`, `test:cli`, `test:workspace`, `test:metadata`, and `test:integration` scripts, with `npm test` running the full suite runner.
4. **Benchmark Alignment**: The benchmark now uses provider-specific estimates for chat payloads instead of a single generic character heuristic.
5. **Release Metadata**: Updated source maps, workspace codebooks, tests, README, roadmap, and VS Code extension metadata for v1.2.0.

### 🔥 v1.1.1 (License Hardening)

1. **AGPL-3.0-only Metadata**: Root package, VS Code extension, and package lock metadata now use the more precise `AGPL-3.0-only` SPDX identifier.
2. **Commercial License Gate**: Added explicit commercial-use language clarifying that proprietary, hosted, SaaS, embedded, OEM, marketplace, or private redistribution rights require a separate written agreement.
3. **NOTICE and Licensing Policy**: Added `NOTICE` and `docs/licensing.md` so npm, GitHub, and enterprise reviewers see the licensing posture directly.
4. **Contributor Safeguards**: Added contribution licensing terms and a PR checklist item to preserve the dual-license model for future contributions.

### 🔥 v1.1.0 (Contributor & Release Hygiene)

1. **Contributor Guide**: Added `CONTRIBUTING.md` with setup, testing, documentation, and API stability expectations.
2. **Release Documentation**: Added `docs/release.md` and `docs/architecture.md` for maintainers and technical reviewers.
3. **GitHub Templates**: Added issue templates for bugs, features, provider compatibility, benchmark submissions, and a PR checklist.
4. **Link Checking**: Added `npm run check:links` and wired it into CI.
5. **Release Metadata**: Updated tests and package metadata to verify contributor hygiene assets.

### 🔥 v1.0.0 (Stable Platform)

1. **Stable Public API**: The `GlyphCompressor`, provider wrappers, source maps, workspace intelligence exports, CLI commands, and VS Code settings are documented as the stable `1.x` platform surface.
2. **TypeScript Declarations**: Added package-level declarations for the middleware, source maps, workspace codebooks, intent detection, and repository doctor APIs.
3. **CI and Packaging Validation**: Added GitHub Actions coverage for Node LTS tests, benchmarks, npm pack dry-runs, and VS Code extension packaging.
4. **Formal Governance Docs**: Added security, privacy, and enterprise deployment documentation for production adoption.
5. **Lean npm Package**: Added an explicit package allowlist so npm releases include runtime, docs, typings, and extension files without scratch artifacts.

### 🔥 v0.9.0 (Workspace Intelligence)

1. **Persistent Workspace Codebook**: Added `glyph-compress inspect` to scan supported project files and write `.glyphcompress/codebook.json` with symbols, imports, diagnostics, owners, and git status.
2. **Intent Detection**: Detects common workflows such as fix error, review diff, implement feature, explain architecture, write tests, and optimize performance.
3. **Relevant File Selection**: Ranks workspace files for a query so compressed context can focus on the files most likely to matter.
4. **Repository Health Commands**: Added `glyph-compress doctor` and `glyph-compress benchmark` for repo readiness and trust metrics from the CLI.

### 🔥 v0.8.0 (Reversible Compression & Source Maps)

1. **Source Map API**: `compressText()` and `compressMessages()` now return a `sourceMap` with file refs, dynamic dictionary entries, diagnostics, code blocks, and replacements.
2. **Reversible Dictionaries**: Added `getReversibleDictionaries()` for file paths, repeated identifiers, diagnostics, and summarized code blocks.
3. **CLI Source Maps**: Added `glyph-compress --source-map` to print source map JSON alongside compressed output.
4. **Round-Trip Coverage**: Added integration tests for source maps, dynamic dictionaries, CommonJS alignment, and CLI source-map output.

### 🔥 v0.7.0 (Trust & Measurement)

1. **Benchmark Harness**: Added `npm run benchmark` to compare original and compressed payloads across raw text, OpenAI, Anthropic, Gemini-compatible, and ultra-mode fixtures.
2. **Trust Metrics**: The benchmark reports payload ratio, token savings, context fidelity score, edit success proxy, and hallucinated file references.
3. **CLI Explain Mode**: Added `glyph-compress --explain` to show level behavior, indexed file refs, dynamic dictionary entries, and detected compression changes.
4. **Fixture Coverage**: Added CLI trust-feature coverage to the integration suite.

### 🔥 v0.6.1 (Packaging & VS Code Hardening)

1. **Root API Alignment**: The documented `GlyphCompressor`, `wrapOpenAI`, and `wrapAnthropic` imports are now exported from the package root.
2. **CommonJS Entry Point**: Added the missing CommonJS package entry so `require('glyph-compress')` works for CJS consumers.
3. **VS Code Proxy Configuration**: The extension proxy now respects `glyphCompress.targetApiUrl` instead of using a hardcoded provider URL.
4. **Opt-In Workspace Rules**: Automatic writes to `.cursorrules` and `.github/copilot-instructions.md` are gated behind `glyphCompress.autoUpdateWorkspaceRules`.

For future release planning and repository improvement priorities, see the [GlyphCompress Roadmap](ROADMAP.md). For contribution, licensing, and operational guidance, see [CONTRIBUTING.md](CONTRIBUTING.md), [docs/licensing.md](docs/licensing.md), [docs/release.md](docs/release.md), [docs/architecture.md](docs/architecture.md), [SECURITY.md](SECURITY.md), [PRIVACY.md](PRIVACY.md), and [ENTERPRISE.md](ENTERPRISE.md).

### 📏 Benchmark Snapshot (v1.12.0)

`npm run benchmark` currently reports an aggregate payload compression ratio of **1.4x**, **28% genuine token savings**, **100% context fidelity score**, **100% edit success proxy**, and **0 hallucinated file references** across representative fixtures. These numbers are calibrated with Unicode token penalties and per-glyph breakeven logic — every reported saving is a real, net-positive token reduction.

### 🧪 Realistic Benchmark Notes

`npm run benchmark:realistic` measures four behaviors that the fixture benchmark does not capture by itself:

1. **Real repository corpus compression** on files like `README.md`, `ROADMAP.md`, and core runtime sources.
2. **Chat payload overhead** after the glyph codebook is injected for OpenAI and Anthropic-style requests.
3. **Multi-turn chat amortization** across cumulative IDE-style conversations.
4. **Enterprise nominal IDE usage** across professional workflows such as PR review, incident response, test planning, and release readiness.
5. **Local throughput and latency** under repeated compression load.

The current realistic benchmark shows a more nuanced picture than the synthetic fixture table below:

- Raw repository files usually land around **1.2x-1.4x** compression in `light`, `standard`, and `aggressive` modes.
- `ultra` can be dramatically better on some prose-heavy documents, but not on every file.
- The **user message alone** usually compresses well for chat prompts.
- The **full first-turn chat payload** can still get worse on short requests because the injected codebook outweighs the user-message savings.
- The **cumulative multi-turn payload** is now measured separately, so you can see whether repeated turns start to amortize the codebook or keep carrying a net overhead.
- The new **enterprise nominal usage** section reports a weighted professional-IDE summary. In the current benchmark, OpenAI lands around **4% full-payload savings** and **17% isolated user-message savings**.
- Anthropic now uses a **hybrid wrapper strategy**: first-turn requests keep `system` lightweight, while multi-turn transcripts switch to structured cacheable blocks once assistant history exists.
- Anthropic-oriented sections include both a transmitted **payloadSaved** metric and a **cache-adjusted estimate**. In the current benchmark, Anthropic remains slightly negative on weighted transmitted payload at about **-5%**, while the cache-adjusted weighted estimate is still positive at about **9%**. This is a benchmark estimate, not a billing guarantee.

Use `npm run benchmark` as the stable regression benchmark and `npm run benchmark:realistic` when you want a more honest estimate of repository-scale and chat-payload behavior.

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

# Explain what changed during compression
npx glyph-compress src/app.ts --level ultra --explain

# Print reversible source map metadata
npx glyph-compress src/app.ts --level ultra --source-map

# Redact secrets before printing or copying compressed output
npx glyph-compress .env --privacy --source-map

# Build a persistent workspace codebook and rank relevant files
npx glyph-compress inspect "fix AuthenticationManager error"

# Check repository readiness for GlyphCompress workflows
npx glyph-compress doctor

# Run benchmark metrics through the CLI
npx glyph-compress benchmark
```

### Command Line (CLI): Available Commands

```bash
npx glyph-compress [file|command] [options]
```

| Command | Purpose | Example |
|---|---|---|
| `[file]` | Compress a single file and print the compressed payload plus the shared codebook. | `npx glyph-compress src/app.ts` |
| `inspect [query]` | Build `.glyphcompress/codebook.json`, detect intent, and rank relevant workspace files. | `npx glyph-compress inspect "fix auth error"` |
| `doctor` | Check repository readiness plus optional local checks for installed extension version, Glyph settings, proxy config, and provider credentials. | `npx glyph-compress doctor` |
| `benchmark` | Run the benchmark harness from the current repository. | `npx glyph-compress benchmark` |

### Command Line (CLI): Options

| Option | Values | Purpose | Example |
|---|---|---|---|
| `-l, --level <level>` | `light`, `standard`, `aggressive`, `ultra` | Select compression aggressiveness. Default: `standard`. | `npx glyph-compress src/app.ts --level ultra` |
| `-c, --copy` | flag | Copy compressed output to the system clipboard. | `npx glyph-compress src/app.ts --copy` |
| `-x, --explain` | flag | Print what was compressed, indexed, preserved, or transformed. | `npx glyph-compress src/app.ts --explain` |
| `--source-map` | flag | Print reversible source map JSON, including file refs, dynamic entries, diagnostics, symbols, AST/code block metadata, privacy metadata, provider metadata, and trust metadata. | `npx glyph-compress src/app.ts --source-map` |
| `--privacy` | flag | Redact common secrets and sensitive identifiers before compression/output. | `npx glyph-compress .env --privacy --source-map` |
| `--provider <provider>` | `raw`, `openai`, `anthropic`, `gemini`, `local` | Select provider-aware estimates and compression profile. Default: `raw`. | `npx glyph-compress src/app.ts --provider openai --explain` |
| `--trust <policy>` | `lossless`, `reversible`, `privacy`, `lossy` | Select allowed transformation policy. Default: auto. | `npx glyph-compress src/app.ts --trust reversible --source-map` |
| `--policy <policy>` | `lossless`, `reversible`, `privacy`, `lossy` | Alias for `--trust`. | `npx glyph-compress src/app.ts --policy privacy` |
| `--json` | flag | Print machine-readable JSON for supported commands such as `inspect` and `doctor`. | `npx glyph-compress inspect "review diff" --json` |
| `-p, --proxy [port]` | optional port | Start the Zero-Command Transparent Proxy. Default port: `8080`. | `npx glyph-compress --proxy 8080` |
| `-h, --help` | flag | Show built-in CLI help. | `npx glyph-compress --help` |

### Command Line (CLI): Practical Examples

```bash
# Standard file compression
npx glyph-compress README.md

# Maximum compression for a TypeScript source file
npx glyph-compress src/app.ts --level ultra

# Provider-aware compression for OpenAI chat payloads
npx glyph-compress src/app.ts --provider openai --level standard --explain

# Anthropic/cache-stable profile with reversible source map metadata
npx glyph-compress src/app.ts --provider anthropic --trust reversible --source-map

# Exact-preservation mode: useful when you want metadata without transformations
npx glyph-compress src/app.ts --trust lossless --source-map

# Privacy-first mode for files that may contain secrets or customer data
npx glyph-compress .env --privacy --trust privacy --source-map

# JSON workspace inspection for automation or CI scripts
npx glyph-compress inspect "implement billing validation" --json

# Repository readiness check in JSON form
npx glyph-compress doctor --json

# Start the local OpenAI-compatible compression proxy
npx glyph-compress --proxy 8080
```

**Cost savings**: ~$200/month at 50 requests/day with Claude Sonnet.

## 🚀 Quick Start

### Standalone (any project)

```javascript
import { GlyphCompressor } from 'glyph-compress';

const gc = new GlyphCompressor({ level: 'standard' });
const { compressed, stats, sourceMap } = gc.compressText(
  "Fix the TypeScript error in src/components/UserProfile.tsx line 42: " +
  "Property 'name' does not exist on type 'User'"
);

console.log(compressed);
// → "⺌✗ ◈₍1₎:42 'name'∉User"
console.log(stats);
// → { ratio: '5.5x', savedPct: '82%' }
console.log(sourceMap.files);
// → [{ ref: '◈₍1₎', path: 'src/components/UserProfile.tsx', domain: 'frontend' }]
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

`wrapAnthropic()` now keeps first-turn requests lightweight and only promotes the system prompt into structured cacheable blocks when the transcript already contains assistant history. That reduces avoidable overhead on short requests while preserving cache-oriented behavior for longer IDE conversations.

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

1. Install from the **[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=neolambo.glyph-compress)** with extension id `neolambo.glyph-compress`.
2. For the exact latest GitHub release build, download `glyph-compress-<version>.vsix` from **[GitHub Releases](https://github.com/Neolambo/glyph-compress/releases)** and install it locally:
   ```powershell
    code.cmd --install-extension .\glyph-compress-1.12.0.vsix --force
   code.cmd --list-extensions --show-versions | Select-String -Pattern 'neolambo.glyph-compress'
   ```
3. See live compression stats in the status bar: `⚡ GC: 3.5x | -1200 tok`

The Marketplace listing exists publicly; GitHub Releases are also published for users who need a specific VSIX version immediately after each release.

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
- `GlyphCompress: Show Compression Stats` — Dashboard with session statistics
- `GlyphCompress: Start Zero-Command Proxy` — Start the local compression proxy
- `GlyphCompress: Stop Zero-Command Proxy` — Stop the local compression proxy
- `GlyphCompress: Compress Entire Workspace` — Generate a compressed workspace summary

**Settings:**
```json
{
  "glyphCompress.enabled": true,
  "glyphCompress.provider": "gemini",        // "auto" | "raw" | "openai" | "anthropic" | "antigravity" | "gemini" | "local"
  "glyphCompress.compressionLevel": "standard", // "light" | "standard" | "aggressive" | "ultra"
  "glyphCompress.trustPolicy": "privacy",     // "auto" | "lossless" | "reversible" | "privacy" | "lossy"
  "glyphCompress.showStatusBar": true,
  "glyphCompress.autoUpdateWorkspaceRules": false,
  "glyphCompress.targetApiUrl": "https://generativelanguage.googleapis.com"
}
```

`glyph-compress doctor` now reports repository basics first, then adds optional local environment checks for:

- installed `neolambo.glyph-compress` extension version
- detected `glyphCompress.*` VS Code settings
- proxy config in local Continue config files
- provider credential env vars such as `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, or `GOOGLE_API_KEY`

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
2. Go to **Models** and choose an **OpenAI-compatible** entry.
3. Under the provider settings, enter your real upstream API key.
4. Set the **Base URL / Override OpenAI Base URL** to: `http://localhost:8080/v1`
5. If you are proxying Gemini-compatible traffic, keep GlyphCompress VS Code settings aligned with:
  - `glyphCompress.provider = gemini`
  - `glyphCompress.targetApiUrl = https://generativelanguage.googleapis.com`
6. All Chat and Cmd+K requests will now flow through the local proxy.

**Cline / RooCode (VS Code Extensions)**
1. Open the Cline/RooCode settings panel.
2. Select **OpenAI Compatible** as your API Provider.
3. **Base URL**: `http://localhost:8080/v1`
4. **API Key**: *Your real API key*
5. **Model ID**: `gpt-4o` (or whichever you prefer).

**Continue.dev**
1. Open `~/.continue/config.yaml`.
2. Add or edit your model configuration:
```yaml
models:
  - title: Gemini 2.5 Flash (Glyph Proxy)
    provider: openai
    model: gemini-2.5-flash
    apiKey: YOUR_REAL_API_KEY
    apiBase: http://localhost:8080/v1
```

If you prefer OpenAI or Anthropic upstreams, keep the same `apiBase` and swap only the upstream API key, model id, and GlyphCompress provider/target settings.

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
| **standard** | Prompt patterns, tech names, file paths, diagnostics, repeated identifiers | Default coding assistant payloads |
| **aggressive** | Standard compression plus multi-language syntax minification inside code blocks | Debugging or review where code structure still matters |
| **ultra** | Aggressive compression plus architectural code summaries and redundancy stripping | Maximum context savings when inner code logic is less important |

Use `sourceMap` or `--source-map` whenever you need to inspect or reverse the compressed references after the payload is sent.

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
│   ├── index.d.ts                # Stable TypeScript declarations
│   ├── workspace-intelligence.js  # Workspace codebook, intent detection, and file ranking
│   ├── radical-alphabet.js       # 96 symbols: radicals + glyphs
│   ├── compressor.js             # Multi-level compression engine
│   └── system-prompt-generator.js# Codebook system prompt generator
├── vscode-ext/
│   ├── package.json              # VS Code extension manifest
│   ├── extension.js              # Extension activation & commands
│   └── glyph-middleware.js       # Core middleware (OpenAI/Claude/Antigravity)
├── test/
│   ├── run-suites.js             # Runs focused test suites
│   ├── unit.js                   # Core compressor and estimator checks
│   ├── cli.js                    # CLI explain/source-map smoke checks
│   ├── workspace.js              # Workspace intelligence smoke checks
│   ├── metadata.js               # Package/docs metadata checks
│   ├── benchmark.js              # Trust and measurement benchmark harness
│   └── integration.js            # 41 legacy integration checks
├── examples/
│   ├── openai-example.js         # OpenAI usage example
│   └── claude-example.js         # Claude usage example
├── package.json
├── SECURITY.md
├── PRIVACY.md
├── ENTERPRISE.md
├── COMMERCIAL_LICENSE.md
├── NOTICE
├── LICENSE
├── ROADMAP.md
└── README.md
```

## 🧪 Tests

```bash
# Run all test suites
npm test

# Run focused suites
npm run test:unit
npm run test:cli
npm run test:workspace
npm run test:extension
npm run test:proxy
npm run test:metadata
npm run test:integration

# Run the stable release validation bundle
npm run check

# Check local Markdown links
npm run check:links

# Run trust and measurement benchmark
npm run benchmark

# Run realistic corpus, payload, and throughput benchmark
npm run benchmark:realistic

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

### v1.9.3 (Proxy Diagnostics Hotfix)
- **Upstream Status Visibility**: Proxy forwarding now logs upstream HTTP status codes for successful and failed provider responses.
- **Safe Error Diagnostics**: Upstream error bodies are logged with bearer tokens and API key fields redacted.
- **Stream Completion Logs**: Successful responses log completed byte counts, and early client disconnects are flagged for Continue/Cursor-style debugging.

### v1.9.0 (Proxy and Packaging Hardening)
- **Proxy Options Preserved**: CLI and VS Code proxy startup now pass provider, trust policy, privacy, and target API options into the compressor.
- **Gemini-Compatible Forwarding**: OpenAI-compatible `/v1/*` requests are mapped to Gemini's `/v1beta/openai/*` route when the target is Google Generative Language.
- **ESM Export Cleanup**: Public ESM middleware import now goes through `src/glyph-middleware.js`, avoiding Node warnings caused by importing ESM from the VS Code package scope.
- **Focused npm Tarball**: The package allowlist now includes runtime files and essential docs without publishing broad outreach drafts or demo-generation scripts.
- **VS Code Hardening**: Proxy startup, status-bar toggling, and interval disposal were tightened for a cleaner extension lifecycle.

### v1.8.0 (Safe Compression Trust Policies)
- **Explicit Trust Policies**: Added `TRUST_POLICY_PROFILES` for `lossless`, `reversible`, `privacy`, and `lossy` modes.
- **Policy-Enforced Transformations**: Lossless mode preserves input text, reversible mode blocks code minification/summaries, privacy mode redacts sensitive values, and lossy mode allows aggressive/ultra transformations.
- **Source Map Trust Metadata**: Added `sourceMap.trustPolicy` and `sourceMap.trust` for audit-friendly downstream tooling.
- **CLI and VS Code Controls**: Added CLI `--trust <policy>` / `--policy <policy>` and VS Code `glyphCompress.trustPolicy` setting.
- **Release Metadata**: Updated source map, workspace codebook, benchmark, README, roadmap, issue template, npm, and VS Code extension versions to `1.8.0`.

### v1.7.0 (Provider-Aware Compression Profiles)
- **Provider Compression Profiles**: Added `PROVIDER_COMPRESSION_PROFILES` for raw, OpenAI, Anthropic, Gemini-compatible, and local-model targets.
- **Estimator-Guided Thresholds**: Dynamic dictionary selection now uses provider-specific savings thresholds and dictionary caps.
- **Source Map Metadata**: Added top-level `sourceMap.provider` and `sourceMap.profile`, with provider/profile metadata on dynamic entries.
- **CLI Provider Selection**: Added `--provider <provider>` and explanation output for the selected provider/profile strategy.
- **Release Metadata**: Updated source map, workspace codebook, benchmark, README, roadmap, issue template, npm, and VS Code extension versions to `1.7.0`.

### v1.6.0 (AST-Like Code Block Source Spans)
- **Code Block Token Maps**: Added `codeBlocks[].tokens` entries for structural tokens inside aggressive minified and ultra summarized code blocks.
- **Top-Level AST Map**: Added `sourceMap.ast` with span metadata and block mode for fast inspection by debugging, explain, and editor workflows.
- **Language-Aware Coverage**: Tracks imports, exports, functions, classes, declarations, return/yield, package/use/using, visibility, and type markers across common language families.
- **TypeScript Declarations**: Added `GlyphAstTokenSpan` and exposed `ast` through `getReversibleDictionaries()`.
- **Release Metadata**: Updated source map, workspace codebook, benchmark, README, roadmap, issue template, npm, and VS Code extension versions to `1.6.0`.

### v1.5.0 (Privacy Firewall Mode)
- **Opt-In Redaction**: Added `privacyFirewall: true` / `privacy: true` for library consumers and `--privacy` for the CLI.
- **Sensitive Pattern Coverage**: Redacts common API keys, secret assignments, bearer tokens, JWTs, GitHub tokens, AWS access keys, emails, and IPv4 addresses before compression.
- **Safe Source Map Metadata**: Added `sourceMap.privacy` with placeholder, kind, label, span, and short SHA-256 hash metadata without retaining raw sensitive values.
- **Reversible Dictionary Access**: Added privacy redaction entries to `getReversibleDictionaries()` for inspection workflows.
- **Release Metadata**: Updated source map, workspace codebook, benchmark, README, roadmap, issue template, npm, and VS Code extension versions to `1.5.0`.

### v1.4.0 (Extension & Proxy Smoke Suites)
- **VS Code Activation Coverage**: Added a mocked VS Code extension host smoke suite that checks activation, command registration, output logging, and subscription tracking.
- **Proxy Coverage**: Added a local proxy smoke suite that stubs upstream HTTPS, verifies compressed chat forwarding, preserves OpenAI-compatible paths, and checks corrected `content-length`.
- **Activation Hardening**: Updated the extension activation path to require `glyph-middleware.cjs`, keeping VS Code's CommonJS host aligned with the packaged middleware artifact.
- **Focused Scripts**: Added `npm run test:extension` and `npm run test:proxy`, and included both in the full suite runner.
- **Release Metadata**: Updated source map, workspace codebook, benchmark, README, roadmap, issue template, npm, and VS Code extension versions to `1.4.0`.

### v1.3.0 (Semantic Source Map Spans)
- **Line/Column Ranges**: Added span metadata with line, column, and offset positions for prompt, tech, file, diagnostic, dynamic dictionary, and code block mappings.
- **Symbol-Level Source Maps**: Added `sourceMap.symbols` to map emitted glyphs back to their original source text and replacement kind.
- **Reversible Dictionaries**: Added symbol spans to `getReversibleDictionaries()` for downstream inspection and debugging workflows.
- **TypeScript Declarations**: Added typed source position, source span, and symbol span interfaces.
- **Integration Coverage**: Expanded integration coverage to 41 checks with multi-line span assertions.

### v1.2.0 (Provider Accuracy & Test Suites)
- **Provider-Aware Estimates**: Added reusable token estimator profiles for raw text, OpenAI, Anthropic, Gemini-compatible, and local-model payloads.
- **Public API Exports**: Exposed `estimateProviderTokens()`, `compareTokenEstimates()`, `normalizeProvider()`, and `PROVIDER_TOKEN_PROFILES` from ESM, CommonJS, and TypeScript declarations.
- **Benchmark Accuracy**: Updated the benchmark to use provider-specific estimates for chat-style fixtures.
- **Split Test Suites**: Added focused unit, CLI, workspace, metadata, and integration suite scripts, with `npm test` orchestrating all suites.
- **Integration Coverage**: Expanded integration metadata coverage to 40 checks.

### v1.1.1 (License Hardening)
- **Precise SPDX Metadata**: Updated npm and VS Code extension metadata to `AGPL-3.0-only`.
- **Commercial Gate**: Reworked commercial licensing language to state that proprietary, hosted, SaaS, embedded, OEM, marketplace, or private redistribution rights require a separate written agreement.
- **NOTICE and Policy Docs**: Added `NOTICE` and `docs/licensing.md`, and included them in npm packaging.
- **Contributor Terms**: Added contribution licensing terms and a pull request checklist item to protect future dual licensing.

### v1.1.0 (Contributor & Release Hygiene)
- **Contributor Guide**: Added setup, testing, documentation style, public API, and release-process guidance.
- **Release and Architecture Docs**: Added focused maintainer checklists and architecture notes under `docs/`.
- **GitHub Templates**: Added bug, feature, provider compatibility, benchmark submission, and pull request templates.
- **Link Checking**: Added `npm run check:links` and CI coverage for local Markdown links.
- **Integration Coverage**: Added contributor hygiene metadata checks to the integration suite.

### v1.0.0 (Stable Platform)
- **Stable API Surface**: Documented and typed the public `GlyphCompressor`, provider wrappers, source maps, workspace intelligence helpers, and CLI workflows.
- **TypeScript Declarations**: Added `src/index.d.ts` and middleware subpath declarations for editor and package consumer support.
- **CI Validation**: Added GitHub Actions for Node 20/22 tests, benchmarks, npm pack dry-runs, and VS Code extension packaging.
- **Formal Docs**: Added security, privacy, and enterprise deployment documents for production adoption.
- **Packaging Hygiene**: Added a package allowlist to avoid publishing generated codebooks, scratch files, historical VSIX files, and unnecessary assets.

### v0.9.0 (Workspace Intelligence)
- **Persistent Codebook**: Added workspace scanning and `.glyphcompress/codebook.json` output with files, symbols, imports, diagnostics, owners, and git context.
- **Intent Detection**: Added workflow detection for fix error, review diff, implement feature, explain architecture, write tests, and optimize performance.
- **Relevant File Ranking**: Added query-aware file selection so future compression can focus on relevant files by default.
- **CLI Commands**: Added `inspect`, `doctor`, and `benchmark` commands with JSON support for automation.
- **Integration Coverage**: Added workspace intelligence, codebook persistence, doctor, CLI inspect, and intent-detection tests.

### v0.8.0 (Reversible Compression & Source Maps)
- **Source Map API**: `compressText()` and `compressMessages()` return a `sourceMap` object for files, dynamic identifiers, diagnostics, code blocks, and replacements.
- **Reversible Dictionaries**: Added `getSourceMap()` and `getReversibleDictionaries()` to inspect mappings after compression.
- **CLI Source Maps**: Added `--source-map` to print reversible source map metadata from the CLI.
- **CommonJS Alignment**: Regenerated the CommonJS middleware so `require('glyph-compress')` consumers receive the same source map behavior.
- **Integration Coverage**: Added source map, dynamic dictionary, and CLI source-map tests.

### v0.7.0 (Trust & Measurement)
- **Benchmark Harness**: Added `test/benchmark.js` and `npm run benchmark` for representative raw, OpenAI, Anthropic, Gemini-compatible, and ultra-mode payloads.
- **Trust Metrics**: Reports payload compression ratio, token savings, context fidelity score, edit success proxy, and hallucinated file references.
- **CLI Explain Mode**: Added `--explain` / `-x` to show compression behavior, indexed file refs, dynamic dictionary entries, and detected changes.
- **Integration Coverage**: Added CLI explain coverage to the integration test suite.

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
- **Monetization & Legal**: Migrated to Dual Licensing model (AGPL-3.0-only for open source, Enterprise for commercial).
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

GlyphCompress is distributed under a **dual-license** model:

1. **Open source: AGPL-3.0-only**. The public repository and npm package may be used under the AGPL-3.0-only terms in [LICENSE](LICENSE). If you modify, integrate, redistribute, or offer GlyphCompress over a network, make sure you can satisfy the AGPL obligations.
2. **Commercial license**. Proprietary, closed-source, private redistribution, SaaS, hosted, embedded, OEM, marketplace, or enterprise use without AGPL obligations requires a separate written commercial agreement. Downloading, installing, forking, importing, or bundling the package does not grant commercial rights.

See [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), [docs/licensing.md](docs/licensing.md), and [NOTICE](NOTICE) for the project licensing position. For commercial terms, contact `campiossasco1@gmail.com`.

## 🤝 Contributing

Contributions welcome! Areas of interest:

- **New radicals** for emerging technologies
- **Language support** for non-English prompts (Italian, German, French are already supported; Spanish, Portuguese, Japanese, and more are welcome)
- **VS Code Marketplace** metadata, examples, and compatibility reports
- **Benchmark data** from real-world IDE sessions
- **LLM comprehension tests** with different models

By submitting a contribution, you confirm that it can be used under the project dual-license model described in [CONTRIBUTING.md](CONTRIBUTING.md).
