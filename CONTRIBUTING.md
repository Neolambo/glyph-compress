# Contributing to GlyphCompress

Thanks for helping improve GlyphCompress. The project is now on the stable `1.x` line, so changes should preserve the public API unless a future major release explicitly says otherwise.

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Local Setup

```bash
npm install
npm test
npm run benchmark
npm run check
```

For the VS Code extension package:

```bash
npm run package:vscode
```

## Development Guidelines

- Keep changes focused and consistent with the existing JavaScript/ESM style.
- Preserve CommonJS and ESM parity for public exports.
- Update `src/index.d.ts` when public APIs change.
- Treat source maps, workspace codebooks, diagnostics, and file paths as potentially sensitive developer metadata.
- Add tests for CLI behavior, package exports, source maps, workspace intelligence, and documentation metadata when those areas change.

## Contribution Licensing

By submitting a contribution, you confirm that you have the right to submit it and that it may be used, modified, distributed, sublicensed, and relicensed by the project maintainer under both the AGPL-3.0-only open-source license and separate commercial license terms.

Do not submit code, documentation, datasets, benchmarks, prompts, or generated artifacts that you cannot license under these terms. Larger or company-sponsored contributions may require a separate contributor license agreement before they are merged.

## Test Expectations

Before opening a pull request, run:

```bash
npm test
npm run benchmark
npm pack --dry-run
```

If extension packaging changed, also run:

```bash
npm run package:vscode
```

## Documentation Style

- Prefer practical, reproducible commands over broad claims.
- Keep release notes tied to verified behavior.
- Link to `SECURITY.md`, `PRIVACY.md`, and `ENTERPRISE.md` when a change affects proxying, telemetry, local artifacts, or sensitive metadata.

## Release Process

See `docs/release.md` for the release checklist used by the maintainers.
