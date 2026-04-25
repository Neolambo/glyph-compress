#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const files = ['README.md', 'ROADMAP.md', 'CONTRIBUTING.md', 'SECURITY.md', 'PRIVACY.md', 'ENTERPRISE.md'];
const docsDir = path.join(root, 'docs');
if (fs.existsSync(docsDir)) {
  for (const entry of fs.readdirSync(docsDir)) {
    if (entry.endsWith('.md')) files.push(path.join('docs', entry));
  }
}

let failures = 0;
const markdownLink = /\[[^\]]+\]\(([^)]+)\)/g;

for (const file of files) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) continue;
  const text = fs.readFileSync(fullPath, 'utf8');
  for (const match of text.matchAll(markdownLink)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/i.test(target)) continue;
    const cleanTarget = target.split('#')[0];
    if (!cleanTarget) continue;
    const resolved = path.resolve(path.dirname(fullPath), decodeURIComponent(cleanTarget));
    if (!fs.existsSync(resolved)) {
      console.error(`Broken link in ${file}: ${target}`);
      failures++;
    }
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log('Markdown links ok');
