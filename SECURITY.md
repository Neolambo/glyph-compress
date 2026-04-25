# Security Policy

## Supported Versions

GlyphCompress `1.x` is the stable supported line. Security fixes are published to npm, GitHub releases, and the VS Code extension package when applicable.

## Reporting a Vulnerability

Please report security issues privately through GitHub Security Advisories for `Neolambo/glyph-compress`, or contact the maintainer listed in the package metadata. Do not open a public issue for a suspected vulnerability.

Include:

- Affected version and installation path: npm, CLI, middleware, or VS Code extension.
- Reproduction steps or proof of concept.
- Expected impact, such as data exposure, request interception, or unsafe file writes.

## Scope

Relevant security areas include local workspace file handling, proxy configuration, prompt/context transformation, source map output, generated codebooks, and VS Code extension commands.

GlyphCompress does not intentionally collect secrets. Users should still avoid compressing credentials, private keys, tokens, or regulated data unless their LLM provider and deployment environment are approved for that data.
