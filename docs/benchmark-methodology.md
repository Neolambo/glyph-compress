# Benchmark Methodology: GlyphCompress vs. Alternatives

`npm run benchmark:alternatives` (`test/benchmark-alternatives.js`) compares GlyphCompress against the two realistic alternatives available without a specialized dependency, using real tokenizer measurements rather than a character-count heuristic.

## What Is Measured

For each of five real files from this repository (`README.md`, `ROADMAP.md`, `docs/architecture.md`, `src/compressor.js`, `src/workspace-intelligence.js`) and four token budgets (500, 1000, 2000, 4000), the script measures what fraction of the **original character content** is represented under each strategy:

1. **No compression** — send the original text as-is. Reported as whether it fits the budget at all; if it doesn't, something else has to give.
2. **Naive truncation** — the common real-world fallback: cut the content off at the token budget. Simple, and whatever gets cut is gone permanently — there is no codebook to decode it back.
3. **GlyphCompress** — compress the same content toward the same budget (`level: 'standard'`, `provider: 'openai'`).

All token counts use [`js-tiktoken`](https://www.npmjs.com/package/js-tiktoken)'s real `o200k_base` encoding (GPT-4o's tokenizer) — the same real-tokenizer approach `test/tokenizer-calibration.js` uses to calibrate glyph costs, rather than this project's own internal character-count heuristic (`src/token-estimator.js`), which the benchmark work itself surfaced as inaccurate for Unicode-heavy prose (see "Known Limitation," below).

## What This Does and Does Not Claim

This measures **information survival at a fixed token budget**, not answer quality. It does not claim GlyphCompress produces better model answers than truncation — verifying that requires real per-strategy LLM judging calls across many tasks, which is exactly the "measure task success on real repositories" item still open in `ROADMAP.md`'s `v1.22.0`.

What it does show, reproducibly, with no API key required: naive truncation permanently deletes whatever doesn't fit the budget, while GlyphCompress shrinks the same information so more of it survives — when compression actually reduces real tokens for that content (see below, this is not universal).

## Not Included: LLMLingua

[LLMLingua](https://github.com/microsoft/LLMLingua) is a genuinely relevant comparison — a research project attacking the same "fit more context in fewer tokens" problem from a model-based angle rather than glyph substitution. It is a Python library, and adding it to this benchmark means adding a Python runtime as a dependency of a Node.js project's benchmark tooling. That is a separate decision from building this comparison harness, and is intentionally left out here rather than approximated or guessed at.

## Known Limitation: Prose-Heavy Content Can Be Break-Even or Negative

Building this benchmark surfaced a real, previously undetected issue: for two of the five fixtures (`README.md`, `ROADMAP.md` — both Unicode-heavy markdown, full of emoji section markers and em-dashes), GlyphCompress's real-token-measured output was **larger** than the original, even though the compressor's own internal net-negative fallback reported `fallback: false` (implying it helped).

Root cause: `estimateProviderTokens()` in `src/token-estimator.js` adds a flat `+1.5` estimated-token penalty for every non-ASCII character in the text. That penalty is calibrated for the compressor's own rare, multi-token Unicode substitution glyphs (`ℜ`, `𝒟`, `𝒦`, ...) — which really do cost several tokens each, as `test/tokenizer-calibration.js` measured — but it is applied uniformly to *any* non-ASCII character, including common, cheap prose punctuation (em-dashes, curly quotes, emoji used as section headers) that real tokenizers usually encode efficiently. On Unicode-rich prose, this makes the heuristic overestimate the *original* text's cost enough (measured: 746 heuristic vs. 532 real tokens for `docs/architecture.md`, a 40% overestimate) that the fallback safety net compares two inflated numbers and misses a real regression.

This is tracked as an open, separate finding in `ROADMAP.md` rather than silently fixed as part of building this benchmark — it touches the token estimator every provider and every compression call relies on, which warrants its own scoped fix and verification pass rather than a rushed change here.

## Reproducing This Benchmark

```bash
npm run benchmark:alternatives
```

No API key or network access required — everything runs offline against the real `js-tiktoken` encoder and this repository's own files.
