/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Expression-Level AST Spans Suite (v1.20.0)
 *
 * `_extractCodeBlockTokens()` previously only recognized top-level
 * declarations (import/export/function/class) — arrow functions, calls,
 * destructuring, async/await, and exception handling were invisible to
 * the source map even though they carry real information about what a
 * minified/summarized code block actually contained. Language coverage
 * was also missing Ruby, Swift, Kotlin, and PHP despite those already
 * having TECH_GLYPHS entries.
 *
 * This suite is the "targeted validation for source-map fidelity at the
 * expression level" the roadmap called for: every token's span must
 * slice back to exactly its own `original` text (not a real AST parser —
 * intentionally not one, see the note in glyph-middleware.js about
 * incomplete chat code snippets — but the regex-based spans must still
 * be honest about where they point).
 */
import assert from 'assert';
import { GlyphCompressor } from '../src/glyph-middleware.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

function compress(prompt) {
  const gc = new GlyphCompressor({ level: 'aggressive', provider: 'raw', trustPolicy: 'lossy' });
  return gc.compressText(prompt);
}

function assertFidelity(result, sourceText) {
  for (const token of result.sourceMap.ast) {
    const sliced = sourceText.slice(token.span.start.offset, token.span.end.offset);
    assert.strictEqual(sliced, token.original, `span for ${token.kind} "${token.original}" should slice back to itself, got "${sliced}"`);
  }
}

test('detects arrow functions distinct from regular function declarations', () => {
  const prompt = 'Explain:\n```js\nfunction outer() {}\nconst doubled = (x) => x * 2;\n```\n';
  const result = compress(prompt);
  assertFidelity(result, prompt);
  const kinds = result.sourceMap.ast.map((t) => t.kind);
  assert(kinds.includes('function'), 'should still detect the regular function declaration');
  assert(kinds.includes('arrowFunction'), 'should detect the arrow function');
});

test('detects function calls with a span distinct from the declaration', () => {
  const prompt = 'Explain:\n```js\nfunction fetchUser(id) {\n  return validate(id);\n}\n```\n';
  const result = compress(prompt);
  assertFidelity(result, prompt);
  const call = result.sourceMap.ast.find((t) => t.kind === 'call' && t.original.startsWith('validate'));
  const decl = result.sourceMap.ast.find((t) => t.kind === 'function');
  assert(call, 'should detect the validate(...) call');
  assert(decl, 'should detect the function declaration');
  assert.notStrictEqual(call.span.start.offset, decl.span.start.offset, 'call and declaration spans must not collapse to the same offset');
});

test('detects destructuring assignments', () => {
  const prompt = 'Explain:\n```js\nconst { data, error } = await fetchResult();\nconst [first, ...rest] = data.items;\n```\n';
  const result = compress(prompt);
  assertFidelity(result, prompt);
  const destructures = result.sourceMap.ast.filter((t) => t.kind === 'destructure');
  assert.strictEqual(destructures.length, 2, `expected 2 destructuring tokens, got ${destructures.length}`);
});

test('detects async/await and exception handling keywords', () => {
  const prompt = 'Explain:\n```js\nasync function run() {\n  try {\n    await doWork();\n  } catch (err) {\n    throw err;\n  } finally {\n    cleanup();\n  }\n}\n```\n';
  const result = compress(prompt);
  assertFidelity(result, prompt);
  const kinds = result.sourceMap.ast.map((t) => t.kind);
  assert(kinds.includes('async'), 'should detect async/await');
  assert(kinds.filter((k) => k === 'exception').length >= 3, 'should detect try/catch/throw/finally as exception tokens');
});

test('regression: code-block indentation survives compression at every level (was silently flattened to a single space/tab)', () => {
  // Found while building this suite's fidelity check: whitespace
  // normalization ran on the whole message, including inside ```fenced```
  // code, TWICE independently (once in _compressUserMessage's own
  // normalization pass, once again at the tail of the verbose-phrase
  // compression chain) — both naive, neither fence-aware. 4-space and
  // 8-space nested indentation both collapsed to a single space (or a
  // single tab after _minifySyntax's own indent-to-tab pass), destroying
  // the nesting a reader relies on, and for indentation-significant
  // languages like Python, changing what the code actually does.
  const code = 'function outer() {\n    if (x) {\n        return inner();\n    }\n}\n';
  const prompt = `Please explain:\n\`\`\`js\n${code}\`\`\`\n`;
  for (const level of ['light', 'standard', 'aggressive']) {
    const gc = new GlyphCompressor({ level, provider: 'raw', trustPolicy: 'lossy' });
    const result = gc.compressText(prompt);
    const fenceMatch = result.compressed.match(/```js\n([\s\S]+?)```/);
    assert(fenceMatch, `${level}: compressed output should still contain a fenced code block`);
    const compressedCode = fenceMatch[1];
    const returnLineIndent = (compressedCode.match(/^([ \t]*)(?:→|\breturn\b)/m) || [])[1] || '';
    const ifLineIndent = (compressedCode.match(/^([ \t]*)if\b/m) || [])[1] || '';
    assert(returnLineIndent.length > ifLineIndent.length, `${level}: the doubly-nested line must stay MORE indented than the singly-nested "if" line (got if="${ifLineIndent}" return="${returnLineIndent}")`);
  }
});

test('covers Ruby, Swift, Kotlin, and PHP, which previously had zero token extraction', () => {
  const cases = [
    { lang: 'ruby', code: "require 'json'\nclass UserService\n  def find(id)\n    id\n  end\nend\n", expectKinds: ['import', 'class', 'function'] },
    { lang: 'swift', code: 'import Foundation\nfunc greet(name: String) -> String {\n  return name\n}\n', expectKinds: ['import', 'function'] },
    { lang: 'kotlin', code: 'import kotlin.math\nfun square(x: Int): Int {\n  return x * x\n}\n', expectKinds: ['import', 'function'] },
    { lang: 'php', code: "require_once 'db.php';\nfunction connect() {\n  return true;\n}\n", expectKinds: ['import', 'function'] },
  ];
  for (const { lang, code, expectKinds } of cases) {
    const prompt = `Explain:\n\`\`\`${lang}\n${code}\`\`\`\n`;
    const result = compress(prompt);
    assertFidelity(result, prompt);
    const kinds = new Set(result.sourceMap.ast.map((t) => t.kind));
    for (const expected of expectKinds) {
      assert(kinds.has(expected), `${lang} should produce a "${expected}" token, got kinds: ${[...kinds].join(', ')}`);
    }
  }
});

test('no exact-duplicate spans (same kind + same offsets) across a realistic multi-construct snippet', () => {
  const prompt = 'Review:\n```js\nasync function fetchUser(id) {\n  try {\n    const { data, error } = await api.getUser(id);\n    if (error) throw error;\n    const [first, ...rest] = data.items;\n    const doubled = (x) => x * 2;\n    return doubled(first);\n  } catch (err) {\n    console.error(err);\n  }\n}\n```\n';
  const result = compress(prompt);
  assertFidelity(result, prompt);
  const seen = new Set();
  for (const token of result.sourceMap.ast) {
    const key = `${token.kind}:${token.span.start.offset}:${token.span.end.offset}`;
    assert(!seen.has(key), `duplicate span detected: ${key}`);
    seen.add(key);
  }
  assert(result.sourceMap.ast.length >= 10, `expected a rich set of tokens for this snippet, got ${result.sourceMap.ast.length}`);
});

console.log(`\nast-spans: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('ast-spans suite ok');
}
