# Command Line CLI

GlyphCompress can be run directly from a terminal with `npx glyph-compress`.

## Usage

```bash
npx glyph-compress [file|command] [options]
```

## Available Commands

| Command | Purpose | Example |
|---|---|---|
| `[file]` | Compress a single file and print the compressed payload plus the shared codebook. | `npx glyph-compress src/app.ts` |
| `inspect [query]` | Build `.glyphcompress/codebook.json`, detect intent, and rank relevant workspace files. | `npx glyph-compress inspect "fix auth error"` |
| `doctor` | Check repository readiness for GlyphCompress workflows. | `npx glyph-compress doctor` |
| `benchmark` | Run the benchmark harness from the current repository. | `npx glyph-compress benchmark` |

## Options

| Option | Values | Purpose |
|---|---|---|
| `-l, --level <level>` | `light`, `standard`, `aggressive`, `ultra` | Select compression aggressiveness. |
| `-c, --copy` | flag | Copy compressed output to the system clipboard. |
| `-x, --explain` | flag | Explain what changed during compression. |
| `--source-map` | flag | Print reversible source map JSON. |
| `--privacy` | flag | Redact secrets and sensitive identifiers before compression. |
| `--provider <provider>` | `raw`, `openai`, `anthropic`, `gemini`, `local` | Select provider-aware estimates and compression profile. |
| `--trust <policy>` | `lossless`, `reversible`, `privacy`, `lossy` | Select allowed transformation policy. |
| `--policy <policy>` | same as `--trust` | Alias for `--trust`. |
| `--json` | flag | Print machine-readable JSON for supported commands. |
| `-p, --proxy [port]` | optional port | Start the Zero-Command Transparent Proxy. |
| `-h, --help` | flag | Show built-in CLI help. |

## Practical Examples

```bash
# Standard file compression
npx glyph-compress README.md

# Maximum compression for a TypeScript source file
npx glyph-compress src/app.ts --level ultra

# Provider-aware compression for OpenAI chat payloads
npx glyph-compress src/app.ts --provider openai --level standard --explain

# Anthropic/cache-stable profile with reversible source map metadata
npx glyph-compress src/app.ts --provider anthropic --trust reversible --source-map

# Exact-preservation mode
npx glyph-compress src/app.ts --trust lossless --source-map

# Privacy-first mode
npx glyph-compress .env --privacy --trust privacy --source-map

# JSON workspace inspection for automation
npx glyph-compress inspect "implement billing validation" --json

# Repository readiness check in JSON form
npx glyph-compress doctor --json

# Start the local OpenAI-compatible compression proxy
npx glyph-compress --proxy 8080
```
