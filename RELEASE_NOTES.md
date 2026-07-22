## v1.27.0 — OpenAI Comprehension Spot-Check

Sibling to v1.26.0's Gemini spot-check, using a live-provided OpenAI key.

### Second Real LLM Comprehension Spot-Check
- `test/comprehension-check-openai.js` (dev-only/manual, `OPENAI_API_KEY=... npm run check:comprehension:openai`) sends the exact same bug-fix scenario as the Gemini sibling script — same compressed prompt shape, same four checks — to a real `gpt-4o-mini` model, so the two are directly comparable.
- All four checks passed: it correctly named `calculateTotal`/`OrderProcessor` and identified the discount bug. Because OpenAI's existing measured-loss gating (v1.17.0/v1.21.0) means its compression barely substitutes identifiers at all, `gpt-4o-mini` also reproduced the original code verbatim and proposed a working fix — the strongest possible comprehension signal.
- ROADMAP.md's "Real Task Evaluation" item now has real, reproducible comprehension evidence for two providers using directly comparable scenarios. Anthropic comprehension coverage and broader/varied task scenarios remain open, pending an Anthropic API key.

### Also in This Release
- Closed out the `@hono/node-server` transitive vulnerability finding from v1.26.0 with a root cause: checked every `@modelcontextprotocol/sdk` version through the current latest — all pin `@hono/node-server` to `^1.19.x`, always inside the vulnerable range, so no non-regressive upgrade exists yet. More importantly, `bin/mcp-server.js` only uses `StdioServerTransport` and never exercises the SDK's HTTP transport, which is the only thing that pulls in the vulnerable `serve-static` code path — the vulnerability is present in `node_modules` but unreachable at runtime. Nothing to change on our side right now.
- Confirmed npm `latest` is caught up through `1.26.0`; `1.24.0`/`1.25.0` were deliberately left unpublished (a harmless historical gap, since `latest` already carries their fixes).

### Tests & Verification
- The new script is deliberately excluded from `npm test`/`test/run-suites.js` — it needs a real OpenAI API key, network access, and real generation quota.
- **Complete Suite Validation**: 24 suites, all passing (unchanged from v1.26.0 — no compressor behavior changed in this release).
- **Validation**: `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run).

***

## v1.26.0 — Gemini Tokenizer Calibration & Comprehension Spot-Check

The v1.17.0/v1.21.0 OpenAI measurement (all `TECH_GLYPHS`/code keywords cost as many or more tokens than the words they replace) was extended to Gemini, using a live-provided API key, plus a first real LLM comprehension spot-check.

### Real Gemini Tokenizer Calibration
- Gemini has no offline pure-JS tokenizer library like OpenAI's js-tiktoken, so this measurement required live calls to the real `models/{model}:countTokens` API rather than an offline script — see `test/tokenizer-calibration-gemini.js` (dev-only/manual, `GEMINI_API_KEY=... npm run calibrate:tokenizer:gemini`).
- Same finding as OpenAI: **26/28 `TECH_GLYPHS` and 32/33 code-minification keyword/glyph pairs are a net token loss on Gemini too** (only `csharp`/`nextjs` glyphs and `#include`→`imp` win). `MEASURED_TECH_GLYPH_TOKENS_GEMINI`/`MEASURED_CODE_KEYWORD_TOKENS_GEMINI` now gate substitution for the `gemini` provider, same mechanism as the existing OpenAI tables.
- Verified this has real bite: reverting the gating and re-running the new tests showed the previous character-based heuristic got several glyphs wrong in each direction that the real measurement catches — the heuristic was "mostly right by luck," never actually verified against a real tokenizer before now.

### First Real LLM Comprehension Spot-Check
- `test/comprehension-check-gemini.js` (dev-only/manual, `GEMINI_API_KEY=... npm run check:comprehension:gemini`) sends a realistic bug-fix scenario — compressed with the actual codebook + dynamic dictionary exactly as `bin/cli.js` sends it, not a simplified version — to a real `gemini-2.5-flash-lite` model.
- The response correctly named the compressed function (`calculateTotal`) and class (`OrderProcessor`) via their `§N` dynamic-dictionary glyphs, and correctly identified the discount bug — no hallucination. A first attempt that skipped `getCodebookPrompt()` (matching `compressText()`'s actual low-level contract, not real CLI usage) did produce a hallucinated function name, confirming the check needed to mirror real usage exactly to be meaningful.
- This is a first, honestly-scoped step toward ROADMAP.md's "Real Task Evaluation" item — one scenario, one provider, not a statistical benchmark. Multi-provider coverage (OpenAI, Anthropic) remains open, pending those providers' API credentials.

### Tests & Verification
- `test/tech-glyph-economics.js` and `test/code-minify-economics.js` extended with Gemini coverage (58 and 16 tests respectively), including the measured-*winning* cases that should still substitute normally.
- Both new scripts are deliberately excluded from `npm test`/`test/run-suites.js` — they need a real provider API key, network access, and (for the comprehension check) real generation quota.
- **Complete Suite Validation**: 24 suites, all passing.
- **Validation**: `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run).

### Found, Not Fixed Here
- `npm install` surfaced a pre-existing moderate-severity transitive vulnerability: `@modelcontextprotocol/sdk`'s `@hono/node-server` dependency has a Windows path-traversal advisory (GHSA-frvp-7c67-39w9). The available fix bumps the SDK to a version with breaking changes, so it's tracked in ROADMAP.md for a dedicated follow-up rather than rushed into this release.

***

## v1.25.0 — Cache-Stable Codebook for OpenAI/Gemini

Found while investigating v1.24.0: the codebook header injected for OpenAI/Gemini was payload-filtered — it only lists the DOM/TECH/SYM/MOD glyphs the current message happens to use — so it varied request to request and could never be a stable prefix for those providers' automatic, implicit prompt caching (which requires byte-identical leading tokens). `test/cache-prefix-stability.js`'s own name promised this was locked in, but its check only ever compared the system message's first line (a literal that never changes), never the full codebook block — exactly why this shipped unnoticed.

### The fix
- **Hybrid strategy mirroring the existing Anthropic `cache_control` first-turn-vs-multi-turn split** (`useStructuredSystem`): once a session has assistant history, `_injectCodebook()` switches OpenAI/Gemini/local to the full, unconditional codebook (byte-identical every time), with the per-request `DYN:` line moved to a separate `[GLYPH DYNAMIC]` block after the system text instead of embedded inside the cacheable block. A first-turn request has no prior turn to cache against yet, so it keeps the smaller filtered header — unchanged from pre-v1.25 behavior.
- **Two-tier fallback, not all-or-nothing**: the larger stable header costs ~350 extra tokens (measured directly against the real filtered version), a bet that only pays off across multiple cached turns and is invisible to a single call's token count. If it would flip a specific message into GlyphCompress's existing net-negative fallback — which discards *every* real saving, not just the header — that message automatically retries with the smaller filtered codebook first, before ever giving up to zero compression.

### Tests & Verification
- **`test/cache-prefix-stability.js`**: new assertions cover the entire codebook block (not just line 1) staying byte-identical across turns once in cache-stable mode, the DYN line living outside that block, graceful degradation to the filtered codebook when the larger header isn't affordable, and confirmation that `raw` and Anthropic are both unaffected.
- Verified these tests actually fail against the pre-fix code (reverted the fix, confirmed the expected failures, restored it) before being trusted — same discipline as v1.24.0.
- **Complete Suite Validation**: 24 suites, all passing.
- **Validation**: `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run).

***

## v1.24.0 — Anthropic Proxy Bridge (Critical Fix)

**Every real request sent through the GlyphProxy to an Anthropic target was being corrupted and rejected by the real API.**

### What broke
Every documented GlyphProxy integration (Cursor, Cline/RooCode, Continue.dev) configures the IDE in "OpenAI Compatible" mode, so the proxy always receives an OpenAI chat/completions-shaped request regardless of which upstream `targetApiUrl` GlyphCompress points at. That was already correctly handled for OpenAI itself and for Gemini (which offers a real OpenAI-compatible endpoint) — never for Anthropic. `api.anthropic.com` does not accept OpenAI's request shape at all: the system prompt must be a top-level `system` field, not a `role: "system"` message; authentication is `x-api-key` + `anthropic-version`, not `Authorization: Bearer`; the endpoint is `/v1/messages`, not `/v1/chat/completions`. On top of that, GlyphCompress's own compression path was inserting an *illegal* `role: "system"` message into `messages` when none existed. Every real Anthropic-target proxy request would have been rejected outright.

This was found while investigating a smaller, related item (making the injected codebook header a stable prefix for OpenAI/Gemini's automatic caching) — reproducing that led to actually testing the Anthropic proxy path directly (mocking the outbound `https.request` call and inspecting exactly what got forwarded), rather than trusting the existing smoke test, which only ever checked the forwarded status code and URL, never the request shape.

### The fix
- New `src/anthropic-bridge.js` translates OpenAI-shaped requests to Anthropic's native Messages API shape and translates the response back — for both non-streaming JSON and streaming SSE, with a byte-buffered SSE parser that correctly handles HTTP chunk boundaries splitting events mid-frame.
- Reuses `GlyphCompressor._prepareAnthropicPayload` — the same compression and `cache_control` structuring `wrapAnthropic()` already relied on — so proxy users now get the same cache-stable structured system blocks as direct SDK-wrapper users, a benefit previously unreachable through the proxy at all.
- Known, documented limitations: multi-modal image content is marked with a visible text placeholder rather than translated to Anthropic's image blocks; OpenAI tool-result (`role: "tool"`) messages are coerced to a labeled `user` message rather than a proper `tool_result` block; streamed tool-call argument deltas are not translated (non-streaming tool calls, including the response's `tool_calls` field, are fully translated).
- README's IDE integration guide previously claimed swapping `apiBase`/target settings alone was enough to use an Anthropic upstream — corrected, with the actual requirement (`glyphCompress.targetApiUrl = https://api.anthropic.com` plus a real Anthropic model id) documented.

### Tests & Verification
- **`test/anthropic-bridge.js`** (new, 18 tests): unit coverage of every translation function (system extraction, tool mapping, header rewriting, response mapping, SSE parsing across arbitrary chunk boundaries) plus end-to-end tests that start a real proxy server, mock the outbound HTTPS call, and assert on the actual forwarded request/response — both streaming and non-streaming — including a check that OpenAI/Gemini targets are completely unaffected.
- **`test/proxy.js`**: the existing Anthropic smoke test was strengthened to assert on the forwarded request/response shape instead of just the status code — exactly the gap that let the original bug ship unnoticed.
- Both suites were verified to actually fail against the pre-fix code (reverted the fix, confirmed the expected failures, restored it) before being trusted.
- **Complete Suite Validation**: 24 suites, all passing.
- **Validation**: `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run).

***

## v1.23.0 — Adaptive Workspace Memory

Changes since v1.21.2:

### Incremental Codebook Builds
- `buildWorkspaceCodebook()` no longer re-parses every workspace file on each call. A file whose mtime is unchanged since the last saved build reuses its previous symbols, imports, and diagnostics instead of being rescanned; only changed files go through extraction again.
- The returned codebook now reports `incrementalStats: { reused, rescanned, total }` so callers can see the split. Pass `{ incremental: false }` (or omit a previous codebook) to force a full rescan.

### Usage-Decay-Weighted Relevance
- New `recordFileUsage(rootDir, filePaths)` records that a file was actually selected and sent for a task, with a count and timestamp persisted to the on-disk codebook.
- `selectRelevantFiles()` now adds a decaying usage boost on top of keyword/intent scoring: 14-day half-life, capped so a file selected many times can't permanently dominate ranking regardless of relevance to the current query.
- `GlyphCompressor.routeAndCompress()` calls `recordFileUsage()` automatically for every file it actually selects, so the Context Router gets steadily better at surfacing files that have proven useful across a session — without any caller-side wiring.

### Found and Fixed
- **`recordFileUsage()` was a silent no-op on a fresh workspace.** It originally required a codebook already persisted to disk, but only the CLI's `inspect` command ever wrote one — meaning `routeAndCompress()`'s new usage tracking would do nothing at all the first time it ran on a workspace nobody had run `inspect` on. Fixed by having `recordFileUsage()` build and save a codebook on the fly when none exists, which also seeds the incremental cache for the next call. Caught by an end-to-end test before shipping, not after.

### Tests & Verification
- **`test/adaptive-workspace-memory.js`** (new, 10 tests): cold-build rescans everything; a second build against a saved codebook reuses unchanged files; touching one file rescans only that file; `{ incremental: false }` forces a full rescan; `recordFileUsage()` persists counts and builds a codebook when none exists; usage boost measurably outranks an equally-matched but unused file; `routeAndCompress()` records usage end-to-end; a year-old usage record decays to a negligible boost.
- **Complete Suite Validation**: 23 suites, all passing.
- **Validation**: `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run).

***

## v1.21.2 — VS Code Marketplace Listing Fix

- Added `vscode-ext/README.md`: the Marketplace "Overview" tab was showing "No overview has been entered by publisher" because `@vscode/vsce package` reads `README.md` from the extension's own root directory (`vscode-ext/`), and none existed.
- Added a `repository` field to `vscode-ext/package.json` and removed the now-unnecessary `--allow-missing-repository` packaging flag.
- Discovered while investigating: the Marketplace had never received a version past `1.12.0` — the listing's description text had been edited manually through the Marketplace management portal independent of publishing, which made it look more current than the actual installable package.
- `npm run check` green, VSIX repackaged and reinstalled locally to confirm the Overview content is present.

***

## v1.21.1 — Critical Packaging Hotfix

**The published VS Code extension was broken from v1.17.0 through v1.21.0.**

### What broke
`vscode-ext/glyph-middleware.cjs` required `../src/workspace-intelligence.cjs` and `../src/team-codebook.cjs`. Those relative paths resolve fine inside a full repository checkout — which is exactly what every test in this project's suite has always exercised, since they all `require()` files by repo-relative path. But `@vscode/vsce package` only includes files physically located inside `vscode-ext/` (see `vscode-ext/.vscodeignore`); the `src/` directory is not part of the packaged VSIX at all. The result: every VSIX built since the Context Router and Team Codebook Registry features wired `workspace-intelligence`/`team-codebook` into the middleware (v1.17.0) would throw `MODULE_NOT_FOUND` the instant any command tried to actually compress something — the extension would activate and log "ready," then fail on first real use.

This was caught by extracting the VSIX that had just been installed into a real VS Code and starting the actual proxy from it, at the user's request to verify the install worked, rather than trusting the test suite — none of the automated tests exercised the packaged file layout.

### The fix
- Local, self-contained copies of `workspace-intelligence.cjs` and `team-codebook.cjs` are now built directly into `vscode-ext/`, matching the pattern already used for `token-estimator.cjs`. `glyph-middleware.cjs`'s requires now point to these local copies instead of `../src/*`.
- **The equivalent npm-package risk was also real**: the new local copies were initially missing from `package.json`'s `files` allowlist, which would have broken `require('glyph-compress')` for npm consumers exactly the same way. Caught before any publish by extracting a real `npm pack` tarball and requiring the published entry points from it, not just by reading the allowlist.

### Tests & Verification
- **`test/extension.js`**: generalized a narrow, single-string check (only ever verified `token-estimator.cjs`) into a scan of every packaged `.cjs` file for *any* `require("../...")` escaping outside `vscode-ext/`.
- **`test/npm-pack-smoke.js`** (new): runs a real `npm pack`, extracts the actual tarball to an isolated temp directory, and requires the published CJS entry point, the `glyph-compress/middleware` sub-export, and `routeAndCompress()` (which transitively needs both newly-local files) from it — the same authoritative "test the real artifact" methodology used for the VSIX side.
- Both regression tests were verified to actually fail when the bug was deliberately reintroduced, and pass after the fix, before being trusted.
- **Complete Suite Validation**: 22 suites, all passing.
- **Validation**:
  - `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run)

***

## v1.21.0 — Provider Trust & UX

Changes since v1.20.0:

### Code-Block Minification Economics
- Applied the same real-tokenizer measurement that found all 28 `TECH_GLYPHS` losing on OpenAI (v1.17.0) to `_minifySyntax()`'s code-block keyword-to-glyph substitutions (`return`→`→`, `function`→`ƒ`, `const`→`◇`, `public`→`+`, `class`→`𝒞`, ...). Result: **all 33 keyword/glyph pairs tested are also net token losses on OpenAI** — common code keywords are already single BPE tokens (code is a large fraction of pretraining data), so replacing them with a 1-4 token Unicode glyph never wins.
- Both tech-name and code-keyword minification now skip measured-loss substitutions on the `openai` provider via the same breakeven pattern. Comment removal, blank-line removal, and indent-to-tab compaction are **not** glyph substitutions and are untouched — they still produce real savings, confirmed by a dedicated test that OpenAI code blocks still get genuine net-positive compression after this change, not just fallback to the original text.

### Trust Warnings
- `buildTrustWarnings(trustProfile, level)` and `sourceMap.trustWarnings`: plain-language warnings about what the current level/trust-policy combination actually permits (e.g. "lossy trust policy: code summaries and redundancy stripping are irreversible"). Every warning is derived strictly from the trust profile's own existing `reversible`/`redacts`/`lossy`/`allows.*` flags — no new, unverifiable claims about provider comprehension or model behavior.
- Surfaced in CLI `--explain`, the VS Code extension's output channel (at startup for the configured level/policy, and after each manual compression), and `sourceMap.trustWarnings` for any other consumer.

### Bug Found and Fixed
- `vscode-ext/glyph-middleware.js` hand-maintains a second, manual `module.exports = {...}` block for CJS consumers alongside its `export {...}` statement — esbuild's own auto-generated CJS export is dead code there (`0 && (module.exports = {...})`). Adding a new export to one list without the other silently produces `undefined` for `require()` consumers. `buildTrustWarnings` shipped with exactly this bug during development, caught immediately by a new regression test in `test/extension.js` that parses and compares both lists — reproduced the failure on purpose to confirm the test actually catches it before trusting it.

### Tests & Verification
- **New Test Suites**: `test/code-minify-economics.js` (8 assertions), `test/trust-warnings.js` (9 assertions, including CLI `--explain` checks).
- **Complete Suite Validation**: 21 suites, all passing.
- **Validation**:
  - `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run)

***

## v1.20.0 — Expression-Level Source Maps

Changes since v1.19.0:

### Expression-Level AST Spans
- `sourceMap.ast` now tracks arrow functions, function calls (with a span distinct from the surrounding declaration), destructuring assignments, async/await, and exception handling (try/catch/throw/finally/except/rescue) inside minified or summarized code blocks — previously only top-level import/export/function/class declarations were visible.
- New language coverage for structural spans: Ruby, Swift, Kotlin, and PHP — all four already had `TECH_GLYPHS` entries but zero token extraction until now.
- Deliberately kept as calibrated regex-based extraction rather than adopting a real parser dependency (acorn/meriyah/etc.): chat-pasted code snippets are routinely syntactically incomplete, which a real parser would simply reject, forcing a fallback to this same approach anyway — and a new parser dependency would add weight for every consumer to buy marginal precision on code that often can't be parsed at all.

### Two Real Bugs Found and Fixed
- **`test/ast-spans.js`** validates that every AST token's span slices back to exactly its own text against the caller's original input — "targeted validation for source-map fidelity at the expression level." Writing it surfaced two real, pre-existing correctness bugs:
- Whitespace normalization ran on the *whole* message, including inside ` ```fenced``` ` code blocks, in **two independent places** in the compression pipeline (the main normalization pass in `_compressUserMessage`, and again at the tail of verbose-phrase compression) — neither was fence-aware.
- 4-space and 8-space nested indentation both collapsed to the same single space (or single tab after the separate, intentional indent-to-tab minification pass), silently flattening code structure at **every** compression level, not just aggressive/ultra. For indentation-significant languages like Python, this could change what the code actually does, not just how it looks.
- Fixed with a shared `_applyOutsideCodeFences()` helper that both passes now use to skip code fence contents entirely.

### Tests & Verification
- **New Test Suite**: `test/ast-spans.js` (7 assertions), including a dedicated regression test that nested indentation survives compression at every level.
- **Complete Suite Validation**: 19 suites, all passing.
- **Validation**:
  - `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run)

***

## v1.19.0 — Structured Diagnostics & Git-Diff-Aware Routing

Changes since v1.18.0:

### Structured Diagnostics
- **`src/logger.js`**: a shared structured logger used by the proxy (and reusable elsewhere) — every entry gets an ISO timestamp, a level, and consistent redaction of bearer tokens/API keys/GitHub tokens/AWS keys/JWTs across every field, applied before it reaches any sink. Previously redaction only ran at one call site (the upstream error response body); every other log line — including one that echoes the intercepted request URL, or a forwarding-error message — went out unredacted.
- **New sinks**: console (human-readable), VS Code `outputChannel` (unchanged behavior, now consistently redacted), and a new optional JSONL file sink via CLI `--log-file <path>`.
- **Richer per-request diagnostics**: each compressed request now logs privacy firewall state, attentional decay/holographic folding/intent diffs flags, dynamic dictionary and file index size, whether a team codebook was loaded, and whether the net-negative fallback fired — not just the resulting compression ratio.

### Context Router
- **`routeAndCompress(query, { gitDiffOnly: true })`**: restricts candidates to git staged/unstaged files, for "review what I changed" / "explain this diff" workflows where relevance comes from being part of the change, not from matching query keywords. CLI: `glyph-compress route <query> --git-diff-only`.

### Build Hygiene
- **Fixed a real, pre-existing drift bug**: `vscode-ext/proxy.js` was a hand-maintained CommonJS duplicate of `src/proxy.js` that had fallen out of sync — missing `attentionalDecay`/`holographicFolding`/`intentDiffs` options, the dashboard/stats endpoints, and (until now) structured logging. It is now esbuild-generated from `src/proxy.js`, matching how `workspace-intelligence.cjs` and `team-codebook.cjs` are already built, eliminating the duplicate maintenance burden entirely.
- **Fixed a version-numbering collision** in `ROADMAP.md`/`docs/wiki/Roadmap.md`: both "Team Codebook Registry" (shipped) and "Structured Diagnostics and Snapshots" (proposed) claimed `v1.18.0`. Renumbered the proposed sequence to `v1.20.0`-`v1.23.0`.

### Tests & Verification
- **New Test Suites**: `test/logger.js` (6 assertions — redaction, timestamps, JSONL file sink, no-sink safety), extended `test/context-router.js` with a real git-repo-backed `gitDiffOnly` test, extended `test/proxy.js` with a CJS-build smoke test that had zero coverage before this release.
- **Fixed a real bug found while writing the file-sink test**: the initial file sink implementation used a buffered `WriteStream`, which opens its file descriptor asynchronously — a caller that logs and immediately reads the file back (or exits right after logging) could race an unopened stream, and an unhandled `'error'` event could crash the process. Switched to synchronous `fs.appendFileSync`, which is more appropriate for a diagnostic logger's volume and durability needs anyway.
- **Complete Suite Validation**: 18 suites, all passing.
- **Validation**:
  - `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run)

***

## v1.18.0 — Team Codebook Registry

Changes since v1.17.0:

### Product Moat
- **Team Codebook Registry**: `glyphcompress.team.json` — a small, git-committable file at the workspace root (unlike the gitignored `.glyphcompress/` cache directory) — lists dynamic-dictionary entries in priority order. Every `GlyphCompressor` instance now seeds its `§N` glyph indices from this file before any per-session learning happens, so every team member's compressor (CLI, MCP server, VS Code extension, proxy — all of them) assigns the exact same glyph to the same repeated identifier. This fixes two problems the per-machine dynamic dictionary had: wasted relearning (every developer re-teaches the dictionary independently) and defeated provider-side prompt caching at the organization level (implicit caching keys off byte-identical prefixes, which requires the same word to produce the same glyph everywhere, not just within one developer's own sessions).
- **New CLI commands**: `glyph-compress team-codebook show` (inspect the shared codebook) and `glyph-compress team-codebook sync` (promote this machine's locally-learned dictionary into the shared file, for committing to git).
- **New API**: `loadTeamCodebook`/`saveTeamCodebook`/`mergeTeamCodebook`/`readLocalDynamicDictWords` (`src/team-codebook.js`), `GlyphCompressor.getTeamCodebookInfo()`.
- The existing personal cross-session cache (`~/.glyphcompress/cache/<hash>.json`, v1.13.0) now merges into the dynamic dictionary instead of overwriting it, so a stale personal cache can never clobber team-seeded entries — fully backward compatible when no team codebook is present.

### Tests & Verification
- **New Test Suite**: `test/team-codebook.js` (9 assertions) covering the file format round-trip, index-collision safety between team and session-learned entries, and both CLI subcommands end-to-end.
- **Complete Suite Validation**: 17 suites, all passing.
- **Validation**:
  - `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run)

***

## v1.17.0 — MCP Server, Context Router & Real-Tokenizer Economics

Changes since v1.16.0:

### Distribution
- **MCP Server**: `bin/mcp-server.js` (`npx glyph-compress-mcp`) exposes GlyphCompress as a Model Context Protocol server over stdio using the official `@modelcontextprotocol/sdk`. Tools: `compress_text`, `compress_file`, `route_context`, `get_codebook`. Works with Claude Code, Claude Desktop, and any other MCP-compatible client with zero IDE-specific integration.

### Context Router
- **`GlyphCompressor.routeAndCompress(query, options)`**: ranks workspace files by relevance to a query (reusing workspace-intelligence's intent detection + scoring), then compresses as many as fit inside a token budget instead of the caller manually picking which files to send. Returns `selectedFiles`/`excludedFiles` (score, token cost, exclusion reason) and a per-file `sourceMap` for auditability.
- **New CLI command**: `glyph-compress route <query> [--budget] [--max-files] [--json]`.
- **Bug fix surfaced while building this**: `extractDiagnostics()`'s TODO/FIXME/HACK regex had no word boundaries, so "HACK" matched inside "Hacker News" and inflated irrelevant marketing docs above the actually-relevant source file for a bug-fix query. Fixed with `\b` boundaries.

### Real-Tokenizer Economics
- Extended `npm run calibrate:tokenizer` with an apples-to-apples word-vs-glyph comparison (not just isolated glyph cost) and phrase-level before/after measurement for error/prompt patterns.
- **Finding**: all 28 `TECH_GLYPHS` are a net token loss on real OpenAI tokenizers — common tech names are already 1-2 BPE tokens; the glyph that replaced them cost as much or more (worst case: "express" 1 token vs. its glyph at 5 tokens).
- **Fix**: `MEASURED_TECH_GLYPH_TOKENS_OPENAI` — a real, measured cost table — replaces the character-based heuristic for the `openai` provider. Tech-name substitution now never fires when it would lose tokens. `raw` mode (demos, character-level reporting) is unaffected.

### Tests & Verification
- **New Test Suites**: `test/tech-glyph-economics.js` (30 assertions), `test/context-router.js`, `test/mcp-server.js` (drives the real MCP server over stdio via the official SDK client, not just internal calls).
- **Complete Suite Validation**: 16 suites, all passing. No regressions on existing benchmarks.
- **Validation**:
  - `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run)

***

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
