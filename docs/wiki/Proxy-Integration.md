# Proxy Integration

GlyphCompress includes a local OpenAI-compatible proxy for tools that allow a custom API base URL.

## Start the Proxy

```bash
npx glyph-compress --proxy 8080
```

Equivalent VS Code command:

```text
GlyphCompress: Start Zero-Command Proxy
```

## Configure Your Tool

Use this base URL:

```text
http://localhost:8080/v1
```

Use your real provider API key in the client tool. The proxy forwards requests to the configured upstream provider after compression.

## Cursor

1. Open Cursor settings.
2. Go to Models.
3. Enable OpenAI-compatible or override base URL.
4. Set base URL to `http://localhost:8080/v1`.
5. Use your normal API key.

## Cline or RooCode

1. Select an OpenAI-compatible provider.
2. Set base URL to `http://localhost:8080/v1`.
3. Set your model id and API key.

## Continue.dev

```json
{
  "title": "GPT-4o (Glyph Proxy)",
  "provider": "openai",
  "model": "gpt-4o",
  "apiKey": "YOUR_REAL_API_KEY",
  "apiBase": "http://localhost:8080/v1"
}
```

## GitHub Copilot Chat

The official Copilot extension does not allow custom API URL overrides. Use the VS Code command `GlyphCompress: Ask LLM (Auto-Compress)` for Copilot workflows.

## Safety Notes

- Keep API keys in the target tool or environment.
- Use `--privacy` or `glyphCompress.trustPolicy = privacy` when content may include secrets.
- Review source maps if you need to audit what was transformed.
