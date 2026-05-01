## v1.10.0

Changes since v1.9.3:

### Release Automation
- add `scripts/release-helper.js` and `npm run release:prepare`
- verify root/extension version alignment before release work starts
- run repo validation, npm publish dry-run, and VSIX packaging from one helper entrypoint
- print the exact npm publish, GitHub release, Marketplace verification, and local VSIX install commands for the active version

### Marketplace Verification
- add `--verify-marketplace` support to the release helper
- add `.github/workflows/post-release-verify.yml` so Marketplace verification can run automatically after a published GitHub release or via manual dispatch

### Release Notes Support
- add `--write-release-notes` to scaffold `RELEASE_NOTES.md` from recent commit subjects
- keep generated notes editable so the final published release notes can be curated before the GitHub release step

### Metadata and Documentation
- bump package, extension, source-map, benchmark, and workspace schema metadata to `1.10.0`
- update release documentation and roadmap status to reflect the implemented release automation foundation
