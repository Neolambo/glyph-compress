# Release and Distribution

Current release: `v1.10.0`.

## Published Channels

- npm: `glyph-compress@1.10.0`
- GitHub release: `v1.10.0`
- VS Code Marketplace: `Neolambo.glyph-compress`
- VSIX asset: `glyph-compress-1.10.0.vsix`

## Verify npm

```bash
npm view glyph-compress version dist-tags --json
```

Expected latest version:

```json
{
  "version": "1.10.0",
  "dist-tags": {
    "latest": "1.10.0"
  }
}
```

## Verify GitHub Release

```bash
gh release view v1.10.0 --json tagName,isDraft,isPrerelease,assets,url
```

## Verify VS Code Marketplace

```powershell
npx @vscode/vsce show Neolambo.glyph-compress
```

Expected Marketplace version: `1.10.0` after Marketplace publish.

## Verify Local VS Code Install

```powershell
code.cmd --list-extensions --show-versions | Select-String -Pattern 'neolambo.glyph-compress'
```

Expected local extension:

```text
neolambo.glyph-compress@1.10.0
```

## Release Checklist Summary

1. Update root npm package version.
2. Update VS Code extension manifest and lockfile version.
3. Run validation: tests, benchmark, link checker, npm pack dry-run.
4. Package VSIX.
5. Commit, tag, and push.
6. Publish npm.
7. Publish GitHub release and attach VSIX.
8. Publish/update Marketplace extension.
9. Verify npm, GitHub, Marketplace, VSIX, and local install are aligned.
