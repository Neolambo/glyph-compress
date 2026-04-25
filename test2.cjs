const { GlyphCompressor } = require('./vscode-ext/glyph-middleware.cjs');
const gc = new GlyphCompressor({ level: 'aggressive' });
const code = "```javascript\nfunction test() { const a = 1; let b = 2; return a + b; }\n```";
console.log(gc.compressText(code).compressed);
