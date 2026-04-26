# GlyphCompress Roadmap

This roadmap tracks what has been delivered, what is partially complete, and what still needs work after the stable `v1.0.0` release.

## Status Legend

- `[x]` Done and released.
- `[ ]` Still missing or not yet implemented.
- `[ ] Partial:` Started, but not complete enough to call done.

## North Star

GlyphCompress should make large codebases cheaper, faster, and easier for LLMs to reason about without forcing developers to change their workflow. The project wins when users can send richer context, spend fewer tokens, and still get answers that preserve intent, code structure, and safety.

## Current Stable Release

- [x] Current stable release is `v1.8.0` for safe compression trust policies.
- [x] Last stable published release is `glyph-compress@1.8.0`.
- [x] npm `latest` points to `1.8.0`.
- [x] GitHub release `v1.8.0` exists and includes `glyph-compress-1.8.0.vsix`.
- [x] Local VS Code installation was verified as `neolambo.glyph-compress@1.8.0`.
- [x] `npm test` is expected to pass the unit, CLI, workspace, extension, proxy, metadata, and integration suites after `v1.8.0`.
- [x] `npm run benchmark` reports 2.1x aggregate ratio, 53% savings, 100% fidelity proxy, and 0 hallucinated refs.
- [x] npm package was reduced to a focused runtime/docs/types tarball using `package.json.files`.

## Release Reality Check

This section separates what is actually complete from what remains useful future work.

### Verified as Complete Through v1.8.0

- [x] npm package, package metadata, TypeScript declarations, ESM export, and CommonJS export are aligned on `1.8.0`.
- [x] GitHub tag, GitHub release, npm latest, VSIX artifact, and local VS Code installation are aligned on `1.8.0`.
- [x] Safe compression trust policies are implemented in both ESM and CommonJS middleware paths.
- [x] CLI support exists for provider selection, trust policy selection, explanations, source maps, privacy mode, workspace inspection, benchmark, and doctor workflows.
- [x] VS Code activation and configuration wiring cover enabled state, compression level, provider, and trust policy.
- [x] Automated validation covers unit, CLI, workspace, extension, proxy, metadata, integration, benchmark, link checking, and npm pack dry-run.
- [x] Documentation exists for architecture, release process, licensing, security, privacy, enterprise usage, contributing, and roadmap planning.

### Still Missing in Practice

- [ ] Public VS Code Marketplace publication is not done; distribution currently relies on GitHub release VSIX artifacts and local installation.
- [ ] Release automation is still manual for commit, tag, npm publish, GitHub release creation, VSIX upload, and post-release verification.
- [ ] Real LLM task-success evaluation is not implemented; current fidelity and edit-success scores are deterministic benchmark proxies.
- [ ] Provider-aware behavior does not yet automatically choose code block, context-router, and trust-warning strategies per provider.
- [ ] Source maps do not yet provide full expression-level AST mappings for every minified code block.
- [ ] Workspace intelligence does not yet feed ranked context automatically into normal compression calls.
- [ ] `doctor` does not yet validate installed VS Code extension version, proxy config, provider credentials, or local VS Code settings.
- [ ] README badge/link deletion regressions, VS Code setting snapshots, and compressed payload snapshots still need dedicated fixtures.
- [ ] Structured redaction-aware debug logging for proxy and extension diagnostics is still missing.
- [ ] Release notes are not generated from conventional commits.

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
- [ ] Missing: Publish to the public VS Code Marketplace if that channel is desired beyond local VSIX/GitHub release distribution.

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

## Repository Improvements

### Packaging

- [x] Add a `files` allowlist in `package.json` to avoid publishing test scratch files, old VSIX files, generated workspace instructions, and large assets that are not required at runtime.
- [x] Avoid publishing historical `.vsix` files to npm.
- [x] Add `npm run check` for tests, benchmark, and npm pack dry-run.
- [x] Add `npm run package:vscode` for VSIX packaging.
- [x] Add `docs/release.md` with the exact release sequence and post-release verification steps.
- [ ] Partial: Release process still requires manual commit, tag, GitHub release, npm publish, and VSIX upload steps.
- [ ] Add a root release script that automates version consistency checks and prints the exact release sequence.

### Testing

- [x] Integration tests cover core compression, provider wrappers, source maps, CLI trust features, workspace intelligence, package metadata, and governance docs.
- [x] Benchmark fixtures cover raw, OpenAI, Anthropic, Gemini-compatible, and ultra payloads.
- [x] Regression coverage exists for package exports and CommonJS imports.
- [x] Split tests into unit, CLI, workspace, metadata, and integration suites.
- [x] Add tokenizer-aware tests using provider-specific token estimators where practical.
- [x] Add proxy and extension activation smoke suites.
- [ ] Add regression fixtures for README badges, deleted links, and VS Code settings.
- [ ] Add snapshot tests for compressed payloads so format drift is deliberate.

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
- [ ] Partial: `doctor` does not yet validate proxy config, VS Code settings, installed extension version, or provider credentials.
- [ ] Partial: CommonJS, ESM, and workspace intelligence examples exist through docs/tests, but Gemini-compatible proxy and VS Code walkthroughs need expansion.
- [ ] Add explicit Gemini-compatible proxy and VS Code usage examples.
- [x] Add privacy firewall redaction for API keys and sensitive request text before compression.
- [ ] Add structured debug logging with redaction-aware log sinks for proxy and extension diagnostics.

### Governance and Quality

- [x] Add GitHub Actions for tests, benchmark, package dry-run, and VSIX packaging.
- [x] Add stable security, privacy, and enterprise docs.
- [x] Add issue templates for bug reports, feature requests, provider compatibility, and benchmark submissions.
- [x] Add pull request template with tests, docs, compression impact, and privacy checklist.
- [x] Add link checking to GitHub Actions.
- [ ] Add release notes automation from conventional commits.

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
- [x] Public API import tests pass for ESM and CommonJS on release.
- [x] VS Code extension activation and command smoke tests are automated in the local test suite.
- [x] README, npm version, GitHub tag, VSIX version, and GitHub release version stayed aligned through `v1.8.0`.

## Immediate Next Actions

1. Decide the extension distribution channel: publish to the VS Code Marketplace, or explicitly keep GitHub VSIX releases as the supported channel.
2. Add a release helper script that verifies version alignment, runs checks, packages the VSIX, and prints/prefills npm and GitHub release commands.
3. Add regression fixtures for README badges, deleted links, VS Code settings, and stable compressed payload snapshots.
4. Extend provider profiles to tune code block minification, context-router behavior, and provider-specific trust warnings.
5. Wire workspace-intelligence file ranking into normal compression calls behind an explicit option and token budget.
6. Add expression-level AST spans for code block minification where language-specific parsers are available.
7. Expand `doctor` to validate installed extension version, proxy config, provider credentials, and local VS Code settings.