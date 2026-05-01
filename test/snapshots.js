import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { GlyphCompressor } from '../src/glyph-middleware.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const snapshots = JSON.parse(
  fs.readFileSync(path.join(root, 'test', 'fixtures', 'compressed-payloads.snapshot.json'), 'utf8')
);

function stripSpan(value) {
  if (Array.isArray(value)) {
    return value.map(stripSpan);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const next = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'span' || key === 'sessionStarted' || key === 'messagesProcessed' || key === 'trust' || key === 'hash') {
      continue;
    }
    next[key] = stripSpan(entry);
  }
  return next;
}

function compressFromSnapshot(snapshot) {
  const compressor = new GlyphCompressor({
    level: snapshot.level,
    provider: snapshot.provider,
    ...(snapshot.options || {}),
  });

  if (snapshot.messages) {
    return compressor.compressMessages(snapshot.messages, snapshot.provider);
  }

  return compressor.compressText(snapshot.input, snapshot.provider);
}

function normalizeResult(snapshot, result) {
  if (snapshot.messages) {
    return stripSpan({
      messages: result.messages,
      sourceMap: result.sourceMap,
      stats: {
        totalOriginalTokens: result.stats.totalOriginalTokens,
        totalCompressedTokens: result.stats.totalCompressedTokens,
        thisMessage: result.stats.thisMessage,
      },
    });
  }

  return stripSpan({
    compressed: result.compressed,
    sourceMap: result.sourceMap,
    stats: result.stats,
  });
}

for (const [name, snapshot] of Object.entries(snapshots)) {
  const actual = normalizeResult(snapshot, compressFromSnapshot(snapshot));
  assert.deepStrictEqual(actual, snapshot.result, `${name} payload snapshot changed`);
}

console.log('snapshot suite ok');