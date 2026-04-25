# GlyphCompress Roadmap

This roadmap tracks what has been delivered, what is partially complete, and what still needs work after the stable `v1.0.0` release.

## Status Legend

- `[x]` Done and released.
- `[ ]` Still missing or not yet implemented.
- `[ ] Partial:` Started, but not complete enough to call done.

## North Star

GlyphCompress should make large codebases cheaper, faster, and easier for LLMs to reason about without forcing developers to change their workflow. The project wins when users can send richer context, spend fewer tokens, and still get answers that preserve intent, code structure, and safety.

## Current Stable Release

- [x] Current target release is `v1.1.0` for contributor and release hygiene.
- [x] Last stable published release is `glyph-compress@1.0.0`.
- [x] `npm test` is expected to pass with 38/38 tests after `v1.1.0`.
- [x] `npm run benchmark` reports 2.0x aggregate ratio, 49% savings, 100% fidelity proxy, and 0 hallucinated refs.
- [x] npm package was reduced to a focused runtime/docs/types tarball using `package.json.files`.

## Product Bets

1. **Context Fidelity Score**
   - [x] Benchmark harness reports a deterministic context fidelity proxy.
   - [x] Benchmark tracks edit success proxy and hallucinated file references.
   - [ ] Partial: Real LLM task-success evaluation across multiple providers is not implemented yet.
   - [ ] Add repeatable model-based comprehension tests that compare compressed vs uncompressed task success.

2. **Provider-Aware Compression**
   - [x] OpenAI and Anthropic middleware wrappers exist.
   - [x] Benchmark fixtures cover raw, OpenAI, Anthropic, Gemini-compatible, and ultra payloads.
   - [ ] Partial: Compression behavior is not yet tuned by provider tokenizer or prompt convention.
   - [ ] Add provider-specific token estimators and compression profiles.

3. **Semantic Source Maps**
   - [x] `compressText()` and `compressMessages()` return `sourceMap`.
   - [x] Source maps include files, dynamic dictionary entries, diagnostics, code blocks, and replacements.
   - [x] CLI supports `--source-map`.
   - [ ] Partial: Source maps do not yet map every glyph back to exact original line and symbol spans.
   - [ ] Add line/column ranges and richer symbol-level mappings.

4. **Adaptive Workspace Memory**
   - [x] `glyph-compress inspect` writes `.glyphcompress/codebook.json`.
   - [x] Workspace codebook includes files, symbols, imports, diagnostics, ownership hints, and git context.
   - [ ] Partial: Codebook is static per inspect run and does not yet learn from real usage over time.
   - [ ] Add incremental updates and decay/weighting from repeated repository usage.

5. **Safe Compression Modes**
   - [x] Compression levels exist: `light`, `standard`, `aggressive`, and `ultra`.
   - [x] Reversible dictionaries and source maps are exposed for inspection.
   - [ ] Partial: Lossless, reversible, and lossy modes are not yet explicit trust policies.
   - [ ] Add mode guarantees, safety labels, and tests that enforce which transformations are allowed per mode.

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
- [ ] Split tests into unit, integration, proxy, CLI, and extension smoke suites.
- [ ] Add tokenizer-aware tests using provider-specific token estimators where practical.
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
- [ ] Add explicit CommonJS, ESM, Gemini-compatible proxy, and VS Code usage examples.
- [ ] Add structured debug logging with redaction for API keys and request bodies.

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
- [ ] Privacy Firewall Mode: Redact secrets, credentials, customer identifiers, and proprietary strings before payload compression.

## Success Metrics

- [ ] Partial: Median token savings target is tracked in benchmark output, but not yet measured across real user repositories.
- [ ] Partial: Standard-mode task success is approximated by a benchmark proxy, but not yet measured with real LLM task outcomes.
- [x] Public API import tests pass for ESM and CommonJS on release.
- [ ] Partial: VS Code extension packaging and install are verified, but activation and command smoke tests are not automated in CI yet.
- [x] README, npm version, GitHub tag, VSIX version, and GitHub release version stayed aligned through `v1.0.0`.

## Immediate Next Actions

1. Split the integration test file into focused unit, CLI, proxy, workspace, and extension smoke suites.
2. Add provider-specific tokenizer estimates and benchmark scenarios for OpenAI, Anthropic, Gemini, and local models.
3. Expand source maps with line/column and symbol-span mappings.
4. Add Privacy Firewall Mode for secrets and proprietary identifier redaction.
5. Decide whether to publish the VS Code extension to the public Marketplace, or keep distributing VSIX through GitHub releases.