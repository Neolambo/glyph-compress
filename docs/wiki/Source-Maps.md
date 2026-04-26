# Source Maps

Source maps make compressed payloads inspectable. They preserve references to files, diagnostics, dynamic dictionary entries, symbols, code blocks, provider metadata, privacy redactions, AST-like spans, and trust policies.

## CLI Usage

```bash
npx glyph-compress src/app.ts --source-map
npx glyph-compress src/app.ts --provider openai --trust reversible --source-map
npx glyph-compress .env --privacy --trust privacy --source-map
```

## Main Fields

Source maps can include:

- `version`
- `level`
- `provider`
- `profile`
- `trustPolicy`
- `trust`
- `files`
- `dynamic`
- `diagnostics`
- `codeBlocks`
- `ast`
- `privacy`
- `symbols`
- `replacements`

## Trust Metadata

`v1.8.0` added:

```json
{
  "trustPolicy": "reversible",
  "trust": {
    "policy": "reversible",
    "reversible": true,
    "redacts": false,
    "lossy": false
  }
}
```

## AST-Like Code Block Spans

`v1.6.0` added structural code block metadata for imports, exports, functions, classes, declarations, returns, packages, visibility markers, and type markers.

## Privacy Metadata

When privacy mode is enabled, source maps contain non-revealing redaction metadata such as placeholder, kind, label, span, and short hash. Raw secrets are not stored in the source map.
