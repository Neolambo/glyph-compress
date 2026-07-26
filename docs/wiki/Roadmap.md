# Roadmap
This page summarizes the current roadmap. The canonical roadmap is maintained in `ROADMAP.md` in the main repository.

## Current Stable Release

`v1.32.3`: Privacy Redaction Coverage.

## Delivered in v1.32.3

- Paused feature work to mutation-test the suite: only 3 of 9 privacy redaction patterns had coverage. Disabling OpenAI-key, GitHub-token, AWS-key, JWT or Bearer-token redaction left the whole suite green.
- New `test/privacy-redaction.js` (14 tests): one per pattern kind, no secret in the source map, redaction stays opt-in, plus a data-driven guard so a new pattern without a test fails.
- Documented that the `freq >= 2` dictionary filter is redundant rather than load-bearing (an equivalent mutation), instead of overclaiming a fix.
- 28 suites total, all passing. No runtime behavior changed.

## Delivered in v1.32.2

- Third and final site of the level/trust coupling bug: Attentional Decay Compaction forced `ultra` for old turns without re-deriving the trust policy, leaving decay near-inert at the default level. End-to-end history reduction went from ~36% to 66%.
- Lifting the veto exposed a wrong level it had been hiding: the warm zone forced `ultra` (which summarizes code away) where the documented contract requires code preserved and only minified. Corrected to `aggressive`.
- 27 suites total, all passing.

## Delivered in v1.32.1

- Fixed the same `level: 'auto'` trust-policy bug from v1.32.0 in `compressMessages()`, the path used by the proxy, SDK wrappers, and VS Code extension. Severity there was 15x (325 vs 4922 tokens), not 11.5%.
- `trustPolicy` is now captured and restored alongside the level in the candidate-strategy machinery.
- 27 suites total, all passing.

## Delivered in v1.32.0

- **Context Budget Planner**: `compressToBudget()` / `planCompressionForBudget()` apply the least destructive compression level whose transmitted payload (codebook included) fits a hard token budget, escalating light→standard→aggressive→ultra and stopping at the first level that fits.
- Reports every level tried, and `withinBudget: false` with the overflow quantified when nothing fits — never a silent overflow.
- CLI `glyph-compress <file> --budget <tokens>` and MCP tool `compress_to_budget`. The CLI surfaces the chosen level's trust warnings, since the planner (not the user) picked it.
- **Fixed a real shipped bug found while building it**: `level: 'auto'` selected `ultra` but had its defining transforms blocked by a trust policy derived once at construction — delivering standard-level output while reporting `selectedLevel: 'ultra'` (4420 vs 3913 tokens, an 11.5% silent loss). An explicitly pinned trust policy is still never escalated.
- Corrected two stale roadmap entries that had shipped in v1.19.0 (structured log sinks) and v1.23.0 (adaptive workspace memory).
- 27 suites total, all passing.

## Delivered in v1.31.1

- Documentation-only release. No runtime/compressor behavior changed.
- Rewrote `CASE_STUDY.md` (previously stale, v1.14.0-era, hype-toned, and orphaned) with real, current `benchmark:realistic`/`benchmark:alternatives` numbers and an honest "where it helps / where it's break-even by design" framing.
- Wired into README (nav row + pointer paragraph), `llms.txt`, `scripts/check-links.js`, and the npm package's `files` allowlist.
- 26 suites total, all passing.

## Delivered in v1.31.0

- Added `server.json` for MCP registry auto-discovery.
- Since this npm package has two bins (CLI and MCP server) and the registry schema has no field to pick a non-default one, added an `mcp` CLI subcommand (`npx glyph-compress mcp`) instead of publishing a second package.
- `package.json` gained `mcpName` for registry ownership verification.
- New tests: the `mcp` subcommand driven through a real MCP client, and `server.json`/`package.json` consistency guarded against drift.
- 26 suites total, all passing.

## Delivered in v1.30.1

- Documentation-only release, prompted by a repository-layout review against other mature open-source READMEs. No runtime/compressor behavior changed.
- Removed the long per-version changelog archive from `README.md` (history now lives only in GitHub Releases/`RELEASE_NOTES.md`).
- Added a quick-nav link row, a "When to Use / When to Skip" section, a "Compared to Alternatives" table (backed by real `benchmark:alternatives` numbers), and a comprehension-check "Proof" table.
- Wrapped Advanced Features, Project Structure, and Theory in collapsible `<details>` blocks.
- Added a root-level `llms.txt` for AI-agent discoverability and `CODE_OF_CONDUCT.md`.
- 25 suites total, all passing (unchanged).

## Delivered in v1.30.0

- Fixed two compounding bugs in `src/token-estimator.js` found while validating v1.29.0's benchmark: an uncalibrated, double-counting Unicode-glyph penalty, and — the larger issue — a base `charsPerToken` ratio only accurate for code, not prose (some affected files have zero non-ASCII characters at all, so the Unicode bug alone couldn't explain the overestimate). Both recalibrated against real `js-tiktoken` measurement.
- Added a fallback safety margin: even fully recalibrated, the heuristic's before/after ratio still overstated real improvement by ~10-14%, so compression now needs a real 10% measured improvement to be trusted, not just any nonzero one.
- Found and fixed a third, unrelated bug while verifying the fix reached the built output: `src/token-estimator.cjs` (used by the root package's CJS entry point) was never rebuilt by the build script at all — same class of drift bug as earlier packaging issues in this project's history.
- All three previously-affected files (`README.md`, `ROADMAP.md`, `docs/architecture.md`) now correctly fall back instead of silently sending real-token-worse output.
- New `test/token-estimator-accuracy.js` (13 tests); verified every fix actually fails without it before trusting it.
- 25 suites total, all passing.

## Delivered in v1.29.0

- `npm run benchmark:alternatives` compares GlyphCompress against no-compression and naive truncation using real `js-tiktoken` token counts across five real repository files, with open methodology in `docs/benchmark-methodology.md`. No API key required.
- LLMLingua is intentionally excluded (a Python dependency — a separate decision), documented plainly rather than approximated.
- Caught a real math bug in the benchmark script's own formula before trusting its output — a case that silently collapsed to be identical to plain truncation, erasing any real signal.
- Found (but has not yet fixed) a real bug in `src/token-estimator.js`: a flat per-non-ASCII-character penalty overestimates Unicode-heavy prose badly enough (40% on one file) that the compressor's own net-negative fallback can miss a genuine real-token regression — confirmed on this repository's own README and ROADMAP. Documented honestly, tracked as an open item.
- 24 suites total, all passing.

## Delivered in v1.28.0

- Real Anthropic tokenizer calibration via the live `/v1/messages/count_tokens` API: 28/28 `TECH_GLYPHS` are a net token loss on Anthropic — no exceptions, the most extreme finding of the three providers — plus 32/33 code keywords. Now gated the same way OpenAI/Gemini already were.
- Third real LLM comprehension spot-check: the same scenario as the Gemini/OpenAI sibling scripts, sent to a real `claude-haiku-4-5` model — it correctly named the compressed function/class, identified the bug, and proposed the most complete fix of the three providers.
- All three primary providers (OpenAI, Gemini, Anthropic) now have real tokenizer calibration and comprehension evidence using directly comparable methodology.
- `test/tokenizer-calibration-anthropic.js` and `test/comprehension-check-anthropic.js` are dev-only/manual, needing a real API key — not part of `npm test`.
- 24 suites total (87 tech-glyph-economics + 24 code-minify-economics assertions across all providers), all passing.

## Delivered in v1.27.0

- Second real LLM comprehension spot-check (sibling to v1.26.0's Gemini one, same scenario/same checks): a realistic bug-fix scenario, compressed exactly as the CLI sends it, sent to a real `gpt-4o-mini` model. All four comprehension checks passed — it correctly named the function/class and identified the bug, and (since OpenAI's compression barely touches identifiers, per its existing measured-loss gating) even reproduced the original code and proposed a working fix.
- ROADMAP.md's "Real Task Evaluation" item now has real evidence for two providers (Gemini, OpenAI). Anthropic coverage and broader task scenarios remain open.
- Closed out the `@hono/node-server` vulnerability finding from v1.26.0 with a root cause: no current SDK version fixes it, and the vulnerable code path is never reached by GlyphCompress's stdio-only MCP transport — nothing to change on our side.
- 24 suites total, all passing.

## Delivered in v1.26.0

- Real Gemini tokenizer calibration via the live `countTokens` API (Gemini has no offline tokenizer library like OpenAI's js-tiktoken): 26/28 `TECH_GLYPHS` and 32/33 code-minification keywords are a net token loss on Gemini too, same pattern as OpenAI. Now gated the same way.
- Verified the fix has real bite: the previous character-based heuristic for Gemini got several glyphs wrong that the real measurement catches.
- First real LLM comprehension spot-check: a realistic bug-fix scenario, compressed exactly as the CLI sends it (codebook + dynamic dictionary included), sent to a real `gemini-2.5-flash-lite` model — it correctly named the compressed function/class and identified the bug, no hallucination.
- Both new scripts (`test/tokenizer-calibration-gemini.js`, `test/comprehension-check-gemini.js`) are dev-only/manual, needing a real API key — not part of `npm test`.
- 24 suites total (74 new assertions across tech-glyph-economics and code-minify-economics), all passing.

## Delivered in v1.25.0

- Found while investigating v1.24.0: the codebook header injected for OpenAI/Gemini was payload-filtered (only lists glyphs the current message uses), so it varied request to request and could never be a stable prefix for their automatic prompt caching. The existing stability test's name promised this but only ever checked the first line of the header.
- Fix mirrors the existing Anthropic `cache_control` first-turn-vs-multi-turn split: once a session has assistant history, OpenAI/Gemini/local get the full, unconditional codebook (byte-identical every time), with the per-request `DYN:` line moved to a separate block after the system text.
- Two-tier fallback: the larger stable header only pays off across multiple turns, invisible to a single call's token count — if it would flip a message net-negative, it retries with the smaller filtered codebook before ever giving up to zero compression.
- `test/cache-prefix-stability.js` gained real multi-turn assertions (the full block, not just line 1) plus graceful-degradation coverage; verified to actually fail against the pre-fix code before being trusted.
- 24 suites total, all passing.

## Delivered in v1.24.0

- **Critical fix**: every real proxy request to an Anthropic target (`targetApiUrl = https://api.anthropic.com`) was being corrupted and rejected by the real API. Every documented IDE integration sends an OpenAI-shaped request to the proxy regardless of upstream, but the proxy never translated that to Anthropic's native Messages API shape (top-level `system` field, `x-api-key`/`anthropic-version` auth, `/v1/messages` endpoint) — and GlyphCompress's own compression path was inserting an illegal `role: "system"` message into `messages` on top of that.
- New `src/anthropic-bridge.js` translates requests and responses (both non-streaming and streaming SSE) between the two shapes, reusing the same compression/`cache_control` logic `wrapAnthropic()` already used — now reachable through the proxy, not just the SDK wrapper.
- Known limitations: multi-modal images are marked with a text placeholder rather than translated; tool-result messages are coerced to a labeled `user` message; streamed tool-call argument deltas aren't translated (non-streaming tool calls work fully).
- Found by reproducing the bug directly (mocking the outbound request and inspecting the forwarded body/headers) rather than trusting the existing smoke test, which never checked request shape. New `test/anthropic-bridge.js` (18 tests) plus a strengthened `test/proxy.js` lock in the fix; both were verified to actually fail against the pre-fix code before being trusted.
- 24 suites total, all passing.

## Delivered in v1.23.0

- Incremental codebook builds: `buildWorkspaceCodebook()` reuses a file's previous symbols/imports/diagnostics when its mtime is unchanged since the last build instead of re-parsing every file every time. Only changed files are rescanned; `incrementalStats: { reused, rescanned, total }` reports the split.
- Usage-decay-weighted relevance: `recordFileUsage(rootDir, filePaths)` records that a file was actually selected and sent; `selectRelevantFiles()` adds a half-life-decayed (14 days), capped boost on top of keyword/intent scoring. `GlyphCompressor.routeAndCompress()` calls this automatically for every selected file.
- Found and fixed a real gap: `recordFileUsage()` originally no-opped unless a codebook had already been persisted to disk (only the CLI's `inspect` command did that), so usage tracking silently did nothing the first time `routeAndCompress()` ran on a fresh workspace. It now builds and saves a codebook on the fly when none exists.
- 23 suites total, all passing.

## Delivered in v1.21.2

- Added `vscode-ext/README.md` — the Marketplace Overview tab was blank because none existed. Added a `repository` field too.
- Discovered the Marketplace had never received anything past `v1.12.0`; publication of everything since is still pending on maintainer credentials.

## Delivered in v1.21.1

- **The published VS Code extension was broken from v1.17.0 through v1.21.0** — `vscode-ext/glyph-middleware.cjs` required `../src/workspace-intelligence.cjs`/`../src/team-codebook.cjs`, paths that don't exist in a packaged VSIX (only `vscode-ext/` ships). Every install would fail on first real compression. Found by extracting an installed VSIX and starting the real proxy from it.
- Fixed with local, self-contained copies inside `vscode-ext/` (same pattern as `token-estimator.cjs`); the equivalent npm-package risk (missing from `package.json`'s `files` allowlist) was also caught and fixed before any publish.
- New `test/npm-pack-smoke.js` runs a real `npm pack` and requires the actual tarball's entry points; `test/extension.js` now scans all packaged files for any escaping `require("../...")`.
- 22 suites total, all passing.

## Delivered in v1.21.0

- Code-block keyword minification (`return`→`→`, `function`→`ƒ`, etc.) is now skipped on OpenAI when measured as a real token loss — same pattern and same finding as the v1.17.0 TECH_GLYPHS fix, applied to all 33 keyword/glyph pairs used in code-block minification.
- `buildTrustWarnings()` / `sourceMap.trustWarnings`: plain-language warnings derived strictly from existing trust-profile flags, surfaced in CLI `--explain` and the VS Code output channel.
- Found and fixed a real export bug: a hand-maintained CJS `module.exports` shim can silently drop new exports; added a regression test that compares it against the ESM export list.
- 21 suites total, all passing.

## Delivered in v1.20.0

- `sourceMap.ast` now tracks arrow functions, function calls, destructuring, async/await, and exception handling in code blocks, plus Ruby/Swift/Kotlin/PHP language coverage that previously had none.
- Found and fixed two real bugs while validating span fidelity: whitespace normalization ran on the whole message (including inside code fences) in two separate places, silently flattening 4-space/8-space indentation to a single space at every compression level. Fixed with a shared fence-aware helper.
- 19 suites total, all passing.

## Delivered in v1.19.0

- Structured, redaction-aware logging (`src/logger.js`): ISO timestamps and consistent secret redaction across every sink (console, VS Code output channel, and a new `--log-file` JSONL sink), plus richer per-request trust/routing diagnostics.
- `routeAndCompress(query, { gitDiffOnly: true })` / CLI `route <query> --git-diff-only` restricts the Context Router to git staged/unstaged files.
- Fixed real drift: `vscode-ext/proxy.js` was a hand-maintained CJS duplicate of `src/proxy.js` that had fallen out of sync; now generated from the same source, with new CJS-build test coverage.
- 18 suites total, all passing.

## Delivered in v1.18.0

- Added `glyphcompress.team.json`, a git-committable shared dynamic dictionary: every teammate's `GlyphCompressor` seeds the same `§N` glyph indices from it before per-session learning, so the same identifier gets the same glyph across the whole team and every entry point (CLI, MCP, VS Code, proxy).
- New CLI commands: `glyph-compress team-codebook show` and `glyph-compress team-codebook sync`.
- The personal cross-session cache now merges into the dynamic dictionary instead of overwriting it, so it can never clobber team-seeded entries.
- 17 suites total, all passing.

## Delivered in v1.17.0

- Shipped an MCP server (`npx glyph-compress-mcp`) exposing `compress_text`, `compress_file`, `route_context`, and `get_codebook` tools for Claude Code, Claude Desktop, and other MCP-compatible clients.
- Wired ranked workspace file selection into compression: `GlyphCompressor.routeAndCompress(query, options)` and CLI `glyph-compress route <query>` rank files by relevance and compress as many as fit inside a token budget, reporting selected/excluded files with score and reason.
- Fixed a word-boundary bug in diagnostic extraction (`HACK` matching inside "Hacker News") found while building the router.
- Extended tokenizer calibration to compare each `TECH_GLYPHS` entry against the actual word it replaces: found all 28 are a net token loss on real OpenAI tokenizers, and wired a measured cost table into the breakeven check so tech-name substitution never fires there when it would lose tokens.
- 16 suites total, all passing, including a real end-to-end MCP protocol smoke test.

## Delivered in v1.16.0

- Fixed a dynamic-dictionary symbol collision: the Greek/Cyrillic glyph pool overlapped reserved `TECH_GLYPHS` symbols (`α` was both "Agent" and the first dynamic-dictionary assignment). Dynamic entries are now unbounded `§N` indexed references.
- Fixed codebook completeness: the printed `TECH:` codebook line is now generated directly from `TECH_GLYPHS`, so it cannot drift out of sync (13/28 glyphs were previously undocumented, including Java, C#, Swift, Ruby, Angular, Svelte, Django, Rails, Express, FastAPI, MySQL, MongoDB, and "prompt").
- Fixed `getCodebookPrompt()` (the CLI's codebook source) to always include dynamic-dictionary `DYN:` definitions.
- Fixed dynamic-dictionary economics: a word must repeat at least twice and net out its own definition cost before counting as a saving.
- Added a net-negative fallback to `compressText()`, matching `compressMessages()`.
- Added automatic level selection (`level: 'auto'`, CLI `--level auto`, VS Code setting `"auto"`).
- Added tokenizer-calibrated glyph cost measurement (`npm run calibrate:tokenizer`) against real OpenAI tokenizers.
- Added `test/codebook-completeness.js`, `test/auto-level.js`, and `test/cache-prefix-stability.js` as permanent regression suites (13 suites total, all passing).

## Delivered in v1.14.0

- Attentional Decay Compaction (ADC) progressively compacts older chat history based on distance `d` into Active (d=0), Warm (d=1-3), Cold (d=4-6), and Deep Freeze (d>6) zones.
- Keeps 100% active prompt fidelity intact to avoid LLM instruction regression.
- Experimental `experimentalDecay` configuration added natively to VS Code configurations.
- CLI arguments `--decay` and `--experimental-decay` support attentional decay from shell runs.
- Unicode-aware language tag parsing handles minified language tags like `ʲˢ` cleanly in the cold zone.
- Added comprehensive unit tests validating the 4 progressive decay zones.

Delivered in `v1.13.0`:

- Cross-session dictionary caching persists dynamicDict and fileIndex on disk under `~/.glyphcompress/cache/<sha256>.json` to enable instant warm-starts.
- Isolated caching keying computes SHA-256 hashes of workspace paths and working directories.
- Auto-save cache triggers inside successful `compressText` and `compressMessages` executions.
- ESM and CommonJS middleware compilation synchronization with full public profile and trust policy exports.
- Passing 51/51 automated integration and snapshot tests.

Delivered in `v1.12.0`:

- Codebook-skip threshold: skip the ~400-token protocol header when text-level savings are below 80 tokens.
- Unicode token cost accuracy with 1.5× penalty per non-ASCII glyph across all token-estimator variants.
- Per-glyph breakeven checks for tech name and dynamic dictionary substitutions.
- Multilingual verbose phrase compression for English, Italian, German, and French filler/polite patterns.
- Eliminated all `JSON.parse(JSON.stringify())` state cloning (~70% latency reduction).
- Source map `replacements` capped at 500 entries to prevent unbounded memory growth.
- Cached compiled regexes for tech names, dynamic dictionary words, and file paths.
- Expanded file path regex for `@scoped/package`, Windows backslashes, and 10+ new extensions.
- Adaptive chat strategy selection with automatic fallback when a compressed payload is net-negative.
- Anthropic hybrid wrapper: first-turn lightweight, multi-turn structured cacheable blocks.
- ESM and CJS middleware are fully synchronized.

## Verified Through v1.14.0

- npm `latest` is `1.14.0`.
- GitHub release `v1.14.0` exists with `glyph-compress-1.14.0.vsix` attached.
- VS Code Marketplace lists `neolambo.glyph-compress`.
- `npm run benchmark` reports 1.4× aggregate ratio, 28% genuine savings, 100% fidelity, 0 hallucinated refs.
- `npm test` passes all integration and unit tests.

## Real Remaining Work

- Wire workspace-intelligence file ranking into normal compression calls behind an explicit option and token budget.
- Extend provider profiles to tune code block minification, context-router behavior, and provider-specific trust warnings.
- Add expression-level AST spans where language-specific parsers are available.
- Expand multilingual verbose phrase coverage to Spanish, Portuguese, and Japanese.
- Reduce the remaining manual release steps for commit, tag, publish, and GitHub release publication.
- Extend diagnostics beyond the current proxy status/error/completion logging into structured log sinks and timestamps.

## Proposed Future Versions

- `v1.22.0`: real task evaluation (blocked on maintainer-provided multi-provider API keys).

## Longer-Term Ideas

- Glyph Negotiation Protocol.
- Context Budget Planner.
- Semantic Diff Compression.
- Team Codebook Registry.
- Real LLM comprehension tests across providers.
