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

console.log('unit suite ok');