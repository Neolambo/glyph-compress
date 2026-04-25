# Privacy

GlyphCompress runs locally in the CLI, library middleware, and VS Code extension. It transforms user-provided text, files, prompts, and message payloads before they are sent to the LLM provider configured by the user.

## Data Processed

Depending on how it is used, GlyphCompress may process:

- File paths and selected source files.
- Prompt text and chat message content.
- Diagnostic messages and stack traces.
- Generated source maps and `.glyphcompress/codebook.json` workspace codebooks.
- Local compression statistics, such as estimated tokens saved.

## Network Behavior

The core compressor does not send data over the network by itself. Network traffic occurs only when users wire GlyphCompress into an LLM client, run the transparent proxy, or use VS Code commands that send compressed payloads to a configured endpoint.

## Local Artifacts

`glyph-compress inspect` writes `.glyphcompress/codebook.json` in the current workspace. The repository ignores this directory by default. Treat codebooks and source maps as potentially sensitive because they can contain file paths, symbols, imports, diagnostics, and ownership hints.

## Telemetry

The project does not include third-party analytics. Local stats shown by the extension are intended for user-visible token savings only.
