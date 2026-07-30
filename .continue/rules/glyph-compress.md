# Working in the GlyphCompress repository

GlyphCompress compresses IDE↔LLM traffic. It ships as three surfaces from one codebase: a CLI (`bin/cli.js`), an MCP server (`bin/mcp-server.js`), and a VS Code extension (`vscode-ext/`), plus a local proxy that clients point their API base URL at.

## Where the code actually lives

`vscode-ext/glyph-middleware.js` is the source of truth for the compressor — not `src/glyph-middleware.js`, which is a thin ESM re-export shim. `vscode-ext/glyph-middleware.cjs` and `vscode-ext/proxy.js` are **build outputs**: edit the sources and run `npm run build:middleware`, never edit the bundles.

That file ends with a hand-written CommonJS block that reassigns `module.exports` after esbuild's own, listing its symbols by hand. **A new export added only to the ESM `export {}` line is silently dropped from the bundle the extension loads.** Add it to both.

## Verification, not assumption

This repository has a documented history of shipping things that were never checked against the thing that shipped: a published tarball that contained the extension folder instead of the library, a cost figure hardcoded to one provider's price, a proxy that failed silently, a documented Continue config that could not load.

So: confirm behaviour against the artifact, not the intention. Read the published tarball, not the working tree. Query the running process, not the config file. When a measurement and a claim disagree, the measurement wins.

## Measurement claims need their conditions attached

Compression savings depend on the shape of the conversation, not just the payload size. The large ratios come from sessions that re-attach the same fenced file every turn — `_elideRepeatedBlocks` removes byte-identical fenced blocks over 200 characters. A payload that is large but *not* repetitive has nothing to elide and measures 3–8%.

Never quote a ratio without saying which case it describes. Both numbers are real.

## Compression levels

`standard` and `aggressive` preserve answer accuracy on measured probes. `ultra` replaces code with structural summaries and, graded against live models on two providers, answered 1 of 5 questions correctly — failing by inventing plausible identifiers rather than admitting it lacks the code. Do not recommend `ultra` as a default.

## Tests and release

`npm test` runs every suite; `npm run build:middleware` first if you touched the compressor or proxy. The release version appears in eleven files including `test/fixtures/compressed-payloads.snapshot.json`, whose snapshots have no regeneration mode and must be updated by hand. Publish npm from the repository **root** — a publish from `vscode-ext/` ships the wrong package, which is what the `prepublishOnly` guard there exists to stop.
