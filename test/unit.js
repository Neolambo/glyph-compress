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

console.log('unit suite ok');