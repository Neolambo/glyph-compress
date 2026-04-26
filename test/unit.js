import assert from 'assert';
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

console.log('unit suite ok');