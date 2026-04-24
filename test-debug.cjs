const { GlyphCompressor } = require('./vscode-ext/glyph-middleware.cjs'); 
const complexMessage = `I have a TypeScript error in my React component at src/components/Dashboard.tsx line 42. 
The error says: Property 'analytics' does not exist on type 'DashboardProps'. 
Also there's a warning about unused imports on line 3.
Here's the code:
\`\`\`typescript
import React, { useState, useEffect, useCallback } from 'react';
import { DashboardProps } from '../types';
import { fetchAnalytics } from '../api/analytics';
import { unusedHelper } from '../utils';

export const Dashboard: React.FC<DashboardProps> = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics(userId).then(setData).finally(() => setLoading(false));
  }, [userId]);

  return <div>{loading ? 'Loading...' : JSON.stringify(data)}</div>;
};
\`\`\`
Can you fix this?`;
const gc = new GlyphCompressor({ level: 'standard' }); 
const r = gc.compressText(complexMessage); 
console.log(r.compressed);
