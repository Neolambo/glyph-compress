# GlyphCompress Roadmap

This roadmap tracks what has been delivered, what is partially complete, and what still needs work after the stable `v1.0.0` release.

## Status Legend

- `[x]` Done and released.
- `[ ]` Still missing or not yet implemented.
- `[ ] Partial:` Started, but not complete enough to call done.

## North Star

GlyphCompress should make large codebases cheaper, faster, and easier for LLMs to reason about without forcing developers to change their workflow. The project wins when users can send richer context, spend fewer tokens, and still get answers that preserve intent, code structure, and safety.

## Current Stable Release

- [x] Current stable release is `v1.16.0` for codebook integrity fixes and automatic level selection.
- [x] Last stable release was `glyph-compress@1.15.0` (Holographic Folding & Intent Diffs).
- [x] Root npm package, VS Code extension manifest, and VS Code extension lockfile are versioned to `1.16.0`.
- [x] `npm test` passes 13 suites (unit, CLI, workspace, extension, proxy, metadata, snapshot, integration, holographic, intent, codebook-completeness, auto-level, cache-prefix-stability) for `v1.16.0`.
- [x] `npm run benchmark` reports 1.3x aggregate ratio, 22% genuine savings, 100% fidelity proxy, 100% edit success, and 0 hallucinated refs — the genuine-savings figure is lower than the previously-reported 25% because the dynamic dictionary no longer counts single-occurrence substitutions that never paid for their own definition (see v1.16.0 below).
- [ ] npm `latest`, VS Code Marketplace listing, and GitHub release for `1.16.0` are pending publication (requires npm and VSCE credentials this environment did not have).

## Prepared Next Release

- [ ] Prepared next release is `v1.17.0` for context router wiring (see Proposed Future Versions below).

## Release Reality Check

This section separates what is actually complete from what remains useful future work.

### Verified as Complete Through v1.11.0

- [x] npm package, package metadata, TypeScript declarations, ESM export, and CommonJS export are aligned on `1.11.0`.
- [x] GitHub tag, GitHub release, npm latest, VSIX artifact, VS Code Marketplace listing, and local VS Code installation are verified for `1.11.0`.
- [x] Safe compression trust policies are implemented in both ESM and CommonJS middleware paths.
- [x] CLI support exists for provider selection, trust policy selection, explanations, source maps, privacy mode, workspace inspection, benchmark, and doctor workflows.
- [x] CLI and VS Code proxy startup preserve provider, trust policy, privacy, and target API options.
- [x] VS Code activation and configuration wiring cover enabled state, compression level, provider, and trust policy.
- [x] Automated validation covers unit, CLI, workspace, extension, proxy, metadata, integration, benchmark, link checking, and npm pack dry-run.
- [x] Documentation exists for architecture, release process, licensing, security, privacy, enterprise usage, contributing, and roadmap planning.

### Still Missing in Practice

- [ ] Partial: Release automation now has a root helper for validation, VSIX packaging, release-note scaffolding, and Marketplace verification, but commit, tag, npm publish, GitHub release creation, and VSIX upload are still manual.
- [ ] Real LLM task-success evaluation is not implemented; current fidelity and edit-success scores are deterministic benchmark proxies.
- [x] Realistic benchmarking now covers raw corpus compression, first-turn chat overhead, cumulative multi-turn payloads, enterprise nominal IDE usage, and Anthropic cache-adjusted estimates. Codebook-skip logic ensures short chat requests never regress; all providers show net-positive or break-even savings.
- [ ] Provider-aware behavior does not yet automatically choose code block, context-router, and trust-warning strategies per provider.
- [ ] Source maps do not yet provide full expression-level AST mappings for every minified code block.
- [ ] Workspace intelligence does not yet feed ranked context automatically into normal compression calls.
- [ ] Partial: `doctor` now validates repository basics plus installed VS Code extension version, local `glyphCompress.*` settings, Continue proxy config, and provider credential env vars when discoverable, but broader IDE/provider setup validation is still incomplete.
- [ ] Partial: Proxy diagnostics now log upstream status, redacted error bodies, completed response byte counts, and early client disconnects, but structured log sinks, timestamps, and broader extension-side diagnostics are still missing.
- [ ] Partial: Release notes can now be scaffolded from conventional commit subjects, but still need human curation before publication.

## Product Bets

1. **Context Fidelity Score**
   - [x] Benchmark harness reports a deterministic context fidelity proxy.
   - [x] Benchmark tracks edit success proxy and hallucinated file references.
   - [ ] Partial: Real LLM task-success evaluation across multiple providers is not implemented yet.
   - [ ] Add repeatable model-based comprehension tests that compare compressed vs uncompressed task success.

2. **Provider-Aware Compression**
   - [x] OpenAI and Anthropic middleware wrappers exist.
   - [x] Benchmark fixtures cover raw, OpenAI, Anthropic, Gemini-compatible, and ultra payloads.
   - [x] Provider-specific token estimators exist for raw text, OpenAI, Anthropic, Gemini-compatible, and local-model payloads.
   - [x] Provider-specific compression profiles tune dynamic dictionary thresholds and source map metadata for raw, OpenAI, Anthropic, Gemini-compatible, and local-model targets.
   - [ ] Partial: Code block minification and router behavior are not yet fully tuned by provider prompt convention.
   - [ ] Extend provider profiles to choose code block and context-router strategies automatically.

3. **Semantic Source Maps**
   - [x] `compressText()` and `compressMessages()` return `sourceMap`.
   - [x] Source maps include files, dynamic dictionary entries, diagnostics, code blocks, and replacements.
   - [x] CLI supports `--source-map`.
   - [x] Source maps include line/column ranges for tracked prompt, tech, file, diagnostic, dynamic dictionary, and code block replacements.
   - [x] Source maps include `symbols` entries that map emitted glyphs back to source text and replacement kind.
   - [x] Source maps include AST-like token spans for structural tokens inside aggressive and ultra code blocks.
   - [ ] Partial: Source maps do not yet map every expression-level token inside aggressive code blocks back to exact AST nodes.
   - [ ] Add deeper expression-level spans for minified code blocks and language-specific structural summaries.

4. **Adaptive Workspace Memory**
   - [x] `glyph-compress inspect` writes `.glyphcompress/codebook.json`.
   - [x] Workspace codebook includes files, symbols, imports, diagnostics, ownership hints, and git context.
   - [ ] Partial: Codebook is static per inspect run and does not yet learn from real usage over time.
   - [ ] Add incremental updates and decay/weighting from repeated repository usage.

5. **Safe Compression Modes**
   - [x] Compression levels exist: `light`, `standard`, `aggressive`, and `ultra`.
   - [x] Reversible dictionaries and source maps are exposed for inspection.
   - [x] Lossless, reversible, privacy, and lossy modes are explicit trust policies with source map metadata.
   - [x] Tests enforce which transformations are allowed per trust policy.
   - [ ] Partial: Trust policies do not yet include per-provider risk scoring or UI warnings for every extension command.
   - [ ] Add provider-specific trust warnings and richer UI surfacing for risky transformations.

6. **Agentic Context Router**
   - [x] Intent detection covers fix error, review diff, implement feature, explain architecture, write tests, and optimize performance.
   - [x] Relevant file ranking uses query terms, symbols, diagnostics, ownership hints, and git staged/unstaged signals.
   - [ ] Partial: Context selection is available through `inspect`, but not yet automatically wired into compression calls.
   - [ ] Add an automatic context router that uses active file, diagnostics, git diff, recent chat history, and token budget.

## Release Plan

### v0.7.0: Trust and Measurement

Status: delivered.

- [x] Add a benchmark harness that compares original prompts versus compressed prompts across representative tasks.
- [x] Track compression ratio, context fidelity score, edit success proxy, and hallucinated file references.
- [x] Add fixture-based coverage for OpenAI, Anthropic, Gemini-compatible, raw text, and ultra payloads.
- [x] Introduce `--explain` in the CLI to show what was compressed, elided, or preserved.
- [x] Publish a small public benchmark report in the README.

### v0.8.0: Reversible Compression and Source Maps

Status: delivered.

- [x] Add optional reversible dictionaries for file paths, diagnostics, repeated identifiers, and compressed code blocks.
- [x] Emit a `sourceMap` object from the library API for compressed text and message payloads.
- [x] Add CLI source map output for compressed payload inspection.
- [x] Add round-trip coverage for source maps, dynamic dictionaries, and CommonJS consumers.
- [x] Document when to use light, standard, aggressive, ultra, source maps, and reversible dictionaries.

### v0.9.0: Workspace Intelligence

Status: delivered as a first workspace-intelligence slice.

- [x] Build a persistent workspace codebook with symbol frequency, import graph, diagnostics, ownership hints, and git context.
- [x] Add intent detection for common workflows: fix error, review diff, implement feature, explain architecture, write tests, optimize performance.
- [x] Rank relevant files for a query so future compression can focus on the most useful context by default.
- [x] Add git-aware context selection for staged changes, unstaged changes, and pull request review signals.
- [x] Add repository health commands: `glyph-compress inspect`, `glyph-compress benchmark`, and `glyph-compress doctor`.
- [ ] Missing: Automatically apply ranked context selection inside compression workflows.

### v1.0.0: Stable Platform

Status: delivered as the first stable release.

- [x] Freeze the public API for `GlyphCompressor`, middleware wrappers, source maps, workspace intelligence helpers, CLI commands, and VS Code settings.
- [x] Add TypeScript declarations for the stable public package surface.
- [x] Add CI for Node LTS versions, packaging, npm pack validation, and VS Code extension validation.
- [x] Add formal docs for security, privacy, licensing, telemetry, and enterprise deployment.
- [x] Publish a stable VS Code extension artifact aligned with npm and GitHub tags.
- [x] Publish to the public VS Code Marketplace as `neolambo.glyph-compress`, while keeping GitHub VSIX releases available for manual installs.

### v1.2.0: Provider Accuracy and Test Suites

Status: delivered.

- [x] Add provider-specific token estimators for raw text, OpenAI, Anthropic, Gemini-compatible, and local-model payloads.
- [x] Export estimator helpers from ESM, CommonJS, and TypeScript declarations.
- [x] Update benchmark fixtures to use provider-aware estimates for chat payloads.
- [x] Split validation into focused unit, CLI, workspace, metadata, and integration suites.
- [x] Keep the legacy integration suite for broad regression coverage while making focused suites callable individually.

### v1.3.0: Semantic Source Map Spans

Status: delivered.

- [x] Add line/column/offset spans for tracked source map replacements.
- [x] Add `sourceMap.symbols` for glyph-to-source mappings.
- [x] Expose symbol spans through `getReversibleDictionaries()`.
- [x] Add TypeScript declarations for source positions, source spans, and symbol spans.
- [x] Add integration coverage for multi-line file and diagnostic spans.

### v1.4.0: Extension and Proxy Smoke Suites

Status: delivered.

- [x] Add a mocked VS Code activation smoke suite that verifies extension startup and contributed command registration.
- [x] Add a proxy smoke suite that verifies compressed chat forwarding without calling a real upstream API.
- [x] Add focused `test:extension` and `test:proxy` scripts and wire them into the full suite runner.
- [x] Harden the VS Code activation path by loading the CommonJS middleware artifact directly.
- [x] Keep npm, GitHub, VSIX, source map, workspace codebook, benchmark, README, and issue-template versions aligned for v1.4.0.

### v1.5.0: Privacy Firewall Mode

Status: delivered.

- [x] Add opt-in privacy firewall support for library consumers through `privacyFirewall: true` / `privacy: true`.
- [x] Add CLI `--privacy` support for redacting sensitive values before output, clipboard copy, or source-map printing.
- [x] Redact common API keys, token assignments, bearer tokens, JWTs, GitHub tokens, AWS access keys, emails, and IPv4 addresses before compression.
- [x] Add `sourceMap.privacy` entries with placeholder, kind, label, span, and non-revealing short SHA-256 hash metadata.
- [x] Expose privacy redaction metadata through `getReversibleDictionaries()` and TypeScript declarations.

### v1.6.0: AST-Like Code Block Source Spans

Status: delivered.

- [x] Add `codeBlocks[].tokens` metadata for structural tokens inside minified and summarized code blocks.
- [x] Add top-level `sourceMap.ast` entries with source spans and block mode metadata.
- [x] Track imports, exports, functions, classes, declarations, return/yield, package/use/using, visibility, and type markers across common language families.
- [x] Add TypeScript declarations for AST-like token spans.
- [x] Add integration coverage for line-aware structural code block token spans.

### v1.7.0: Provider-Aware Compression Profiles

Status: delivered.

- [x] Add provider compression profiles for raw, OpenAI, Anthropic, Gemini-compatible, and local-model targets.
- [x] Use provider estimator feedback to tune dynamic dictionary savings thresholds and dictionary caps.
- [x] Add `sourceMap.provider`, `sourceMap.profile`, and dynamic-entry provider metadata for debugging and downstream tooling.
- [x] Add CLI `--provider <provider>` support and explanation output for selected provider/profile strategy.
- [x] Export `PROVIDER_COMPRESSION_PROFILES` and `ProviderCompressionProfile` through ESM, CommonJS, and TypeScript declarations.

### v1.8.0: Safe Compression Trust Policies

Status: delivered.

- [x] Add explicit `lossless`, `reversible`, `privacy`, and `lossy` trust policies.
- [x] Add `sourceMap.trustPolicy` and `sourceMap.trust` metadata for audit and downstream tooling.
- [x] Gate prompt, tech, file, diagnostic, dynamic dictionary, privacy, code minification, code summary, and redundancy stripping transformations by policy.
- [x] Add CLI `--trust <policy>` / `--policy <policy>` support and explanation output.
- [x] Add VS Code `glyphCompress.trustPolicy` setting and activation/config-change wiring.
- [x] Export `TRUST_POLICY_PROFILES` and `TrustPolicyProfile` through ESM, CommonJS, and TypeScript declarations.

### v1.9.0: Proxy and Packaging Hardening

Status: delivered.

- [x] Route package ESM middleware imports through `src/glyph-middleware.js` instead of the VS Code extension package scope.
- [x] Preserve provider, trust policy, privacy, and target API settings in CLI proxy startup.
- [x] Preserve provider, trust policy, and target API settings in VS Code proxy startup.
- [x] Add Gemini-compatible `/v1/*` to `/v1beta/openai/*` proxy route mapping.
- [x] Narrow npm `files` allowlist to runtime files and essential documentation.

### v1.9.3: Proxy Diagnostics Hotfix

Status: delivered.

- [x] Log upstream provider HTTP status codes for proxy requests.
- [x] Log upstream error response bodies with bearer tokens and API key fields redacted.
- [x] Log completed response byte counts for successful proxy responses.
- [x] Warn when the IDE client closes the response before the upstream stream completes.

### Proposed Future Versions

This sequence turns the current open roadmap items into concrete future milestones. It is ordered by dependency, so later versions assume the earlier ones landed first.

### v1.10.0: Release Automation Foundation

Status: delivered.

- [x] Add a root release helper that verifies version alignment, runs checks, packages the VSIX, and prints the exact npm, GitHub, and Marketplace verification commands.
- [x] Automate Marketplace post-release verification in CI or in the release helper.
- [x] Generate release notes from conventional commits or a structured release-note template.

### v1.11.0: Doctor and Integration Refresh

Status: delivered.

- [x] Expand `glyph-compress doctor` to validate installed extension version, proxy config, provider credential presence, and local VS Code settings.
- [x] Refresh Gemini-compatible proxy and VS Code usage examples for current Continue and Cursor configuration formats.
- [x] Add regression fixtures for VS Code settings snapshots, README badge/deleted-link regressions, and compressed payload snapshots.

### v1.12.0: Performance Engine Overhaul

Status: prepared for release.

- [x] Add adaptive chat strategy selection with automatic fallback when a compressed payload is net-negative.
- [x] Redesign Anthropic wrapping so first-turn requests stay lightweight while multi-turn threads switch to structured cacheable blocks.
- [x] Keep Anthropic stable protocol blocks separate from request-specific dynamic additions and measure cache-adjusted estimates in the realistic benchmark.
- [x] Add codebook-skip threshold: skip the ~400-token protocol header when text-level savings are below 80 tokens.
- [x] Correct Unicode token cost estimation with 1.5x penalty per non-ASCII glyph across all token-estimator variants.
- [x] Add per-glyph breakeven checks for tech name and dynamic dictionary substitutions to prevent negative token trades.
- [x] Eliminate all `JSON.parse(JSON.stringify())` state-cloning calls, replacing with shallow structured clones (~70% latency reduction).
- [x] Cap source map `replacements` at 500 entries to prevent unbounded memory growth during long sessions.
- [x] Cache compiled regexes for tech names, dynamic dictionary words, and file paths.
- [x] Add whitespace normalization (collapse spaces/tabs, strip trailing, limit blank lines) before verbose phrase processing.
- [x] Add multilingual verbose phrase compression for English, Italian, German, and French filler/polite patterns.
- [x] Expand file path regex to support `@scoped/package`, Windows backslashes, and 10+ new file extensions.
- [x] Lower dynamic dictionary minimum-word-length from 4 to 3 characters and add bigram detection.
- [x] Tune provider-specific `dynamicMinSavedChars` and `maxDynamicEntries` thresholds for net-positive compression across all providers.
- [x] Sync all CJS performance optimizations to the ESM middleware (`vscode-ext/glyph-middleware.js`).
- [x] Remove 31 historical `.vsix` build artifacts from the repository.
- [x] Shorten codebook instruction text from "Decode using mappings below." to "Decode:" for ~3 token savings per request.

### v1.13.0: Cross-Session Dictionary Caching

Status: delivered.

- [x] Dynamically persist `dynamicDict` and `fileIndex` on disk under `~/.glyphcompress/cache/<sha256>.json` to enable instant warm-starts.
- [x] Integrate cache key generation using SHA-256 hashes of workspace paths and working directories.
- [x] Add auto-save cache triggers inside successful `compressText` and `compressMessages` executions.
- [x] Synchronize ESM and CommonJS middleware compilers and export public profile tables.
- [x] Implement test coverage verifying dynamic dictionary warm-start restorations and maintain 51/51 passing tests.

### v1.14.0: Attentional Decay Compaction (ADC)

Status: delivered.

- [x] Implement Attentional Decay Compaction (ADC) to scale chat transcripts toward near-infinite context capacity at minimal token costs by progressively compacting older history.
- [x] Define a zone-based progressive compaction schema (Active, Warm, Cold, Deep Freeze) where older context is decayed into structural/episodic summaries.
- [x] Wire the new `experimentalDecay` setting into VS Code configurations, CLI arguments, and proxy middleware.
- [x] Deliver 100% test coverage for the 4 compaction zones, keeping active prompt fidelity intact and verified.

### v1.15.0: Holographic Folding & Intent Diffs

Status: delivered.

- [x] Implement Holographic Context Folding (Concept 4) to group overlapping related files and import boilerplate into layered structure blocks.
- [x] Implement Generative Intent Diffs (Concept 3) to minify unified diff outputs into high-density declarative change action lines.
- [x] Wire folding and intents configurations into GlyphCompressor options, CLI flags (`--folding` / `--intents`), and proxy server.
- [x] Create comprehensive unit test suites in `test/holographic-test.js` and `test/intent-test.js` verifying behavior and saving thresholds.

### v1.16.0: Codebook Integrity & Adaptive Levels

Status: delivered.

- [x] Fix dynamic-dictionary symbol collision: replace the Greek/Cyrillic glyph pool (which overlapped reserved `TECH_GLYPHS` symbols — `α` was both "Agent" and the first dynamic-dictionary assignment) with unbounded `§N` indexed references.
- [x] Fix codebook completeness: generate the printed `TECH:` codebook line directly from `TECH_GLYPHS` so it cannot drift out of sync (13/28 glyphs were previously undocumented). Apply the same fix to the legacy `compressor.js`/`system-prompt-generator.js` engine (14/33 previously undocumented).
- [x] Fix `getCodebookPrompt()` (the CLI's codebook source) to always include dynamic-dictionary `DYN:` definitions, not just when called through the messages/proxy path.
- [x] Fix dynamic-dictionary economics: require a word to repeat at least twice and net out its own definition cost before counting it as a saving.
- [x] Add net-negative fallback to `compressText()`, matching the fallback already present in `compressMessages()`.
- [x] Add automatic level selection: `selectCompressionLevel()` and `level: 'auto'` pick light/standard/aggressive/ultra per request from content length and code density.
- [x] Add tokenizer-calibrated glyph cost measurement (`npm run calibrate:tokenizer`, `js-tiktoken` dev dependency) to check the token-cost heuristic against real OpenAI tokenizers.
- [x] Add `test/codebook-completeness.js` (60 assertions) and `test/cache-prefix-stability.js` as permanent regression suites.

### v1.17.0: Context Router Wiring

Status: delivered.

- [x] Wire ranked workspace file selection into normal compression calls behind an explicit option and token budget (`GlyphCompressor.routeAndCompress()`, CLI `glyph-compress route <query>`).
- [x] Use diagnostics and recent task intent as router inputs (via `workspace-intelligence`'s existing intent detection + relevance scoring); fixed a word-boundary bug in diagnostic extraction (`HACK` matching inside "Hacker News") uncovered while wiring this up.
- [x] Keep provider-aware routing behavior auditable through source-map metadata: `selectedFiles`/`excludedFiles` report score, token cost, and exclusion reason, with a per-file `sourceMap` for reversibility.
- [ ] Partial: git-diff-aware routing (staged/unstaged files as a router signal) is available in `selectRelevantFiles` but not yet surfaced as a dedicated `routeAndCompress` option.

### v1.18.0: Structured Diagnostics and Snapshots

Status: proposed.

- [ ] Add structured redaction-aware log sinks with timestamps for CLI, proxy, and VS Code extension diagnostics.
- [ ] Surface richer trust and routing diagnostics in the extension output and proxy logs.

### v1.19.0: Expression-Level Source Maps

Status: proposed.

- [ ] Add deeper expression-level AST spans for minified code blocks where language-specific parsers are available.
- [ ] Expand language coverage for structural spans and reversible debug metadata.
- [ ] Add targeted validation for source-map fidelity at the expression level.

### v1.20.0: Provider Trust and UX

Status: proposed.

- [ ] Extend provider profiles to choose code block and context-router strategies automatically.
- [ ] Add per-provider trust warnings or risk scoring for risky transformations.
- [ ] Improve VS Code UX surfacing for provider choice, trust policy, and diagnostic output.

### v1.21.0: Real Task Evaluation

Status: proposed.

- [ ] Add repeatable model-based comprehension tests across multiple providers.
- [ ] Measure task success on real repositories beyond deterministic benchmark proxies.
- [ ] Track median token savings across real user repositories or opted-in benchmark corpora.

### v1.22.0: Adaptive Workspace Memory

Status: proposed.

- [ ] Add incremental codebook updates instead of full regenerate-on-inspect behavior.
- [ ] Add decay or weighting from repeated repository usage.
- [ ] Prepare the workspace-memory layer for future semantic diff and team codebook features.

## Repository Improvements

### Packaging

- [x] Add a `files` allowlist in `package.json` to avoid publishing test scratch files, old VSIX files, generated workspace instructions, and large assets that are not required at runtime.
- [x] Avoid publishing historical `.vsix` files to npm.
- [x] Add `npm run check` for tests, benchmark, and npm pack dry-run.
- [x] Add `npm run package:vscode` for VSIX packaging.
- [x] Add `docs/release.md` with the exact release sequence and post-release verification steps.
- [ ] Partial: Release process still requires manual commit, tag, GitHub release publication, npm publish, and VSIX upload steps.
- [x] Add a root release script that automates version consistency checks and prints the exact release sequence.

### Testing

- [x] Integration tests cover core compression, provider wrappers, source maps, CLI trust features, workspace intelligence, package metadata, and governance docs.
- [x] Benchmark fixtures cover raw, OpenAI, Anthropic, Gemini-compatible, and ultra payloads.
- [x] Regression coverage exists for package exports and CommonJS imports.
- [x] Split tests into unit, CLI, workspace, metadata, and integration suites.
- [x] Add tokenizer-aware tests using provider-specific token estimators where practical.
- [x] Add proxy and extension activation smoke suites.
- [x] Add regression fixtures for README badges, deleted links, and VS Code settings.
- [x] Add snapshot tests for compressed payloads so format drift is deliberate.

### Documentation

- [x] Add `SECURITY.md` explaining proxy behavior, local processing, API key handling, and what data is sent upstream.
- [x] Add `PRIVACY.md` for local artifacts, source maps, codebooks, telemetry, and network behavior.
- [x] Add `ENTERPRISE.md` for deployment controls and commercial usage guidance.
- [x] Add `CONTRIBUTING.md` with local setup, test commands, release process, and documentation style.
- [x] Add `docs/architecture.md` for compression pipeline and provider-specific behavior notes.
- [x] Add `docs/release.md` checklist covering npm, GitHub tags, VSIX install, README badges, and Marketplace release checks.

### Developer Experience

- [x] Add TypeScript declarations for the public API.
- [x] Add examples for OpenAI, Anthropic, CLI, and workspace intelligence through README/CLI usage.
- [x] Add `glyph-compress doctor` to validate repository readiness.
- [ ] Partial: `doctor` now validates proxy config, VS Code settings, installed extension version, and provider credentials when discoverable, but broader local IDE/provider coverage is still incomplete.
- [ ] Partial: CommonJS, ESM, workspace intelligence, Gemini-compatible proxy, and VS Code walkthroughs exist through docs/tests, and Continue/Cursor config examples were refreshed, but broader IDE-specific walkthrough coverage still needs polish.
- [x] Add privacy firewall redaction for API keys and sensitive request text before compression.
- [ ] Add structured debug logging with timestamps and redaction-aware log sinks for proxy and extension diagnostics.

### Governance and Quality

- [x] Add GitHub Actions for tests, benchmark, package dry-run, and VSIX packaging.
- [x] Add stable security, privacy, and enterprise docs.
- [x] Add issue templates for bug reports, feature requests, provider compatibility, and benchmark submissions.
- [x] Add pull request template with tests, docs, compression impact, and privacy checklist.
- [x] Add link checking to GitHub Actions.
- [x] Add release notes automation from conventional commits.

## Strategic Priorities — Becoming the Default IDE↔LLM Compression Layer

GlyphCompress competes against a moving target: providers are shipping native prompt caching for free, and research tools like LLMLingua attack the same problem from a different angle. Winning that space requires more than character-level glyph substitution — it requires being the trusted, invisible default that every AI-native IDE and coding agent uses without the user thinking about it. This section tracks that path, grouped by leverage.

### 1. Technical Foundation (highest leverage, do first)

- [x] Tokenizer-calibrated cost measurement exists for `TECH_GLYPHS` (`npm run calibrate:tokenizer`, v1.16.0).
- [x] Extend tokenizer calibration to every glyph family: `DOMAIN_GLYPHS`, `STRUCTURE_GLYPHS`/error-pattern symbols, and `PROMPT_PATTERNS` output — not just `TECH_GLYPHS`. Also added phrase-level (whole diagnostic/prompt string) before/after comparison, not just isolated glyphs.
- [x] Compare each glyph against the *actual replaced word/phrase* token cost (apples-to-apples). Result: **all 28 `TECH_GLYPHS` are a net token loss on real OpenAI tokenizers** — common tech names are already 1-2 BPE tokens, and the glyph that replaced them cost as much or more (worst case: "express" 1 token vs `𝔼ˣ` 5 tokens).
- [x] Replace the heuristic breakeven formula with a real, measured per-glyph token-cost table (`MEASURED_TECH_GLYPH_TOKENS_OPENAI`) for the `openai` provider — tech-name substitution now never fires when it would lose tokens. `raw` (demos, character-level reporting) is intentionally unaffected. Locked in by `test/tech-glyph-economics.js` (30 assertions).
- [ ] Extend calibration to Anthropic (token-count endpoint) and Gemini (`countTokens` API) so all three primary providers are optimized against real tokenizers, not one out of three.
- [ ] Add repeatable model-based comprehension tests (tracked below under Experimental Ideas as "LLM Comprehension Tests") to verify decoding, not just assume it.

### 2. Trust at Scale

- [ ] Publish a reproducible public benchmark against known alternatives (LLMLingua, no compression, naive truncation) with open methodology.
- [ ] Commission a third-party security audit of the proxy (it intercepts real provider API keys) to unblock enterprise adoption beyond self-reported SECURITY.md/PRIVACY.md.

### 3. Distribution Beyond VS Code

- [ ] Ship an MCP (Model Context Protocol) server so GlyphCompress plugs into Claude Code, Claude Desktop, and other MCP-compatible clients with no IDE-specific integration work.
- [ ] Add a JetBrains plugin and a Neovim plugin — most backend/enterprise developers are not on VS Code.
- [ ] Upstream native integration (not just manual proxy config) into Continue.dev, Cline, RooCode, and Aider.
- [ ] Offer an optional hosted/cloud proxy for teams that do not want to self-host, aligned with the existing dual AGPL/commercial license.

### 4. Product Moat

- [x] Ship Context Router Wiring (v1.17.0) — `GlyphCompressor.routeAndCompress(query, options)` and CLI `glyph-compress route <query>` rank workspace files by relevance and compress as many as fit inside a token budget, with `selectedFiles`/`excludedFiles` (+ per-file `sourceMap`) making the routing decision auditable. Building it surfaced and fixed a real pre-existing bug: `extractDiagnostics()`'s TODO/FIXME/HACK regex had no word boundaries and matched "HACK" inside "Hacker News," inflating irrelevant marketing docs above the actually-relevant source file.
- [ ] Systematically orchestrate provider-side prompt caching (not just Anthropic `cache_control`) by treating the codebook and stable context as cache-first blocks across OpenAI and Gemini's implicit caching too.
- [ ] Ship Team Codebook Registry (tracked below under Experimental Ideas) for shared, org-wide dictionaries — a network effect a single-user tool cannot replicate.

### 5. Go-to-Market

- [ ] Publish honest case studies using realistic (not synthetic-demo) numbers from real repositories, ideally with a citable customer.
- [ ] Publish a public comparison table against alternatives (native provider caching alone, LLMLingua, no compression) that states plainly where GlyphCompress does and does not help.

## Experimental Ideas

- [ ] Glyph Negotiation Protocol: Have the assistant reply with which glyph subsets it understood, then adapt future compression to that model.
- [ ] Context Budget Planner: Let users set a target token budget and have GlyphCompress choose the compression strategy automatically.
- [ ] Semantic Diff Compression: Compress only what changed since the previous chat turn, using stable references for unchanged context.
- [ ] Team Codebook Registry: Allow teams to share project-specific dictionaries across repositories and agents.
- [ ] LLM Comprehension Tests: Ask multiple models to decode and solve tasks from compressed prompts, then score accuracy against expected edits.
- [x] Privacy Firewall Mode: Redact secrets, credentials, and common customer identifiers before payload compression.

## Success Metrics

- [ ] Partial: Median token savings target is tracked in benchmark output, but not yet measured across real user repositories.
- [ ] Partial: Standard-mode task success is approximated by a benchmark proxy, but not yet measured with real LLM task outcomes.
- [x] All providers now show net-positive or break-even savings on standard benchmark fixtures thanks to codebook-skip and per-glyph breakeven logic.
- [x] Public API import tests pass for ESM and CommonJS on release.
- [x] VS Code extension activation and command smoke tests are automated in the local test suite.
- [x] README, npm version, GitHub tag, Marketplace listing, VSIX version, and GitHub release version stayed aligned through `v1.11.0`.

## Immediate Next Actions

1. Wire workspace-intelligence file ranking into normal compression calls behind an explicit option and token budget.
2. Extend provider profiles to tune code block minification, context-router behavior, and provider-specific trust warnings.
3. Add expression-level AST spans for code block minification where language-specific parsers are available.
4. Expand multilingual verbose phrase coverage to Spanish, Portuguese, and Japanese.