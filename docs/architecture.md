# Architecture

GlyphCompress is a semantic compression layer for IDE-to-LLM context. It compresses repeated developer communication patterns, file paths, diagnostics, code blocks, and workspace metadata while preserving enough structure for coding assistants to reason about the task.

## Main Components

- `vscode-ext/glyph-middleware.js`: stable middleware API, provider wrappers, source maps, codebook prompt, and compression levels.
- `src/workspace-intelligence.js`: workspace codebook generation, intent detection, git-aware file ranking, and repository doctor checks.
- `bin/cli.js`: command-line entry point for file compression, source maps, workspace inspection, doctor checks, benchmark execution, and proxy startup.
- `test/benchmark.js`: deterministic trust and measurement benchmark across representative payloads.
- `vscode-ext/extension.js`: VS Code activation, commands, proxy integration, and local token savings UX.

## Compression Flow

1. Build a dynamic dictionary from user context.
2. Apply prompt/action and technology glyph substitutions.
3. Index file paths and diagnostics.
4. Optionally minify or summarize code blocks for `aggressive` and `ultra` levels.
5. Emit compressed text plus `sourceMap` metadata for reversible inspection.

## Workspace Intelligence Flow

1. `glyph-compress inspect` scans supported source and documentation files.
2. It writes `.glyphcompress/codebook.json` with symbols, imports, diagnostics, ownership hints, and git status.
3. Intent detection classifies common workflows such as fix, review, implement, explain, test, and optimize.
4. File ranking scores likely relevant files using query terms, symbols, diagnostics, ownership hints, and git staged/unstaged signals.

## Provider Behavior

OpenAI and Anthropic wrappers are stable public APIs. Gemini-compatible usage is supported through the proxy pathway and benchmark fixtures. Provider-specific tokenizer profiles are still planned work; current token estimates remain deterministic approximations for regression and release validation.
