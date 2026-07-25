# Benchmark Methodology: GlyphCompress vs. Alternatives

`npm run benchmark:alternatives` (`test/benchmark-alternatives.js`) compares GlyphCompress against the two realistic alternatives available without a specialized dependency, using real tokenizer measurements rather than a character-count heuristic.

## What Is Measured

For each of five real files from this repository (`README.md`, `ROADMAP.md`, `docs/architecture.md`, `src/compressor.js`, `src/workspace-intelligence.js`) and four token budgets (500, 1000, 2000, 4000), the script measures what fraction of the **original character content** is represented under each strategy:

1. **No compression** — send the original text as-is. Reported as whether it fits the budget at all; if it doesn't, something else has to give.
2. **Naive truncation** — the common real-world fallback: cut the content off at the token budget. Simple, and whatever gets cut is gone permanently — there is no codebook to decode it back.
3. **GlyphCompress** — compress the same content toward the same budget (`level: 'standard'`, `provider: 'openai'`).

All token counts use [`js-tiktoken`](https://www.npmjs.com/package/js-tiktoken)'s real `o200k_base` encoding (GPT-4o's tokenizer) — the same real-tokenizer approach `test/tokenizer-calibration.js` uses to calibrate glyph costs, deliberately independent of this project's own internal character-count heuristic (`src/token-estimator.js`), so the benchmark's numbers stay trustworthy even if that heuristic drifts. Building this benchmark is in fact what surfaced a real bug in that heuristic — see "Found and Fixed" below.

## What This Does and Does Not Claim

This measures **information survival at a fixed token budget**, not answer quality. It does not claim GlyphCompress produces better model answers than truncation — verifying that requires real per-strategy LLM judging calls across many tasks, which is exactly the "measure task success on real repositories" item still open in `ROADMAP.md`'s `v1.22.0`.

What it does show, reproducibly, with no API key required: naive truncation permanently deletes whatever doesn't fit the budget, while GlyphCompress shrinks the same information so more of it survives — when compression actually reduces real tokens for that content. For content where it doesn't (Unicode-light prose that doesn't compress well — see below), GlyphCompress now correctly falls back to sending the original unchanged, matching naive truncation's retained fraction exactly rather than making things worse.

## Not Included: LLMLingua

[LLMLingua](https://github.com/microsoft/LLMLingua) is a genuinely relevant comparison — a research project attacking the same "fit more context in fewer tokens" problem from a model-based angle rather than glyph substitution. It is a Python library, and adding it to this benchmark means adding a Python runtime as a dependency of a Node.js project's benchmark tooling. That is a separate decision from building this comparison harness, and is intentionally left out here rather than approximated or guessed at.

## Found and Fixed: Two Real Bugs in `src/token-estimator.js` (v1.30.0)

Building this benchmark surfaced a real, previously undetected issue: for three of the five fixtures (`README.md`, `ROADMAP.md`, `docs/architecture.md`), GlyphCompress's real-token-measured output was **larger than or equal to** the original, even though the compressor's own internal net-negative fallback reported `fallback: false` (implying it helped). Root cause turned out to be two separate, compounding problems, both fixed in v1.30.0 — see `test/token-estimator-accuracy.js` for the regression suite that locks this in.

**1. An uncalibrated, double-counting Unicode penalty.** `estimateProviderTokens()` added a flat `+1.5` estimated-token penalty for every non-ASCII *UTF-16 code unit*, calibrated for the compressor's own rare, multi-token Unicode substitution glyphs (`ℜ`, `𝒟`, `𝒦`, ...) but applied uniformly to any non-ASCII character — including common, cheap prose punctuation (em-dashes, curly quotes) that real tokenizers usually encode as a single token — and it double-counted every astral-plane character (emoji, and the compressor's own glyphs), since those are two UTF-16 code units but one Unicode codepoint. Fixed with codepoint-aware counting and separately calibrated penalties for BMP vs. astral-plane characters, measured live against real `js-tiktoken` output.

**2. A base `charsPerToken` constant that was only accurate for code.** This turned out to be the *larger* of the two problems: OpenAI's `charsPerToken: 3.8` matched real code (measured: ~3.8-3.9 for `src/compressor.js`/`src/workspace-intelligence.js`) but badly underestimated real tokenizer efficiency on prose/markdown (measured: ~4.2-5.3 for the three prose fixtures) — `docs/architecture.md` has *zero* non-ASCII characters at all, so the Unicode-penalty bug above couldn't explain its ~40% overestimate; the base ratio itself was wrong. Recalibrated to `4.2`, the character-weighted blended average across all five measured files.

**3. Even recalibrated, a single heuristic number isn't reliable enough on marginal content**, so `compressText()`/`compressMessages()`'s fallback check now requires a real 10% heuristic-measured improvement (not just any nonzero one) before trusting a compression — a safety margin, evidence-based from the ~10-14% residual ORIGINAL-vs-COMPRESSED ratio discrepancy still measured post-recalibration across the same five files.

With all three fixes, GlyphCompress now correctly falls back to sending the original unchanged for all three prose fixtures (matching naive truncation's retained fraction exactly, never worse) while still compressing the two code fixtures with a genuine, real-token-measured margin.

## Reproducing This Benchmark

```bash
npm run benchmark:alternatives
```

No API key or network access required — everything runs offline against the real `js-tiktoken` encoder and this repository's own files.
