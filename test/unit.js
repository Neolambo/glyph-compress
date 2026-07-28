import assert from 'assert';
import fs from 'node:fs';
import path from 'node:path';
import { GlyphCompressor, estimateProviderTokens, normalizeProvider, compareTokenEstimates } from '../src/index.js';

// The intent encoding is unchanged — `fix ... error` still maps to ⺌✗. What
// v1.33.8 added is that emitting it is conditional on being cheaper in REAL
// tokens rather than characters.
//
// That gate matters most exactly here, on a short string: "fix the error in
// app.tsx" is 7 real tokens while "⺌✗ ◈₍1₎" is 12, because the glyphs are
// non-ASCII and fragment into several tokens each. This assertion used to lock
// in that inflated output.
//
// It is a size effect, not a verdict on the encoding: measured with
// `npm run measure:showcase`, the same encoder saves 78% of real tokens across
// the five showcase scenarios. Small strings lose, realistic IDE context wins.
const shortPrompt = 'fix the error in app.tsx';
const shortResult = new GlyphCompressor({ level: 'standard' }).compressText(shortPrompt);
assert.strictEqual(
  shortResult.compressed,
  shortPrompt,
  'a short prompt must come back untouched: the glyph form costs more real tokens than the plain text',
);
assert(shortResult.fallback, 'and the result must say so, rather than reporting a saving it did not make');

// The encoder still produces the intent glyphs; only the economics gate in
// front of it decides whether they ship. Asserted directly so this file keeps
// covering the encoding itself, not just the gate.
const encoded = new GlyphCompressor({ level: 'standard', provider: 'raw' })
  ._compressUserMessage(shortPrompt, shortPrompt);
assert(encoded.includes('⺌✗'), 'core compressor should still encode fix error intent');
assert(normalizeProvider('claude') === 'anthropic', 'provider aliases should normalize');
assert(estimateProviderTokens([{ role: 'user', content: 'hello world' }], 'openai') > 0, 'OpenAI estimate should be positive');

const comparison = compareTokenEstimates('AuthenticationManager AuthenticationManager AuthenticationManager', 'α α α', 'anthropic');
assert(comparison.provider === 'anthropic', 'comparison should report normalized provider');
assert(comparison.originalTokens > comparison.compressedTokens, 'comparison should show savings');

const privateCompressor = new GlyphCompressor({ level: 'standard', privacyFirewall: true });
const privateResult = privateCompressor.compressText('API_KEY=sk-testSECRETSECRETSECRETSECRETSECRET and email admin@example.com');
assert(!privateResult.compressed.includes('sk-testSECRET'), 'privacy firewall should redact API keys');
assert(!privateResult.compressed.includes('admin@example.com'), 'privacy firewall should redact emails');
assert(privateResult.sourceMap.privacy.length >= 2, 'privacy firewall should expose redaction metadata');
assert(privateResult.sourceMap.privacy.every((entry) => !entry.hash.includes('sk-testSECRET')), 'privacy metadata should not expose raw secrets');

// Test Caching
const cacheKey = 'test-caching-key-123';
const gc1 = new GlyphCompressor({ cacheKey, level: 'standard' });
assert(gc1.cacheFile, 'cacheFile path should be computed');
assert(gc1.cacheFile.includes('.glyphcompress'), 'cacheFile should be under .glyphcompress');

if (fs.existsSync(gc1.cacheFile)) {
  fs.unlinkSync(gc1.cacheFile);
}

// Long enough and repeated enough to qualify under BOTH admission regimes.
//
// Since v1.33.8 the dictionary is priced in tokens, and there are two pricings:
// with js-tiktoken the real count decides, without it a conservative chars/8
// rule does. `SuperUniqueIdentifierName` x10 qualifies under the first and is
// rejected by the second — so this assertion held in development and failed in
// the shipped configuration, which is exactly the split the no-optional CI job
// exists to surface. A 35-character identifier repeated 12 times clears both.
const textToCompress = 'SuperUniqueIdentifierNameForTesting '.repeat(12).trim();
gc1.compressText(textToCompress);

assert(fs.existsSync(gc1.cacheFile), 'cache file should be written after compressText');
assert(gc1.dynamicDict.has('SuperUniqueIdentifierNameForTesting'), 'dynamicDict should map the unique word');

const gc2 = new GlyphCompressor({ cacheKey, level: 'standard' });
assert(gc2.dynamicDict.has('SuperUniqueIdentifierNameForTesting'), 'cached dynamicDict entries should be restored (warm-start)');
assert(gc2.dynamicCounter === gc1.dynamicCounter, 'dynamicCounter should be restored');

if (fs.existsSync(gc1.cacheFile)) {
  fs.unlinkSync(gc1.cacheFile);
}

// fileCounter has the same warm-start requirement as dynamicCounter above,
// but only dynamicCounter was asserted — mutation testing showed the
// fileCounter restore could be removed with the whole suite staying green.
// The consequence is not cosmetic: a file indexed in a later session reuses
// an index already cached for a *different* path, so the model decodes the
// reference to the wrong file. Asserted behaviourally (no duplicate refs)
// rather than on the counter, since the collision is what actually matters.
const refCacheKey = 'glyph-file-ref-warmstart-' + Date.now();
const refSession1 = new GlyphCompressor({ cacheKey: refCacheKey, level: 'standard' });
refSession1.compressText('Look at src/alpha.ts and src/beta.ts for details.');
assert(refSession1.fileIndex.size >= 2, 'precondition: first session must index both files');

const refSession2 = new GlyphCompressor({ cacheKey: refCacheKey, level: 'standard' });
refSession2.compressText('Now check src/gamma.ts instead.');
const refs = [...refSession2.fileIndex.values()];
assert.strictEqual(
  refs.length,
  new Set(refs).size,
  `warm-start file refs collided (${JSON.stringify([...refSession2.fileIndex.entries()])}) — a new file reused a cached index, so the model would decode the reference to the wrong path`,
);

if (refSession1.cacheFile && fs.existsSync(refSession1.cacheFile)) {
  fs.unlinkSync(refSession1.cacheFile);
}

// Test Attentional Decay Compaction
//
// Each turn carries a real code block rather than a one-liner. Since v1.33.8
// compression is accepted only when it reduces real tokens, and a nine-message
// transcript of ~180 tokens is simply too small for decay plus the injected
// codebook to pay for itself — the compressor correctly returns it untouched,
// which left this suite reading decayed[9] on a 9-element array. A transcript
// decay can actually win on is also the more honest test of decay.
const decayBody = (n) => Array.from({ length: 12 }, (_, i) =>
  `  const helper${n}_${i} = (input) => transform(input, options${n});`).join('\n');

const decayTurn = (n, label) => ({
  role: n % 2 === 0 ? 'user' : 'assistant',
  content: `Message ${n} (${label}).\n\`\`\`javascript\nconst code${n} = ${n};\n${decayBody(n)}\n\`\`\``,
});

const decayCompressor = new GlyphCompressor({ level: 'standard', attentionalDecay: true });
const transcript = [
  decayTurn(0, 'Deep Freeze'), // d = 8
  decayTurn(1, 'Deep Freeze'), // d = 7
  decayTurn(2, 'Cold'), // d = 6
  decayTurn(3, 'Cold'), // d = 5
  decayTurn(4, 'Cold'), // d = 4
  decayTurn(5, 'Warm'), // d = 3
  decayTurn(6, 'Warm'), // d = 2
  decayTurn(7, 'Warm'), // d = 1
  decayTurn(8, 'Active'), // d = 0
];

const { messages: decayed } = decayCompressor.compressMessages(transcript, 'raw');



// 1. Verify Active Zone (d = 0) has full fidelity
assert(decayed[9].content.includes('code8'), 'Active zone should preserve raw code blocks');

// 2. Verify Warm Zone (d = 1-3) has standard minified/processed content
assert(decayed[8].content.includes('code7'), 'Warm zone should preserve code blocks but apply minification/standard compression');

// 3. Verify Cold Zone (d = 4-6) has replaced code blocks with signature summaries
assert(!decayed[3].content.includes('code2'), 'Cold zone should strip raw code blocks');
// Two mechanisms can produce the cold-zone summary: 'ultra' collapses a
// fenced block to its own structural form (e.g. `[ʲˢ1L]` — language tag +
// line count), and a regex fallback rewrites any fence that survives into
// `// [Summary: lang, N lines]`. Before v1.32.2 the forced 'ultra' was
// vetoed by the derived trust policy, so only the regex ever fired and this
// assertion could match the literal word "Summary". Assert the actual
// contract instead — the code is gone, replaced by something describing it.
assert(
  // `\S*` assumed the structural form had no internal spaces, which only held
  // for a one-line code block. A realistic block summarises as `[ʲˢƒ:12 13L]`
  // — language tag, function count, line count — with a space in the middle.
  /\[Summary|\[[^\]]*\d+L\]/.test(decayed[3].content),
  `Cold zone should replace code blocks with a summary marker, got: ${decayed[3].content}`,
);

// 4. Verify Deep Freeze Zone (d > 6) has episodic summaries and zero code blocks
assert(!decayed[1].content.includes('code0'), 'Deep Freeze zone should completely discard code blocks');
assert(decayed[1].content.includes('[Radical Summary:'), 'Deep Freeze zone should reduce text to episodic summaries');

console.log('unit suite ok');