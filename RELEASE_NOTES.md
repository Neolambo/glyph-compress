## v1.14.0 — Attentional Decay Compaction (ADC)

Changes since v1.13.0:

### Compression & Attentional Decay Compaction
- **Attentional Decay Compaction (ADC)**: Implemented an experimental, opt-in feature (`options.attentionalDecay`) that scales chat transcripts to near-infinite context capacity at minimal token costs by progressively compacting older history.
- **Zone-Based Progressive Compaction**:
  - **Active Zone (d = 0)**: Lossless high-fidelity standard prompt compression to preserve active queries.
  - **Warm Zone (d = 1-3)**: Aggressive `ultra`-level minification (stripping comments/logs, normalizing spaces, collapsing filler phrases).
  - **Cold Zone (d = 4-6)**: Replaces raw code blocks with signature/placeholder summaries (e.g., `// [Summary: <lang> block, <N> lines]`).
  - **Deep Freeze Zone (d > 6)**: Discards code blocks entirely and condenses message text to a high-density episodic/conceptual summary (`[Radical Summary: <concept>...]`).
- **Unicode-Aware Language Extraction**: Enhanced the cold-zone regex parser to reliably match all language identifiers, including minified Unicode superscript markers (e.g. `ʲˢ`).

### VS Code Extension & CLI/Proxy Integration
- **VS Code Configuration**: Registered the `glyphCompress.experimentalDecay` configuration setting to allow users to toggle ADC natively within their IDE.
- **CLI Arguments & Flags**: Added `--decay` and `--experimental-decay` arguments to enable attentional decay directly from command line invocations.
- **Proxy Server Support**: Supported transparent progressive decay within the Zero-Command proxy forwarding logic.

### Tests & Verification
- **ADC Test Coverage**: Added comprehensive test cases in `test/unit.js` covering Active, Warm, Cold, and Deep Freeze zones.
- **Complete Suite Validation**: All 51 tests across integration, unit, metadata, CLI, proxy, extension, and workspace pass with 100% success.

***

## v1.13.0 — Cross-Session Dictionary Caching

Changes since v1.12.0:

### Compression & Caching
- **Cross-Session Dictionary Caching**: Persists `dynamicDict` and `fileIndex` on disk under `~/.glyphcompress/cache/<sha256>.json` to enable instant warm-starts.
- **Consistent Compression Keying**: Uses SHA-256 hashes of workspace paths (for VS Code extension) and working directories (for CLI/proxy) to ensure robust, isolated, project-specific caches.
- **Improved Anthropic Prompt Caching**: Prompts remain consistent across separate developer sessions, avoiding unnecessary cache invalidation and reducing input token costs.
- **Dynamic Restorations**: Restores dynamic dictionary mappings and bigram counts seamlessly on startup, ensuring compression consistency across multiple command-line invocations and extension reloads.

### Infrastructure & Compatibility
- **ESM & CJS Exporter Synchronization**: Resolved exports mismatch by exposing `PROVIDER_COMPRESSION_PROFILES` and `TRUST_POLICY_PROFILES` consistently in the CommonJS build (`vscode-ext/glyph-middleware.cjs`).
- **Build and Compilation Tooling**: Introduced an automated ESM-to-CJS compilation pipeline using `esbuild` with a post-build token-estimator path rewritings.

### Docs & Roadmaps
- **Roadmap & README Syncing**: Updated `ROADMAP.md` and `README.md` to reflect complete `v1.13.0` caching goals.
- **Wiki Synchronization**: Updated offline and online Wiki pages covering the cache directory, release procedures, and technical setup.

### Tests
- **Caching Coverage**: Added comprehensive unit tests in `test/unit.js` checking that compressor warm-starts correctly restore serialized dynamic dictionaries and file indices.
- **Suite Verification**: 51/51 tests passing across metadata, snapshots, unit, cli, workspace, proxy, and integration test suites.

### Validation
- `npm test` (51/51 integration, unit, metadata pass)
- `npm run check:links`
- `npm run build:middleware`
- `npm run package:vscode`
