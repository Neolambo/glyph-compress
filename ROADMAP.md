# GlyphCompress Roadmap

This roadmap tracks what has been delivered, what is partially complete, and what still needs work after the stable `v1.0.0` release.

## Status Legend

- `[x]` Done and released.
- `[ ]` Still missing or not yet implemented.
- `[ ] Partial:` Started, but not complete enough to call done.

## North Star

GlyphCompress should make large codebases cheaper, faster, and easier for LLMs to reason about without forcing developers to change their workflow. The project wins when users can send richer context, spend fewer tokens, and still get answers that preserve intent, code structure, and safety.

## Current Stable Release

- [x] Current stable release is `v1.32.9`: **the legacy engine exported from the package root emitted glyphs the model was never given a definition for** — 6 of them, including the `₍` `₎` subscript delimiters of the `◈₍1₎` file-reference notation, the most load-bearing construct in the output. Root cause was three drifts in one function: `SYM:` was a hand-written string covering 9 of `STRUCTURE_GLYPHS`' 21 entries (sitting directly beneath a comment describing the identical drift fixed for `TECH_GLYPHS` in v1.16.0), `ERROR_CODES` was imported and never rendered, and the `₍N₎` notation was only implied. `test/codebook-completeness.js` never covered this engine at all. Now generated from the tables and covered.
- [x] `v1.32.8`: **the compression level was never validated or normalized.** `provider` and `trustPolicy` always resolved their input and reported the resolved value; `level` was stored verbatim, so `'Ultra'` — one capital letter — matched none of the exact-string level checks and silently degraded to light-level output (**11.0% -> 6.3% real-token saving** on this repo's own `src/compressor.js`, trust policy dropping `lossy` -> `reversible` with it). Worse, `sourceMap.level`, `stats.selectedLevel`, and `--explain` all echoed the invalid string back as applied. Fixed with `normalizeCompressionLevel()` (resolve-and-report, matching `normalizeProvider`); the CLI now exits 1 on an unrecognized level.
- [x] `v1.32.7`: tests only. An architecture review hypothesised that the dynamic dictionary's session-order `§N` assignment would invalidate the provider cache whenever a session learned new vocabulary — **measurement refuted it**: the cacheable block stays byte-identical while the dictionary grows 47 -> 80 entries, because v1.25.0 correctly puts all of that in the `DYN:` line outside the block. The real finding was that this invariant had **no test**: none of the nine cache-prefix tests grew the dictionary (a session starting large saturates it on turn 1). New test added, and its first version was caught passing against a disabled cache-stable path before shipping.
- [x] `v1.32.6`: closes the last surviving mutation from the v1.32.3-v1.32.6 audit. `_loadCache()` restores both counters on a warm start but only `dynamicCounter` was asserted — removing the `fileCounter` restore left all 30 suites green, while a second session assigned `◇₍1₎` to a *new* file already bound to another path, so the model decodes the reference to the wrong file with nothing looking malformed. Guarded behaviourally (no duplicate refs) rather than on the counter value.
- [x] `v1.32.5`: **critical fix** — pointing a *native* Anthropic client (Claude Code, Claude Desktop, the SDK via `ANTHROPIC_BASE_URL`) at the GlyphProxy silently destroyed its request. v1.24.0's fix assumed every client is OpenAI-shaped, which holds for Cursor/Cline/Continue but not for a native one; re-running the translator over an already-native body dropped the top-level `system` prompt and the **entire `tools` array**. An agentic client stripped of its tools still gets a 200 back, so the failure was completely silent. Fixed with `isNativeAnthropicRequest()` + in-place compression that preserves every field rather than rebuilding from an allowlist.
- [x] `v1.32.4`: mutation testing round two, into the two highest-risk untested files. `inferProviderFromTarget()` (which resolves the proxy's default `provider: 'auto'`, and so gates every provider-specific decision) had **no coverage at all**; the proxy's upstream error-body redaction was never verified to still be called; and `context-router.js`'s `gitDiffOnly` test passed with the filter **fully disabled**. Also fixed two real defects in `src/dashboard.js` — `escapeHtml()` threw on the numeric fields the render loop actually passes it (silently freezing the dashboard, since the loop is inside a try/catch), and the history render path interpolated six fields unescaped while the logs path escaped. Those fields are internally generated, so that was latent risk, not an exploitable XSS.
- [x] `v1.32.3`: a deliberate pause on features to **mutation-test the suite itself**. Found that only 3 of the 9 `PRIVACY_REDACTION_PATTERNS` kinds had coverage — disabling OpenAI-key, GitHub-token, AWS-key, JWT, or Bearer-token redaction left `npm test` fully green, while README/PRIVACY.md advertise all nine. `test/logger.js` made the area *look* covered but tests the log-sink redactor, a different code path. New `test/privacy-redaction.js` (14 tests) covers every kind, asserts no secret reaches the source map, and parses the pattern list so a tenth pattern without a test now fails.
- [x] `v1.32.2`: third and final site of the `level`/trust-policy coupling bug — Attentional Decay Compaction forced `ultra` for old turns without re-deriving the policy, so at the **default** `level: 'standard'` decay was silently near-inert (2141 vs 408 tokens on an 8-turn thread; end-to-end history reduction 36% -> **66%**). Lifting the veto also exposed a genuinely **wrong level** it had been hiding: the warm zone forced `ultra`, which summarizes code away, while the documented contract and `test/unit.js` require warm turns to keep their code minified — corrected to `aggressive`.
- [x] `v1.32.1`: fixed the *other half* of v1.32.0's `level: 'auto'` trust-policy bug. v1.32.0 scoped its fix to `compressText()` and left `compressMessages()` alone; the same root cause was live there and far worse — **325 vs 4922 tokens (15x)** on a realistic 4-message thread — in the path the proxy, `wrapOpenAI`/`wrapAnthropic`, and the VS Code extension all use. `trustPolicy` is now captured/restored alongside the level, since the two are coupled.
- [x] `v1.32.0`: shipped the **Context Budget Planner** (`compressToBudget()`/`planCompressionForBudget()`, CLI `--budget`, MCP `compress_to_budget`) — pick the least destructive compression level that fits a hard token budget, with every level tried reported and honest `withinBudget: false` when nothing fits. Building it exposed and fixed a **real shipped bug in `level: 'auto'`** (v1.16.0): `_resolveTrustPolicy()` reads `this.level` but only ran in the constructor, so `auto` selected `ultra` and then had its defining transforms blocked by the conservative policy derived from `'auto'` — delivering standard-level output while reporting `selectedLevel: 'ultra'`. Measured at 4420 vs 3913 tokens (11.5% silently lost) on this repository's own `src/compressor.js`.
- [x] `v1.31.1` was a documentation-only release. Rewrote `CASE_STUDY.md` (previously stale, v1.14.0-era, hype-toned, and orphaned — not linked or link-checked) with real, current `benchmark:realistic`/`benchmark:alternatives` numbers and honest "where it helps / where it doesn't" framing. Wired into README, `llms.txt`, `check:links`, and the npm package.
- [x] `v1.31.0` adds `server.json` for MCP registry auto-discovery. Since this npm package has two bins (`glyph-compress` CLI, `glyph-compress-mcp` server) and the registry schema has no field to select a non-default one, added an `mcp` CLI subcommand (`npx glyph-compress mcp`) instead of publishing a second package, and pointed `server.json`'s `packageArguments` at it. `package.json` gained `mcpName` for registry ownership verification. New tests drive the subcommand through a real MCP client and guard `server.json`/`package.json` consistency against drift.
- [x] `v1.30.1` was a documentation-only release, prompted by a repository-layout review against other mature open-source READMEs. Removed the long per-version changelog archive from README.md (now only in GitHub Releases/`RELEASE_NOTES.md`), and added a quick-nav row, a "When to Use / When to Skip" section, a "Compared to Alternatives" table, a comprehension-check "Proof" table, collapsible `<details>` for deep-dive sections, a root-level `llms.txt`, and `CODE_OF_CONDUCT.md`.
- [x] `v1.30.0` fixed the `src/token-estimator.js` bug found while building v1.29.0's benchmark — two compounding issues (an uncalibrated Unicode penalty, and a base ratio only accurate for code, not prose), plus a fallback safety margin since even a well-calibrated single heuristic number isn't reliable enough alone. `docs/benchmark-methodology.md`'s three previously break-even-or-negative fixtures now correctly fall back instead of silently regressing.
- [x] `v1.29.0` added a reproducible public benchmark against no-compression and naive truncation (`npm run benchmark:alternatives`), using real `js-tiktoken` measurement — which is what found the v1.30.0 bug in the first place.
- [x] `v1.28.0` added real Anthropic tokenizer calibration (28/28 `TECH_GLYPHS` are a net loss, the most extreme finding of the three providers) plus a third real LLM comprehension spot-check, against a real Claude model — completing real-tokenizer calibration and comprehension evidence across all three primary providers.
- [x] `v1.27.0` added a real OpenAI comprehension spot-check (`gpt-4o-mini`), sibling to v1.26.0's Gemini one — same scenario, same checks, both passing.
- [x] `v1.26.0` added real Gemini tokenizer calibration (same net-token-loss finding as OpenAI, now measured rather than assumed) plus the first LLM comprehension spot-check, against a real Gemini model.
- [x] `v1.25.0` made the codebook header injected for OpenAI/Gemini a byte-identical, cacheable prefix once a session has assistant history, with a two-tier fallback so the larger header never costs more than it saves.
- [x] `v1.24.0` was a critical fix: every real proxy request to an Anthropic target (`targetApiUrl = https://api.anthropic.com`) was being corrupted and rejected by the real API, because the proxy forwarded the OpenAI-shaped client request unmodified instead of translating it to Anthropic's native Messages API shape.
- [x] `v1.23.0` shipped Adaptive Workspace Memory — incremental codebook builds (reuse unchanged files by mtime instead of full re-parse) and usage-decay-weighted relevance ranking, both wired automatically into `GlyphCompressor.routeAndCompress()`.
- [x] `v1.21.2` was a VS Code Marketplace listing fix (`vscode-ext/README.md` was missing entirely, so the Marketplace "Overview" tab was blank; also discovered the Marketplace had never received anything past `v1.12.0`, months behind this repository).
- [x] `v1.21.1` was a critical packaging hotfix — the VS Code extension had been broken since `v1.17.0` (see below).
- [x] Root npm package, VS Code extension manifest, VS Code extension lockfile, and `server.json` are versioned to `1.32.9`.
- [x] npm `latest` is caught up to `1.31.1` (published directly by the maintainer, working around the OTP-confirmation flow this environment can't complete non-interactively); `1.24.0`/`1.25.0`/`1.27.0` were left unpublished as a harmless historical gap since `latest` already carries their fixes. `v1.32.9` publication is pending the same maintainer-driven `npm publish` step. VS Code Marketplace is caught up to `v1.31.1`, published directly by the maintainer through the web management portal (marketplace.visualstudio.com/manage) rather than the CLI/PAT flow; `v1.32.9` publication there is still pending.
- [x] `npm test` passes 30 suites (unit, CLI, workspace, extension, proxy, metadata, snapshot, integration, holographic, intent, codebook-completeness, auto-level, cache-prefix-stability, tech-glyph-economics, code-minify-economics, context-router, mcp-server, team-codebook, logger, ast-spans, trust-warnings, npm-pack-smoke, adaptive-workspace-memory, anthropic-bridge, token-estimator-accuracy, context-budget-planner, privacy-redaction, dashboard, proxy-provider-inference) for `v1.32.9`. `test/benchmark-alternatives.js` and the tokenizer-calibration/comprehension scripts remain deliberately excluded — reporting/manual tools, not pass/fail regression gates.
- [x] `npm run benchmark` reports 1.3x aggregate ratio, 22% genuine savings, 100% fidelity proxy, 100% edit success, and 0 hallucinated refs — unchanged; the synthetic fixtures it uses weren't affected by the estimator recalibration.

## Prepared Next Release

- [ ] No specific next release is queued. Real-tokenizer calibration, single-scenario comprehension checks, a public benchmark vs. alternatives, and the token-estimator accuracy bug it found are all now done. Everything remaining is either broader in scope (real task-success evaluation on varied scenarios/real repositories, `v1.22.0`) or a strategic call needing direction (JetBrains/Neovim plugins, hosted proxy, security audit, go-to-market content — see Strategic Priorities).

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
- [x] Delivered in `v1.19.0`, but this entry was left stale until `v1.32.0`: structured log sinks *are* implemented (`src/logger.js`) — every entry carries an ISO timestamp with consistent redaction across console, the VS Code `outputChannel`, and an optional JSONL file sink via `--log-file`. Covered by `test/logger.js`.
- [ ] Partial: Release notes can now be scaffolded from conventional commit subjects, but still need human curation before publication.
- [x] **Found while building `npm run benchmark:alternatives` (v1.29.0), fixed in v1.30.0**: `src/token-estimator.js` had two compounding bugs — an uncalibrated, double-counting Unicode penalty, and (the larger issue) a base `charsPerToken` constant only accurate for code, not prose (`docs/architecture.md` has zero non-ASCII characters, so the Unicode bug alone couldn't explain its ~40% overestimate). Both recalibrated against real `js-tiktoken` measurement; `compressText()`/`compressMessages()`'s fallback also gained a 10% safety margin, since even the recalibrated heuristic's ORIGINAL-vs-COMPRESSED ratio still showed ~10-14% residual noise. See "v1.30.0" below and `docs/benchmark-methodology.md`.

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
   - [x] Delivered in `v1.23.0`, but this entry was left stale until `v1.32.0`: the codebook is no longer static per inspect run. `buildWorkspaceCodebook()` reuses unchanged files by mtime (`incrementalStats`), and `recordFileUsage()` + a 14-day half-life decay (`USAGE_DECAY_HALF_LIFE_DAYS`) weight relevance from repeated real usage. Covered by `test/adaptive-workspace-memory.js`.

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

### v1.17.0: MCP Server, Context Router Wiring & Real-Tokenizer Economics

Status: delivered.

- [x] Ship an MCP server (`bin/mcp-server.js`, `npx glyph-compress-mcp`) exposing `compress_text`, `compress_file`, `route_context`, and `get_codebook` tools, verified end-to-end over real stdio transport with the official MCP SDK client (`test/mcp-server.js`).
- [x] Wire ranked workspace file selection into normal compression calls behind an explicit option and token budget (`GlyphCompressor.routeAndCompress()`, CLI `glyph-compress route <query>`).
- [x] Use diagnostics and recent task intent as router inputs (via `workspace-intelligence`'s existing intent detection + relevance scoring); fixed a word-boundary bug in diagnostic extraction (`HACK` matching inside "Hacker News") uncovered while wiring this up.
- [x] Keep provider-aware routing behavior auditable through source-map metadata: `selectedFiles`/`excludedFiles` report score, token cost, and exclusion reason, with a per-file `sourceMap` for reversibility.
- [x] Extend tokenizer calibration with apples-to-apples word-vs-glyph and phrase-level before/after comparison; found all 28 `TECH_GLYPHS` are a net token loss on OpenAI and wired a measured cost table into the breakeven check so tech-name substitution never fires there when it would lose tokens.
- [x] Git-diff-aware routing: `routeAndCompress(query, { gitDiffOnly: true })` and CLI `glyph-compress route <query> --git-diff-only` restrict candidates to git staged/unstaged files for "review what I changed" workflows, instead of only nudging their score among the whole workspace.

### v1.19.0: Structured Diagnostics

Status: delivered.

- [x] Add structured redaction-aware log sinks with timestamps for CLI, proxy, and VS Code extension diagnostics (`src/logger.js`, `createStructuredLogger`). Every log entry now gets an ISO timestamp and consistent redaction across ALL sinks (console, VS Code `outputChannel`, and a new optional JSONL file sink via CLI `--log-file`) — previously redaction was only ever applied at one call site (the upstream error body), so a forwarding-error message or an echoed request URL could leak a secret unredacted.
- [x] Surface richer trust and routing diagnostics in the extension output and proxy logs: each request now logs privacy firewall / attentional decay / holographic folding / intent diffs state, dynamic dictionary and file index size, whether a team codebook was loaded, and whether the net-negative fallback fired.
- [x] Fixed a real, pre-existing drift bug found while doing this: `vscode-ext/proxy.js` was a hand-maintained CommonJS duplicate of `src/proxy.js` that had fallen out of sync (missing `attentionalDecay`/`holographicFolding`/`intentDiffs` options, the dashboard/stats endpoints, and now structured logging). It is now esbuild-generated from `src/proxy.js` like the rest of the CJS build, eliminating the duplicate entirely. Had zero test coverage before or after; added a CJS-build smoke test.

### v1.20.0: Expression-Level Source Maps

Status: delivered.

- [x] Add deeper expression-level AST spans for minified code blocks. Deliberately kept as calibrated regex-based extraction rather than a real parser dependency (acorn/meriyah/etc.) — chat-pasted code snippets are routinely syntactically incomplete (missing imports, partial functions), which a real parser would simply fail to handle, forcing a fallback to this same approach anyway; a new parser dependency would also add weight for every consumer to buy marginal precision on code that often can't be parsed at all. New token kinds: arrow functions, function calls (distinct span from declarations), destructuring, async/await, and exception handling (try/catch/throw/finally).
- [x] Expand language coverage for structural spans: added Ruby, Swift, Kotlin, and PHP, which already had `TECH_GLYPHS` entries but zero token extraction.
- [x] Add targeted validation for source-map fidelity at the expression level (`test/ast-spans.js`) — every token's span must slice back to exactly its own text against the caller's original input.
- [x] **Found and fixed two real, pre-existing correctness bugs while writing that fidelity check**: whitespace normalization ran on the *whole* message, including inside ` ```fenced``` ` code blocks, in two independent places in the pipeline (the main normalization pass, and again at the tail of verbose-phrase compression) — neither fence-aware. 4-space and 8-space nested indentation both collapsed to the same single space (or single tab after the indent-to-tab pass), silently flattening code structure at every compression level, not just aggressive/ultra, and for indentation-significant languages like Python, changing what the code actually does. Fixed by making both passes skip code fence contents entirely (`_applyOutsideCodeFences`).

### v1.21.0: Provider Trust and UX

Status: delivered.

- [x] Extend provider profiles to choose code block strategy automatically: applied the same real-tokenizer measurement that found all 28 `TECH_GLYPHS` losing on OpenAI (v1.17.0) to `_minifySyntax()`'s code-block keyword substitutions — all 33 keyword/glyph pairs tested (`return`→`→`, `function`→`ƒ`, `const`→`◇`, `public`→`+`, ...) are also net token losses on OpenAI. Both now skip measured-loss substitutions on the `openai` provider via the same breakeven pattern; comment/blank-line removal and indent-to-tab compaction are untouched since they are not glyph substitutions and still save real tokens. Context-router strategy selection by provider remains open — no evidence yet that it should differ by provider.
- [x] Add per-provider trust warnings for risky transformations: `buildTrustWarnings(trustProfile, level)` and `sourceMap.trustWarnings` — every warning is derived strictly from the trust profile's own existing `reversible`/`redacts`/`lossy`/`allows.*` flags (no new, unverifiable claims about model behavior). Surfaced in CLI `--explain`.
- [x] Improve VS Code UX surfacing for trust policy and diagnostic output: trust warnings now appear in the extension's output channel both at startup (for the configured level/policy) and after each manual compression.
- [x] **Found and fixed a real export bug while adding this**: `vscode-ext/glyph-middleware.js` hand-maintains a second, manual `module.exports = {...}` block for CJS consumers alongside its `export {...}` statement (esbuild's own auto-generated CJS export is dead code there — `0 && (module.exports = {...})`). A symbol exported from one list but not the other silently produces `undefined` for `require()` consumers; `buildTrustWarnings` shipped with exactly this bug initially, caught immediately by a new regression test (`test/extension.js`) that now compares both lists and fails loudly if they diverge.

### v1.21.1: Critical Packaging Hotfix

Status: delivered.

- [x] **The published VS Code extension was broken from `v1.17.0` through `v1.21.0`.** `vscode-ext/glyph-middleware.cjs` required `../src/workspace-intelligence.cjs` and `../src/team-codebook.cjs`. Those paths resolve fine inside a full repo checkout (which is all every prior test ever exercised — everything used repo-relative `require()`), but `@vscode/vsce package` only includes files physically inside `vscode-ext/`; `src/` is not part of the packaged VSIX at all. Every VSIX built since Context Router/Team Codebook Registry shipped would throw `MODULE_NOT_FOUND` the instant any command tried to compress anything. Found by extracting the actual just-installed VSIX and starting the real proxy from it, at the user's request to verify the install actually worked — not from any automated test, because none of them tested the packaged artifact.
- [x] Fixed by building local, self-contained copies of `workspace-intelligence.cjs` and `team-codebook.cjs` directly into `vscode-ext/` (matching the existing pattern already used for `token-estimator.cjs`), and rewriting `glyph-middleware.cjs`'s requires to the local copies instead of `../src/*`.
- [x] **The equivalent npm-package risk was also real**: the new local `vscode-ext/` copies were initially missing from `package.json`'s `files` allowlist, which would have broken `require('glyph-compress')` for npm consumers the same way, caught before any publish by extracting a real `npm pack` tarball and requiring the published entry points from it.
- [x] Two new regression suites make this permanent: `test/extension.js` now scans every packaged `.cjs` file for any `require("../...")` escaping outside `vscode-ext/`, generalizing what used to be a single hardcoded check for one historical instance; `test/npm-pack-smoke.js` runs a real `npm pack`, extracts the tarball, and requires the published CJS entry point, the middleware sub-export, and `routeAndCompress()` from it. Both were verified to actually fail before the fix (reproduced the bug on purpose) and pass after.

### v1.22.0: Real Task Evaluation

Status: proposed, partially started in v1.26.0/v1.27.0/v1.28.0.

- [ ] Partial: `test/comprehension-check-gemini.js` (v1.26.0), `test/comprehension-check-openai.js` (v1.27.0), and `test/comprehension-check-anthropic.js` (v1.28.0, all dev-only/manual) send the same realistic bug-fix scenario, compressed with the real codebook + dynamic dictionary exactly as the CLI sends it, to real `gemini-2.5-flash-lite`, `gpt-4o-mini`, and `claude-haiku-4-5` models — all three correctly named the compressed function/class and identified the bug with no hallucination (OpenAI and Anthropic both reproduced the code and proposed working fixes, since their measured-loss gating means compression barely touches identifiers at all; Anthropic's fix was the most complete of the three, correctly implementing percentage-based discount logic). All three primary providers now have comprehension evidence for one scenario each — broader/varied task scenarios are still needed before this is "repeatable... across multiple providers" in the full sense.
- [ ] Measure task success on real repositories beyond deterministic benchmark proxies.
- [ ] Track median token savings across real user repositories or opted-in benchmark corpora.

### v1.23.0: Adaptive Workspace Memory

Status: delivered.

- [x] **Incremental codebook updates**: `buildWorkspaceCodebook()` reuses a file's previous symbols/imports/diagnostics when its mtime is unchanged since the last build, instead of re-parsing every file on every call. Only changed files are rescanned; the codebook now reports `incrementalStats: { reused, rescanned, total }`. `{ incremental: false }` forces a full rescan.
- [x] **Decay/weighting from repeated repository usage**: `recordFileUsage(rootDir, filePaths)` records that a file was actually selected and sent for a task; `selectRelevantFiles()` adds a half-life-decayed (14 days), capped usage boost on top of keyword/intent scoring. `GlyphCompressor.routeAndCompress()` calls this automatically for every file it selects, so files proven useful in past sessions can outrank a cold keyword match.
- [x] **Fixed a real gap found while testing this**: `recordFileUsage()` originally no-opped unless a codebook had already been persisted to disk (only the CLI's `inspect` command did that) — usage tracking would silently do nothing the first time `routeAndCompress()` ran on a fresh workspace. It now builds and saves a codebook on the fly when none exists, which also seeds the incremental cache for the next call.
- [x] New `test/adaptive-workspace-memory.js` (10 tests): incremental reuse/rescan correctness, usage persistence and decay, and an end-to-end check that `routeAndCompress()` actually records usage for selected files.
- [x] The workspace-memory layer (usage history, incremental per-file cache) is now in place as a foundation for future semantic diff features; Team Codebook Registry itself shipped separately in v1.18.0.

### v1.24.0: Anthropic Proxy Bridge (Critical Fix)

Status: delivered.

- [x] **Found and fixed a critical bug: every real proxy request to an Anthropic target was corrupted and rejected by the real API.** Every documented IDE integration (Cursor, Cline/RooCode, Continue.dev) configures the client in "OpenAI Compatible" mode, so the proxy always receives an OpenAI chat/completions-shaped request regardless of the real upstream. That was already handled correctly for OpenAI and for Gemini (a real OpenAI-compatible endpoint), but never for Anthropic: `api.anthropic.com` requires the system prompt as a top-level `system` field (not a `role: "system"` message), `x-api-key`/`anthropic-version` auth (not `Authorization: Bearer`), and the `/v1/messages` endpoint (not `/v1/chat/completions`). GlyphCompress's own compression path was additionally inserting an illegal `role: "system"` message into `messages` when none existed. Found by mocking the outbound request and inspecting exactly what the proxy forwarded, rather than trusting the existing smoke test, which only checked the forwarded status code and URL and so never caught it.
- [x] New `src/anthropic-bridge.js`: translates OpenAI-shaped requests to Anthropic's native Messages API shape and translates the response back, for both non-streaming JSON and streaming SSE (byte-buffered SSE parser correctly handles HTTP chunk boundaries that split events). Reuses `GlyphCompressor._prepareAnthropicPayload` — the same compression and `cache_control` structuring `wrapAnthropic()` already used — so proxy users now get the same cache-stable behavior as direct SDK-wrapper users, which was previously unreachable through the proxy at all.
- [x] Known, documented limitations: multi-modal image content is marked with a visible text placeholder rather than translated to Anthropic's image blocks; OpenAI tool-result (`role: "tool"`) messages are coerced to a labeled `user` message rather than a proper `tool_result` block; streamed tool-call argument deltas are not translated (non-streaming tool calls, including the response's `tool_calls` field, are fully translated).
- [x] New `test/anthropic-bridge.js` (18 tests): unit coverage of every translation function plus end-to-end tests that start a real proxy server, mock the outbound HTTPS call, and assert on the actual forwarded request/response for both streaming and non-streaming Anthropic responses — including a check that OpenAI/Gemini targets are unaffected. The existing `test/proxy.js` Anthropic smoke test was strengthened the same way. Verified both suites actually catch the original bug by reverting the fix and confirming the expected failures before restoring it.
- [x] README's IDE integration guide previously claimed swapping `apiBase`/target settings alone was enough to use an Anthropic upstream — corrected, with the real requirement (`glyphCompress.targetApiUrl = https://api.anthropic.com` and a real Anthropic model id) documented.

### v1.25.0: Cache-Stable Codebook for OpenAI/Gemini

Status: delivered.

- [x] **Found a real gap while investigating v1.24.0: the codebook header injected for OpenAI/Gemini could never be a stable cache prefix.** It's payload-filtered — only lists the DOM/TECH/SYM/MOD glyphs the current message happens to use — so it varies request to request, defeating those providers' automatic, implicit prompt caching (which requires byte-identical leading tokens). The existing `test/cache-prefix-stability.js` suite's name promised to lock this in but its check only ever compared the system message's first line (a literal that never changes) — never the full codebook block — which is exactly why this shipped unnoticed.
- [x] **Hybrid fix mirroring the existing Anthropic `cache_control` first-turn-vs-multi-turn split**: once a session has assistant history, `_injectCodebook()` switches OpenAI/Gemini/local to the full, unconditional codebook (byte-identical every time), with the per-request `DYN:` line moved to a separate `[GLYPH DYNAMIC]` block after the system text instead of embedded inside the cacheable block. A first-turn request has no prior turn to cache against yet, so it keeps the smaller filtered header — unchanged from pre-v1.25 behavior.
- [x] **Two-tier fallback, not all-or-nothing**: the larger stable header costs ~350 extra tokens, a bet that only pays off across multiple cached turns — invisible to a single call's token count. Measured directly: if it would flip a specific message into GlyphCompress's existing net-negative fallback (losing every real saving, not just the header), that message automatically retries with the smaller filtered codebook first, before ever giving up to zero compression.
- [x] `test/cache-prefix-stability.js` gained real multi-turn assertions: the entire codebook block byte-identical across turns once in cache-stable mode (not just line 1), DYN isolated outside it, graceful degradation when the header isn't affordable, and confirmation `raw`/Anthropic are unaffected. Verified these tests actually fail against the pre-fix code before being trusted, same discipline as v1.24.0.

### v1.26.0: Gemini Tokenizer Calibration & Comprehension Spot-Check

Status: delivered.

- [x] **Real Gemini tokenizer calibration**, using a live-provided Gemini API key: measured every `TECH_GLYPHS` entry and every code-minification keyword/glyph pair against the real `models/{model}:countTokens` API (`gemini-2.5-flash-lite`) — Gemini has no offline pure-JS tokenizer equivalent to js-tiktoken, so unlike the OpenAI calibration this can only be regenerated with a real key (`test/tokenizer-calibration-gemini.js`, dev-only/manual, `npm run calibrate:tokenizer:gemini`). Same finding as OpenAI: **26/28 `TECH_GLYPHS` and 32/33 code keywords are a net token loss on Gemini too.** `MEASURED_TECH_GLYPH_TOKENS_GEMINI`/`MEASURED_CODE_KEYWORD_TOKENS_GEMINI` now gate substitution for the `gemini` provider.
- [x] Verified the fix has real bite, not just theoretical: reverting the gating logic and re-running the new tests showed the character-based heuristic previously used for Gemini got 3 glyphs wrong in each direction (tech names and code keywords) that the real measurement catches — the heuristic was "mostly right by luck," not verified.
- [x] `test/tech-glyph-economics.js` and `test/code-minify-economics.js` extended with Gemini coverage (58 and 16 tests respectively, using the static measured table — no live key needed to run them), including the two/one measured-*winning* cases (`csharp`/`nextjs` glyphs, `#include`→`imp`) that should still substitute normally.
- [x] **First real LLM comprehension spot-check** (`test/comprehension-check-gemini.js`, dev-only/manual, `npm run check:comprehension:gemini`): a realistic bug-fix scenario, compressed with the actual codebook + dynamic dictionary exactly as the CLI sends it, was sent to a real `gemini-2.5-flash-lite` model. The response correctly named the compressed function (`calculateTotal`) and class (`OrderProcessor`) via their `§N` dynamic-dictionary glyphs and correctly identified the discount bug — no hallucination. A first run that skipped `getCodebookPrompt()` (not matching real CLI usage) did produce a hallucinated function name, which is exactly why the script mirrors real usage exactly rather than a simplified version.
- [x] Both new scripts are deliberately excluded from `npm test`/`test/run-suites.js` — they need a real provider API key, network access, and (for the comprehension check) real generation quota, unlike everything else in the suite.
- [x] Found, unrelated to this work: `npm install` surfaced a pre-existing moderate-severity transitive vulnerability (`@hono/node-server` path traversal on Windows, via `@modelcontextprotocol/sdk`). Fixing it requires a breaking SDK version bump — flagged for a dedicated follow-up rather than bundled into this release.

### v1.27.0: OpenAI Comprehension Spot-Check

Status: delivered.

- [x] **Second real LLM comprehension spot-check** (`test/comprehension-check-openai.js`, dev-only/manual, `npm run check:comprehension:openai`), using a live-provided OpenAI key: the exact same bug-fix scenario as v1.26.0's Gemini check — same compressed prompt shape, same four checks — sent to a real `gpt-4o-mini` model. All four checks passed: it correctly named `calculateTotal`/`OrderProcessor` and identified the discount bug. Because OpenAI's existing measured-loss gating (v1.17.0/v1.21.0) means its compression barely substitutes identifiers at all, `gpt-4o-mini` also reproduced the original code verbatim and proposed a working fix — the strongest possible comprehension signal.
- [x] ROADMAP.md's "Real Task Evaluation" item now has real, reproducible comprehension evidence for two providers (Gemini, OpenAI) using directly comparable scenarios. Anthropic comprehension coverage and broader/varied task scenarios remain open.
- [x] Investigated and closed out the `@hono/node-server` finding from v1.26.0 with a root cause (see "Governance and Quality" below): no current SDK version has a fix, and the vulnerable code path is never reached by GlyphCompress's stdio-only MCP transport anyway — nothing to change on our side right now.

### v1.28.0: Anthropic Tokenizer Calibration & Comprehension Spot-Check

Status: delivered.

- [x] **Real Anthropic tokenizer calibration**, using a live-provided Anthropic key: measured every `TECH_GLYPHS` entry and code-minification keyword/glyph pair against the real `/v1/messages/count_tokens` API (`claude-haiku-4-5`) — Anthropic has no offline tokenizer library either, so this needed a live key (`test/tokenizer-calibration-anthropic.js`, dev-only/manual, `npm run calibrate:tokenizer:anthropic`). Most extreme finding of the three providers: **28/28 `TECH_GLYPHS` are a net token loss, no exceptions** (32/33 code keywords too, only `#include`→`imp` wins — same as Gemini). `MEASURED_TECH_GLYPH_TOKENS_ANTHROPIC`/`MEASURED_CODE_KEYWORD_TOKENS_ANTHROPIC` now gate substitution for the `anthropic` provider, closing the gap noted since v1.17.0 ("Anthropic still keeps the character-based heuristic until it gets its own calibration pass").
- [x] Verified the fix has real bite: reverting the gating and re-running the new tests showed the previous character-based heuristic got several tech-name and code-keyword glyphs wrong that the real measurement catches.
- [x] `test/tech-glyph-economics.js` (87 tests) and `test/code-minify-economics.js` (24 tests) extended with Anthropic coverage, using the static measured table — no live key needed to run them.
- [x] **Third real LLM comprehension spot-check** (`test/comprehension-check-anthropic.js`, dev-only/manual, `npm run check:comprehension:anthropic`): the same scenario as the Gemini/OpenAI sibling scripts, sent to a real `claude-haiku-4-5` model. All four checks passed — it correctly named `calculateTotal`/`OrderProcessor`, identified the discount bug, and (like OpenAI, since Anthropic's compression now also barely touches identifiers) proposed the most complete fix of the three providers, correctly implementing percentage-based discount logic.
- [x] ROADMAP.md's tokenizer-calibration and "Real Task Evaluation" items now have real, reproducible evidence across all three primary providers (OpenAI, Gemini, Anthropic) using directly comparable methodology and scenarios.

### v1.29.0: Benchmark vs. Alternatives

Status: delivered.

- [x] **`npm run benchmark:alternatives`** (`test/benchmark-alternatives.js`): compares GlyphCompress against no-compression and naive truncation — the two realistic alternatives available without a specialized dependency — using real `js-tiktoken` (`o200k_base`) token counts across five real files from this repository at four token budgets. Metric is deliberately narrow: at a fixed budget, what fraction of the *original* content survives? Naive truncation permanently deletes whatever is cut; GlyphCompress shrinks the same information so more of it fits, when compression actually reduces real tokens for that content.
- [x] **LLMLingua intentionally excluded**: a Python library, and adding it means adding a Python runtime as a benchmark dependency — a separate decision, documented plainly in `docs/benchmark-methodology.md` rather than approximated or guessed at.
- [x] **Caught a real bug in the benchmark script itself before trusting its output**: the first version's formula for "compressed text still exceeds budget" (`budget/compressedTokens * compressedTokens/originalTokens`) algebraically collapses to `budget/originalTokens` — identical to plain naive truncation — silently erasing any measurable GlyphCompress advantage whenever both strategies needed further truncation. Caught by noticing the aggregate table showed a suspicious flat "+0%" advantage at every budget instead of scaling with each file's real compression ratio. Fixed to the correct `budget/compressedTokens`.
- [x] **Found a real, previously undetected bug in `src/token-estimator.js` while validating the benchmark's own numbers**: `estimateProviderTokens()`'s flat `+1.5`-per-non-ASCII-character penalty — calibrated for the compressor's own rare multi-token Unicode glyphs — is applied to *any* non-ASCII character, overestimating Unicode-heavy prose badly enough (40% on `docs/architecture.md`) that the net-negative fallback safety net can miss a genuine regression. Confirmed on this repository's own `README.md` and `ROADMAP.md`, both real-token-larger after compression despite `fallback: false`. Documented honestly in the benchmark output and methodology doc rather than hidden; **fixed in v1.30.0, see below** — it turned out to be one of two compounding bugs, the other (a base ratio miscalibrated for prose) larger than this one.
- [x] `docs/benchmark-methodology.md` documents the full methodology, what is and isn't claimed (information survival, not answer quality — real task-success evaluation remains open under `v1.22.0`), and how to reproduce it with no API key.

### v1.30.0: Token Estimator Accuracy Fix

Status: delivered.

- [x] **Two compounding bugs in `src/token-estimator.js`, both fixed**, found while validating v1.29.0's benchmark: (1) an uncalibrated Unicode-glyph penalty that double-counted astral-plane characters (surrogate pairs count as 2 UTF-16 code units, 1 codepoint) and used one flat, unmeasured multiplier for every character class; (2) the *larger* issue — OpenAI's base `charsPerToken: 3.8` matched real code (~3.8-3.9) but badly underestimated real tokenizer efficiency on prose (~4.2-5.3) — `docs/architecture.md` has zero non-ASCII characters at all, so bug (1) alone couldn't explain its ~40% overestimate; the base ratio itself was wrong. Both recalibrated against real `js-tiktoken` measurement across five real repository files (the char-weighted blended average, `4.2`, for the base ratio).
- [x] **A third, structural fix**: even fully recalibrated, the heuristic's ORIGINAL-vs-COMPRESSED *ratio* still overstated real improvement by ~10-14% across the same five files — no flat, no-live-tokenizer heuristic can be exactly right for every content type. `compressText()`/`compressMessages()`'s net-negative fallback now requires a real 10% heuristic-measured improvement (`isCompressionTrusted`), not just any nonzero one, closing the gap a single point comparison couldn't.
- [x] **Found and fixed a third, unrelated bug while verifying the above actually took effect in the built output**: `src/token-estimator.cjs` (which `src/index.cjs`, the root package's CJS entry point, requires directly) was never rebuilt by `scripts/build-middleware.js` at all — only the separate `vscode-ext/token-estimator.cjs` copy was. Same class of drift bug as `vscode-ext/proxy.js` and the CJS export shim found earlier in this project's history. Now both copies are built from the same source every time.
- [x] Also deduplicated two more independently-drifted hardcoded `charsPerToken` lookup tables inside `GlyphCompressor` itself (used by the dynamic-dictionary and tech-name-gating breakeven checks) — both had already fallen out of sync with the canonical values in `src/token-estimator.js`. Both now delegate to the shared, single source of truth instead of maintaining their own copies.
- [x] Verified all fixes have real bite: reverted every change and confirmed the new tests fail without them (an import error for the estimator/margin logic; a stale-constant mismatch for the build-pipeline gap), before restoring and re-verifying.
- [x] All three fixtures that previously showed a masked real-token regression (`README.md`, `ROADMAP.md`, `docs/architecture.md`) now correctly trigger `fallback: true`, sending the original unchanged — `npm run benchmark:alternatives`'s aggregate advantage dropped slightly (from reporting fake wins) to a smaller, now fully honest number.
- [x] New `test/token-estimator-accuracy.js` (13 tests): Unicode codepoint-counting correctness, real-`js-tiktoken` cross-checks against a 30%-error ceiling (down from the old ~40%+), end-to-end checks that `GlyphCompressor` never sends real-token-worse output for the three previously-affected files, confirmation genuinely good code compressions still pass through, and the build-pipeline consistency guard.

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
- [x] Investigated (v1.26.0 found it, follow-up closed it out): `@modelcontextprotocol/sdk`'s `@hono/node-server` dependency has a moderate-severity path-traversal advisory on Windows (GHSA-frvp-7c67-39w9). Checked every SDK version from 1.25.0 through the current latest (1.29.0) — all of them pin `@hono/node-server` to `^1.19.x`, which is always inside the vulnerable `<2.0.5` range; no published SDK version has both the HTTP-transport feature and a fixed hono version yet. `npm audit fix --force`'s suggested downgrade (to 1.24.3) isn't a real fix — that version likely predates the HTTP-transport dependency entirely, so it would be a 5-version regression to dodge an advisory, not resolve it. More importantly: `bin/mcp-server.js` only ever uses `StdioServerTransport`, never the SDK's HTTP transport that pulls in the vulnerable `serve-static` code path — **the vulnerable code exists in `node_modules` but is never executed by GlyphCompress at runtime.** Nothing to fix on our side right now; re-check `npm audit` whenever `@modelcontextprotocol/sdk` bumps its own `@hono/node-server` dependency past 2.0.5.

## Strategic Priorities — Becoming the Default IDE↔LLM Compression Layer

GlyphCompress competes against a moving target: providers are shipping native prompt caching for free, and research tools like LLMLingua attack the same problem from a different angle. Winning that space requires more than character-level glyph substitution — it requires being the trusted, invisible default that every AI-native IDE and coding agent uses without the user thinking about it. This section tracks that path, grouped by leverage.

### 1. Technical Foundation (highest leverage, do first)

- [x] Tokenizer-calibrated cost measurement exists for `TECH_GLYPHS` (`npm run calibrate:tokenizer`, v1.16.0).
- [x] Extend tokenizer calibration to every glyph family: `DOMAIN_GLYPHS`, `STRUCTURE_GLYPHS`/error-pattern symbols, and `PROMPT_PATTERNS` output — not just `TECH_GLYPHS`. Also added phrase-level (whole diagnostic/prompt string) before/after comparison, not just isolated glyphs.
- [x] Compare each glyph against the *actual replaced word/phrase* token cost (apples-to-apples). Result: **all 28 `TECH_GLYPHS` are a net token loss on real OpenAI tokenizers** — common tech names are already 1-2 BPE tokens, and the glyph that replaced them cost as much or more (worst case: "express" 1 token vs `𝔼ˣ` 5 tokens).
- [x] Replace the heuristic breakeven formula with a real, measured per-glyph token-cost table (`MEASURED_TECH_GLYPH_TOKENS_OPENAI`) for the `openai` provider — tech-name substitution now never fires when it would lose tokens. `raw` (demos, character-level reporting) is intentionally unaffected. Locked in by `test/tech-glyph-economics.js` (30 assertions).
- [x] Extended calibration to Gemini (v1.26.0, via its real `countTokens` API: 26/28 `TECH_GLYPHS` and 32/33 code keywords are a net token loss) and Anthropic (v1.28.0, via its real `/v1/messages/count_tokens` API: 28/28 `TECH_GLYPHS` — no exceptions — and 32/33 code keywords are a net token loss, the most extreme of the three). All three primary providers (OpenAI, Gemini, Anthropic) are now calibrated against real tokenizers.
- [ ] Add repeatable model-based comprehension tests (tracked below under Experimental Ideas as "LLM Comprehension Tests") to verify decoding, not just assume it.

### 2. Trust at Scale

- [x] Partial (v1.29.0): `npm run benchmark:alternatives` (`test/benchmark-alternatives.js`, `docs/benchmark-methodology.md`) compares GlyphCompress against no-compression and naive truncation, using real `js-tiktoken` token counts, with open methodology and no API key required. LLMLingua is explicitly excluded (a Python dependency, a separate decision) rather than approximated. Building it surfaced a real bug in the token estimator — see "Real Remaining Work" below.
- [ ] Commission a third-party security audit of the proxy (it intercepts real provider API keys) to unblock enterprise adoption beyond self-reported SECURITY.md/PRIVACY.md.

### 3. Distribution Beyond VS Code

- [x] Ship an MCP (Model Context Protocol) server (`bin/mcp-server.js`, `npx glyph-compress-mcp`) exposing `compress_text`, `compress_file`, `route_context`, and `get_codebook` as callable tools — plugs into Claude Code, Claude Desktop, and other MCP-compatible clients with no IDE-specific integration work. Verified end-to-end over real stdio transport with the official MCP SDK client (`test/mcp-server.js`).
- [ ] Add a JetBrains plugin and a Neovim plugin — most backend/enterprise developers are not on VS Code.
- [ ] Upstream native integration (not just manual proxy config) into Continue.dev, Cline, RooCode, and Aider.
- [ ] Offer an optional hosted/cloud proxy for teams that do not want to self-host, aligned with the existing dual AGPL/commercial license.

### 4. Product Moat

- [x] Ship Context Router Wiring (v1.17.0) — `GlyphCompressor.routeAndCompress(query, options)` and CLI `glyph-compress route <query>` rank workspace files by relevance and compress as many as fit inside a token budget, with `selectedFiles`/`excludedFiles` (+ per-file `sourceMap`) making the routing decision auditable. Building it surfaced and fixed a real pre-existing bug: `extractDiagnostics()`'s TODO/FIXME/HACK regex had no word boundaries and matched "HACK" inside "Hacker News," inflating irrelevant marketing docs above the actually-relevant source file.
- [x] Anthropic `cache_control` structuring is reachable through the proxy, not just `wrapAnthropic()` (v1.24.0). The OpenAI/Gemini codebook header is now also a stable, byte-identical cache prefix once a session has assistant history, with a two-tier fallback so the larger header never costs more than it saves (v1.25.0). Remaining: extend the same stable-prefix treatment to Team Codebook Registry content and other large stable context blocks, and measure real cache-hit-rate impact once provider API credentials are available for live testing.
- [x] Ship Team Codebook Registry (tracked below under Experimental Ideas) for shared, org-wide dictionaries — a network effect a single-user tool cannot replicate.

### 5. Go-to-Market

- [x] `v1.31.0`: rewrote `CASE_STUDY.md` (previously a stale, hype-toned v1.14.0 document, orphaned — not linked from README/llms.txt, not checked by `scripts/check-links.js`, not shipped in the npm package) with real `npm run benchmark:realistic`/`benchmark:alternatives` numbers from the current version, an honest "where it helps / where it's break-even by design" framing instead of a flat savings pitch, and no fabricated dollar-ROI figures. Now linked from the README nav row and pointer paragraph, `llms.txt`, wired into `check:links`, and published in the npm package.
- [x] Public comparison table against alternatives shipped in README's "🆚 Compared to Alternatives" section (v1.30.1): no compression, naive truncation, provider-side caching, LLMLingua (documented exclusion), GlyphCompress — backed by real `benchmark:alternatives` numbers, not projections.
- [ ] Still open: a case study with a citable third-party customer/repository, not just this project's own source files.

## Experimental Ideas

- [ ] Glyph Negotiation Protocol: Have the assistant reply with which glyph subsets it understood, then adapt future compression to that model.
- [x] Context Budget Planner (`v1.32.0`): `GlyphCompressor.compressToBudget(text, { budget })` and the standalone `planCompressionForBudget()` escalate light→standard→aggressive→ultra and apply the *lightest* level whose transmitted payload (codebook included) fits the budget — buying space that is not needed is a pure fidelity loss. Reports every level tried, and `withinBudget: false` with the overflow quantified when nothing fits, rather than silently overflowing. CLI: `glyph-compress <file> --budget <tokens>`; MCP: `compress_to_budget`. Building it exposed the `level: 'auto'` trust-policy bug fixed in the same release.
- [ ] Semantic Diff Compression: Compress only what changed since the previous chat turn, using stable references for unchanged context.
- [x] Team Codebook Registry: `glyphcompress.team.json` (git-committable, at the workspace root) lets a team share a priority-ordered dynamic dictionary — every GlyphCompressor instance seeds its §N indices from it before local learning, so the same word gets the same glyph on every teammate's machine (and via every MCP/CLI/proxy entry point). CLI: `glyph-compress team-codebook show|sync`. API: `loadTeamCodebook`/`saveTeamCodebook`/`mergeTeamCodebook` (`src/team-codebook.js`), `GlyphCompressor.getTeamCodebookInfo()`.
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