/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — MCP Server Smoke Suite
 *
 * Spawns bin/mcp-server.js as a real child process over stdio (the same
 * way Claude Code / Claude Desktop / any MCP client would) and drives it
 * through the official MCP SDK Client, rather than importing server
 * internals directly — this is the only way to catch real protocol-level
 * breakage (tool schema errors, transport issues) instead of just
 * unit-testing the underlying GlyphCompressor calls.
 */
import assert from 'assert';
import { fileURLToPath } from 'url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const serverPath = fileURLToPath(new URL('../bin/mcp-server.js', import.meta.url));

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], cwd: root });
const client = new Client({ name: 'glyph-compress-test-client', version: '1.0.0' });
await client.connect(transport);

await test('lists all four expected tools', async () => {
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepStrictEqual(names, ['compress_file', 'compress_text', 'get_codebook', 'route_context']);
});

await test('compress_text returns compressed output, codebook, and stats', async () => {
  const result = await client.callTool({
    name: 'compress_text',
    arguments: { text: 'fix the AuthenticationManager AuthenticationManager AuthenticationManager bug', provider: 'raw' },
  });
  assert(!result.isError, 'should not be an error result');
  const payload = JSON.parse(result.content[0].text);
  assert(typeof payload.compressed === 'string' && payload.compressed.length > 0, 'should return compressed text');
  assert(payload.codebook.includes('[GLYPH PROTOCOL'), 'should return the codebook');
  assert(typeof payload.stats.ratio === 'string', 'should return stats');
});

await test('compress_file reads and compresses a real file', async () => {
  const result = await client.callTool({
    name: 'compress_file',
    arguments: { filePath: 'package.json', provider: 'raw' },
  });
  assert(!result.isError, 'should not be an error result');
  const payload = JSON.parse(result.content[0].text);
  // The file path itself gets indexed into a glyph reference (₍N₎), so the
  // literal filename is not expected to survive — that is by design, not
  // a bug (see the file-path compression feature already covered by other
  // suites). Assert the compression actually ran instead.
  assert(payload.compressed.length > 0, 'should return non-empty compressed content');
  assert(payload.stats.originalTokens > 0, 'should report original token count');
});

await test('compress_file reports a clean error for a missing file', async () => {
  const result = await client.callTool({
    name: 'compress_file',
    arguments: { filePath: 'this-file-does-not-exist.txt' },
  });
  assert(result.isError, 'should be an error result');
  assert(result.content[0].text.includes('not found'), 'error should explain the file was not found');
});

await test('route_context returns selected/excluded files and respects the token budget', async () => {
  const result = await client.callTool({
    name: 'route_context',
    arguments: { query: 'fix the dynamic dictionary bug', tokenBudget: 1200, maxFiles: 6 },
  });
  assert(!result.isError, 'should not be an error result');
  const payload = JSON.parse(result.content[0].text);
  assert(Array.isArray(payload.selectedFiles), 'should return selectedFiles');
  assert(payload.intents.includes('fix_error'), 'should detect fix_error intent');
  assert(payload.tokensUsed <= payload.tokenBudget, 'should respect the token budget');
});

await test('get_codebook returns the protocol prompt', async () => {
  const result = await client.callTool({ name: 'get_codebook', arguments: {} });
  assert(result.content[0].text.includes('[GLYPH PROTOCOL'), 'should return the codebook text');
});

await client.close();

console.log(`\nmcp-server: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('mcp-server suite ok');
}
