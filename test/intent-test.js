import assert from 'assert';
import { Compressor, GlyphCompressor } from '../src/index.js';

// 1. Test core Compressor intent diffs
const coreCompressor = new Compressor(null, { intentDiffs: true });

const diffText = `Here is the refactoring diff:
diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,6 +1,6 @@
-import { oldFunc } from './old';
-class AuthManager {
-  oldAuth() {}
+import { authenticate } from './oauth';
+class AuthenticationManager {
+  async authenticate(email: string, pass: string) {}
 }
`;

const context = {
  prompt: diffText
};

const result = coreCompressor.compress(context);
const compressed = result.compressed;
console.log('Intent Compressor Output:\n', compressed);

// Assertions for Compressor
assert(compressed.includes('⚡:'), 'Should contain the intent diff prefix');
assert(compressed.includes('▲'), 'Should contain added indicator');
assert(compressed.includes('▼'), 'Should contain removed indicator');
assert(compressed.includes('AuthenticationManager'), 'Should capture class rename');
assert(compressed.includes('authenticate'), 'Should capture function change');

// 2. Test GlyphCompressor middleware intent diffs
// Encoded below the economics gate. Since v1.33.8 compressText() only ships
// its output when that output costs fewer REAL tokens, and a short diff does
// not clear that bar — the glyph forms cost more than the English at this size.
// This test is about what intent-diff encoding *produces*, not about whether
// the result is cheap enough to send, so it calls the encoder directly. The
// economics are covered in test/integration.js.
const middlewareCompressor = new GlyphCompressor({ intentDiffs: true });
const safeDiff = middlewareCompressor._applyPrivacyFirewall(diffText, false);
middlewareCompressor._buildDynamicDictionary(safeDiff);
const textResult = { compressed: middlewareCompressor._compressUserMessage(diffText, safeDiff) };
console.log('Intent Middleware Output:\n', textResult.compressed);

// Assertions for Middleware
assert(textResult.compressed.includes('⚡:'), 'Middleware output should contain the intent diff prefix');
assert(textResult.compressed.includes('▲'), 'Middleware output should contain added indicator');
assert(textResult.compressed.includes('AuthenticationManager') || textResult.compressed.includes('γ'), 'Middleware output should capture class rename');

console.log('intent test ok');
