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

- Token estimation.
- Dynamic dictionary thresholds.
- Dynamic dictionary caps.
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
