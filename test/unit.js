import assert from 'assert';
import fs from 'node:fs';
import path from 'node:path';
import { GlyphCompressor, estimateProviderTokens, normalizeProvider, compareTokenEstimates } from '../src/index.js';

const compressor = new GlyphCompressor({ level: 'standard' });
const compressed = compressor.compressText('fix the error in app.tsx').compressed;

assert(compressed.includes('⺌✗'), 'core compressor should encode fix error intent');
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

const textToCompress = 'SuperUniqueIdentifierName SuperUniqueIdentifierName SuperUniqueIdentifierName';
gc1.compressText(textToCompress);

assert(fs.existsSync(gc1.cacheFile), 'cache file should be written after compressText');
assert(gc1.dynamicDict.has('SuperUniqueIdentifierName'), 'dynamicDict should map the unique word');

const gc2 = new GlyphCompressor({ cacheKey, level: 'standard' });
assert(gc2.dynamicDict.has('SuperUniqueIdentifierName'), 'cached dynamicDict entries should be restored (warm-start)');
assert(gc2.dynamicCounter === gc1.dynamicCounter, 'dynamicCounter should be restored');

if (fs.existsSync(gc1.cacheFile)) {
  fs.unlinkSync(gc1.cacheFile);
}

// Test Attentional Decay Compaction
const decayCompressor = new GlyphCompressor({ level: 'standard', attentionalDecay: true });
const transcript = [
  { role: 'user', content: 'Message 0 (Deep Freeze): This is very old history. \n```javascript\nconst code0 = 0;\n```' }, // d = 8 (Deep Freeze)
  { role: 'assistant', content: 'Message 1 (Deep Freeze): Old response. \n```javascript\nconst code1 = 1;\n```' }, // d = 7 (Deep Freeze)
  { role: 'user', content: 'Message 2 (Cold): This is cold history. \n```javascript\nconst code2 = 2;\n```' }, // d = 6 (Cold)
  { role: 'assistant', content: 'Message 3 (Cold): Cold response. \n```javascript\nconst code3 = 3;\n```' }, // d = 5 (Cold)
  { role: 'user', content: 'Message 4 (Cold): Another cold one. \n```javascript\nconst code4 = 4;\n```' }, // d = 4 (Cold)
  { role: 'assistant', content: 'Message 5 (Warm): This is warm. \n```javascript\nconst code5 = 5;\n```' }, // d = 3 (Warm)
  { role: 'user', content: 'Message 6 (Warm): Warm request. \n```javascript\nconst code6 = 6;\n```' }, // d = 2 (Warm)
  { role: 'assistant', content: 'Message 7 (Warm): Warm response. \n```javascript\nconst code7 = 7;\n```' }, // d = 1 (Warm)
  { role: 'user', content: 'Message 8 (Active): Latest active prompt! \n```javascript\nconst code8 = 8;\n```' }, // d = 0 (Active)
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
  /\[Summary|\[\S*\d+L\]/.test(decayed[3].content),
  `Cold zone should replace code blocks with a summary marker, got: ${decayed[3].content}`,
);

// 4. Verify Deep Freeze Zone (d > 6) has episodic summaries and zero code blocks
assert(!decayed[1].content.includes('code0'), 'Deep Freeze zone should completely discard code blocks');
assert(decayed[1].content.includes('[Radical Summary:'), 'Deep Freeze zone should reduce text to episodic summaries');

console.log('unit suite ok');