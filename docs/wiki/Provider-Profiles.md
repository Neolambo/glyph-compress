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
- Codebook-skip threshold: the ~400-token protocol header is omitted when text-level savings are below 80 tokens.
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
