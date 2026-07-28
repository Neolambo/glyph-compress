# Provider Profiles

Provider profiles tune compression choices for different LLM APIs and local workflows.

## Supported Providers

- `raw`
- `openai`
- `anthropic`
- `gemini`
- `local`

## CLI Usage

```bash
npx glyph-compress src/app.ts --provider openai --explain
npx glyph-compress src/app.ts --provider anthropic --trust reversible --source-map
npx glyph-compress src/app.ts --provider gemini --level aggressive
npx glyph-compress src/app.ts --provider local --level standard
```

## What Profiles Affect

Provider profiles can affect:

- Token estimation (including 1.5× Unicode glyph penalty since v1.12.0).
- Dynamic dictionary savings thresholds (`dynamicMinSavedChars` tuned per provider).
- Dynamic dictionary entry caps (`maxDynamicEntries` tuned per provider).
- Per-glyph breakeven checks: tech name and dictionary substitutions are individually validated to ensure net-positive token savings.
- Codebook-skip threshold: the protocol header (measured at 448 tokens) is omitted when text-level savings are below 80 tokens.
- **The dictionary codeword form** (`codewords`), chosen per provider from comprehension checks against the live APIs rather than set globally. `anthropic` uses ordinary English words, which BPE encodes in 1 token where `§N` costs 2 — a comprehension tie and 8.2% fewer input tokens. `openai`, `gemini`, `raw` and `local` stay on `§N`: measured, Anthropic scores 3-4/4 with words while Gemini manages 1-2/4 and OpenAI 4/12, both failing the same way — they resolve the reference and then answer in the compressed vocabulary. An explicit option still overrides the profile.
- **Whether the cache-stable codebook header is worth its cost**, which depends on the provider having a prefix cache at all. The full header is exempt from the per-call never-inflate rule only when there is assistant history *and* a provider that can cache it; `raw` and `local` have no cache to repay it, so they do not get the exemption.
- Source map provider metadata.
- Future provider-specific routing and trust warnings.

## Source Map Metadata

Provider-aware source maps include:

- `sourceMap.provider`
- `sourceMap.profile`
- provider/profile metadata on dynamic dictionary entries

## Library Usage

```javascript
import { GlyphCompressor, PROVIDER_COMPRESSION_PROFILES } from 'glyph-compress';

const compressor = new GlyphCompressor({
  level: 'standard',
  provider: 'openai'
});

console.log(PROVIDER_COMPRESSION_PROFILES.openai);
```
