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
| `route <query>` | Context Router: rank relevant workspace files and compress as many as fit inside a token budget. | `npx glyph-compress route "fix the auth bug" --budget 2000` |
| `team-codebook show` / `sync` | Team Codebook Registry: inspect or promote entries into the shared, git-committable `glyphcompress.team.json`. | `npx glyph-compress team-codebook sync` |
| `measure <file>` | Measure what a session costs **on your own file**: simulate an IDE re-attaching it every turn and report tokens sent and tokens billed, raw against compressed. | `npx glyph-compress measure src/app.ts --turns 10` |
| `mcp` | Start the MCP stdio server (same as `npx glyph-compress-mcp`). | `npx glyph-compress mcp` |

## Options

| Option | Values | Purpose |
|---|---|---|
| `-l, --level <level>` | `light`, `standard`, `aggressive`, `ultra`, `auto` | Select compression aggressiveness, or let `auto` pick per request. |
| `-c, --copy` | flag | Copy compressed output to the system clipboard. |
| `-x, --explain` | flag | Explain what changed during compression. |
| `--source-map` | flag | Print reversible source map JSON. |
| `--privacy` | flag | Redact secrets and sensitive identifiers before compression. |
| `--provider <provider>` | `raw`, `openai`, `anthropic`, `gemini`, `local` | Select provider-aware estimates and compression profile. |
| `--trust <policy>` | `lossless`, `reversible`, `privacy`, `lossy` | Select allowed transformation policy. |
| `--policy <policy>` | same as `--trust` | Alias for `--trust`. |
| `--json` | flag | Print machine-readable JSON for supported commands. |
| `-p, --proxy [port]` | optional port | Start the Zero-Command Transparent Proxy. |
| `--decay` | flag | Enable experimental Attentional Decay Compaction to progressively compress older chat history. |
| `--experimental-decay` | flag | Alias for `--decay`. |
| `--budget <tokens>` | integer | For `route`: how many tokens of file context to select. For a single file: engage the Context Budget Planner, escalating `light`→`ultra` and using the lightest level whose payload fits. |
| `--max-files <n>` | integer | Max candidate files to rank for `route`. Default: `8`. |
| `--turns <n>` | integer | Turns to simulate for `measure`. Default: `10`. Fewer than 2 is rejected — with one turn nothing has repeated yet. |
| `--git-diff-only` | flag | Restrict `route` to git staged/unstaged files ("review what I changed"). |
| `--folding` | flag | Holographic context folding for overlapping files. `--holographic-folding` is an alias. |
| `--intents` | flag | Generative intent diffs for code changes. `--intent-diffs` is an alias. |
| `--target <url>` | URL | Proxy upstream base URL. Default: `https://api.openai.com`. `--target-api-url` is an alias. |
| `--log-file <path>` | path | Append structured, redacted JSONL diagnostics from the proxy to this file. |
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
