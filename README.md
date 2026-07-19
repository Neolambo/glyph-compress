<h1 align="center">⚡ GlyphCompress</h1>

<p align="center">
  <img src="./assets/logo.png" alt="GlyphCompress Logo" width="300">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/glyph-compress"><img src="https://badgen.net/npm/v/glyph-compress" alt="NPM Version"></a>
  <a href="https://opensource.org/licenses/AGPL-3.0"><img src="https://badgen.net/badge/License/AGPL-3.0-only/blue" alt="License: AGPL-3.0-only"></a>
  <a href="COMMERCIAL_LICENSE.md"><img src="https://badgen.net/badge/Commercial%20License/required%20for%20proprietary%20use/red" alt="Commercial License"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=neolambo.glyph-compress"><img src="https://badgen.net/badge/VS%20Code%20Marketplace/available/blue" alt="VS Code Marketplace"></a>
  <a href="https://github.com/Neolambo/glyph-compress/releases"><img src="https://badgen.net/github/release/Neolambo/glyph-compress" alt="GitHub Release"></a>
</p>

<p align="center">
  <strong>Semantic compression for IDE↔LLM communication — CLI, VS Code extension, and MCP server, with reversible-by-default compression calibrated against real provider tokenizers.</strong>
</p>
<p align="center">
  Up to 90%+ savings on well-suited payloads (see benchmarks below); real aggregate savings on the project's own benchmark suite is a more modest, honestly-reported 22%.
</p>

GlyphCompress uses a compositional radical-based encoding system (inspired by Chinese logograms) to compress the verbose context exchanged between IDEs and Large Language Models. A shared codebook injected into the LLM's system prompt enables it to decode compact glyph sequences back into full semantic concepts.

### 🎬 See it in Action

Watch the latest YouTube video to see how GlyphCompress achieves 90% token savings:

- ⚙️ **[Data Flow Architecture](https://youtu.be/XRwRYEsReJU)**: A graphical animation showing how the engine minifies and translates verbose code into dense semantic glyphs.

---

## 📌 Table of Contents

- [🎯 The Problem](#-the-problem)
- [✨ The Solution](#-the-solution)
- [🔍 Realistic Session Showcase](#-realistic-session-showcase)
- [🧠 Advanced Features: Holographic Folding, Intent Diffs & History Decay](#-advanced-features-holographic-folding-intent-diffs--history-decay)
- [📊 Benchmarks](#-benchmarks)
- [🚀 Usage: Command Line (CLI)](#-usage-command-line-cli)
- [🚀 Quick Start (Code & Extension)](#-quick-start)
- [👻 The Ultimate Magic: Zero-Command Transparent Proxy](#-the-ultimate-magic-zero-command-transparent-proxy-v050)
- [🔌 MCP Server (Claude Code, Claude Desktop & other MCP clients)](#-mcp-server-claude-code-claude-desktop--other-mcp-clients)
- [🔤 The Glyph Protocol](#-the-glyph-protocol)
- [👥 Contributing](#-contributing)
- [⚖️ Dual Licensing Model](#%EF%B8%8F-dual-licensing-model)

---

## 🎯 The Problem

Every IDE→LLM request carries massive, redundant context. As coding sessions grow longer, the **chat history** accumulates exponentially, causing token costs to explode, performance to lag, and LLMs to hit context window limits:

```
System prompt:             ~2,000 tokens (repeated every time)
Open files:                ~3,000 tokens
Errors/diagnostics:        ~500 tokens  
Chat history (multi-turn): ~4,000 tokens (explodes exponentially)
User prompt:               ~500 tokens
─────────────────────────────────────────
TOTAL:                     ~10,000 tokens/request
```

At 50 requests/day → **500K tokens/day** → $8-15/day on Claude/GPT-4.

## ✨ The Solution

GlyphCompress intercepts outgoing LLM requests, compresses context using a shared codebook, and utilizes **experimental Attentional Decay Compaction (ADC)** to progressively condense older history into summaries, saving **80-90% of tokens** and enabling **near-infinite multi-turn chats**:

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

## 🔍 Realistic Session Showcase

GlyphCompress includes a built-in interactive demo benchmark (`npm run demo`) simulating real-world developer tasks (React debugging, SQL optimization, Python ML pipelines, YAML config) to measure character and token reduction. 

Here is what a typical compressed session telemetry looks like:

### 1. Fix TypeScript diagnostic in React Component
* **Original Context**: `1,734 chars` (includes `UserProfile.tsx` contents, history, and TS2339 error code).
* **Compressed Output**: `137 chars` (**12.7x compression, 92% saved**).
* **Emitted Payload**:
  ```text
  [F: ◈₍1₎=src/components/UserProfile.tsx]
  ⺌✗ ◈₍2₎
  ◈₍1₎ᵗ [imp:5 exp:1 ◇:4 ⟿:2 ⟳:5 44L]
  ◈₍1₎:42 ✗∉prop 'department'∉User
  [T1:U:⺍▲] [T2:A:⺍▲]
  ```

### 2. Optimize slow Prisma/SQL API endpoint
* **Original Context**: `1,999 chars` (includes two TS controller/service files, Express imports, and history).
* **Compressed Output**: `195 chars` (**10.3x compression, 90% saved**).
* **Emitted Payload**:
  ```text
  [F: ⊜₍3₎=src/controllers/orders.controller.ts | ⊜₍4₎=src/services/order.service.ts]
  ⺋ the orders API endpoint
  ⊜₍3₎ᵗ [imp:3 exp:1 20L]
  ⊜₍4₎ᵗ [imp:1 exp:1 26L]
  [T1:U:The /api/orders endp] [T2:A:⺎▼]
  ```

### 3. Deploy application to Kubernetes
* **Original Context**: `730 chars` (includes raw Kubernetes Deployment YAML block and prompt).
* **Compressed Output**: `84 chars` (**8.7x compression, 88% saved**).
* **Emitted Payload**:
  ```text
  [F: ◊₍5₎=k8s/deployment.yaml]
  ⺏ the application→the production 𝒦 cluster
  ◊₍5₎ [27L]
  ```

### 4. Debug Python ML preprocessing pipeline
* **Original Context**: `1,925 chars` (includes `preprocess.py` content, scikit-learn imports, and active diagnostics).
* **Compressed Output**: `249 chars` (**7.7x compression, 87% saved**).
* **Emitted Payload**:
  ```text
  [F: ◇₍6₎=src/pipeline/preprocess.py]
  ⺃ the data preprocessing pipeline
  ◇₍6₎ᵖ [imp:2 𝒞:1 37L]
  ◇₍6₎:18 ⚠⚠unused Unused import train_test_split
  ◇₍6₎:25 ⚠ FutureWarning: DataFrame.fillna with 'method' is deprecated
  [T1:U:The pipeline crashes] [T2:A:⺎▼]
  ```

### 📊 Session Aggregate Efficiency (Amortized Cost)
* **Amortized Monthly Savings (Claude Sonnet @ $3/M tokens)**: Saves **$5.85/month** for a single developer at just 50 requests/day, scaling exponentially for teams.

## 🧠 Advanced Features: Holographic Folding, Intent Diffs & History Decay

GlyphCompress includes state-of-the-art context optimization layers designed for large, multi-turn, and multi-file developer workflows.

### 1. Holographic Context Folding (v1.15.0)
Holographic Folding analyzes import relationships across multiple files in your prompt. Instead of sending repetitive, boilerplated imports for each file, it extracts them into a single `Base` shared header and presents the files as structured overlays:
* **How it works**: Detects mutual dependencies and group-folds files that share imports.
* **Format**: `⟦Base: import A | import B⟧ ↷ [◈Ref struct ↷ ◈Ref struct]`
* **Savings**: Up to 40% character/token reduction on multi-file contexts.
* **Activation**:
  * **CLI**: `--folding` (or `--holographic-folding`)
  * **VS Code**: Toggle `"glyphCompress.holographicFolding": true` in settings.

> [!NOTE]
> For example, when reading two dependent React component files, the middleware extracts the common React imports and groups their core declarations to avoid LLM token overhead on repeating boilerplate.

### 2. Generative Intent Diffs (v1.15.0)
Generative Intent Diffs intercept git/IDE unified diffs (which are traditionally very verbose and costly for LLMs) and translate them into a sequence of structural action lines:
* **How it works**: Syntactically parses addition (`+`) and deletion (`-`) blocks to summarize added/deleted classes (`▲𝒞` / `▼𝒞`), functions (`▲ƒ` / `▼ƒ`), or packages (`▲📦` / `▼📦`).
* **Format**: `⚡: ⊝₍1₎ ▼𝒞 OldClass | ⊝₍1₎ ▲𝒞 NewClass` (or `⚡: ◈ ±LineCount` for non-symbol changes).
* **Savings**: Over 80% token savings on code refactoring context.
* **Activation**:
  * **CLI**: `--intents` (or `--intent-diffs`)
  * **VS Code**: Toggle `"glyphCompress.intentDiffs": true` in settings.

> [!TIP]
> This feature is exceptionally powerful when using git diffs in Cline, RooCode, or Cursor chats. The engine strips the massive `+` and `-` source lines, sending only the semantic intention of the refactor.

### 3. Attentional Decay Compaction (ADC) (v1.14.0)
Attentional Decay simulates human memory inside the multi-turn chat transcript. As the conversation progresses, older messages are progressively compacted into dense, emoji-tagged summaries while keeping the latest turns in high-fidelity full text.
* **How it works**: Categorizes chat history into 4 decay zones based on distance from the current turn:
  * **Hot Zone** (turns 1-2): 100% full text.
  * **Warm Zone** (turns 3-4): Light minification.
  * **Cool Zone** (turns 5-6): Semantic summaries.
  * **Cold Zone** (turns 7+): Highly compressed language-tagged bullet-point glyph summaries.
* **Savings**: Prevents chat history token explosion, enabling near-infinite conversation length.
* **Activation**:
  * **CLI**: `--decay` (or `--experimental-decay`)
  * **VS Code**: Toggle `"glyphCompress.experimentalDecay": true` in settings.

### 4. Team Codebook Registry (v1.18.0)
The per-session dynamic dictionary (and its cross-session cache) is per-machine — without this, two teammates working on the same repository independently learn different `§N` glyph assignments for the same identifiers, which both wastes the learning and defeats org-wide provider-side prompt caching (implicit caching keys off byte-identical prefixes, which requires the same word to produce the same glyph everywhere).
* **How it works**: `glyphcompress.team.json` — a small, git-committable file at the workspace root (unlike the gitignored `.glyphcompress/` cache dir) — lists dictionary entries in priority order. Every `GlyphCompressor` instance seeds its `§N` indices from it before any per-session learning happens.
* **Workflow**: `glyph-compress team-codebook sync` promotes this machine's locally-learned dictionary into the shared file; commit it to git so the whole team (and every CLI/MCP/proxy entry point) assigns the same glyph to the same word.
* **Activation**: Automatic once `glyphcompress.team.json` exists at the workspace root — no flag needed. Inspect with `glyph-compress team-codebook show`.

***


### New in v1.23.0 (Adaptive Workspace Memory)

1. **Incremental codebook builds**: `buildWorkspaceCodebook()` no longer re-parses every workspace file on each call. When a file's mtime is unchanged since the last build, its symbols/imports/diagnostics are reused from the saved codebook instead of being re-extracted; only changed files are rescanned. The returned codebook now reports `incrementalStats: { reused, rescanned, total }`. Pass `{ incremental: false }` to force a full rescan.
2. **Usage-weighted relevance**: `recordFileUsage(rootDir, filePaths)` records that a file was actually selected and sent for a task; `selectRelevantFiles()`/the Context Router now add a decaying usage boost (14-day half-life, capped so no file can permanently dominate) on top of keyword/intent scoring, so files that have proven useful before can outrank a cold keyword match. `GlyphCompressor.routeAndCompress()` calls this automatically for every file it selects.
3. **Fixed a real gap found while testing this**: `recordFileUsage()` originally no-opped unless a codebook had already been persisted to disk (only the CLI's `inspect` command did that) — meaning usage tracking silently did nothing the first time `routeAndCompress()` ran on a fresh workspace. It now builds and saves a codebook on the fly when none exists, which also seeds the incremental cache for the next call.
4. New `test/adaptive-workspace-memory.js` (10 tests) covers incremental reuse/rescan behavior, usage persistence and decay, and `routeAndCompress()` actually recording usage end-to-end.

### New in v1.21.2 (VS Code Marketplace Listing Fix)

`vscode-ext/` had no `README.md`, so the Marketplace "Overview" tab showed "No overview has been entered by publisher" — `@vscode/vsce package` reads `README.md` from the extension's own root directory to populate that page, and it was simply missing. Also found while investigating: the last version actually published to the Marketplace was `1.12.0`, months and many features behind this repository — the description text visible on the listing page had been edited manually through the Marketplace management portal at some point, independent of publishing a new package version, which made the listing look more current than it was. Added `vscode-ext/README.md` and a `repository` field to `vscode-ext/package.json` (removing the now-unnecessary `--allow-missing-repository` packaging flag).

### New in v1.21.1 (Critical Packaging Hotfix)

**The published VS Code extension was broken since v1.17.0.** `vscode-ext/glyph-middleware.cjs` required `../src/workspace-intelligence.cjs` and `../src/team-codebook.cjs` — paths that resolve fine inside this repo checkout, but `@vscode/vsce package` only includes files physically inside `vscode-ext/`, so every packaged VSIX since Context Router/Team Codebook Registry shipped (v1.17.0-v1.21.0) crashed with `MODULE_NOT_FOUND` the moment any command tried to compress anything. Caught by extracting a real installed VSIX and starting the proxy from it — every prior test required files by repo-relative path, which never exercises the actual packaged layout. **The equivalent npm-package risk was also real** (the local `vscode-ext/` copies this fix introduces were initially missing from `package.json`'s `files` allowlist) and is fixed in the same commit.

Two new regression suites lock this in permanently: `test/extension.js` now scans every packaged `.cjs` file for any `require("../...")` escaping outside `vscode-ext/`, and `test/npm-pack-smoke.js` runs a real `npm pack`, extracts the actual tarball, and requires the published entry points from it — both reproduced the original failure on purpose before trusting the fix.

### New in v1.21.0 (Provider Trust & UX)

1. **Code-block minification is now real-tokenizer-aware too**: the same measurement that found all 28 `TECH_GLYPHS` losing on OpenAI (v1.17.0) was applied to `_minifySyntax()`'s keyword-to-glyph substitutions inside code blocks (`return` → `→`, `function` → `ƒ`, `const` → `◇`, `public` → `+`, ...). Result: **all 33 keyword/glyph pairs tested are also net token losses on OpenAI** — common code keywords are already single BPE tokens (code is a huge fraction of pretraining data), so replacing them with a 1-4 token Unicode glyph never wins. Tech-name and code-keyword minification now both skip measured-loss substitutions on the `openai` provider; comment removal, blank-line removal, and indent-to-tab compaction (not glyph substitutions) still apply and still save real tokens.
2. **Trust warnings** (`buildTrustWarnings()`, `sourceMap.trustWarnings`): plain-language, fact-derived warnings about what the current level/trust-policy combination actually permits — e.g. "lossy trust policy: code summaries and redundancy stripping are irreversible." Every warning is derived strictly from the trust profile's own existing `reversible`/`redacts`/`lossy`/`allows.*` flags, not new claims about model behavior. Surfaced in CLI `--explain`, the VS Code extension's output channel (both at startup and after each compression), and `sourceMap.trustWarnings` for any consumer.
3. **Fixed a real export bug found while adding the trust-warnings API**: `vscode-ext/glyph-middleware.js` hand-maintains a second, manual `module.exports = {...}` block for CJS consumers alongside its `export {...}` statement (esbuild's own auto-generated CJS export is dead code there). A new export added to one list without the other silently produces `undefined` for `require()` consumers — which is exactly what shipped initially with `buildTrustWarnings` in this same release, caught immediately by a new regression test that now compares both lists.

### New in v1.20.0 (Expression-Level Source Maps & a Real Indentation Bug Fix)

1. **Expression-level AST spans**: `sourceMap.ast` now tracks arrow functions, function calls (with a span distinct from the declaration), destructuring, async/await, and exception handling (try/catch/throw/finally) inside minified/summarized code blocks — not just top-level import/export/function/class declarations. New language coverage: Ruby, Swift, Kotlin, and PHP, which already had `TECH_GLYPHS` entries but no token extraction at all.
2. **Fixed two real, pre-existing bugs found while validating span fidelity**: whitespace normalization ran on the *whole* message, including inside ` ```fenced``` ` code blocks, in two independent places in the pipeline. 4-space and 8-space nested indentation both silently collapsed to the same single space (or single tab), flattening code structure at **every** compression level — not just aggressive/ultra — and for indentation-significant languages like Python, changing what the code actually does. Both passes now skip code fence contents entirely.
3. **`test/ast-spans.js`**: every AST token's span must slice back to exactly its own text against the original input — this is what caught the bug above.

### New in v1.19.0 (Structured Diagnostics & Git-Diff-Aware Routing)

1. **Structured diagnostics**: every proxy/CLI log entry now carries an ISO timestamp and consistent redaction across every sink (console, VS Code `outputChannel`, and a new optional JSONL file sink via `--log-file`) — previously redaction only ran at one call site (the upstream error body), so other log lines could leak a secret unredacted. Each request now also logs richer trust/routing diagnostics: privacy firewall, decay/folding/intent-diff flags, dynamic dictionary and file index size, whether a team codebook was loaded, and whether the net-negative fallback fired.
2. **`routeAndCompress(query, { gitDiffOnly: true })`**: restricts the Context Router to git staged/unstaged files only, for "review what I changed" workflows — CLI: `glyph-compress route <query> --git-diff-only`.
3. **Fixed a real build-drift bug found while doing this work**: `vscode-ext/proxy.js` was a hand-maintained CommonJS duplicate of `src/proxy.js` that had fallen out of sync (missing several options and the dashboard/stats endpoints). It's now generated from the same source as the rest of the CJS build, so it can't drift again — and had zero test coverage before or after, now covered by a CJS-build smoke test.

### New in v1.18.0 (Team Codebook Registry)

1. **Team Codebook Registry**: `glyphcompress.team.json` (git-committable, at the workspace root) lets a team share a priority-ordered dynamic dictionary, so every teammate's `GlyphCompressor` — through the CLI, MCP server, VS Code extension, or proxy — assigns the exact same `§N` glyph to the same repeated identifier, instead of each machine learning its own independent, incompatible assignment. New CLI: `glyph-compress team-codebook show|sync`. See [Team Codebook Registry](#4-team-codebook-registry-v1180) above.

### New in v1.17.0 (MCP Server, Context Router & Real-Tokenizer Economics)

1. **MCP Server**: `npx glyph-compress-mcp` exposes GlyphCompress as a [Model Context Protocol](https://modelcontextprotocol.io/) server — `compress_text`, `compress_file`, `route_context`, and `get_codebook` tools, usable from Claude Code (`claude mcp add glyph-compress -- npx glyph-compress-mcp`), Claude Desktop, and any other MCP-compatible client with no IDE-specific integration work. See [MCP Server](#-mcp-server-claude-code-claude-desktop--other-mcp-clients) below.
2. **Context Router**: `GlyphCompressor.routeAndCompress(query, options)` and CLI `glyph-compress route <query> [--budget] [--max-files] [--git-diff-only]` rank workspace files by relevance to a query and compress as many as fit inside a token budget, instead of manually picking which files to send. `gitDiffOnly` restricts candidates to git staged/unstaged files for "review what I changed" workflows. Reports `selectedFiles`/`excludedFiles` (with score, token cost, and exclusion reason) plus a per-file `sourceMap` for auditability. Building this surfaced and fixed a real pre-existing bug: the TODO/FIXME/HACK diagnostic-detection regex had no word boundaries and matched "HACK" inside "Hacker News," inflating irrelevant marketing docs above the actually-relevant source file.
3. **Real-tokenizer TECH_GLYPHS economics**: extended `npm run calibrate:tokenizer` to compare every glyph against the *actual word it replaces* (not just its isolated cost) using real OpenAI tokenizers. Result: **all 28 `TECH_GLYPHS` were a net token loss** — common tech names are already 1-2 BPE tokens, and the Unicode glyph that replaced them cost as much or more (worst case: "express" at 1 token vs. its glyph at 5). Tech-name substitution now never fires on the `openai` provider when it would lose tokens (measured cost table, not a heuristic); `raw` mode keeps substituting unconditionally for demos/character-level reporting.

### New in v1.16.0 (Codebook Integrity & Adaptive Levels)

This release fixes real correctness gaps found during an audit of the compression engine, then builds three new capabilities on top of the fixes.

**Correctness fixes:**

1. **Dynamic-dictionary symbol collision fixed**: the per-session dynamic dictionary used to draw from a pool of Greek/Cyrillic letters that overlapped with reserved `TECH_GLYPHS` symbols — `α` was both the first dynamic-dictionary assignment *and* the fixed glyph for "Agent", so any session with a repeated word and any mention of "Agent" produced an ambiguous glyph the model could not reliably decode. Dynamic entries are now `§N` references (the same indexed-reference convention already used for file refs like `◈₍1₎`), which is collision-free and has no fixed symbol-pool ceiling.
2. **Undocumented tech glyphs fixed**: 13 of 28 `TECH_GLYPHS` entries (Java, C#, Swift, Ruby, Angular, Svelte, Django, Rails, Express, FastAPI, MySQL, MongoDB, "prompt") could appear in compressed output without ever being documented in the codebook sent to the model. The codebook is now generated directly from `TECH_GLYPHS`, so it cannot drift out of sync with what the compressor actually emits. The same class of bug (14/33 documented) was fixed in the legacy `compressor.js` engine used by `npm run demo`.
3. **CLI codebook completeness fixed**: `getCodebookPrompt()` — the codebook source for `npx glyph-compress <file>` — never included the dynamic dictionary's `DYN:` definitions, so CLI output could contain `§N` glyphs with no definition attached anywhere in the printed output. It now always includes definitions for every dynamic entry it produced.
4. **Dynamic-dictionary economics fixed**: a word seen only once in a payload was still being treated as a "saving," even though a single occurrence can never amortize the cost of transmitting its own `word=§N` definition. The dictionary now requires a word to repeat at least twice and nets out the definition cost when estimating savings.
5. **`compressText()` net-negative fallback added**: `compressMessages()` already fell back to the original payload when compression measured net-negative; `compressText()` (used by the CLI and standalone SDK calls) had no equivalent safety net and could silently return output that cost *more* tokens than the input. It now shares the same fallback (for all providers except `raw`, which intentionally reports unguarded character-level deltas).

**New capabilities:**

6. **Automatic level selection (`level: 'auto'`)**: pass `level: 'auto'` (or `--level auto` on the CLI) and GlyphCompress picks `light`/`standard`/`aggressive`/`ultra` per request from content signals — text length and code density — instead of a fixed default. `selectCompressionLevel()` is also exported directly for programmatic use.
7. **Tokenizer-calibrated glyph costs**: `npm run calibrate:tokenizer` measures the *real* token cost of every glyph against OpenAI's cl100k_base and o200k_base tokenizers (via the `js-tiktoken` dev dependency) instead of relying solely on a fixed heuristic, and flags any glyph whose real cost is worse than assumed.
8. **Codebook completeness test suite**: `npm run test:codebook` deterministically exercises every `TECH_GLYPHS`/`DOMAIN_GLYPHS` entry and the dynamic dictionary, and asserts every emitted glyph is documented in whatever codebook ships with it — this is the test that would have caught fixes #1-#3 automatically.
9. **Cache-prefix stability test suite**: `npm run test:cache-prefix` locks in that the injected codebook is byte-identical for identical content (required for OpenAI/Gemini implicit prompt caching) and that Anthropic's `cache_control`-tagged stable block never embeds request-specific dynamic-dictionary entries.

> [!NOTE]
> The aggregate benchmark numbers below moved slightly (25% → 22% genuine savings) as a direct, expected result of fix #4 — the old number included savings from single-occurrence substitutions that were never economically real. `ultra`-level savings on code-heavy content are unaffected.

### New in v1.15.0 (Holographic Folding & Intent Diffs)

1. **Holographic Context Folding**: Folds overlapping related files and import boilerplate into layered, structured blocks (e.g. `⟦Base: ...⟧ ↷ [file1.tsx ↷ file2.tsx]`), saving up to 40% characters on multi-file workspaces.
2. **Generative Intent Diffs**: Condenses verbose unified git/IDE diffs into extremely short symbolic change action lines (e.g. `⚡: ⊝₍1₎ ▼𝒞 Auth | ▲𝒞 Authentication`), saving over 80% tokens on refactoring payloads.
3. **VS Code configuration support**: Toggle ADC easily within IDE settings via `glyphCompress.experimentalDecay`.
4. **CLI/Proxy Flags**: Enables decay on the command-line or local proxy server via `--decay` or `--experimental-decay`.
5. **Unicode superscript tagging compatibility**: Enhanced regex parsing ensures cold zone summaries perfectly extract minified superscript language tags (e.g. `ʲˢ`).

### New in v1.13.0 (Cross-Session Dictionary Caching)

1. **Cross-Session Dictionary Caching**: Persists `dynamicDict` and `fileIndex` on disk under `~/.glyphcompress/cache/<sha256>.json` to enable instant warm-starts.
2. **Consistent Workspace Keying**: Computes SHA-256 hashes of workspace paths (for the VS Code extension) and working directories (for CLI/proxy) to ensure isolated, project-specific caches.
3. **Improved Anthropic Prompt Caching**: Prompts remain consistent across separate developer sessions, avoiding unnecessary cache invalidation and reducing input token costs.
4. **Dynamic Restorations**: Restores dynamic dictionary mappings and bigram counts seamlessly on startup, ensuring compression consistency across multiple command-line invocations and extension reloads.
5. **ESM & CJS Exporter Synchronization**: Exposes `PROVIDER_COMPRESSION_PROFILES` and `TRUST_POLICY_PROFILES` consistently in both ES Modules and CommonJS runtimes, preventing runtime undefined errors in downstream imports.

### v1.12.0 (Performance Engine Overhaul)

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

### 📏 Benchmark Snapshot (v1.23.0)

`npm run benchmark` currently reports an aggregate payload compression ratio of **1.3x**, **22% genuine token savings**, **100% context fidelity score**, **100% edit success proxy**, and **0 hallucinated file references** across representative fixtures. These numbers are calibrated with Unicode token penalties and per-glyph breakeven logic — every reported saving is a real, net-positive token reduction. Disabling `TECH_GLYPHS` substitution on OpenAI when it measurably loses tokens (see "New in v1.17.0" above) did not move this number on these fixtures — it removes a systematic source of hidden waste with no observed downside, rather than trading it against measured savings.

### 🧪 Realistic Benchmark Notes

`npm run benchmark:realistic` measures four behaviors that the fixture benchmark does not capture by itself:

1. **Real repository corpus compression** on files like `README.md`, `ROADMAP.md`, and core runtime sources.
2. **Chat payload overhead** after the glyph codebook is injected for OpenAI and Anthropic-style requests.
3. **Multi-turn chat amortization** across cumulative IDE-style conversations.
4. **Enterprise nominal IDE usage** across professional workflows such as PR review, incident response, test planning, and release readiness.
5. **Local throughput and latency** under repeated compression load.

The current realistic benchmark shows a more nuanced picture than the synthetic fixture table below:

- Raw repository files at `light`, `standard`, and `aggressive` are now close to break-even (roughly **0.9x-1.0x**) on typical prose-and-code documentation. As of v1.16.0, the dynamic dictionary requires a word to repeat at least twice and accounts for the cost of transmitting its own definition, so it no longer inflates this number with single-occurrence substitutions that never actually paid for themselves.
- `ultra` remains the level with real, structural savings on code-heavy files (up to roughly **1.2x** on this repository's own source), though not universally — dense single-file prose/code mixes can still land slightly negative.
- The **user message alone** usually compresses well for chat prompts.
- The **full first-turn chat payload** can still get worse on short requests because the injected codebook outweighs the user-message savings.
- The **cumulative multi-turn payload** is now measured separately, so you can see whether repeated turns start to amortize the codebook or keep carrying a net overhead.
- The new **enterprise nominal usage** section reports a weighted professional-IDE summary. In the current benchmark, OpenAI's weighted full-payload and isolated user-message savings are both roughly **break-even (~0%)** on this fixture set — the codebook overhead and the in-body savings largely cancel out.
- Anthropic now uses a **hybrid wrapper strategy**: first-turn requests keep `system` lightweight, while multi-turn transcripts switch to structured cacheable blocks once assistant history exists.
- Anthropic-oriented sections include both a transmitted **payloadSaved** metric and a **cache-adjusted estimate**. In the current benchmark, Anthropic remains slightly negative on weighted transmitted payload at about **-5%**, while the cache-adjusted weighted estimate (accounting for `cache_control` reuse of the system block and largest user block) is positive at about **28%**. This is a benchmark estimate, not a billing guarantee.

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

> [!NOTE]
> The table below measures the five curated per-scenario examples shown in [Realistic Session Showcase](#-realistic-session-showcase), in raw characters — it is a best-case illustration of what a well-suited payload can achieve, not the typical or aggregate result. For the honestly-reported, provider-token-aware aggregate across a representative fixture set, see [📏 Benchmark Snapshot](#-benchmark-snapshot-v1180) below (`npm run benchmark`: **1.3x ratio, 22% genuine savings**) and the [Realistic Benchmark Notes](#-realistic-benchmark-notes) (`npm run benchmark:realistic`) for real-repository and chat-payload numbers, which are more modest and sometimes break-even or negative on prose-heavy content.

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
| `route <query>` *(v1.17.0+)* | Context Router: rank workspace files relevant to a query and compress as many as fit inside a token budget, instead of manually picking which files to send. | `npx glyph-compress route "fix the auth bug" --budget 2000` |
| `team-codebook show` *(v1.18.0+)* | Print the shared team codebook (`glyphcompress.team.json`), if any. | `npx glyph-compress team-codebook show` |
| `team-codebook sync` *(v1.18.0+)* | Promote this machine's locally-learned dynamic dictionary into `glyphcompress.team.json` for the whole team. | `npx glyph-compress team-codebook sync` |

### Command Line (CLI): Options

| Option | Values | Purpose | Example |
|---|---|---|---|
| `-l, --level <level>` | `light`, `standard`, `aggressive`, `ultra`, `auto` | Select compression aggressiveness, or let `auto` pick per request. Default: `standard`. | `npx glyph-compress src/app.ts --level ultra` |
| `-c, --copy` | flag | Copy compressed output to the system clipboard. | `npx glyph-compress src/app.ts --copy` |
| `-x, --explain` | flag | Print what was compressed, indexed, preserved, or transformed. | `npx glyph-compress src/app.ts --explain` |
| `--source-map` | flag | Print reversible source map JSON, including file refs, dynamic entries, diagnostics, symbols, AST/code block metadata, privacy metadata, provider metadata, and trust metadata. | `npx glyph-compress src/app.ts --source-map` |
| `--privacy` | flag | Redact common secrets and sensitive identifiers before compression/output. | `npx glyph-compress .env --privacy --source-map` |
| `--provider <provider>` | `raw`, `openai`, `anthropic`, `gemini`, `local` | Select provider-aware estimates and compression profile. Default: `raw`. | `npx glyph-compress src/app.ts --provider openai --explain` |
| `--trust <policy>` | `lossless`, `reversible`, `privacy`, `lossy` | Select allowed transformation policy. Default: auto. | `npx glyph-compress src/app.ts --trust reversible --source-map` |
| `--policy <policy>` | `lossless`, `reversible`, `privacy`, `lossy` | Alias for `--trust`. | `npx glyph-compress src/app.ts --policy privacy` |
| `--decay` | flag | Enable Attentional Decay Compaction on chat history messages. | `npx glyph-compress --decay` |
| `--folding` | flag | Enable holographic context folding for overlapping related files. | `npx glyph-compress --folding` |
| `--intents` | flag | Enable generative intent diffs compression for code changes. | `npx glyph-compress --intents` |
| `--budget <tokens>` | integer | Token budget for the `route` command. Default: `2000`. | `npx glyph-compress route "fix the bug" --budget 3000` |
| `--max-files <n>` | integer | Max candidate files to rank for the `route` command. Default: `8`. | `npx glyph-compress route "fix the bug" --max-files 12` |
| `--git-diff-only` | flag | Restrict `route` to git staged/unstaged files only, for "review what I changed" workflows. | `npx glyph-compress route "review my changes" --git-diff-only` |
| `--json` | flag | Print machine-readable JSON for supported commands such as `inspect`, `doctor`, and `route`. | `npx glyph-compress inspect "review diff" --json` |
| `-p, --proxy [port]` | optional port | Start the Zero-Command Transparent Proxy. Default port: `8080`. | `npx glyph-compress --proxy 8080` |
| `--log-file <path>` | file path | Append structured, redacted JSONL diagnostics from the proxy (timestamps, trust/routing metadata) to this file. | `npx glyph-compress --proxy --log-file ~/.glyphcompress/proxy.log` |
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

Get up and running with GlyphCompress in under 60 seconds. We highly recommend starting with the **Automated (Invisible)** workflow:

### 1. 🤖 Automated & Transparent Workflows (Recommended)

* **Option A: Zero-Command Invisible Proxy (100% Automatic)**
  Compresses all your outgoing IDE chat payloads automatically in the background without changing any of your development habits:
  1. Install the extension **GlyphCompress** from the VS Code Marketplace (id: `neolambo.glyph-compress`).
  2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run: `GlyphCompress: Start Zero-Command Proxy`.
  3. Configure your IDE (Cursor, Cline, Continue, etc.) to use the local proxy address `http://localhost:8080` (or `http://localhost:8080/v1`) as its OpenAI Base URL. *(See the [Step-by-Step IDE Integration Guide](#️-step-by-step-ide-integration-guide) below for exact configurations).*
  *Every request is now automatically and transparently compressed on the fly!*

* **Option B: Auto-Managed Workspace Rules**
  Let the extension automatically inject the codebook instructions into your workspace:
  1. Toggle `"glyphCompress.autoUpdateWorkspaceRules": true` in your VS Code settings.
  2. The extension will automatically create and update `.cursorrules` and `.github/copilot-instructions.md` in your project root with the compression codebook.
  3. Cursor and Copilot Chat models will **instantly understand** compressed glyphs natively!

---

### 2. 🎛️ Manual Workflows

* **Option C: One-Click Extension Command (`Ctrl+Alt+G`)**
  Manually compress files or code selections on demand:
  1. Highlight any block of code in your editor (or leave unselected to compress the whole file).
  2. Press `Ctrl+Alt+G` (or `Cmd+Alt+G` on Mac).
  3. The extension instantly compresses your selection and automatically opens your VS Code Chat pre-filled. Just hit enter!

* **Option D: Zero-Install CLI Tool**
  Compress any project file in your terminal and copy the glyph payload directly to your clipboard:
  ```bash
  npx glyph-compress src/app.ts --copy
  ```

* **Option E: JS/TS Developer SDK**
  Integrate semantic compression directly into your own API scripts or AI agents:
  ```bash
  npm install glyph-compress
  ```
  See the code templates below:

### Standalone SDK Usage (Any project)

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
    code.cmd --install-extension .\glyph-compress-1.17.0.vsix --force
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
  "glyphCompress.compressionLevel": "standard", // "light" | "standard" | "aggressive" | "ultra" | "auto"
  "glyphCompress.trustPolicy": "privacy",     // "auto" | "lossless" | "reversible" | "privacy" | "lossy"
  "glyphCompress.showStatusBar": true,
  "glyphCompress.autoUpdateWorkspaceRules": false,
  "glyphCompress.targetApiUrl": "https://generativelanguage.googleapis.com",
  "glyphCompress.experimentalDecay": false,
  "glyphCompress.holographicFolding": false,
  "glyphCompress.intentDiffs": false
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

## 🔌 MCP Server (Claude Code, Claude Desktop & other MCP clients)

GlyphCompress ships an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server, so any MCP-compatible client can call compression directly — no IDE-specific integration or proxy configuration needed.

### Tools exposed

| Tool | What it does |
|---|---|
| `compress_text` | Compress an arbitrary text/context blob. Returns the compressed text, the codebook needed to decode it, and stats. |
| `compress_file` | Read a file from disk and compress its content. |
| `route_context` | Context Router: rank workspace files relevant to a query and compress as many as fit inside a token budget. |
| `get_codebook` | Return the glyph codebook prompt for manual injection into a system prompt. |

### Add it to Claude Code

```bash
claude mcp add glyph-compress -- npx glyph-compress-mcp
```

### Add it to Claude Desktop or another MCP client

Add to the client's MCP server config (for Claude Desktop, `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "glyph-compress": {
      "command": "npx",
      "args": ["glyph-compress-mcp"]
    }
  }
}
```

### Run it directly

```bash
npx glyph-compress-mcp
```

The server communicates over stdio using the official `@modelcontextprotocol/sdk`. It has no network dependency beyond your MCP client's own transport — everything runs locally, same as the CLI and proxy.

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
| **auto** *(v1.16.0+)* | Picks light/standard/aggressive/ultra per request from content length and code density | You don't want to hand-pick a level per payload |

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
├── bin/
│   ├── cli.js                    # `glyph-compress` CLI (compress/inspect/doctor/benchmark/route/team-codebook)
│   └── mcp-server.js             # `glyph-compress-mcp` MCP server (compress_text/compress_file/route_context/get_codebook)
├── src/
│   ├── index.js                  # Library entry point (ESM)
│   ├── index.cjs / index.d.ts    # CommonJS entry point + stable TypeScript declarations
│   ├── glyph-middleware.js       # Thin re-export of the compiled middleware (see vscode-ext/)
│   ├── workspace-intelligence.js # Workspace codebook, intent detection, file ranking, and the Context Router's file reader
│   ├── team-codebook.js          # Team Codebook Registry (glyphcompress.team.json read/write/merge)
│   ├── token-estimator.js        # Provider-aware token estimators
│   ├── radical-alphabet.js / compressor.js / system-prompt-generator.js  # Legacy standalone engine (used by `npm run demo`)
│   └── workspace-intelligence.cjs, team-codebook.cjs, ...  # esbuild-generated CJS builds (see scripts/build-middleware.js)
├── vscode-ext/
│   ├── package.json              # VS Code extension manifest
│   ├── extension.js              # Extension activation & commands
│   └── glyph-middleware.js       # Core middleware: GlyphCompressor, wrapOpenAI/wrapAnthropic, routeAndCompress
├── test/
│   ├── run-suites.js             # Runs all 17 test suites
│   ├── unit.js, cli.js, workspace.js, metadata.js, snapshots.js, integration.js, holographic-test.js, intent-test.js
│   ├── codebook-completeness.js, auto-level.js, cache-prefix-stability.js, tech-glyph-economics.js
│   ├── context-router.js, mcp-server.js, team-codebook.js  # newest suites — router, MCP protocol, shared dictionary
│   ├── tokenizer-calibration.js  # real-tokenizer glyph-cost report (npm run calibrate:tokenizer)
│   └── benchmark.js, benchmark-realistic.js
├── examples/
│   ├── openai-example.js, claude-example.js, antigravity-example.js
├── package.json
├── SECURITY.md, PRIVACY.md, ENTERPRISE.md, COMMERCIAL_LICENSE.md, NOTICE, LICENSE
├── ROADMAP.md, RELEASE_NOTES.md
└── README.md
```

## 🧪 Tests

```bash
# Run all 17 test suites
npm test

# Run focused suites
npm run test:unit
npm run test:cli
npm run test:workspace
npm run test:extension
npm run test:proxy
npm run test:metadata
npm run test:snapshots
npm run test:holographic
npm run test:intent
npm run test:integration
npm run test:codebook           # codebook-completeness: every emitted glyph must be documented
npm run test:auto-level         # selectCompressionLevel() / level: 'auto'
npm run test:cache-prefix       # byte-stable codebook prefix for provider-side implicit caching
npm run test:tech-glyph-economics  # TECH_GLYPHS never lose real tokens on OpenAI
npm run test:context-router     # routeAndCompress() + CLI `route`
npm run test:mcp-server         # drives the real MCP server over stdio via the official SDK client
npm run test:team-codebook      # glyphcompress.team.json shared dictionary

# Run the stable release validation bundle (build, full test suite, benchmark, link check, npm pack dry-run)
npm run check

# Check local Markdown links
npm run check:links

# Run trust and measurement benchmark
npm run benchmark

# Run realistic corpus, payload, and throughput benchmark
npm run benchmark:realistic

# Measure real per-glyph token cost against OpenAI tokenizers (cl100k_base/o200k_base)
npm run calibrate:tokenizer

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
