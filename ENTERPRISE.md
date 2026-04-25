# Enterprise Deployment

GlyphCompress is dual licensed under AGPL-3.0 and a commercial license. Organizations that need proprietary use, private redistribution, support, or custom deployment terms should use the commercial license path.

## Recommended Controls

- Review LLM provider contracts and data handling policies before sending compressed workspace context.
- Configure `glyphCompress.targetApiUrl` to an approved endpoint when using the VS Code proxy.
- Keep `.glyphcompress/codebook.json` out of source control unless explicitly approved.
- Treat source maps as sensitive developer metadata.
- Disable automatic workspace rule updates unless your organization has approved generated IDE instructions.

## Deployment Checklist

- Pin npm and VS Code extension versions to the same release tag.
- Run `npm test`, `npm run benchmark`, and `glyph-compress doctor` in internal validation.
- Validate proxy routing in a non-production workspace before rollout.
- Document which repositories, file classes, and LLM endpoints are approved.
- Train users to exclude secrets, credentials, private keys, tokens, and regulated data from prompts.

## Support Boundaries

The stable `1.x` API covers `GlyphCompressor`, `wrapOpenAI`, `wrapAnthropic`, CLI commands, source maps, workspace codebooks, and the VS Code extension settings documented in the README.
