/**
 * GlyphCompress — OpenAI Usage Example
 * 
 * Demonstrates how to wrap an OpenAI client for automatic
 * semantic compression. Requires: npm install openai
 */

import OpenAI from 'openai';
import { wrapOpenAI } from '../vscode-ext/glyph-middleware.js';

// 1. Create and wrap the client
const client = wrapOpenAI(
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  { level: 'standard' } // 'light' | 'standard' | 'aggressive'
);

// 2. Use it normally — compression is automatic
async function main() {
  console.log('Sending compressed request to OpenAI...\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a senior TypeScript developer.' },
      {
        role: 'user',
        content: `Fix the TypeScript error in src/components/UserProfile.tsx at line 42.
The error says: Property 'department' does not exist on type 'User'.
The file has 5 imports, uses 3 useState hooks and 2 useEffect hooks.
The component renders a profile card with avatar, name, email, and badge.`,
      },
    ],
  });

  console.log('Response:', response.choices[0].message.content);

  // 3. Check compression stats
  const stats = client._glyphCompress.getStats();
  console.log('\n--- Compression Stats ---');
  console.log(`Messages processed: ${stats.messagesProcessed}`);
  console.log(`Tokens saved: ${stats.totalSavedTokens}`);
  console.log(`Compression ratio: ${stats.overallRatio}`);
  console.log(`Estimated cost saved: ${stats.estimatedCostSaved}`);
}

main().catch(console.error);
