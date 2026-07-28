/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — loading the optional tokenizer from a test
 *
 * `js-tiktoken` is an optional dependency, and the CI job that matters most
 * installs with `--omit=optional` because that is the path the published
 * artifacts actually run: a VSIX ships no node_modules at all. Four suites
 * import the tokenizer at module scope and would crash that job outright.
 *
 * Skipping is the obvious answer and the dangerous one. A suite that quietly
 * skips is a suite that has stopped protecting anything while still printing
 * green, which is the exact failure this project keeps finding — three
 * falsely-passing tests were fixed in a single session. So a skip here is
 * loud, is counted separately from a pass, and never reports "ok".
 */
let encoder;
let attempted = false;

export async function loadEncoder() {
  if (attempted) return encoder;
  attempted = true;
  try {
    const { encodingForModel } = await import('js-tiktoken');
    encoder = encodingForModel('gpt-4o');
  } catch {
    encoder = null;
  }
  return encoder;
}

/**
 * Exit a suite that cannot run without the tokenizer, saying so unmistakably.
 *
 * Exit code stays 0 — a missing optional dependency is not a failure, and
 * failing here would make the no-optional CI job impossible to keep green.
 * What must not happen is the suite printing its usual "suite ok" line, which
 * a reader or a grep would take as coverage that did not occur.
 */
export function skipSuite(name, reason) {
  console.log(`\n${name}: SKIPPED — ${reason}`);
  console.log(`${name}: 0 passed, 0 failed, SUITE SKIPPED (not a pass)`);
  process.exit(0);
}
