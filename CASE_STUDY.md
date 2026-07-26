# Case Study: Where GlyphCompress Actually Helps

*Real numbers from `npm run benchmark:realistic` and `npm run benchmark:alternatives` on GlyphCompress v1.31.0, reproducible offline (js-tiktoken) or with your own provider key. Every number below is measured, not projected — where the result is a wash or negative, this document says so.*

## Executive Summary

GlyphCompress is not a flat "X% off every request" tool, and this document does not pretend otherwise. Three honestly-measured patterns hold across the data below:

1. **Code-heavy content compresses for real.** `ultra` level saves 13-26% real tokens on this repository's own source files, verified with `js-tiktoken`, not a character-count heuristic.
2. **OpenAI chat payloads are currently close to break-even by design.** Real-tokenizer calibration (v1.17.0/v1.21.0) found that common tech names and code keywords are already efficient single BPE tokens, so most glyph substitutions would *lose* tokens on OpenAI — the compressor correctly skips them rather than inflating a savings number that isn't real.
3. **Anthropic's win is in prompt caching, not raw payload size.** Structured `cache_control` blocks make multi-turn Anthropic conversations 15-37% cheaper on a cache-adjusted basis, even while the raw transmitted payload alone is roughly break-even or slightly negative once the codebook header is counted.

If you need a one-line answer: **use GlyphCompress for code-heavy `ultra` compression and for Anthropic multi-turn workflows; expect it to correctly step aside on short, prose-heavy, single-turn OpenAI/Gemini requests.** See [When to Use / When to Skip](README.md#-when-to-use-glyphcompress-and-when-to-skip-it) in the README for the full picture.

---

## 1. Static File Compression (Real Repository Files)

`npm run benchmark:realistic`, measuring this repository's own files at every compression level, real character/token counts:

| File | Level | Original Tokens | Compressed Tokens | Ratio | Saved |
|---|---|---:|---:|---:|---:|
| README.md | light/standard | 13,351 | ~12,870 | 1.0x | 4% |
| README.md | aggressive | 13,351 | 12,030 | 1.1x | 10% |
| README.md | **ultra** | 13,351 | 9,910 | **1.3x** | **26%** |
| ROADMAP.md | all levels | 17,527 | 16,807-16,808 | 1.0x | 4% |
| docs/architecture.md | all levels | 705 | 650 | 1.1x | 8% |
| src/compressor.js | light/standard/aggressive | 5,104 | 4,420-4,422 | 1.2x | 13% |
| src/compressor.js | **ultra** | 5,104 | 3,913 | **1.3x** | **23%** |
| src/workspace-intelligence.js | light/standard/aggressive | 5,088 | 4,696 | 1.1x | 8% |
| src/workspace-intelligence.js | **ultra** | 5,088 | 4,435 | **1.1x** | **13%** |

**Reading this honestly:** `ultra` (which strips comments/blank lines and generates structural code summaries) is consistently the level with real, measured savings on source code. ROADMAP.md — a long, mostly-prose markdown file — barely moves across any level, which is expected and correct: prose has little repeated structure for a deterministic codebook to exploit.

---

## 2. Compared to Naive Truncation (`npm run benchmark:alternatives`)

At a fixed token budget, what fraction of the *original* content survives? Naive truncation permanently deletes whatever's cut; GlyphCompress shrinks the same information so more of it fits — when compression actually reduces real tokens for that content.

| File | Budget | Naive Truncation Retains | GlyphCompress Retains |
|---|---:|---:|---:|
| src/compressor.js | 4,000 tok | 78% | **83%** |
| src/workspace-intelligence.js | 4,000 tok | 75% | **76%** |
| README.md | 4,000 tok | 30% | 30% *(correctly falls back)* |
| ROADMAP.md | 4,000 tok | 25% | 25% *(correctly falls back)* |
| docs/architecture.md | 1,000+ tok | 100% | 100% *(fits either way)* |

On the two prose-heavy markdown files, GlyphCompress ties truncation exactly — as of v1.30.0's fallback fix, it correctly detects when compression wouldn't beat the original and sends the content unchanged rather than risking a real-token regression. On the two code files, it beats truncation by a real, measured margin. Full methodology: [docs/benchmark-methodology.md](docs/benchmark-methodology.md).

---

## 3. Chat Payloads & Multi-Turn Amortization

Three realistic scenarios (`short-fix`, `medium-review`, `large-architecture`), measured with each provider's real token accounting:

**OpenAI:** 0% payload savings across all three scenarios at every scale tested. This is the direct, expected consequence of v1.17.0/v1.21.0's measured-loss gating — OpenAI's tokenizer already treats common tech names and code keywords as single, cheap tokens, so glyph substitution is skipped rather than forced. Real gains for OpenAI users come from `ultra`-level code compression (Section 1), not chat-payload substitution.

**Anthropic**, single-turn: -43% (short-fix), -5% (medium-review), -3% (large-architecture) on raw transmitted payload — the injected codebook header costs more than a short message saves, worse on smaller payloads. This is exactly why `cache_control` matters:

**Anthropic, cache-adjusted** (`repo-fix-thread`, `architecture-review-thread`, 3 turns each): raw cumulative payload is -9% and -3% respectively, but the **cache-adjusted estimate — accounting for exact repeated-block reuse of the system prompt and largest user block — is +33% and +34%.** This is a best-case billed-token estimate, not a billing guarantee; it assumes the provider's cache actually hits on those exact blocks.

---

## 4. Enterprise Nominal Usage (Weighted PR Review / Incident / Release Workloads)

A weighted mix of PR review, release-readiness, incident root-cause, and test-plan-generation workloads, single-turn and multi-turn:

| Provider | Weighted Payload Saved (raw) | Weighted Cache-Adjusted |
|---|---:|---:|
| OpenAI | 0% | — (no caching modeled) |
| Anthropic | -4% | **+28%** |

**The honest read:** on typical enterprise IDE workloads, OpenAI is currently a wash on chat-payload size (by design — see Section 3) and Anthropic's raw payload is slightly negative once the codebook is counted, but its cache-adjusted estimate is a real ~28% — driven entirely by prompt-caching mechanics, not glyph substitution. There is no team-wide dollar figure this document will assert as universal; the reproducible commands below let you measure it against your own provider pricing and usage pattern.

---

## 5. Throughput & Latency

Peak-load stress test, 50 consecutive requests per level:

| Level | Throughput | Avg Latency |
|---|---:|---:|
| light | 145,247 chars/sec | 272.7 ms |
| standard | 138,191 chars/sec | 286.7 ms |
| aggressive | 139,112 chars/sec | 284.8 ms |
| ultra | 128,267 chars/sec | 308.8 ms |

Compression runs locally inside the proxy; latency overhead is negligible relative to a real LLM API round-trip (typically 1-10+ seconds).

---

## Reproducing This Case Study

```bash
npm run benchmark:realistic     # Sections 1, 3, 4, 5 — raw corpus, chat payload, enterprise, throughput
npm run benchmark:alternatives  # Section 2 — vs. naive truncation, real js-tiktoken counts, no API key needed
```

No numbers in this document are hand-edited from the script output. If a future release changes them, this file goes stale until the next refresh — check `RELEASE_NOTES.md` for the current version's real numbers if this document predates it.
