import assert from 'assert';
import { Compressor, GlyphCompressor } from '../src/index.js';

// 1. Test core Compressor holographic folding
const coreCompressor = new Compressor(null, { holographicFolding: true });

const filesContext = {
  files: [
    {
      path: 'src/components/layout.tsx',
      content: `import React from 'react';\nimport { Sidebar } from './Sidebar';\nimport { Header } from './Header';\nexport default function Layout() { return <div/>; }`
    },
    {
      path: 'src/components/Page.tsx',
      content: `import React from 'react';\nimport Layout from './layout';\nimport { Sidebar } from './Sidebar';\nexport default function Page() { return <div/>; }`
    }
  ]
};

const result = coreCompressor.compress(filesContext);
const compressed = result.compressed;

console.log('Holographic Folded Context Output:', compressed);

// Assertions for Compressor
assert(compressed.includes('⟦Base:'), 'Should contain the folded Base imports block');
assert(compressed.includes('ℜ') || compressed.includes('React'), 'Should contain React (or ℜ) in base imports');
assert(compressed.includes('Sidebar'), 'Should contain Sidebar in base imports');
assert(compressed.includes('Header'), 'Should contain Header in base imports');
assert(compressed.includes('↷'), 'Should contain layering boundary symbol');

// 2. Test GlyphCompressor middleware holographic folding on user message text
const middlewareCompressor = new GlyphCompressor({ holographicFolding: true });
const promptText = `Please check these components:

File: src/components/layout.tsx
\`\`\`tsx
import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
export default function Layout() { return <div/>; }
\`\`\`

File: src/components/Page.tsx
\`\`\`tsx
import React from 'react';
import Layout from './layout';
import { Sidebar } from './Sidebar';
export default function Page() { return <div/>; }
\`\`\`
`;

const textResult = middlewareCompressor.compressText(promptText);
console.log('Middleware Holographic Text Output:', textResult.compressed);

// Assertions for middleware text folding
assert(textResult.compressed.includes('⟦Base:'), 'Middleware output should contain the folded Base imports block');
assert(textResult.compressed.includes('ℜ') || textResult.compressed.includes('React'), 'Middleware output should fold shared React import');
assert(textResult.compressed.includes('Sidebar') || textResult.compressed.includes('δ'), 'Middleware output should fold shared Sidebar import');

// 3. Assert token savings (character savings)
const rawGc = new GlyphCompressor({ holographicFolding: false });
const rawTextResult = rawGc.compressText(promptText);
const savings = (rawTextResult.compressed.length - textResult.compressed.length) / rawTextResult.compressed.length;
console.log(`Saved ${Math.round(savings * 100)}% characters via holographic folding`);
assert(savings > 0.15, 'Should save at least 15% characters on highly overlapping code');

console.log('holographic test ok');
