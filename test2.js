import { GlyphCompressor } from './vscode-ext/glyph-middleware.js';

const gc = new GlyphCompressor({ level: 'ultra' });
const code = `\`\`\`rust
use std::fs;
use reqwest::Client;

pub struct Server {
    port: u16,
}

impl Server {
    pub async fn start(&self) {}
}

fn main() {}
\`\`\``;

console.log("Input:", code);
const r = gc.compressText(code);
console.log("Output:", r.compressed);
