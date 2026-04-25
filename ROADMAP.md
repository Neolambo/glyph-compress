# GlyphCompress Roadmap

This roadmap turns GlyphCompress from a clever compression layer into a measurable, trusted context operating system for AI-assisted development.

## North Star

GlyphCompress should make large codebases cheaper, faster, and easier for LLMs to reason about without forcing developers to change their workflow. The project wins when users can send richer context, spend fewer tokens, and still get answers that preserve intent, code structure, and safety.

## Product Bets

1. **Context Fidelity Score**: Add an evaluation score that measures whether compressed context still preserves enough information for an LLM to solve the original task.
2. **Provider-Aware Compression**: Tune output differently for OpenAI, Anthropic, Gemini, local models, and coding agents based on their tokenizer behavior and prompt conventions.
3. **Semantic Source Maps**: Let every compressed glyph block map back to original files, lines, symbols, and diagnostics so users can inspect what was removed or summarized.
4. **Adaptive Workspace Memory**: Build a project codebook that evolves from real repository usage, not only static patterns.
5. **Safe Compression Modes**: Separate lossless, reversible, and lossy compression so enterprise users can choose a trust level per workflow.
6. **Agentic Context Router**: Select the smallest useful context bundle automatically based on user intent, active file, diagnostics, git diff, and recent chat history.

## Release Plan

### v0.7.0: Trust and Measurement

Status: delivered in the first v0.7.0 release slice.

- Add a benchmark harness that compares original prompts versus compressed prompts across representative tasks.
- Track compression ratio, context fidelity score, edit success proxy, and hallucinated file references.
- Add fixture-based coverage for OpenAI, Anthropic, Gemini-compatible, raw text, and ultra payloads.
- Introduce `--explain` in the CLI to show what was compressed, elided, or preserved.
- Publish a small public benchmark report in the README.

### v0.8.0: Reversible Compression and Source Maps

Status: delivered in the first v0.8.0 release slice.

- Add optional reversible dictionaries for file paths, diagnostics, repeated identifiers, and compressed code blocks.
- Emit a `sourceMap` object from the library API for compressed text and message payloads.
- Add CLI source map output for compressed payload inspection.
- Add round-trip coverage for source maps, dynamic dictionaries, and CommonJS consumers.
- Document when to use light, standard, aggressive, ultra, source maps, and reversible dictionaries.

### v0.9.0: Workspace Intelligence

- Build a persistent workspace codebook with symbol frequency, import graph, diagnostics, and ownership hints.
- Add intent detection for common workflows: fix error, review diff, implement feature, explain architecture, write tests, optimize performance.
- Compress only relevant files by default instead of compressing whole workspace payloads blindly.
- Add git-aware context selection for staged changes, unstaged changes, and pull request review.
- Add repository health commands: `glyph-compress inspect`, `glyph-compress benchmark`, and `glyph-compress doctor`.

### v1.0.0: Stable Platform

- Freeze the public API for `GlyphCompressor`, middleware wrappers, CLI commands, and VS Code settings.
- Add TypeScript declarations or migrate core APIs to TypeScript.
- Add CI for Node LTS versions, packaging, linting, and VS Code extension validation.
- Add formal docs for security, privacy, licensing, telemetry, and enterprise deployment.
- Publish a stable VS Code Marketplace release aligned with npm and GitHub tags.

## Repository Improvements

### Packaging

- Add `.npmignore` or a `files` allowlist in `package.json` to avoid publishing test scratch files, old VSIX files, generated workspace instructions, and large assets that are not required at runtime.
- Move VS Code extension assets into a dedicated release pipeline and avoid packaging historical `.vsix` files in the repository.
- Add a root `release` script that runs tests, packs npm, packages VSIX, creates a Git tag, and prints a release checklist.

### Testing

- Split tests into unit, integration, proxy, CLI, and extension smoke suites.
- Add tokenizer-aware tests using provider-specific token estimators where practical.
- Add regression fixtures for deleted links, README badges, package exports, CommonJS imports, and VS Code settings.
- Add snapshot tests for compressed payloads so format drift is deliberate.

### Documentation

- Add `CONTRIBUTING.md` with local setup, test commands, release process, and documentation style.
- Add `SECURITY.md` explaining proxy behavior, local processing, API key handling, and what data is sent upstream.
- Add `docs/architecture.md` for compression pipeline diagrams and provider-specific behavior.
- Add a short `docs/release.md` checklist covering npm, GitHub tags, VSIX install, README badges, and Marketplace release.

### Developer Experience

- Add TypeScript declarations for the public API.
- Add examples for CommonJS, ESM, CLI, OpenAI, Anthropic, Gemini-compatible proxies, and VS Code usage.
- Add `glyph-compress doctor` to validate environment, proxy config, VS Code settings, and installed extension version.
- Add structured debug logging with redaction for API keys and request bodies.

### Governance and Quality

- Add issue templates for bug reports, feature requests, provider compatibility, and benchmark submissions.
- Add pull request template with tests, docs, compression impact, and privacy checklist.
- Add GitHub Actions for tests, package dry-run, VSIX packaging, and link checking.
- Add release notes automation from conventional commits.

## Experimental Ideas

- **Glyph Negotiation Protocol**: Have the assistant reply with which glyph subsets it understood, then adapt future compression to that model.
- **Context Budget Planner**: Let users set a target token budget and have GlyphCompress choose the compression strategy automatically.
- **Semantic Diff Compression**: Compress only what changed since the previous chat turn, using stable references for unchanged context.
- **Team Codebook Registry**: Allow teams to share project-specific dictionaries across repositories and agents.
- **LLM Comprehension Tests**: Ask multiple models to decode and solve tasks from compressed prompts, then score accuracy against expected edits.
- **Privacy Firewall Mode**: Redact secrets, credentials, customer identifiers, and proprietary strings before payload compression.

## Success Metrics

- Median token savings above 60% in standard mode and above 85% in ultra mode.
- No statistically significant drop in task success for standard mode compared with uncompressed prompts.
- Public API import tests pass for ESM and CommonJS on every release.
- VS Code extension install, activation, and command smoke tests pass before publishing.
- README, npm version, GitHub tag, VSIX version, and Marketplace version stay aligned for every release.

## Immediate Next Actions

1. Add `.npmignore` or `package.json.files` to reduce the npm package from the current multi-megabyte tarball.
2. Add GitHub Actions for `npm test`, `npm publish --dry-run`, and VSIX package validation.
3. Add `SECURITY.md` before promoting proxy mode more aggressively.
4. Add a release checklist and automate version consistency checks.
5. Build the first benchmark harness for v0.7.0.