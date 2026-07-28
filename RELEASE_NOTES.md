## v1.34.0 — The Cheapest Codeword Does Not Look Like A Code (opt-in)

**`codewordDictionary: true` replaces `§N` markers with ordinary single-token words. Measured end to end: 4–10 dictionary entries become 33–49, and savings improve by 139–251 real tokens per file.** Off by default — see "What is not verified" below, which is the whole reason it ships opt-in.

### The Reasoning

The dynamic dictionary swaps a repeated identifier for a short stand-in, and this project had been choosing that stand-in as though the alphabet were free to invent. It is not. **BPE is a learned variable-length code trained on natural text** — it already assigns the shortest encodings to ordinary words. Anything that *looks* like a code is by construction outside that distribution and costs more. Measured in running text:

| Codeword form | Real tokens |
|---|---|
| `rgb(163,242,193)` | 8 |
| `#A3F2C1` (24-bit colour) | 7 |
| `#A3F2` (16-bit colour) | 5 |
| base64, 4 chars | 3 |
| `§1`, emoji, single CJK | 2 |
| **an ordinary English word** | **1** |

A colour map — the intuition that prompted this — is the *worst* option measured, 2.5× worse than what it would replace. The best is a plain word.

### Why Halving The Codeword Matters More Than It Sounds

It moves the break-even. A substitution pays only if the identifier costs more than the codeword, and **most identifiers are 2 tokens**: `AuthenticationManager`, `NotificationDispatcher`, `handleSubmit`. Against a 2-token `§N` those can never pay, which is why v1.33.8's correct economics left the dictionary admitting only a handful of entries. Against a 1-token word, every one of them becomes profitable.

Measured through the real pipeline at `aggressive`:

| File | `§N` | Word codewords | Extra saving |
|---|---|---|---|
| `src/compressor.js` | 4 entries, −511 | 33 entries, −650 | **+139 tokens** |
| `src/proxy.js` | 7, −344 | 37, −568 | **+224 tokens** |
| `vscode-ext/glyph-middleware.js` | 10, −630 | 49, −881 | **+251 tokens** |
| `src/workspace-intelligence.js` | 4, −353 | 40, −554 | **+201 tokens** |

### The Risk, And What Guards It

`§1` cannot occur naturally. `zebra` can — and a codeword that also appears as content is undecodable in the direction that corrupts silently, with the model expanding a word the author actually wrote. Two defences:

- **A vocabulary chosen against plausible collisions, not average ones.** Excluded despite being single-token and thematically apt: `salt` (cryptography), `bloom` (filter), `bean` (Java), `leaf` (every tree structure), `spring` and `sage` (frameworks), `delta`, `vector`, `matrix`, `kernel`.
- **Per-payload withdrawal**, which does the real work, since no static list anticipates every codebase. Matching is case-insensitive and by **substring**: `zebraCrossing` disqualifies `zebra`. A first version matched whole words only, reasoning that the two tokenize differently — but that argument is about the tokenizer while the risk is about the model, which could plausibly read `zebraCrossing` as `AuthenticationManagerCrossing`. Capacity is the cheaper thing to spend: ~89 codewords, and at least 40 survive withdrawal against this repository's largest source file.

### What Is Not Verified

**Whether models decode a word codeword as reliably as a `§N` marker.** That is the question the idea lives or dies on, it needs real API calls, and no key was available here — so nothing about comprehension is claimed. All three comprehension checks now take `--codewords` and report which mode ran, so the same scenario can be compared both ways:

```
ANTHROPIC_API_KEY=... node test/comprehension-check-anthropic.js --codewords
```

Until that comparison exists, the flag stays off. A saving that costs comprehension is not a saving.

### Also Recorded: Why Not An Image

Rendering the payload as an image was measured as arithmetic rather than dismissed. Claude bills roughly `width × height / 750`, so a 1092×1092 image costs ~1,590 tokens and holds ~7,300 OCR-legible characters ≈ ~1,800 tokens of text — about 12% saving at best. It is paid for with exact fidelity: no reliable line references, no partial edits, and OCR errors that fail silently. For a coding tool that trade is not close.

---

## v1.33.10 — The Guarantee Did Not Hold In The Shipped Build

**Corrects v1.33.8.** That release stated the never-inflate guarantee "holds either way", with or without the optional tokenizer. It did not. Measured on the packaged artifact, where `js-tiktoken` is absent by design: **+5.54% via `compressMessages`** and **+0.15% via `compressText`** on this repository's own files.

### Why It Was Missed

`js-tiktoken` is an **optional** dependency, and a VSIX ships no `node_modules` at all — so the packaged extension always runs on the fallback path. Every measurement backing v1.33.8 was taken in the development tree, where the dependency *is* installed. The verified path and the shipped path were not the same path, and nothing tested the difference.

### The Cause

v1.33.8 gave `raw` a bare `compressed <= original` check. That is correct against a **real** count and wrong against an **estimated** one: the estimator overstates improvement by 10–14%, so at the 1.0 boundary it waves through payloads that actually grew. The margin exists precisely to stand in for the tokenizer when the tokenizer is not there, and `raw` had been exempted from it.

Raw's permissive rule now applies only on the measured path. Unmeasured, every provider takes the 10% margin.

### The Honest Bound

With the fix, the packaged artifact's worst case across 60 file/provider/level combinations is **raw/ultra at +4 real tokens on a 3,230-token payload (+0.12%)** — the estimator believes it saved over 10% there while reality is a fractional loss. Widening the margin enough to absorb that would start rejecting genuine savings.

So the guarantee is stated in two parts rather than overclaimed:

| | Guarantee |
|---|---|
| With `js-tiktoken` installed (npm default) | **Exact.** Never more tokens out than in. |
| Without it (VSIX, or `--no-optional`) | **Bounded by the estimator**, measured worst case +0.12%. |

Both are asserted. The second pins the 0.5% ceiling; the first asserts the exact bound so the tolerance can never quietly become the normal operating point.

### The Test Took Three Attempts, And The Failures Are The Point

The first version judged the child process's output using `stats.compressedTokens` — **the estimator**, the very instrument whose error causes the bug. It passed with the bug deliberately restored. The second used a fixture the bug did not appear on, and also passed. The third exceeded the OS argument limit inlining 60,000 characters of source into `node -e`.

The working version runs the packaged artifact where the tokenizer cannot resolve, refuses to run if it turns out to be reachable, ships the emitted bytes back to the parent process, and counts them **there** with js-tiktoken. Restoring the bug now fails it with `compressMessages inflated by 182 real tokens (5.54%) at src/proxy.js raw/light`.

A test that cannot fail is worse than no test, because it reports safety it never checked.

---

## v1.33.9 — Differential Transmission Now Keeps The Cache Prefix Too

**Billed session cost on a re-attached file, 10 turns: −63.7% → −75.4% (OpenAI), −66.8% → −78.5% (Anthropic).** No change to how many tokens are transmitted — the entire gain is cache that was previously being thrown away.

### What Was Happening

Differential transmission (v1.33.0) elides a code block repeated across turns and keeps one copy. It keeps the **newest**, which means every turn rewrites the bytes of earlier turns — and a provider's prefix cache keys on exactly those bytes. Measured over a 10-turn session: **9 prefix breaks out of 9.** Every turn missed the cache.

The elision itself was never in question and still measures as this project's largest single saving. Re-priced with js-tiktoken rather than the heuristic that v1.33.0 used:

| Turns | Tokens transmitted |
|---|---|
| 3 | −40.0% |
| 6 | −63.4% |
| 10 | **−75.4%** |

which confirms the original −72.4% figure. But the *billed* figure was well below it, because the cache never hit.

### The Fix, And Why It Is Conditional

Keeping the **oldest** copy transmits exactly the same number of tokens and leaves history untouched — **1 prefix break out of 9** instead of 9. The whole difference lands on the bill:

| Turns | Provider | Billed, keep newest | Billed, keep oldest |
|---|---|---|---|
| 3 | openai | −23.8% | **−34.3%** |
| 6 | openai | −48.6% | **−62.7%** |
| 10 | openai | −63.7% | **−75.4%** |
| 10 | anthropic | −66.8% | **−78.5%** |

**But it is only safe when nothing rewrites history.** With Attentional Decay enabled, old turns are compacted: measured over the same session, turns 0–5 come back with their code blocks replaced by structural summaries. Pointing every marker at the oldest copy would then reference a turn whose code no longer exists — a dangling pointer, the failure class of the `◈₍1₎` collision fixed in v1.32.6. **v1.33.0's choice was correct**; it was correct for the case it was designed around.

So the surviving copy is now the oldest when decay is off (the default) and the newest when it is on. The marker wording follows the reference direction — *"shown earlier … see the first copy"* against *"repeated later … see the most recent copy"* — because a marker pointing the model the wrong way is a wrong instruction, not a cosmetic difference.

### Verification

Both directions are pinned by their own test, each with the reason it exists. Forcing keep-newest fails the decay-off case; forcing keep-oldest fails the decay-on case, and neither mutation is caught by the other's test. The surviving copy is asserted to be un-decayed in both modes, and marker direction is asserted to match. 30 suites green, `npm run benchmark` unchanged at 26%.

---

## v1.33.8 — Compression Is Priced In Real Tokens, Over A Session

**GlyphCompress no longer sends more tokens than it received.** The guarantee is scoped to a *session* of ordinary use, not to each individual call — which is the scope that matters, and the one that makes the prompt-cache investment legal.

### The Bug: Admission Was Counted In Characters

The dynamic dictionary decided what to learn with

```js
save = freq * (word.length - 2) - (word.length + 2)
```

Characters, not tokens — and wrong in the direction that approves losing substitutions. Providers bill tokens; BPE merges ordinary identifiers into very few of them while `§N` always costs 2. Replacing `amount`, `validated` or `currency` — **1 token each** — therefore doubled the cost while the formula reported a large saving.

Measured on identifier-repetitive source: **characters fell 33% (17,238 → 11,473) while real tokens rose 37.8% (3,496 → 4,818).** The net-negative fallback did not catch it, because it compared two heuristic numbers whose errors point in *opposite* directions — **+42.9% on plain text against −24.1% on glyph text**, more than enough to invert a verdict. The guard was sound; its inputs were not.

Length cannot fix this, and that is the whole reason for the new dependency:

| Identifier | Length | Real tokens |
|---|---|---|
| `AuthenticationManager` | 21 | **2** |
| `processTransaction0` | 19 | **3** |

The shorter identifier costs more. No length heuristic separates them.

### The Fix

`js-tiktoken` becomes an **optional** dependency. Installed, admission and the accept/reject gate use real BPE counts; absent, a deliberately conservative length rule (`chars/8`) applies, chosen against those counterexamples so it never over-estimates the replaced word — the only error direction that can admit a loser. ~~**The never-inflate guarantee holds either way**~~ — **corrected in v1.33.10: it did not.** Without the tokenizer the packaged build was still inflating (+5.54% via `compressMessages`), because this release also exempted `raw` from the margin that stands in for the tokenizer. See v1.33.10 for the fix and the honest bound. Without the tokenizer the fallback also leaves real savings on the table (`processTransaction0` at 120 occurrences is ~113 tokens).

Two further gaps closed: `raw` skipped the guard entirely and was inflating README.md by 0.5%, and the 10% improvement margin — which exists to cover the *heuristic's* error band — no longer applies to a real count, where a 5.7% saving is simply a 5.7% saving.

### Why A Session, Not A Call

The cache-stable codebook header costs **437 real tokens** against the filtered form's 32. On one call it can measure **+50%** (999 tokens against 664). A per-call rule rejects it every time — and rejecting it throws away byte-identical prefixes worth up to **−41.6% of effective session cost** once providers price cache reads at 0.1× (v1.33.6, `npm run measure:cache`).

So that header is exempt from the real-token gate, under two conditions: assistant history exists (later turns are real, not hypothetical) **and** the provider actually has a prefix cache. `raw` and `local` have none, so the exemption would be a licence to inflate for no return — measured at +4.93% before that narrowing.

The asymmetry is the point. The `§N` dictionary inflated per call *and* broke the prefix — losing on both axes. This header loses one to win the other.

### Verified At Session Level

| | Result |
|---|---|
| OpenAI/Gemini implicit caching, 2–42 turns | **0.0%** inflation, **0** prefix truncations |
| Anthropic explicit caching, 2–42 turns | **100%** prefix coverage, **0** full-price tokens |
| `compressText`, 100 combinations | never inflates |
| `raw`/`local` (no prefix cache), per call | never inflates |
| `npm run benchmark` | 26%, unchanged |

### The Tests Were Measuring The Wrong Thing

Migrating the suite surfaced a distinction that had been conflated: **what the encoder produces** and **whether shipping it pays** are different contracts. Tests asserting glyph output now call the encoder directly; tests asserting a *saving* go through the gate with payloads where the saving is real.

Doing so exposed three facts worth stating plainly:

- **`standard` no longer clears the margin on real source.** `aggressive` saves ~901 real tokens on 8,000 characters of this repository's own code, `ultra` ~2,112. `standard` correctly declines.
- **Repeated English prose does not compress at any level.** Long phrases are already close to optimal for BPE. Several fixtures were built from it.
- **A test asserting `ratio > 1x` on nine one-line prompts was simply false.** It is now two true assertions: short prompts are declined without inflation, and realistic IDE payloads do compress.

### Not A Verdict On The Glyph Encoding

A 24-character prompt inflates 71% (`fix the error in app.tsx` is 7 real tokens, `⺌✗ ◈₍1₎` is 12), which looked like an indictment of the whole approach. Re-pricing the README's own showcase scenarios with js-tiktoken says otherwise — **89% in characters, 78% in real tokens** (`npm run measure:showcase`). The published figure holds. Small strings lose; realistic IDE context wins, which is what the README already claimed.

---

## v1.33.7 — Security: The Privacy Firewall Was Bypassed On Every Fallback

**Upgrade if you use `privacyFirewall: true`.** Secrets that the firewall had already redacted were sent to the provider **unredacted** whenever compression turned out to be net-negative.

### What Happened

Both entry points fall back to the original payload when compression would cost more tokens than it saves. Both returned the **raw** original rather than the privacy-filtered one:

- `compressText()` returned `text` instead of `safeText` — the redacted string the firewall had just produced.
- `compressMessages()` returned the untouched input array.

The firewall ran, the redactions were computed, the source map recorded them, the API reported the firewall as active — and then the fallback path discarded the filtered text and shipped the original. Reproduced on released code with an entirely ordinary input:

```
API_KEY=sk-prod… and admin@example.com from 192.168.10.22
```

sent through `compressMessages()` with `privacyFirewall: true` arrives at the provider with the key, the address and the IP intact.

### Why It Was Reachable

Short messages are exactly where compression does not pay, so they take the fallback path — and short messages are exactly where people paste a credential to ask about it. The two conditions coincide rather than being independent.

It stayed hidden because the firewall's own test suite verified redaction on payloads that compress successfully, so the fallback branch was never exercised with a secret in it. Six of nine redaction patterns had been untested until v1.32.3; this was the path around all nine.

### The Fix

Both paths now return the privacy-filtered original. The firewall is a security boundary and cannot be conditional on whether compression happened to pay off. Where the firewall is disabled, `_applyPrivacyFirewall` returns its input unchanged, so behaviour there is identical to before.

Covered in `test/privacy-redaction.js` for both entry points, each asserting the fallback branch was actually taken before asserting anything about it — a precondition, so the test cannot quietly stop testing what it claims to. Reverting either half fails its own case and leaves the other passing.

### Not Affected

- `trustPolicy: 'lossless'` returns input unchanged by design and never enters this path.
- Runs without `privacyFirewall: true` are unaffected: nothing was being redacted to begin with.
- No change to compression output, ratios, or the benchmark suite.

---

## v1.33.6 — The Cache Breakpoint Was On The Wrong Axis

**Full-price tokens in a 42-turn session: 20,763 → 0. Effective cost −41.6%.**

### The Bug

Anthropic's prompt cache is **prefix-based**: `cache_control` means "everything up to and including this block is cacheable". The breakpoint therefore belongs at the *end* of what you've sent, so the next request reads all of it back.

GlyphCompress marked the **largest user block** instead. That is a different axis entirely, and in the shape that matters it is the wrong one: the largest block is almost always the file attached at the start of the session, and it **does not move as the conversation grows**. Every turn after it fell outside the cached prefix and was billed at full price — on every single request, for the rest of the session.

The failure is invisible from the outside. The payload is valid, the cache is genuinely used, the numbers look fine on a short session. It only shows up as a bill that grows faster than the conversation.

### Measured

`npm run measure:cache`, with a 5.5k-token file attached up front, cache writes priced at 1.25x and reads at 0.1x:

| Turns | Prefix coverage (before → after) | Full-price tokens (before) | Effective cost |
|---|---|---|---|
| 8 | 96% → 100% | 447 | −1.4% |
| 18 | 88% → 100% | 3,291 | **−13.8%** |
| 42 | 74% → 100% | 20,763 | **−41.6%** |

The saving grows with session length, because that is precisely how much conversation had piled up beyond the frozen breakpoint. This is the axis the project's own analysis said mattered most — 85–95% of cumulative session tokens are repetition, and the write/read spread attacks that at 10x leverage, against the ~22% compression delivers.

### Why Short Sessions Don't Regress

Marking the newest turn writes it to cache at 1.25x, and a session that ends there never reads it back. Swept across session lengths, the worst case measured is **+0.2% at 4 turns** — the loss is bounded by the 0.25x write premium on one turn, while the gain is unbounded in session length. There is no length at which the old placement wins by more than rounding.

### One Breakpoint, Not Two

Keeping the old largest-block marking *as well* was measured and rejected. It is the documented "stable floor plus moving head" pattern, but it measured identically here and it buys no real resilience: with prefix caching, any change early enough to invalidate the advancing head invalidates the floor beneath it too. Dropping it also leaves headroom — with both system blocks cached, this now uses **3 of Anthropic's 4** breakpoints instead of exactly 4.

### Verification

`test/cache-prefix-stability.js` asserts both the structure (exactly one conversation breakpoint, on the final message) and the billing consequence (the prefix covers 100% of the conversation) — the second because the first alone would still pass if some other breakpoint were deciding the outcome. Restoring the largest-block heuristic fails it. 30 suites green.

### Caveat Stated Plainly

These are token-equivalents under Anthropic's published multipliers, not billed dollars, and they assume each turn lands inside the cache TTL (5 minutes by default). A session with long pauses re-writes rather than reads, and the advantage shrinks toward zero. The change is never worse than the old placement in that case — both lose the cache — but the headline figure assumes an active session.

---

## v1.33.5 — Correcting Two Published Numbers That Don't Reproduce

No behavior change. This release retracts and restates measurements from v1.33.3 and v1.33.4, and adds the harness that makes them reproducible: **`npm run measure:routing`**.

### What Was Wrong

Both figures came from an ad-hoc script run against the working tree. That is not a stable measurement environment, for two reasons that compounded:

- **git dirtiness.** Ranking gives **+3** to any file git reports as staged or unstaged. `src/workspace-intelligence.js` is the target of query 6 — and it was the file being edited, so every "after" run boosted it, while every "before" run, taken via `git stash`, did not. That is a whole retrieval point, manufactured by the act of measuring.
- **usage history.** `routeAndCompress()` records usage for everything it selects, so simply running the router changes what the next run returns. Measurements taken minutes apart were not comparable, and the original history (`examples/test-dashboard.tsx` at count 318) was deleted during a sweep, so the v1.33.3 figure could not be re-derived at all.

The dirtiness confound survived a first round of diagnosis, because mutating a file with `sed` to test a variant makes it dirty again — the corrected run reproduced the original error.

### Correction 1 — v1.33.3's Delta

**Published: retrieval 0/6 → 3/6. Actual: 1/6 → 2/6.** Both ends were wrong, in the same direction.

Measured with `npm run measure:routing --seed-usage` on clean checkouts of each revision, all sharing one deterministic usage history:

| Revision | With usage history | Without |
|---|---|---|
| v1.33.2 (before the fix) | **1/6**, noise 17/18 | 2/6, noise 16/18 |
| v1.33.3 | **2/6**, noise 16/18 | 2/6, noise 16/18 |
| v1.33.4 | 2/6, noise 16/18 | 2/6, noise 16/18 |

The right-hand column is the clearer statement of what the fix does. With no history, the boost has nothing to act on and every revision scores 2/6. The feedback loop was costing one retrieval; the fix gives it back. **It repairs damage rather than adding capability** — which is what a fix should do, and less than the original note claimed.

### Correction 2 — The Two Halves Are Redundant, Not Complementary

v1.33.3 stated that both halves are load-bearing, citing "cap 10 with the gate in place retrieves only 2/6, not 3/6". That comparison was contaminated. The clean 2x2:

| Gate | Cap | Retrieval | Noise |
|---|---|---|---|
| off | 10 (v1.33.2) | 1/6 | 17/18 |
| **on** | 10 | 2/6 | 16/18 |
| off | **3** | 2/6 | 16/18 |
| **on** | **3** (shipped) | 2/6 | 16/18 |

**Either half alone achieves the full effect; together they add nothing measurable.** The shipped release applies both.

Both are kept. Six queries cannot separate two guards that defend distinct failure modes — the gate stops usage *inventing* relevance, the cap stops it *outweighing* relevance — and each has its own unit test that fails when its mechanism is removed. But that is a design argument, not a measured one, and v1.33.3 presented it as measured.

### Correction 3 — v1.33.4's Content-Indexing Table

The baseline row read 3/6; on a clean tree it is 2/6, and every other row shifts with it. **The conclusion is unaffected** — all six variants were measured under the same contamination, and all six were identical, so "content indexing changed nothing" still holds, as does the reason it failed. Only the absolute figures were inflated.

### The Harness

`npm run measure:routing` refuses to run on a dirty tree (exit 2) rather than producing a number that quietly includes the +3 boost on whatever you were editing, and pins the usage history instead of inheriting it. `--seed-usage` rebuilds the feedback loop deterministically — 40 rounds of ordinary development queries, after which `examples/test-dashboard.tsx` reaches count **312**, against the 318 recorded before the original data was lost. That the same file tops the list from a clean start is independent confirmation of the v1.33.3 *diagnosis*, which was never in question — only its magnitude was.

---

## v1.33.4 — Two Silent Failures, Found While Measuring Something Else

> **Corrected in v1.33.5:** the retrieval figures in the table below were measured on a dirty working tree and are inflated by one point. The comparison between variants — all identical — and the conclusion drawn from it are unaffected. See v1.33.5 above.

This release ships no feature. It went looking for one, didn't find it, and found two bugs on the way — both of the same kind this project keeps turning up: **output that stays valid and confident while something is quietly missing from it.**

### 1. A File Too Large To Index Was Skipped Entirely

`readTextFile()` returned `''` for any file over `maxFileBytes` rather than reading a prefix. An oversized file therefore contributed no symbols, no imports, no diagnostics — it could never be selected by the router, which still returned a confident scored list without it.

On this repository, at the 120,000-byte default, exactly one file crossed the line: **`vscode-ext/glyph-middleware.js` at 122,875 bytes** — the ESM source of truth holding the compressor, the privacy patterns and the attentional decay zones. The file most questions about this project's behavior should reach indexed as **0 lines, 0 symbols, 0 imports, 0 diagnostics**.

It now reads a prefix instead: **2,824 lines, 20 symbols, 8 imports, 1 diagnostic**. A query for `TECH_LABEL_OVERRIDES`, a symbol unique to that file, went from **unranked to rank 1**. A prefix is strictly better than nothing here — imports and top-level symbols cluster near the head of a source file.

Covered by `test/context-router.js`; reverting the read to the skip behavior fails it.

### 2. Three Tests Reported Green With Guaranteed-False Assertions

The `test()` helpers in `test/context-router.js` and `test/integration.js` call `fn()` inside a `try/catch`. An async test **rejects after fn() returns**, so the catch never fires: the suite printed `✓` and reported `0 failed`. Verified by forcing a false assertion into one — it still passed.

`integration.js` was the worse of the two: it ends in `process.exit()`, which tore the process down before the rejection could even surface as an unhandled one. In `context-router.js` the rejection did escape, and Node's default `--unhandled-rejections=throw` set exit 1 — so CI caught it by luck of a runtime default, while the suite's own reporting said everything passed.

Both helpers now detect a thenable, collect it, and await every pending result before printing totals. Same forced failure now prints `✗` and `1 failed`. `test/mcp-server.js` and `test/cache-prefix-stability.js` were already correct — they use `await test(...)`.

### The Feature That Didn't Ship

The goal was content indexing: score files on their text, not just `path + owner + symbols + imports`. It was built, measured across five variants, and dropped. **Retrieval stayed at exactly 3/6 and noise at 15/18 in every one:**

| Variant | Retrieval | Noise | Codebook |
|---|---|---|---|
| v1.33.3 baseline (metadata only) | 3/6 | 15/18 | 66 KB |
| + content terms, 40/file | 3/6 | 15/18 | 133 KB |
| + content terms, 100/file | 3/6 | 15/18 | 214 KB |
| + content terms, 200/file | 3/6 | 15/18 | 317 KB |
| + terms scaled by file length | 3/6 | 15/18 | 135 KB |
| + identifier splitting + BM25 saturated tf + df>1 filter | 3/6 | 15/18 | 132 KB |

It did improve rank *within* the top 3 — `src/dashboard.js` 2nd→1st, `src/workspace-intelligence.js` 3rd→1st — but no metric this project holds itself to measures that, and 2x–5x the codebook for an unmeasured effect is the same trade v1.33.3 refused for IDF.

**Why it failed is the part worth keeping.** Choosing which terms to *store* by tf·idf is the wrong objective. idf exists to score a query term, and it rewards terms unique to one file — so a 2,800-line file's stored vocabulary filled up with one-off compound identifiers (`this._minifyreplace`, `addmatches`, `this.dynamiccounter`), each df=1 and therefore maximal idf. Nobody queries those. The words a person actually types — "privacy", "decay" — appear in a handful of files, score lower, and never made the list. Filtering df=1 didn't rescue it, because the committed `.cjs` build artifacts duplicate the sources and inflate df for every identifier in them.

That points at the real blocker, upstream of scoring: **the index treats generated bundles as peers of their sources.** They compete for slots, split the term statistics, and appear as noise in every result above. Excluding build outputs is the prerequisite; retrying content indexing before that means retrying it against corrupted statistics. Tracked in `ROADMAP.md`.

---

## v1.33.3 — The Router's Memory Was Feeding On Itself

> **Corrected in v1.33.5.** The figures below do not reproduce: they were taken on a working tree where the file under edit — the target of one query — received the +3 git-dirty ranking boost. The real delta is **1/6 → 2/6**, and the claim that both halves are load-bearing is wrong; either alone achieves the full effect. The diagnosis is unchanged and independently reproduced. Read v1.33.5 for the corrected numbers and `npm run measure:routing` for the command that produces them.

Retrieval against six ground-truth queries: ~~**0/6 → 3/6**, noise **18/18 → 15/18**~~ — see the correction above.

### The Bug
v1.23.0 gave files a boost for having been selected before, and documented the intent that this "can outrank a cold keyword match". The intent is defensible in isolation. It is not defensible *here*, because of what sits on either side of it:

- `routeAndCompress()` records usage for **everything it selects**.
- **Nothing** records whether the selection was any good.

So the boost is computed from the router's own past output, with no correctness signal anywhere in the loop. A file selected often keeps being selected because it was selected often. Measured on this repository, `examples/test-dashboard.tsx` reached usage count **318** and won the query `"dashboard escapeHtml crashes on a number"` on a single generic path match — beating `src/dashboard.js`, which matched the rare term. `USAGE_COUNT_CAP` was 10 while one query-term match is worth 4, so usage did not merely break ties; it outvoted relevance two-and-a-half to one.

### The Fix
Usage now **breaks ties among files that already matched, and cannot manufacture a match**:

- **Gate** — a file matching nothing in the query earns no usage boost at all.
- **Cap** — `USAGE_COUNT_CAP` 10 → 3, below the 4 points one term match earns, so usage can reorder within a relevance tier but never jump one.

~~Both halves are load-bearing, which is worth stating because the gate alone looks sufficient: with the gate in place but the cap left at 10, retrieval is **2/6**, not 3/6.~~ **Retracted in v1.33.5** — that comparison was contaminated by the git-dirty boost. Measured cleanly, either half alone achieves the full effect and the two are redundant. Both are kept, on a design argument rather than a measured one.

### Verification
Both mutations are caught by `test/adaptive-workspace-memory.js`: removing the gate fails the new tie test, restoring the cap to 10 fails the new cap test. The baseline was re-measured by stashing the change and re-running the same harness — 0/6, confirming the improvement is this change and not measurement drift. 30 suites green; cache-prefix stability and the three-provider comprehension checks unaffected.

### Dropped, Not Shipped
**IDF term weighting** was implemented alongside this and removed. Weighting rare query terms above common ones sounds obviously correct; measured, it changed nothing — retrieval 3/6 and noise 15/18 with and without it — and mutating it to a flat weight broke no test. Shipping it would have added a document-frequency pass over every candidate file per query in exchange for no measured benefit. It is recorded in `ROADMAP.md` as refuted so it is not retried.

### Two Corrections To The Previous Iteration
- The earlier report of this work said the cap-and-gate approach reached only **1/6**. That number was wrong: it came from a run whose IDF divisor was `log(corpusSize)`, which is `0` for a single-file corpus and turned every score into `NaN`. With that guarded, the same approach reaches 3/6.
- Two of the six ground-truth queries expected `src/privacy.js` and `src/glyph-middleware.js`. Neither is where that code lives — the patterns and the decay zones are both in `vscode-ext/glyph-middleware.js`, and `src/glyph-middleware.js` is a 16-line shim. Those two were harness errors, not router failures, and are corrected in the numbers above.

### Still Open
The three remaining misses fail the same way: **the test file outranks the source file**. Scoring reads `path + owner + symbols + imports` and never the file's content, which systematically favours the file *named* after a topic over the file that *implements* it. That needs content indexing (BM25 over file text), tracked in `ROADMAP.md`.

---

## v1.33.2 — Cross-Session Determinism (and a Misattribution Corrected)

Closes the cache-first thread with no new mechanism: the property was already there, undocumented and untested. Getting to it required correcting a wrong conclusion first.

### The Property
A provider cache keys on bytes, so a compressed body is reusable across sessions only if identical input yields identical output. **By default it does not.** `§N` indices are handed out in session learning order, so the same file emits `const §1 = 'raw'` from a fresh compressor and `const §36 = 'raw'` from one that had already handled other content — different bytes, identical input, no cache hit ever.

Setting **`workspacePath`** fixes it. The cross-session dictionary cache (v1.13.0) persists the assignments and reloads them, so learning order stops mattering. Measured across all four combinations:

| team codebook | `workspacePath` | deterministic |
|---|---|---|
| no | no | **no** |
| no | **yes** | **yes** |
| yes | no | **no** |
| yes | yes | yes |

### The Correction
The first measurement here concluded that the **team codebook** provided this, and that conclusion was stated before it was isolated. It was wrong: that test passed `workspacePath` in the team-codebook case too, so the cache was doing the work and the registry took the credit. The four-way matrix above shows the registry makes no difference to determinism on its own — it is loaded *from* `workspacePath`, and its actual job is cross-machine agreement, a different property. Recording this because the wrong version was asserted out loud first.

### Tests & Verification
- New test in `test/team-codebook.js` asserting byte-identical output across differently-warmed sessions **with** `workspacePath`, plus a control asserting the divergence still happens **without** it — otherwise the first assertion would pass for reasons unrelated to the mechanism it names.
- Verified it fails when `_loadCache()` is disabled, with the rebuild step v1.33.1's notes flagged as mandatory for bundled modules.
- **Complete Suite Validation**: 30 suites, all passing.

### Priority Closed
This was the last of four compression-performance directions measured in this pass. Two produced shipped gains (differential transmission, −72%; the stale router index), one was refuted (tool schemas: 4.3k tokens and already 9.4% compressed, not the 5–15k untouched surface assumed), and this one turned out to need documentation and a regression guard rather than code.

***

## v1.33.1 — The Context Router Ran Against a Stale File Index

**A file added since the last `glyph-compress inspect` could never be routed, and the router reported a confident scored list regardless.**

### The Bug
`selectRelevantFiles()` took `loadWorkspaceCodebook()` as-is whenever a persisted codebook existed — it only ever built one when none was found. So routing ran against whatever snapshot the last `inspect` left behind, forever. Measured on this repository: the persisted codebook was dated 2026-07-19 and listed **119 files where a rebuild finds 136**. Seventeen files were invisible to routing, including `src/anthropic-bridge.js` and most of the test suites added since. A file the codebook never learned about cannot be selected, and nothing in the output says so.

Fixed by seeding a rebuild with the cached copy instead of trusting it. The incremental path (v1.23.0) already reuses every unchanged file's parsed symbols by mtime and only rescans what changed, while still walking the tree so new files are discovered. **Measured cost: none** — 337ms vs 346ms per routing call, within noise, because the directory walk was already happening on the fallback path.

### Measured, Not Fixed: Routing Relevance Is Poor
Chasing the above turned up something larger that this release does **not** fix, reported rather than left implicit. Against six queries with unambiguous ground truth (`"why is the anthropic proxy dropping the system prompt"` → `src/anthropic-bridge.js`, and five like it), the router retrieved the right file **0 out of 6 times**, before *and* after the staleness fix. Two causes, both real:

- **Relevance never looks at file content.** The haystack is `path + owner + symbols + imports` only. `src/dashboard.js` scores 8 and ranks 4th for `"dashboard escapeHtml crashes"` because `escapeHtml` lives inside a template string and is never extracted as a symbol — while `examples/test-dashboard.tsx` scores 14 on path matches alone.
- **The usage boost is a feedback loop on its own output.** `routeAndCompress()` records usage for every file it selects, and `usageBoost()` then ranks those files higher next time. With no correctness signal anywhere, a bad selection reinforces itself.

Fixing that means content indexing and a scoring redesign — a real piece of work, not a patch, and doing it badly inside this release would be worse than saying so. Tracked in ROADMAP.md.

### Tests & Verification
- New `test/context-router.js` case: a file created after the codebook was persisted must still be reachable. Verified it fails without the fix (`selected: alpha.js` — the new file invisible).
- **A methodology note worth recording:** that revert-check initially *passed* with the fix reverted, which would have shipped an untested guard. `src/glyph-middleware.js` is a shim that `require()`s the built `vscode-ext/glyph-middleware.cjs`, into which esbuild **bundles** `src/workspace-intelligence.js` — so editing the source changes nothing until `npm run build:middleware` runs. The revert was never reaching the executed code. Any revert-check touching a bundled module must rebuild between the revert and the test run.
- **Complete Suite Validation**: 30 suites, all passing.

***

## v1.33.0 — Differential Transmission (72% on Repeated Context)

**The largest measured saving this project has shipped, and it comes from not sending things twice rather than from compressing them harder.**

### The Observation
IDEs re-attach open-file context on every turn, so the same file arrives unchanged turn after turn. Measured on a 5-turn thread re-sending `src/token-estimator.js`, real `js-tiktoken` tokens:

```
per-turn emitted: 1635 | 1635 | 1592 | 1592 | 1592
```

Full weight every time. Nothing in the compressor noticed it had already sent that content. The duplication is *within a single request* the model reads as a whole, so every copy after the first is redundant with one the model can already see.

### The Result

| level | before | after | reduction |
|---|---:|---:|---:|
| `standard` | 10,515 | 2,909 | **−72.4%** |
| `aggressive` | 6,413 | 2,058 | **−67.9%** |

For comparison, prompt caching recovers 67% of the same repetition — these compose rather than compete, because elision reduces what needs caching in the first place.

### Direction Is the Design, Not a Detail
Attentional Decay compacts **old** turns. A marker pointing backwards would dangle the moment its referent decayed, handing the model a pointer to nothing — the silent-failure class of the `◈₍1₎` collision fixed in v1.32.6. So the newest copy is kept intact and the *older* ones are elided: if decay later compacts those turns, they held only a marker anyway. Verified: with `attentionalDecay: true` the payload is unchanged (2,946 vs 2,942 before this release's marker fix).

### Two Design Corrections Found by Measuring, Not by Testing Afterwards
- **The marker is plain text, not a glyph.** A new glyph would need a codebook entry, and a glyph emitted without one is exactly the drift v1.32.9 fixed one release ago.
- **The marker is excluded from the dynamic dictionary.** Left in, it repeats once per elided turn, its words clear the `freq >= 2` bar, and the instruction dissolves into `[§40 §41 later in this §34 — see the §60 copy]` — decodable in principle, a four-glyph lookup chain in practice, for a sentence the model must act on. Elision markers are metadata addressed to the model, the same category as the privacy placeholders `_buildDynamicDictionary` already skips. Excluding it also *lowered* the payload, 2,942 → 2,909.

### A Test Assumption This Invalidated
`attentional decay measurably beats no decay` asserted a ratio below 0.5 and started failing. Not a decay regression — both sides improved (1159→833 with decay, 3368→1276 without). Its fixture repeated one identical snippet per turn, so decay's cold-zone summarization was partly just deduplicating, work elision now does earlier. Fixed by giving each turn *distinct* content so the test isolates decay, and re-grounding the threshold on measurement: **0.53 with decay working, exactly 1.00 with it disabled**, so 0.7 sits clear of both. The old 0.5 was calibrated against a confound.

### Tests & Verification
- Four new tests: the file survives exactly once, the survivor is the newest turn, elision holds under decay, and a non-repeated block is never touched.
- Verified they fail with elision disabled.
- `npm run benchmark:alternatives` unchanged (+0/+0/+1/+1) — expected, it measures single-file compression, not multi-turn repetition.
- **Complete Suite Validation**: 30 suites, all passing.

### Known Flake, Reported Rather Than Buried
One full-suite run in eight crashed in `test/proxy.js` with Windows `status: 3221226505` (`0xC0000409`, STATUS_STACK_BUFFER_OVERRUN) immediately after a server bind — a process-level crash, not a failed assertion. The suite passes 3/3 standalone, and the committed v1.32.9 baseline passed 8/8 in an isolated worktree. This release's change is pure string manipulation in JS and touches no networking, so it is very unlikely to be the cause, but 1/8 against 0/8 is too small a sample to *prove* that. Recorded here rather than dismissed; worth watching in CI.

***

## v1.32.9 — The Legacy Engine Emitted Undocumented Glyphs (Again)

**The `Compressor`/`Codebook` pair exported from the package root sent the model glyphs it was never given a definition for — including the `₍N₎` file-reference notation itself.**

### The Bug
- `src/index.js` exports `Compressor` and `Codebook`, so `src/compressor.js` is public API, not demo-only code. `test/codebook-completeness.js` — the suite that exists specifically to catch "emitted glyph absent from the shipped codebook" — only ever checked the main engine.
- Measured across the legacy engine's public surface: **6 distinct glyphs reached the model undefined** — `⺌` (fix), `⺎` (review/explain), `⺏` (deploy), `ℹ` (info), `⏱` (from `ETIMEDOUT`), and the `₍` `₎` subscript delimiters. The last is the worst: `◈₍1₎` is the single most load-bearing construct in the output, and a model never told what the subscripts mean cannot resolve a reference at all.
- Root cause is three drifts in one 30-line function, all of the same shape:
  - The `SYM:` line was a **hand-written string listing 9 of `STRUCTURE_GLYPHS`' 21 entries**, leaving `📄 📁 ~ ℹ 💡 ≡ ⟨⟩ 𝒾 ⟳` undefined — sitting directly beneath a comment explaining that exactly this drift had already been fixed once for `TECH_GLYPHS` in v1.16.0.
  - `ERROR_CODES` was imported and never rendered, so composite diagnostic glyphs (`⏱timeout`, `○denied`) were undocumented.
  - The `₍N₎` notation was only ever implied via `getFileIndexHeader()`, and only when a file happened to already be indexed.

### The Fix
- `SYM:` is now generated from `STRUCTURE_GLYPHS`, the same way `TECH:` is generated from `TECH_GLYPHS` — the hand-maintained-list-beside-a-table pattern is what drifted, so it is gone rather than extended.
- New `ERR:` line renders the distinct `ERROR_CODES` glyphs, `PAT:` documents the `PROMPT_PATTERNS` action glyphs, and `FILE:` states the `◈₍N₎` / `:L` / `~` notation unconditionally.
- Prompt grows 776 → 1083 characters. That cost is paid once per conversation; a reference the model cannot decode costs the whole payload.

### Tests & Verification
- `test/codebook-completeness.js` extended to the legacy engine (now 62): every non-ASCII glyph produced across its public surface must appear in the prompt it ships, and every `STRUCTURE_GLYPHS` value must be covered — asserted against the source-of-truth table rather than one sampled payload, since the sampling is precisely what let a subset drift.
- Verified both fail against the original hand-written line, naming the exact missing glyphs.
- **Complete Suite Validation**: 30 suites, all passing.

***

## v1.32.8 — Compression Level Was Never Validated (Silent Degradation)

**`--level Ultra` — a single capital letter — silently cost 4.7 percentage points of real compression, and every diagnostic reported the level as applied.**

### The Bug
- `provider` and `trustPolicy` have always *resolved* their input and reported the resolved value: an unknown provider becomes `raw`, an unknown policy becomes `reversible`, and `--explain` shows you that. `level` did neither — it was stored verbatim, straight from `options.level`.
- Every level check in the compressor is an exact string comparison (`this.level === 'ultra'`). `'Ultra'` matches none of them, so the payload silently degrades to light-level output. Measured on this repository's own `src/compressor.js` with real `js-tiktoken`: **`'ultra'` saves 11.0%, `'Ultra'` saves 6.3%**. The derived trust policy degrades with it (`lossy` → `reversible`), compounding the loss.
- The reporting is what makes it a trap rather than an inconvenience: `sourceMap.level`, `stats.selectedLevel`, and the CLI's `--explain` all echo the invalid string back. `--level ULTRAA` printed `Level: ULTRAA` and `Mode: Custom compression level.` — inventing a category that does not exist, for a value that did nothing.
- Same class as v1.32.0-v1.32.2 (a level selected but not applied, while the stats claim otherwise), reached from the opposite direction: there the level was valid and the policy blocked it; here the level never existed.

### The Fix
- `normalizeCompressionLevel()` trims and lowercases, preserves `'auto'`, and resolves anything unrecognized to the documented default — then stores the **resolved** value, so the diagnostics stop lying. Applied at both assignment sites: the constructor and `_applyEffectiveLevel()` (which also receives levels from `_resolveBaseLevel` and `compressToBudget`'s caller-supplied ladder).
- Deliberately resolve-and-report rather than throw, matching the existing `normalizeProvider` convention — a library that starts throwing on input it used to accept is a breaking change, and the honest reporting is what actually fixes the trap.
- The **CLI** does reject: an unrecognized `--level` now exits 1 with the valid list, because at the command line a value matching nothing is a typo, not a programmatic choice.

### Tests & Verification
- Three new tests in `test/context-budget-planner.js` (now 22): case/whitespace variants must produce byte-identical output and the same derived trust policy as the canonical level; an unknown level must resolve to the default *and report it*; and `'auto'` must survive normalization (a regression guard — over-normalizing would collapse `'auto'` into `'standard'` and silently disable per-content selection entirely).
- Verified they fail with normalization removed.
- **Complete Suite Validation**: 30 suites, all passing.

***

## v1.32.7 — Cache-Stability Coverage for Dictionary Growth

Tests only; no runtime behavior changed. Came out of an architectural review that produced a specific bug hypothesis — and then refuted it.

### The Hypothesis, and Why It Was Wrong
- The dynamic dictionary assigns `§N` indices in **session learning order**, so the claim was that a session which learns new vocabulary mid-conversation would emit a different codebook each turn and silently invalidate the provider's cached prefix on every turn.
- Measured directly: turn 1 emits the smaller filtered header (by design — there is no prior turn to cache against), turn 2 upgrades to the full unconditional codebook, and from there the cacheable block stays **byte-identical even as the dictionary grows from 47 to 80 entries**. v1.25.0's fix is complete, not the partial patch the review assumed. The growth lands entirely in the `DYN:` line, which lives outside the cacheable block exactly as designed.

### The Real Finding: That Invariant Was Untested
- `test/cache-prefix-stability.js` had nine tests and **none of them grew the dictionary**. The closest one varies *content* between turns, which a session starting on a large payload never exercises — the dictionary saturates on turn 1, so growth never happens. The mechanism the whole v1.25.0 release exists for had no direct coverage.
- New test drives a session from a small payload (few entries) into a large one, asserting the dictionary genuinely grew between the two compared turns before comparing their cacheable blocks.

### A Weak Test, Caught Before Shipping
- The first version of that test passed against a mutation that disabled the cache-stable codebook entirely. Not vacuous — it really did compare two codebook blocks — but the chosen payloads produced coincidentally identical filtered headers, so it could not distinguish stable-by-design from stable-by-luck.
- Strengthened to a three-part invariant: the block must be delimited (so the slicing compares something), the `DYN:` line must **differ** between turns (proving the new vocabulary reached the payload at all), and only then must the cacheable block match. It now fails correctly when the `DYN:` line is moved back inside the cacheable block, naming the dictionary growth in the failure message.

### Tests & Verification
- **Complete Suite Validation**: 30 suites, all passing; `npm run check` clean.

***

## v1.32.6 — Warm-Start File Ref Collision Guard

Closes the last surviving mutation from the audit that produced v1.32.3-v1.32.5.

- `_loadCache()` restores both `dynamicCounter` and `fileCounter` on a warm start, but only `dynamicCounter` was asserted. Removing the `fileCounter` restore left all 30 suites green.
- The consequence is not cosmetic. Reproduced directly: session one indexes `src/alpha.ts` → `◇₍1₎` and `src/beta.ts` → `◇₍2₎`; session two warm-starts, and `src/gamma.ts` is assigned **`◇₍1₎`** — an index already bound to a different path. The model then decodes that reference to the wrong file, and nothing about the output looks malformed.
- Guarded behaviourally (no duplicate refs across a warm start) rather than by asserting the counter value, because the collision is the thing that matters — a future refactor could keep the counter correct by other means and should not fail, while any path that reintroduces a duplicate reference must.

### Audit Summary (v1.32.3 → v1.32.6)
Four releases from one deliberate pause on features. Across ~24 mutations in four rounds:
- **Real defects fixed**: native Anthropic clients losing their system prompt and all tools (v1.32.5, critical); `escapeHtml()` throwing on the numeric fields its own render loop passes, silently freezing the dashboard; the dashboard history path interpolating unescaped (latent, not exploitable); this warm-start collision.
- **Coverage gaps closed**: 6 of 9 privacy redaction patterns, `inferProviderFromTarget()` (zero coverage despite gating every provider-specific decision), the proxy's error-body redaction call site, `src/dashboard.js` (755 lines, zero tests).
- **Falsely-passing tests found and fixed**: three — `gitDiffOnly` passing with the filter fully disabled, the placeholder-leak test using inputs the economics filter rejected anyway, and an escalation guard written earlier in the same session.
- **Confirmed already solid**: the Anthropic bridge's OpenAI path, team codebook ordering, cache workspace keying, extension command registration, holographic folding, intent diffs, decay — all mutations caught.
- One survivor was analysed and proved an **equivalent mutation** (the `freq >= 2` dictionary filter is redundant, since the savings formula already excludes single-occurrence words) and documented as such rather than papered over with a test that could not fail.

***

## v1.32.5 — Native Anthropic Clients (Critical Fix)

**Pointing a native Anthropic client at the GlyphProxy silently destroyed its request.** Found while answering a direct user question — "how do I use this in my Claude Code session?" — rather than by the mutation sweep, which had not thought to ask what happens when the client is not OpenAI-shaped.

### The Bug
- v1.24.0 fixed the mirror-image problem: the proxy forwarding an OpenAI-shaped request unmodified to `api.anthropic.com`. Its fix rests on a premise stated explicitly in the code — *"every documented IDE integration sends OpenAI-shaped chat/completions requests regardless of the upstream target"* — which is true for Cursor, Cline, and Continue, all of which use "OpenAI Compatible" mode.
- That premise does not hold for a **native** Anthropic client: Claude Code, Claude Desktop, or the Anthropic SDK pointed at the proxy via `ANTHROPIC_BASE_URL`. Those already speak the Messages API.
- Running the OpenAI→Anthropic translator over an already-native body rebuilds it from a field allowlist. Measured on a real Claude Code-shaped payload: the top-level **`system` prompt was dropped** (native clients put it at the top level, not in `messages`, so the translator found nothing to lift) and the **entire `tools` array was lost** (`mapOpenAITools` looks for OpenAI's nested `function` object and finds Anthropic's `input_schema` instead). `tool_choice`, `metadata`, and `thinking` were dropped too.
- For an agentic client this is the worst kind of failure: stripped of every tool and its system prompt, it still receives a valid `200`, so nothing surfaces as an error — the assistant just quietly becomes incapable.

### The Fix
- `isNativeAnthropicRequest()` detects the native shape using signals OpenAI's chat/completions body cannot produce: a top-level `system` field, or tools declared with `input_schema` rather than a nested `function`.
- `compressNativeAnthropicRequest()` compresses such a request **in place**, spreading the original body and replacing only `system` and `messages`. Deliberately not an allowlist rebuild — that is precisely what caused the bug, and a native client may send fields this bridge has never heard of, including ones the API gains later.
- The OpenAI translation path is untouched for the shape it was written for.

### Tests & Verification
- Seven new tests in `test/anthropic-bridge.js` (now 25): detection in both directions including explicit false-positive guards (a false positive would skip a translation an OpenAI request genuinely needs, reintroducing the v1.24.0 corruption), preservation of `system`/`tools`/`tool_choice`/`metadata`/`thinking`/`max_tokens`, and a control asserting the OpenAI path still behaves exactly as before.
- Verified the new tests fail when detection is disabled.
- **Complete Suite Validation**: 30 suites, all passing.

### Practical Note
Using the transparent proxy with Claude Code also requires the client to be started against it (`ANTHROPIC_BASE_URL`), which no running session can adopt retroactively. The MCP server (`claude mcp add glyph-compress -- npx glyph-compress-mcp`) remains the tool-based route, and does not transparently compress a conversation.

***

## v1.32.4 — Proxy & Dashboard Coverage (mutation testing, round two)

Continued the audit into the two highest-risk untested files: `src/proxy.js` (handles real provider API keys) and `src/dashboard.js` (755 lines, the largest completely untested file in the repo). Seven mutations; three survived, and one previously "passing" test turned out to prove nothing.

### `inferProviderFromTarget()` Had No Coverage At All
- This function turns the proxy's default `provider: 'auto'` into a concrete provider, and every provider-specific decision depends on it: measured tokenizer gating (v1.17.0/v1.21.0/v1.26.0/v1.28.0), the Anthropic `cache_control` strategy, and the net-negative fallback. Breaking Anthropic detection left the suite green — an Anthropic target would silently be compressed with OpenAI's calibration.
- New `test/proxy-provider-inference.js` covers every documented target plus realistic variants (trailing slash, `/v1` suffix, mixed case), asserts the function genuinely discriminates rather than returning a constant, and pins the unknown-target fallback: it must never be `raw`, which deliberately skips both the fallback and the measured-loss gating and would make an unrecognised upstream the *least* safe configuration.

### The Proxy's Error-Body Redaction Was Unverified
- Provider error responses routinely echo request context back, which is why v1.19.0's logger refactor exists. `test/logger.js` covers `redactForLog()` itself, but nothing checked that the proxy still *calls* it at that site — swapping it for a bare `String()` survived the whole suite. Now guarded, along with a check that no bare `console.*` call bypasses the structured logger.

### A Test That Proved Nothing
- `context-router.js`'s `gitDiffOnly` test passed with the filter **completely disabled**. Its fixture's only unchanged file scored zero on the query, and workspace intelligence already boosts git-dirty files during ranking — so the filter made no observable difference. Added a committed, unmodified decoy that *wins* on relevance and must still be excluded, plus a control asserting the decoy IS selected without the flag. The assertion now discriminates; verified it fails when the filter is disabled.

### Two Real Defects in the Dashboard
- `escapeHtml()` called `.replace()` directly on its argument, but the render loop passes numbers and possibly-absent fields. Because that loop sits inside a `try/catch`, the resulting `TypeError` would not surface — the dashboard would simply stop updating, silently. It now coerces.
- The **logs** render path escaped its data; the **history** path interpolated six fields raw. Stated precisely: those fields are all internally generated (counters, formatted numbers, closed enums), so this was **latent risk and an undocumented inconsistency, not an exploitable XSS**. Fixed as defence in depth rather than reported as a vulnerability.
- New `test/dashboard.js` extracts and evaluates the real `escapeHtml` from the template (so it cannot drift from what the browser runs), checks ampersand-first ordering, and asserts *both* render paths escape every interpolation.

### Tests & Verification
- Every mutation re-run after the fixes; all three survivors are now caught. One mutation was mislabelled on inspection — it broke provider inference rather than the Anthropic bridge it claimed to disable — and is reported here as what it actually was.
- **Complete Suite Validation**: 30 suites, all passing. No compressor behavior changed; the only runtime edits are in the dashboard template.

***

## v1.32.3 — Privacy Redaction Coverage (found by mutation testing)

A deliberate pause on features to audit the test suite instead, by mutation testing: introduce a realistic bug, run `npm test`, and see whether anything catches it. A mutation that survives means the tests covering that behavior are weaker than their names suggest — a failure mode this project has hit twice before (`cache-prefix-stability` in v1.25.0, and a guard written earlier in this same session).

### The Gap: 6 of 9 Redaction Patterns Were Untested
- `PRIVACY_REDACTION_PATTERNS` defines nine kinds of secret the privacy firewall strips before a payload reaches a provider. Exactly **three** had coverage (`secret_assignment`, `email`, `ipv4`), all via a single combined assertion in `test/integration.js`.
- Disabling **OpenAI key**, **GitHub token**, **AWS access key**, **JWT**, or **Bearer token** redaction entirely left the whole suite green — while `README.md`/`PRIVACY.md` advertise all of them. A regression in any of those would have shipped silently and sent a real credential to a third-party model in plaintext.
- `test/logger.js` was actively misleading here: it *does* test AWS keys and bearer tokens, but against `redactForLog()` — the log-sink redactor, a separate code path from payload redaction. Its presence made the area look covered.

### New `test/privacy-redaction.js` (14 tests)
- One test per pattern kind, so a regression names the exact credential type that started leaking rather than failing one shared assertion.
- A check that no raw secret appears anywhere in the **source map** — redacting the payload but recording the secret in an audit trail that gets written to disk and returned to CLI/MCP callers would just relocate the leak.
- A guard that redaction stays **opt-in**.
- A data-driven guard that parses `PRIVACY_REDACTION_PATTERNS` from the source: adding a tenth pattern without a sample now fails the suite. Its absence is precisely why six kinds went uncovered.

### Also Covered: Dynamic Dictionary Economics
- The v1.16.0 fix requiring a word to repeat before earning a `§N` entry — the change that moved this project's headline benchmark from a reported 25% to an honest 22% — had no direct test.
- Worth stating precisely rather than overclaiming: the explicit `freq >= 2` filter turns out to be **defensive redundancy, not the load-bearing mechanism**. The savings formula yields exactly `-4` for any single-occurrence word regardless of length, so the `save` threshold already excludes it. Mutating `freq >= 2` to `freq >= 1` is therefore an *equivalent mutation* that no test can catch, because behavior does not change. The new tests lock the observable contract instead of either filter.

### One Real Bug in the New Tests, Caught Before Shipping
- The first version of the placeholder-leak test used four *different* email addresses, each producing a placeholder seen once — which the economics filter rejects anyway, so it never exercised the guard it claimed to test. It passed with the guard fully removed. Rewritten to repeat a single address (producing `EMAIL_1` six times, economically attractive), it now fails correctly when the guard is removed. Same class of falsely-passing test this release set out to hunt.

### Tests & Verification
- Every mutation re-run after the fix: the five privacy mutations are now caught by `privacy-redaction.js`; the two survivors were analysed and one proved equivalent (documented above) rather than papered over.
- **Complete Suite Validation**: 28 suites, all passing. No runtime behavior changed in this release — tests only.

***

## v1.32.2 — Attentional Decay Fix (third and final site of the trust-coupling bug)

Chasing v1.32.1's fix through the remaining `this.level =` assignments found the third and last site of the same root cause — this one hitting the **default configuration**, and hiding a genuinely wrong compression level behind it.

### Decay Was Silently Disabled at the Default Level
- Attentional Decay Compaction explicitly forces `ultra` for older turns, then restores. Like the two sites before it, it did so without re-deriving the trust policy — so at the default `level: 'standard'` (→ `reversible`) the forced level was vetoed and decay barely did anything. Measured on an 8-turn thread over this repository's own `src/compressor.js`: **2141 tokens with the veto, 408 without**.
- ADC's whole purpose is stopping chat history from exploding on long conversations. End-to-end, it now reduces that thread by **66%** instead of ~36%.

### A Wrong Level the Bug Was Hiding
- With the veto lifted, `test/unit.js` immediately failed: the **warm zone** (`d <= 3`) forced `ultra`, which replaces code blocks with structural summaries — but both the documented decay contract ("Warm Zone: light minification") and that test require warm turns to *keep* their code, only minified. The forced level was simply wrong, and had been invisible for as long as the trust policy neutered it into a no-op.
- Corrected to `aggressive`, which minifies and strips comments while preserving the code itself. The cold zone keeps `ultra`, where removing code is the intent.
- A second, smaller consequence: the cold zone's regex fallback (rewriting surviving fences into `// [Summary: ...]`) no longer fires, because `ultra` now collapses those fences itself into its native `[ʲˢ1L]` form first. Both mechanisms satisfy the same contract — code gone, replaced by a description — so `test/unit.js`'s assertion was retargeted from the literal string `Summary` to the actual contract, rather than being weakened to pass.

### Tests & Verification
- Three new tests in `test/context-budget-planner.js` (now 19), all verified to fail against the reverted fix.
- `test/unit.js`'s decay assertions updated as described above — one now genuinely stronger (it previously passed only because the forced level was a no-op).
- **Complete Suite Validation**: 27 suites, all passing. `npm run benchmark` unchanged (1.3x / 22%) — it does not exercise decay.

***

## v1.32.1 — Chat-Path Trust Fix (the other half of v1.32.0's bug)

v1.32.0 fixed the `level: 'auto'` trust-policy coupling in `compressText()`. That fix deliberately scoped out `compressMessages()`, whose candidate-strategy machinery has its own state capture/restore. Following up on that scoping decision found the same bug live there — and considerably worse.

### The Same Root Cause, in the Main Path
- `compressMessages()` resolves `level: 'auto'` through `_resolveBaseLevel()` → `selectCompressionLevel()`, which returns `ultra` for code-heavy threads, then assigned `this.level = candidate.level` without re-deriving the trust policy. Identical to the v1.32.0 bug, but in the path the **proxy, `wrapOpenAI`/`wrapAnthropic`, and the VS Code extension** all use — i.e. essentially every real integration, not just the CLI.
- Severity measured on a realistic 4-message review thread over this repository's own `src/compressor.js`: explicit `ultra` → **325** tokens, `auto` → **4922** tokens. **A 15x difference**, versus 11.5% for the `compressText()` case fixed in v1.32.0.
- Fixed by routing the candidate loop through `_applyEffectiveLevel()`, and by capturing/restoring `trustPolicy` in `_captureCompressionState()`/`_restoreCompressionState()` — the two are coupled, so restoring the level without the policy left the compressor in a state it could never have reached on its own.
- An explicitly requested trust policy is still never escalated: `trustPolicy: 'reversible'` pinned alongside `level: 'auto'` continues to block ultra's transforms in the chat path too.

### Tests & Verification
- Two new tests in `test/context-budget-planner.js` (now 16) covering the chat path specifically, since it reaches its level through different machinery than `compressText()`.
- Both verified to fail against the reverted fix before being trusted.
- **Complete Suite Validation**: 27 suites, all passing. `npm run benchmark` unchanged (1.3x / 22%).

***

## v1.32.0 — Context Budget Planner (and a real `level: 'auto'` bug it exposed)

### Context Budget Planner
- `GlyphCompressor.compressToBudget(text, { budget })` and the standalone `planCompressionForBudget(text, { budget })` answer a question nothing in the API could before: *"I have N tokens — give me the least destructive compression that fits."* `selectCompressionLevel()` picks a level from content signals but is budget-blind; `routeAndCompress()`'s `tokenBudget` decides which *files* to send, not how hard to compress each one; `compressText()` applies one level, once.
- Escalates **lightest-first** (light → standard → aggressive → ultra) and stops at the first level that fits. It deliberately does **not** return the smallest possible output: heavier levels trade real fidelity for space, and buying space you do not need is a pure loss.
- Budgets against what is **actually transmitted** — compressed body *plus* the injected codebook. Budgeting on the body alone under-reports the real cost on exactly the short payloads where the ~400-token codebook dominates. `{ includeCodebook: false }` opts out.
- When no level fits, returns `withinBudget: false` with `overflowTokens` quantified and the smallest candidate still usable, rather than silently overflowing a budget the caller asked to be held to.
- Returns the full `trials` table (every level tried, body/codebook/total tokens, fallback state) so the choice is auditable, consistent with `routeAndCompress()`'s `selectedFiles`/`excludedFiles`.
- Discarded trials do not pollute lifetime telemetry: a single logical compression counts once, not once per level tried.
- CLI: `glyph-compress <file> --budget <tokens>`. MCP: new `compress_to_budget` tool. Because the planner — not the user — chooses the level, the CLI surfaces the chosen level's `trustWarnings`, so escalating all the way to `ultra` (which replaces a file with a structural summary) can never happen silently.

### Found While Building It: `level: 'auto'` Never Delivered What It Selected
- `_resolveTrustPolicy()` reads `this.level`, but only ever ran **once, in the constructor**. With `level: 'auto'` the constructor sees `'auto'` — neither `'aggressive'` nor `'ultra'` — and derives the conservative `reversible` policy. `compressText()` then resolves the level to `ultra` for code-heavy content, but with a trust profile that **forbids exactly the code summarization `ultra` is defined by**.
- Net effect: `auto` reported `selectedLevel: 'ultra'` while delivering standard-level output. Measured on this repository's own `src/compressor.js`: explicit `ultra` → **3913** tokens, `auto` → **4420** tokens, a silent **11.5%** loss *and* a misreported level. Shipped since `v1.16.0`.
- Fixed with `_applyEffectiveLevel()`, which re-derives the trust policy whenever the effective level changes. An **explicitly requested** policy is never touched — delegating the level choice is not permission to quietly widen what transformations are allowed. Verified: `trustPolicy: 'reversible'` pinned alongside `level: 'auto'` still blocks ultra's transforms.
- Behavior change to be aware of: `level: 'auto'` on code-heavy content now genuinely applies `ultra`, which is lossy and irreversible by design. That was always what it claimed to do; it now actually does it. Pin `trustPolicy: 'reversible'` to keep the previous conservative behavior.

### Stale Roadmap Entries Corrected
- Two `ROADMAP.md` items were still listed as missing/partial despite having shipped: structured log sinks with ISO timestamps and redaction (`src/logger.js`, delivered `v1.19.0`) and incremental/usage-decay-weighted workspace memory (delivered `v1.23.0`). Both are covered by existing suites; the roadmap simply never got updated.

### Tests & Verification
- New `test/context-budget-planner.js` (14 tests): the level/trust coupling, budget escalation, codebook accounting, overflow reporting, input validation, custom ladders, telemetry isolation, and state restoration.
- Verified the new guards actually bite by reverting the fix — **which caught a falsely-passing test**: the escalation guard originally compared `ultra` against `light`, and under the bug `ultra` collapses to exactly `standard` while `light` still differs by two tokens for unrelated reasons, so it passed with the bug fully present. Retargeted to require a real margin of `ultra` over `standard`; it now fails correctly when the fix is removed.
- **Complete Suite Validation**: 27 suites, all passing. `npm run benchmark` is unchanged (1.3x / 22%) — its fixtures construct levels explicitly and were never affected by the `auto` path.

***

## v1.31.1 — Case Study Refresh

Documentation-only release. No runtime/compressor behavior changed.

### The Problem
- `CASE_STUDY.md` dated back to v1.14.0 — stale numbers from before the token-estimator accuracy fix (v1.30.0) and the real tokenizer calibration work (v1.16.0-v1.28.0), plus hype-toned language ("straight to the bottom line!") inconsistent with the honest-reporting standard the rest of the project now holds. It was also an orphan: not linked from README or `llms.txt`, not checked by `scripts/check-links.js`, and not included in the npm package's `files` allowlist.

### The Fix
- Rewrote `CASE_STUDY.md` end to end using fresh `npm run benchmark:realistic` and `npm run benchmark:alternatives` output from this version. Structure: static file compression, vs. naive truncation, chat payloads and multi-turn cache-adjusted Anthropic estimates, enterprise nominal usage, throughput/latency — each section states plainly what it measures and what it doesn't claim, matching `docs/benchmark-methodology.md`'s tone. No fabricated dollar-ROI figures.
- Linked from the README nav row, the version-pointer paragraph, and `llms.txt`. Added to `scripts/check-links.js` (along with `CODE_OF_CONDUCT.md`, which had the same gap) and `package.json`'s `files` allowlist.
- Marked ROADMAP.md's "Publish honest case studies" and "public comparison table against alternatives" go-to-market items done; the comparison table itself shipped earlier in README (v1.30.1) but hadn't been checked off.

### Tests & Verification
- `test/metadata.js` extended to guard the existence of `CASE_STUDY.md` and `server.json` (the latter was missing this same file-existence check from v1.31.0).
- **Complete Suite Validation**: 26 suites, all passing (unchanged — no compressor behavior changed).
- **Validation**: `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run).

***

## v1.31.0 — MCP Registry Manifest

Adds `server.json` for [MCP registry](https://github.com/modelcontextprotocol/registry) auto-discovery, found while reviewing repository layout for professionalism gaps.

### The Problem
- The registry's `server.json` schema has no field to select a non-default bin when a package publishes more than one — it assumes `npx <identifier>` resolves to the right one. This package has two: `glyph-compress` (CLI) and `glyph-compress-mcp` (MCP server). A `server.json` naively pointing at the bare package identifier would make the registry invoke the CLI, not the MCP server.

### The Fix — No Second Package
- Added an `mcp` CLI subcommand: `npx glyph-compress mcp` starts the exact same stdio server as the dedicated `npx glyph-compress-mcp` bin (delegates via dynamic `import('./mcp-server.js')`), following the same recognized-subcommand pattern already used for `inspect`/`doctor`/`benchmark`/`route`/`team-codebook`.
- `server.json`'s `packages[0].packageArguments` passes the `mcp` positional argument, matching the documented pattern for packages that need a fixed argument to reach MCP mode (the same convention the registry's own NuGet example uses).
- `package.json` gained `"mcpName": "io.github.Neolambo/glyph-compress"`, matching `server.json`'s `name` field, for the registry's ownership-verification step.

### Tests & Verification
- `test/mcp-server.js` gained a real end-to-end check: `bin/cli.js mcp` spawned as a child process, driven through the official MCP SDK client, must expose the same four tools as the dedicated bin.
- `test/metadata.js` gained drift guards: `package.json.mcpName` must match `server.json.name`; `server.json`'s npm package `identifier`/`version` must match `package.json`; `server.json` must be in the npm `files` allowlist; `packageArguments` must include the `mcp` positional.
- **Complete Suite Validation**: 26 suites, all passing.
- **Validation**: `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run) — confirmed `server.json` is included in the published tarball.

***

## v1.30.1 — Documentation & Repository Layout

Documentation-only release, prompted by a repository-layout review against other mature open-source READMEs. No runtime/compressor behavior changed — `npm run benchmark` numbers are identical to v1.30.0.

### README Cleanup
- Removed the ~260-line per-version "New in vX.Y.Z" changelog archive (v0.6.0 → v1.29.0) that duplicated GitHub Releases/`RELEASE_NOTES.md`. README now keeps only the current release's entry with a pointer to full history.

### Professionalism Improvements (Gap Analysis vs. Other Mature OSS READMEs)
- Quick-nav link row under the badges (Quick Start · CLI · MCP Server · When to Use/Skip · Benchmarks · Releases · Roadmap · llms.txt · License).
- New "🧭 When to Use GlyphCompress (and When to Skip It)" section — an honest, direct statement of good-fit and weak-fit scenarios, not just best-case marketing.
- New "🆚 Compared to Alternatives" table (no compression, naive truncation, provider-side caching, LLMLingua, GlyphCompress) backed by real `npm run benchmark:alternatives` numbers.
- New "🔎 Proof: Comprehension Preserved on Real Models" table, surfacing the real Gemini/OpenAI/Anthropic comprehension-check results (v1.26.0-v1.28.0) that were previously only in `RELEASE_NOTES.md`.
- Collapsible `<details>` blocks for Advanced Features, Project Structure, and Theory — keeps the main scroll scannable while preserving depth.
- New root-level `llms.txt` for AI-agent discoverability, and `CODE_OF_CONDUCT.md` (linked from `CONTRIBUTING.md` and README, included in the npm package).

### Tests & Verification
- `test/metadata.js` extended to guard the existence of `llms.txt` and `CODE_OF_CONDUCT.md`.
- **Complete Suite Validation**: 25 suites, all passing (unchanged — no compressor behavior changed).
- **Validation**: `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run).

***

## v1.30.0 — Token Estimator Accuracy Fix

Fixes the `src/token-estimator.js` bug found while building v1.29.0's benchmark — it turned out to be two compounding issues, not one.

### Two Compounding Bugs, Both Fixed
- **An uncalibrated, double-counting Unicode penalty.** `estimateProviderTokens()` added a flat `+1.5` penalty per non-ASCII *UTF-16 code unit*, calibrated for the compressor's own rare multi-token substitution glyphs but applied to any non-ASCII character (including cheap, common prose punctuation), and double-counted every astral-plane character (surrogate pairs are 2 UTF-16 units but 1 codepoint). Fixed with codepoint-aware counting and separately calibrated penalties for BMP vs. astral-plane characters, measured live against real `js-tiktoken` output.
- **The larger issue: a base `charsPerToken` constant only accurate for code.** OpenAI's `3.8` matched real code (measured: ~3.8-3.9) but badly underestimated real tokenizer efficiency on prose (measured: ~4.2-5.3). `docs/architecture.md` has *zero* non-ASCII characters, so the Unicode bug alone couldn't explain its ~40% overestimate — the base ratio itself was wrong. Recalibrated to `4.2`, the character-weighted blended average across five real repository files.

### A Third, Structural Fix
- Even fully recalibrated, the heuristic's ORIGINAL-vs-COMPRESSED *ratio* still overstated real improvement by ~10-14% across the same five files — no flat, no-live-tokenizer heuristic can be exactly right for every content type. `compressText()`/`compressMessages()`'s net-negative fallback now requires a real 10% heuristic-measured improvement (not just any nonzero one) before trusting a compression, closing the gap a single point comparison couldn't.

### Found While Fixing This
- **A third, unrelated bug**, found while verifying the fix actually reached the built CJS output: `src/token-estimator.cjs` (which `src/index.cjs`, the root package's CJS entry point, requires directly) was never rebuilt by `scripts/build-middleware.js` at all — only the separate `vscode-ext/token-estimator.cjs` copy was. Same class of drift bug as `vscode-ext/proxy.js` and the CJS export shim found earlier in this project's history. Fixed: both copies now build from the same source every time.
- Also deduplicated two more independently-drifted hardcoded `charsPerToken` lookup tables inside `GlyphCompressor` itself, both already out of sync with the canonical values — now delegate to the single source of truth instead of maintaining their own copies.

### Real-World Effect
All three fixtures that previously showed a masked real-token regression (`README.md`, `ROADMAP.md`, `docs/architecture.md`) now correctly trigger `fallback: true`, sending the original unchanged instead of silently sending something worse. `npm run benchmark:alternatives`'s reported aggregate advantage dropped slightly — from partially reporting fake wins to a smaller, now fully honest number.

### Tests & Verification
- New `test/token-estimator-accuracy.js` (13 tests): Unicode codepoint-counting correctness, real-`js-tiktoken` cross-checks against a 30%-error ceiling (down from ~40%+ pre-fix), end-to-end checks that `GlyphCompressor` never sends real-token-worse output for the three previously-affected files, confirmation genuinely good code compressions still pass through unaffected, and a build-pipeline consistency guard.
- Verified every fix has real bite: reverted each change (the estimator/margin logic, and separately the build-pipeline fix) and confirmed the new tests fail without it, before restoring and re-verifying.
- **Complete Suite Validation**: 25 suites, all passing.
- **Validation**: `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run).

***

## v1.29.0 — Benchmark vs. Alternatives

A reproducible public benchmark comparing GlyphCompress against realistic alternatives, with open methodology.

### `npm run benchmark:alternatives`
- New `test/benchmark-alternatives.js` compares GlyphCompress against **no compression** and **naive truncation** — the two realistic alternatives available without a specialized dependency — across five real files from this repository (`README.md`, `ROADMAP.md`, `docs/architecture.md`, `src/compressor.js`, `src/workspace-intelligence.js`) at four token budgets (500/1000/2000/4000).
- Token counts use real `js-tiktoken` (`o200k_base`, GPT-4o's tokenizer), not this project's internal character-count heuristic — consistent with the real-tokenizer-over-heuristic approach `test/tokenizer-calibration.js` already established.
- Metric is deliberately narrow: at a fixed budget, what fraction of the *original* content survives? This does not claim better model answers — that requires real per-strategy LLM judging, still open under ROADMAP.md's `v1.22.0`. It does show, reproducibly, with no API key: naive truncation permanently deletes whatever doesn't fit; GlyphCompress shrinks the same information so more of it survives, when compression actually reduces real tokens for that content.
- **LLMLingua intentionally excluded**: it's a Python library, and adding it means adding a Python runtime as a benchmark dependency — a separate decision, documented plainly in `docs/benchmark-methodology.md` rather than approximated.

### Found While Building This
- **A real bug in the benchmark script's own formula**, caught before trusting its output: the "compressed text still exceeds budget" case computed `budget/compressedTokens * compressedTokens/originalTokens`, which algebraically collapses to `budget/originalTokens` — identical to plain naive truncation, silently erasing any real GlyphCompress advantage. Caught by noticing the aggregate table showed a suspicious flat "+0%" advantage at every budget instead of scaling with each file's real compression ratio. Fixed to the correct `budget/compressedTokens`.
- **A real, previously undetected bug in `src/token-estimator.js`**, found while validating the corrected numbers: `estimateProviderTokens()` adds a flat `+1.5` estimated-token penalty for every non-ASCII character, calibrated for the compressor's own rare multi-token Unicode glyphs but applied uniformly to any non-ASCII character — including cheap, common prose punctuation. This overestimates Unicode-heavy markdown badly enough (40% on `docs/architecture.md`: 746 heuristic vs. 532 real tokens) that the net-negative fallback safety net compares two inflated numbers and can miss a genuine regression — confirmed directly on this repository's own `README.md` and `ROADMAP.md`, both real-token-*larger* after compression despite `fallback: false`. Documented honestly in the benchmark's own output rather than hidden or worked around; **not yet fixed** — tracked in ROADMAP.md, since it touches the estimator every provider and compression call relies on.

### Docs
- New `docs/benchmark-methodology.md`: full methodology, what is and isn't claimed, the LLMLingua exclusion rationale, and the token-estimator finding above — with reproduction instructions (`npm run benchmark:alternatives`, no API key needed).

### Tests & Verification
- `test/benchmark-alternatives.js` is a reporting/comparison tool, not a pass/fail regression gate — deliberately excluded from `npm test`/`test/run-suites.js`, same as the existing `benchmark.js`/`benchmark-realistic.js` scripts.
- **Complete Suite Validation**: 24 suites, all passing (unchanged — no compressor behavior changed in this release).
- **Validation**: `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run).

***

## v1.28.0 — Anthropic Tokenizer Calibration & Comprehension Spot-Check

Completes real-tokenizer calibration and comprehension spot-checks across all three primary providers, using a live-provided Anthropic key.

### Real Anthropic Tokenizer Calibration
- Anthropic has no offline tokenizer library either, so this measurement required live calls to the real `/v1/messages/count_tokens` API — see `test/tokenizer-calibration-anthropic.js` (dev-only/manual, `ANTHROPIC_API_KEY=... npm run calibrate:tokenizer:anthropic`).
- Most extreme finding of the three providers: **28/28 `TECH_GLYPHS` are a net token loss, no exceptions** (OpenAI: 28/28, Gemini: 26/28), and 32/33 code-minification keyword/glyph pairs (only `#include`→`imp` wins, same as Gemini). `MEASURED_TECH_GLYPH_TOKENS_ANTHROPIC`/`MEASURED_CODE_KEYWORD_TOKENS_ANTHROPIC` now gate substitution for the `anthropic` provider, closing a gap noted since v1.17.0.
- Verified this has real bite: reverting the gating and re-running the new tests showed the previous character-based heuristic got several glyphs wrong in each direction that the real measurement catches.

### Third Real LLM Comprehension Spot-Check
- `test/comprehension-check-anthropic.js` (dev-only/manual, `ANTHROPIC_API_KEY=... npm run check:comprehension:anthropic`) sends the exact same bug-fix scenario as the Gemini/OpenAI sibling scripts to a real `claude-haiku-4-5` model.
- All four checks passed: it correctly named `calculateTotal`/`OrderProcessor` and identified the discount bug. Like OpenAI, since Anthropic's compression now barely touches identifiers, it also proposed a fix — the most complete of the three providers, correctly implementing percentage-based discount logic rather than just subtracting a flat amount.
- All three primary providers (OpenAI, Gemini, Anthropic) now have real, reproducible tokenizer calibration and comprehension evidence using directly comparable methodology and scenarios — closing out this thread of ROADMAP.md's "Real Task Evaluation" and tokenizer-calibration items. Broader/varied task scenarios and real-repository evaluation remain open.

### Tests & Verification
- `test/tech-glyph-economics.js` (87 tests) and `test/code-minify-economics.js` (24 tests) extended with Anthropic coverage, including the one measured-*winning* code keyword that should still substitute normally.
- Both new scripts are deliberately excluded from `npm test`/`test/run-suites.js` — they need a real provider API key, network access, and (for the comprehension check) real generation quota.
- **Complete Suite Validation**: 24 suites, all passing.
- **Validation**: `npm run check` (build, link validation, snapshots, tests, benchmarks, npm pack dry-run).

***

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
