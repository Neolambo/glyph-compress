## v1.16.0 — Codebook Integrity & Adaptive Levels

Changes since v1.15.0:

### Correctness Fixes
- **Dynamic-dictionary symbol collision fixed**: the per-session dynamic dictionary drew from a Greek/Cyrillic pool that overlapped reserved `TECH_GLYPHS` symbols — `α` was both the first dynamic-dictionary assignment and the fixed glyph for "Agent," producing genuinely ambiguous output whenever both occurred in the same payload (a common case, not an edge case). Dynamic entries are now unbounded `§N` indexed references, matching the existing file-ref convention (`◈₍1₎`).
- **Undocumented tech glyphs fixed**: 13 of 28 `TECH_GLYPHS` entries (Java, C#, Swift, Ruby, Angular, Svelte, Django, Rails, Express, FastAPI, MySQL, MongoDB, "prompt") could reach compressed output without ever being documented in the injected codebook. The codebook's `TECH:` line is now generated directly from `TECH_GLYPHS`, so it cannot drift out of sync again. The legacy `compressor.js`/`system-prompt-generator.js` engine had the same class of bug (14/33 undocumented) and received the same fix.
- **CLI codebook completeness fixed**: `getCodebookPrompt()` — the codebook source for `npx glyph-compress <file>` — never included the dynamic dictionary's `DYN:` definitions, so CLI output could contain undocumented `§N` glyphs. It now always includes them.
- **Dynamic-dictionary economics fixed**: single-occurrence word substitutions were counted as "savings" even though they can never amortize the cost of their own `word=§N` definition. The dictionary now requires `freq >= 2` and nets out the definition cost.
- **`compressText()` net-negative fallback added**: matches the fallback `compressMessages()` already had; `raw` provider intentionally keeps its unguarded always-compress behavior.

### New Capabilities
- **Automatic level selection**: `level: 'auto'` (CLI: `--level auto`) picks light/standard/aggressive/ultra per request from text length and code density; `selectCompressionLevel()` is exported for direct use.
- **Tokenizer-calibrated glyph costs**: `npm run calibrate:tokenizer` measures real per-glyph token cost against OpenAI's cl100k_base/o200k_base tokenizers (`js-tiktoken` dev dependency) instead of relying solely on a fixed heuristic.
- **VS Code setting**: `glyphCompress.compressionLevel` now accepts `"auto"`.

### Tests & Verification
- **New Test Suites**: `test/codebook-completeness.js` (60 assertions — deterministically exercises every `TECH_GLYPHS`/`DOMAIN_GLYPHS` entry and the dynamic dictionary), `test/auto-level.js`, `test/cache-prefix-stability.js` (locks in byte-stable codebook prefixes for OpenAI/Gemini implicit caching and Anthropic's `cache_control` block separation).
- **Complete Suite Validation**: 13 suites, all passing.
- **Honest benchmark numbers**: `npm run benchmark` genuine-savings figure moved from 25% to 22% as a direct, expected result of the dynamic-dictionary economics fix — the old number included illusory single-occurrence savings. `ultra`-level savings on code-heavy content are unaffected.
- **Validation**:
  - `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run)

***

## v1.15.0 — Holographic Context Folding & Generative Intent Diffs

Changes since v1.14.0:

### Compression & Semantic Layering
- **Holographic Context Folding**: Folds overlapping related files and import boilerplate into layered, structured blocks (e.g. `⟦Base: ...⟧ ↷ [file1.tsx ↷ file2.tsx]`), saving up to 40% characters on multi-file workspaces.
- **Generative Intent Diffs**: Condenses verbose unified git/IDE diffs into extremely short symbolic change action lines (e.g. `⚡: ⊝₍1₎ ▼𝒞 Auth | ▲𝒞 Authentication`), saving over 80% tokens on refactoring payloads.

### CLI & Zero-Command Proxy
- **CLI Options**: Added `--folding` (`--holographic-folding`) and `--intents` (`--intent-diffs`) to the CLI command parser.
- **Proxy Integrations**: Forwarded folding and intents configurations through proxy server settings, enabling automated context optimization on IDE chat requests.
- **Startup Preset**: Configured automated startup preset (`start-proxy.js`) to enable attentional decay, holographic folding, and intent diffs by default.

### Tests & Verification
- **New Test Suites**: Created `test/holographic-test.js` and `test/intent-test.js` covering core and middleware text transformations, with strict token-savings threshold validation.
- **Complete Suite Validation**: All 53 tests pass with 100% success.
- **Validation**:
  - `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run)

***

## v1.14.0 — Attentional Decay Compaction (ADC)

Changes since v1.13.0:

### Compression & Attentional Decay Compaction
- **Attentional Decay Compaction (ADC)**: Implemented an experimental, opt-in feature (`options.attentionalDecay`) that scales chat transcripts to near-infinite context capacity at minimal token costs by progressively compacting older history.
- **Zone-Based Progressive Compaction**:
  - **Active Zone (d = 0)**: Lossless high-fidelity standard prompt compression to preserve active queries.
  - **Warm Zone (d = 1-3)**: Aggressive `ultra`-level minification (stripping comments/logs, normalizing spaces, collapsing filler phrases).
  - **Cold Zone (d = 4-6)**: Replaces raw code blocks with signature/placeholder summaries (e.g., `// [Summary: <lang> block, <N> lines]`).
  - **Deep Freeze Zone (d > 6)**: Discards code blocks entirely and condenses message text to a high-density episodic/conceptual summary (`[Radical Summary: <concept>...]`).
- **Unicode-Aware Language Extraction**: Enhanced the cold-zone regex parser to reliably match all language identifiers, including minified Unicode superscript markers (e.g. `ʲˢ`).

### VS Code Extension & CLI/Proxy Integration
- **VS Code Configuration**: Registered the `glyphCompress.experimentalDecay` configuration setting to allow users to toggle ADC natively within their IDE.
- **CLI Arguments & Flags**: Added `--decay` and `--experimental-decay` arguments to enable attentional decay directly from command line invocations.
- **Proxy Server Support**: Supported transparent progressive decay within the Zero-Command proxy forwarding logic.

### Tests & Verification
- **ADC Test Coverage**: Added comprehensive test cases in `test/unit.js` covering Active, Warm, Cold, and Deep Freeze zones.
- **Complete Suite Validation**: All 51 tests across integration, unit, metadata, CLI, proxy, extension, and workspace pass with 100% success.

***

## v1.13.0 — Cross-Session Dictionary Caching

Changes since v1.12.0:

### Compression & Caching
- **Cross-Session Dictionary Caching**: Persists `dynamicDict` and `fileIndex` on disk under `~/.glyphcompress/cache/<sha256>.json` to enable instant warm-starts.
- **Consistent Compression Keying**: Uses SHA-256 hashes of workspace paths (for VS Code extension) and working directories (for CLI/proxy) to ensure robust, isolated, project-specific caches.
- **Improved Anthropic Prompt Caching**: Prompts remain consistent across separate developer sessions, avoiding unnecessary cache invalidation and reducing input token costs.
- **Dynamic Restorations**: Restores dynamic dictionary mappings and bigram counts seamlessly on startup, ensuring compression consistency across multiple command-line invocations and extension reloads.

### Infrastructure & Compatibility
- **ESM & CJS Exporter Synchronization**: Resolved exports mismatch by exposing `PROVIDER_COMPRESSION_PROFILES` and `TRUST_POLICY_PROFILES` consistently in the CommonJS build (`vscode-ext/glyph-middleware.cjs`).
- **Build and Compilation Tooling**: Introduced an automated ESM-to-CJS compilation pipeline using `esbuild` with a post-build token-estimator path rewritings.

### Docs & Roadmaps
- **Roadmap & README Syncing**: Updated `ROADMAP.md` and `README.md` to reflect complete `v1.13.0` caching goals.
- **Wiki Synchronization**: Updated offline and online Wiki pages covering the cache directory, release procedures, and technical setup.

### Tests
- **Caching Coverage**: Added comprehensive unit tests in `test/unit.js` checking that compressor warm-starts correctly restore serialized dynamic dictionaries and file indices.
- **Suite Verification**: 51/51 tests passing across metadata, snapshots, unit, cli, workspace, proxy, and integration test suites.

### Validation
- `npm test` (51/51 integration, unit, metadata pass)
- `npm run check:links`
- `npm run build:middleware`
- `npm run package:vscode`
