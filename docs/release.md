# Release Checklist

Use this checklist for every npm, GitHub, and VS Code extension release.

## 0. Release Helper

Run the release helper from the repository root to automate version consistency checks, validation, VSIX packaging, and the exact follow-up commands:

```bash
npm run release:prepare
```

Useful flags:

```bash
node scripts/release-helper.js --allow-dirty
node scripts/release-helper.js --skip-check --skip-package --skip-publish-dry-run
node scripts/release-helper.js --allow-dirty --write-release-notes
node scripts/release-helper.js --verify-marketplace --skip-check --skip-package --skip-publish-dry-run
```

The helper does not publish anything by itself. It validates the repository state, optionally runs the expensive checks, packages the VSIX, can write a `RELEASE_NOTES.md` scaffold from conventional commit subjects, can verify the currently published Marketplace version on demand, and then prints the exact npm, GitHub release, and Marketplace verification commands for the current version.

## 0.1 Post-release Marketplace CI

The repository now includes `.github/workflows/post-release-verify.yml`.

- It runs automatically when a GitHub release is published.
- It can also be triggered manually with GitHub Actions `workflow_dispatch`.
- The job reuses `scripts/release-helper.js --verify-marketplace` so the release helper and CI share the same Marketplace verification logic.

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

If you already ran `npm run release:prepare`, the commands below are what the helper executed by default.

```bash
npm test
npm run benchmark
npm run benchmark:realistic
npm pack --dry-run
npm publish --dry-run
npm run package:vscode
```

Treat `npm run benchmark` as the stable regression gate and `npm run benchmark:realistic` as the release-time sanity check for repository-scale payload behavior. This matters especially for Anthropic changes, where transmitted payload savings and cache-adjusted savings can diverge.

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

Verify the Marketplace listing is visible under the published extension id:

```powershell
npx @vscode/vsce show Neolambo.glyph-compress
code.cmd --list-extensions --show-versions | Select-String -Pattern 'neolambo.glyph-compress'
```

Also verify the public listing page:

```text
https://marketplace.visualstudio.com/items?itemName=neolambo.glyph-compress
```

Confirm the README, npm version, GitHub tag, GitHub release, VSIX version, Marketplace listing, and VS Code installed version all match.
