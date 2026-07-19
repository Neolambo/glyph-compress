/**
 * GlyphCompress — Anthropic Claude Usage Example
 * 
 * Demonstrates how to wrap a Claude client for automatic
 * semantic compression. Requires: npm install @anthropic-ai/sdk
 */

import Anthropic from '@anthropic-ai/sdk';
import { wrapAnthropic } from '../src/glyph-middleware.js';

// 1. Create and wrap the client
const client = wrapAnthropic(
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  { level: 'standard' } // 'light' | 'standard' | 'aggressive' | 'ultra' | 'auto'
);

// 2. Use it normally — compression is automatic
async function main() {
  console.log('Sending compressed request to Claude...\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: 'You are a senior Python developer.',
    messages: [
      {
        role: 'user',
        content: `Debug the data preprocessing pipeline in src/pipeline/preprocess.py.
There's a warning about unused import train_test_split on line 18.
Also a FutureWarning about DataFrame.fillna with 'method' being deprecated on line 25.
The file has 2 imports, 1 class with 4 methods, and is 37 lines long.`,
      },
    ],
  });

  console.log('Response:', response.content[0].text);

  // 3. Check compression stats
  const stats = client._glyphCompress.getStats();
  console.log('\n--- Compression Stats ---');
  console.log(`Messages processed: ${stats.messagesProcessed}`);
  console.log(`Tokens saved: ${stats.totalSavedTokens}`);
  console.log(`Compression ratio: ${stats.overallRatio}`);
  console.log(`Estimated cost saved: ${stats.estimatedCostSaved}`);
}

main().catch(console.error);
