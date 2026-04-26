# Safe Compression Trust Policies

GlyphCompress v1.8.0 introduced explicit trust policies that decide which transformations are allowed.

## Policies

| Policy | Reversible | Redacts | Lossy | Intended Use |
|---|---:|---:|---:|---|
| `lossless` | yes | no | no | Preserve the input text exactly. |
| `reversible` | yes | no | no | Normal safe compression for coding workflows. |
| `privacy` | yes | yes | no | Redact secrets before compression. |
| `lossy` | no | optional | yes | Maximum compression with code summaries and redundancy stripping. |

## CLI Examples

```bash
# Preserve text while still exposing metadata
npx glyph-compress src/app.ts --trust lossless --source-map

# Safe default for most coding tasks
npx glyph-compress src/app.ts --trust reversible --source-map

# Redact secrets before compression
npx glyph-compress .env --privacy --trust privacy --source-map

# Allow aggressive/ultra summaries
npx glyph-compress src/app.ts --level ultra --trust lossy --explain
```

## Source Map Metadata

Source maps include:

- `sourceMap.trustPolicy`
- `sourceMap.trust`

This lets downstream tools inspect whether a payload was lossless, reversible, privacy-redacted, or lossy.

## Library Usage

```javascript
import { GlyphCompressor, TRUST_POLICY_PROFILES } from 'glyph-compress';

const compressor = new GlyphCompressor({
  level: 'standard',
  trustPolicy: 'reversible'
});

console.log(TRUST_POLICY_PROFILES.reversible);
```
