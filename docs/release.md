# Release Checklist

Use this checklist for every npm, GitHub, and VS Code extension release.

## 1. Version Consistency

- Update `package.json`.
- Update `vscode-ext/package.json`.
- Update `vscode-ext/package-lock.json`.
- Update any visible benchmark or schema labels that intentionally track the release version.
- Verify versions:

```bash
node -e "const root=require('./package.json'); const ext=require('./vscode-ext/package.json'); const lock=require('./vscode-ext/package-lock.json'); if(root.version!==ext.version||root.version!==lock.version||root.version!==lock.packages[''].version) throw new Error('version mismatch'); console.log(root.version);"
```

## 2. Validation

```bash
npm test
npm run benchmark
npm pack --dry-run
npm publish --dry-run
npm run package:vscode
```

Install the VSIX locally and verify the version:

```powershell
code.cmd --install-extension vscode-ext\glyph-compress-<version>.vsix --force
code.cmd --list-extensions --show-versions | Select-String -Pattern 'neolambo.glyph-compress'
```

## 3. GitHub and npm

```bash
git add .
git commit -m "feat(release): <summary>"
git tag v<version>
git push origin master
git push origin v<version>
npm publish
```

Create the GitHub release and attach the VSIX:

```bash
gh release create v<version> vscode-ext/glyph-compress-<version>.vsix --title "GlyphCompress v<version>" --notes-file RELEASE_NOTES.md
```

## 4. Post-Release Verification

```bash
npm view glyph-compress version dist-tags --json
gh release view v<version> --json tagName,name,url,isDraft,isPrerelease,assets
git status --short
```

Confirm the README, npm version, GitHub tag, GitHub release, VSIX version, and VS Code installed version all match.
