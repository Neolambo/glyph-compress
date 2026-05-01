## v1.12.0 — Performance Engine Overhaul

Changes since v1.11.0:

### Token Accuracy
- correct Unicode token cost estimation with 1.5× penalty per non-ASCII glyph across all token-estimator variants
- add per-glyph breakeven checks for tech name and dynamic dictionary substitutions to prevent negative token trades
- add codebook-skip threshold: skip the ~400-token protocol header when text-level savings are below 80 tokens
- shorten codebook instruction text from "Decode using mappings below." to "Decode:" for ~3 token savings per request

### Compression Engine
- add adaptive chat strategy selection with fallback when compressed payloads are net-negative
- add whitespace normalization (collapse spaces/tabs, strip trailing, limit blank lines) before verbose phrase processing
- add multilingual verbose phrase compression for English, Italian, German, and French filler/polite patterns
- lower dynamic dictionary minimum-word-length from 4 to 3 characters and add bigram detection
- tune provider-specific `dynamicMinSavedChars` and `maxDynamicEntries` thresholds for net-positive compression across all providers
- expand file path regex to support `@scoped/package`, Windows backslashes, and 10+ new file extensions

### Anthropic Hybrid Payloads
- redesign `wrapAnthropic()` to keep first-turn payloads lightweight and switch to structured cacheable blocks only for multi-turn transcripts
- separate Anthropic stable protocol blocks from dynamic `DYN:` additions and mark the largest user block as cacheable

### Performance
- eliminate all `JSON.parse(JSON.stringify())` state-cloning calls, replacing with shallow structured clones (~70% latency reduction)
- cap source map `replacements` at 500 entries to prevent unbounded memory growth during long sessions
- cache compiled regexes for tech names, dynamic dictionary words, and file paths

### Codebase
- sync all CJS performance optimizations to the ESM middleware (`vscode-ext/glyph-middleware.js`)
- remove 31 historical `.vsix` build artifacts from the repository

### Docs
- rewrite README v1.12.0 feature list with 9 items covering all performance work
- update benchmark snapshot to 1.4× aggregate / 28% genuine savings (calibrated with Unicode penalties)
- update ROADMAP v1.12.0 section with 17 completed items
- add multilingual language support note to Contributing section

### Tests
- add Anthropic wrapper regression coverage for first-turn lightweight payloads and multi-turn structured cache blocks
- add `npm run benchmark:realistic` for real corpus, enterprise IDE, throughput, and Anthropic cache-adjusted measurements
- update integration test expectations for codebook-skip and tech glyph-skip behaviors

### Benchmark (v1.12.0)

```
Aggregate ratio:        1.4x
Aggregate saved:        28%
Context fidelity score: 100%
Edit success proxy:     100%
Hallucinated file refs: 0
```

### Validation
- `npm test` (51/51 integration, unit, metadata pass)
- `npm run benchmark`
- `npm run benchmark:realistic`
- `npm run check:links`
- `npm run package:vscode`
