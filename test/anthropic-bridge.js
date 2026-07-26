/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Anthropic Proxy Bridge Suite (v1.24.0)
 *
 * Every documented proxy integration configures the IDE in "OpenAI
 * Compatible" mode, so the proxy always receives an OpenAI chat/completions
 * -shaped request regardless of the real upstream. That was never actually
 * translated for an Anthropic target: `startProxyServer` forwarded the
 * OpenAI-shaped body unmodified to `api.anthropic.com`, which does not
 * accept it (system must be a top-level field, not a `role: "system"`
 * message; auth is `x-api-key` + `anthropic-version`, not `Authorization:
 * Bearer`; the endpoint is `/v1/messages`). On top of that, GlyphCompress's
 * own compression path injected an *illegal* `role: "system"` message into
 * `messages` when none existed. Every real Anthropic-target proxy request
 * would have been rejected by the real API. Found by reproducing it
 * directly (mocking the outbound `https.request` call and inspecting the
 * forwarded body/headers), not by trusting the existing proxy smoke test —
 * which only checked the forwarded URL and status code, never the request
 * shape, and so never caught this.
 *
 * This suite locks in the fix at two levels: unit tests against the pure
 * translation functions in src/anthropic-bridge.js, and end-to-end tests
 * that start a real proxy server, mock the outbound HTTPS call, and assert
 * on the actual forwarded request/response for both non-streaming and
 * streaming (SSE) Anthropic responses.
 */
import assert from 'assert';
import http from 'http';
import https from 'https';
import { EventEmitter, once } from 'events';
import { Readable } from 'stream';
import {
  isAnthropicNativeTarget,
  isNativeAnthropicRequest,
  compressNativeAnthropicRequest,
  openaiRequestToAnthropic,
  anthropicHeadersFromOpenAI,
  anthropicResponseToOpenAI,
  mapAnthropicStopReason,
  extractSSEEvents,
  createAnthropicToOpenAISSETransform,
} from '../src/anthropic-bridge.js';
import { GlyphCompressor } from '../src/glyph-middleware.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

// ─── isAnthropicNativeTarget ────────────────────────────────────────────

test('isAnthropicNativeTarget recognizes the real Anthropic API host', () => {
  assert(isAnthropicNativeTarget('https://api.anthropic.com'));
  assert(!isAnthropicNativeTarget('https://api.openai.com'));
  assert(!isAnthropicNativeTarget('https://generativelanguage.googleapis.com'));
});

// ─── openaiRequestToAnthropic ───────────────────────────────────────────

test('openaiRequestToAnthropic: system field is top-level, never a message role', () => {
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'anthropic' });
  const { body } = openaiRequestToAnthropic({
    model: 'claude-3-5-sonnet-20241022',
    messages: [
      { role: 'system', content: 'You are a coding assistant.' },
      { role: 'user', content: 'Fix the bug.' },
    ],
  }, compressor);
  assert(typeof body.system !== 'undefined', 'system should be a top-level field');
  assert(!body.messages.some((m) => m.role === 'system'), 'no message should carry role: "system" — the original bug');
  assert(body.messages.every((m) => m.role === 'user' || m.role === 'assistant'));
});

test('openaiRequestToAnthropic: multiple system messages are joined into one system field', () => {
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'anthropic' });
  const { body } = openaiRequestToAnthropic({
    model: 'claude-3-5-sonnet-20241022',
    messages: [
      { role: 'system', content: 'Rule one.' },
      { role: 'system', content: 'Rule two.' },
      { role: 'user', content: 'Go.' },
    ],
  }, compressor);
  const systemText = typeof body.system === 'string' ? body.system : JSON.stringify(body.system);
  assert(systemText.includes('Rule one'));
  assert(systemText.includes('Rule two'));
});

test('openaiRequestToAnthropic: max_tokens defaults when missing, passes through when present', () => {
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'anthropic' });
  const withDefault = openaiRequestToAnthropic({ model: 'x', messages: [{ role: 'user', content: 'hi' }] }, compressor);
  assert.strictEqual(withDefault.body.max_tokens, 4096);
  const withExplicit = openaiRequestToAnthropic({ model: 'x', max_tokens: 512, messages: [{ role: 'user', content: 'hi' }] }, compressor);
  assert.strictEqual(withExplicit.body.max_tokens, 512);
});

test('openaiRequestToAnthropic: stop maps to stop_sequences as an array', () => {
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'anthropic' });
  const single = openaiRequestToAnthropic({ model: 'x', stop: '\n', messages: [{ role: 'user', content: 'hi' }] }, compressor);
  assert.deepStrictEqual(single.body.stop_sequences, ['\n']);
  const multi = openaiRequestToAnthropic({ model: 'x', stop: ['\n', 'END'], messages: [{ role: 'user', content: 'hi' }] }, compressor);
  assert.deepStrictEqual(multi.body.stop_sequences, ['\n', 'END']);
});

test('openaiRequestToAnthropic: OpenAI function tools map to Anthropic input_schema tools', () => {
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'anthropic' });
  const { body } = openaiRequestToAnthropic({
    model: 'x',
    messages: [{ role: 'user', content: 'hi' }],
    tools: [{ type: 'function', function: { name: 'get_weather', description: 'Get weather', parameters: { type: 'object', properties: { city: { type: 'string' } } } } }],
  }, compressor);
  assert.strictEqual(body.tools.length, 1);
  assert.strictEqual(body.tools[0].name, 'get_weather');
  assert.strictEqual(body.tools[0].input_schema.properties.city.type, 'string');
});

test('openaiRequestToAnthropic: non-anthropic-target compression is unaffected by this module existing', () => {
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'openai' });
  const { messages } = compressor.compressMessages([
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'Fix the bug in app.tsx' },
  ], 'openai');
  assert(messages.some((m) => m.role === 'system'), 'OpenAI-target compression should still use role: "system" messages as before');
});

test('openaiRequestToAnthropic: image content parts are marked, not silently dropped', () => {
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'anthropic' });
  const { body } = openaiRequestToAnthropic({
    model: 'x',
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Look at this: ' }, { type: 'image_url', image_url: { url: 'data:...' } }] }],
  }, compressor);
  const userMsg = body.messages.find((m) => m.role === 'user');
  assert(userMsg, 'user message should exist');
  assert(JSON.stringify(userMsg.content).includes('omitted'), 'dropped image content should leave a visible trace, not vanish silently');
});

// ─── anthropicHeadersFromOpenAI ─────────────────────────────────────────

test('anthropicHeadersFromOpenAI: rewrites Bearer auth to x-api-key and adds anthropic-version', () => {
  const headers = anthropicHeadersFromOpenAI({ authorization: 'Bearer sk-ant-real-key', host: 'localhost:8080', 'content-length': '123', 'content-type': 'application/json' });
  assert.strictEqual(headers['x-api-key'], 'sk-ant-real-key');
  assert.strictEqual(headers['anthropic-version'], '2023-06-01');
  assert.strictEqual(headers.authorization, undefined, 'OpenAI-style Authorization header must not reach Anthropic');
  assert.strictEqual(headers.host, undefined);
});

test('anthropicHeadersFromOpenAI: falls back to an existing x-api-key header if no Authorization is present', () => {
  const headers = anthropicHeadersFromOpenAI({ 'x-api-key': 'sk-ant-direct' });
  assert.strictEqual(headers['x-api-key'], 'sk-ant-direct');
});

// ─── anthropicResponseToOpenAI ──────────────────────────────────────────

test('anthropicResponseToOpenAI: text response maps to choices[0].message.content', () => {
  const openai = anthropicResponseToOpenAI({
    id: 'msg_1', model: 'claude-3-5-sonnet-20241022',
    content: [{ type: 'text', text: 'Done.' }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 10, output_tokens: 5 },
  }, 'claude-3-5-sonnet-20241022');
  assert.strictEqual(openai.object, 'chat.completion');
  assert.strictEqual(openai.choices[0].message.content, 'Done.');
  assert.strictEqual(openai.choices[0].finish_reason, 'stop');
  assert.strictEqual(openai.usage.total_tokens, 15);
});

test('anthropicResponseToOpenAI: tool_use blocks map to OpenAI tool_calls', () => {
  const openai = anthropicResponseToOpenAI({
    id: 'msg_2', model: 'claude-3-5-sonnet-20241022',
    content: [{ type: 'tool_use', id: 'toolu_1', name: 'get_weather', input: { city: 'Rome' } }],
    stop_reason: 'tool_use',
    usage: { input_tokens: 20, output_tokens: 8 },
  }, 'claude-3-5-sonnet-20241022');
  assert.strictEqual(openai.choices[0].finish_reason, 'tool_calls');
  assert.strictEqual(openai.choices[0].message.tool_calls[0].function.name, 'get_weather');
  assert.deepStrictEqual(JSON.parse(openai.choices[0].message.tool_calls[0].function.arguments), { city: 'Rome' });
});

test('mapAnthropicStopReason covers known reasons and defaults safely', () => {
  assert.strictEqual(mapAnthropicStopReason('max_tokens'), 'length');
  assert.strictEqual(mapAnthropicStopReason('tool_use'), 'tool_calls');
  assert.strictEqual(mapAnthropicStopReason('end_turn'), 'stop');
  assert.strictEqual(mapAnthropicStopReason('something_unknown'), 'stop');
});

// ─── SSE parsing/streaming ───────────────────────────────────────────────

test('extractSSEEvents parses complete events and holds back an incomplete trailing one', () => {
  const raw = 'event: message_start\ndata: {"a":1}\n\nevent: content_block_delta\ndata: {"b":2}\n\nevent: incomplete\ndata: {"c":';
  const { events, rest } = extractSSEEvents(raw);
  assert.strictEqual(events.length, 2);
  assert.deepStrictEqual(events[0].data, { a: 1 });
  assert.deepStrictEqual(events[1].data, { b: 2 });
  assert(rest.includes('incomplete'), 'the incomplete trailing event should be held back, not dropped or crash');
});

async function collectTransformOutput(transform, inputChunks) {
  const out = [];
  transform.on('data', (chunk) => out.push(chunk.toString('utf8')));
  const ended = once(transform, 'end');
  for (const chunk of inputChunks) transform.write(chunk);
  transform.end();
  await ended;
  return out.join('');
}

await testAsync('createAnthropicToOpenAISSETransform translates text deltas even when split across arbitrary chunk boundaries', async () => {
  const sse = [
    'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_x","model":"claude-3-5-sonnet-20241022"}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hel"}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"lo"}}\n\n',
    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n',
    'event: message_stop\ndata: {"type":"message_stop"}\n\n',
  ].join('');
  // Split at byte offsets that land mid-event on purpose.
  const buf = Buffer.from(sse, 'utf8');
  const chunks = [buf.slice(0, 10), buf.slice(10, 60), buf.slice(60)];

  const transform = createAnthropicToOpenAISSETransform({ model: 'claude-3-5-sonnet-20241022' });
  const output = await collectTransformOutput(transform, chunks);

  const dataBlocks = output.split('\n\n').filter((b) => b.startsWith('data:'));
  const texts = dataBlocks
    .filter((b) => !b.includes('[DONE]'))
    .map((b) => JSON.parse(b.replace(/^data:\s*/, '')))
    .filter((c) => c.choices?.[0]?.delta?.content)
    .map((c) => c.choices[0].delta.content)
    .join('');
  assert.strictEqual(texts, 'Hello');
  assert(output.includes('data: [DONE]'), 'stream must terminate with [DONE] for OpenAI-compatible clients');
  assert(output.includes('"finish_reason":"stop"'), 'the final chunk should carry a mapped finish_reason');
});

// ─── End-to-end: real proxy server, mocked outbound HTTPS ──────────────

async function withMockedHttpsRequest(responder, fn) {
  const originalRequest = https.request;
  const captured = { url: null, options: null, body: '' };
  https.request = (url, options, callback) => {
    captured.url = url.toString();
    captured.options = options;
    const request = new EventEmitter();
    request.write = (chunk) => { captured.body += chunk.toString(); };
    request.end = () => {
      const response = responder();
      queueMicrotask(() => callback(response));
    };
    return request;
  };
  try {
    return await fn(captured);
  } finally {
    https.request = originalRequest;
  }
}

function jsonResponse(statusCode, obj) {
  const stream = Readable.from([Buffer.from(JSON.stringify(obj), 'utf8')]);
  stream.statusCode = statusCode;
  stream.headers = { 'content-type': 'application/json' };
  return stream;
}

function postJson(port, path, payload, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = http.request({
      hostname: '127.0.0.1', port, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...extraHeaders },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

await testAsync('end-to-end: a real Anthropic-target proxy request is translated, not corrupted (the original bug)', async () => {
  await withMockedHttpsRequest(
    () => jsonResponse(200, {
      id: 'msg_e2e', model: 'claude-3-5-sonnet-20241022',
      content: [{ type: 'text', text: 'Fixed it.' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 30, output_tokens: 6 },
    }),
    async (captured) => {
      const { startProxyServer } = await import('../src/proxy.js');
      const server = startProxyServer(0, 'https://api.anthropic.com', { level: 'standard', provider: 'auto' });
      await once(server, 'listening');
      try {
        const res = await postJson(server.address().port, '/v1/chat/completions', {
          model: 'claude-3-5-sonnet-20241022',
          messages: [
            { role: 'system', content: 'You are a coding assistant.' },
            { role: 'user', content: 'Fix the AuthenticationManager error: '.repeat(10) + 'function AuthenticationManager() { return null; } '.repeat(10) },
          ],
        }, { Authorization: 'Bearer sk-ant-e2e-key' });

        assert.strictEqual(captured.url, 'https://api.anthropic.com/v1/messages', 'must forward to the real Messages API endpoint, not /v1/chat/completions');
        assert.strictEqual(captured.options.headers['x-api-key'], 'sk-ant-e2e-key');
        assert(captured.options.headers['anthropic-version']);
        assert.strictEqual(captured.options.headers['authorization'], undefined);

        const forwarded = JSON.parse(captured.body);
        assert(!forwarded.messages.some((m) => m.role === 'system'), 'forwarded messages must never contain the illegal system role');
        assert(typeof forwarded.system !== 'undefined' && forwarded.system, 'the system prompt must reach Anthropic via the top-level system field');
        assert(typeof forwarded.max_tokens === 'number');

        assert.strictEqual(res.statusCode, 200);
        const clientJson = JSON.parse(res.body);
        assert.strictEqual(clientJson.object, 'chat.completion', 'the client must receive an OpenAI-shaped response back');
        assert.strictEqual(clientJson.choices[0].message.content, 'Fixed it.');
      } finally {
        server.close();
      }
    },
  );
});

await testAsync('end-to-end: streaming Anthropic responses are translated to OpenAI-compatible SSE', async () => {
  const sseEvents = [
    { event: 'message_start', data: { type: 'message_start', message: { id: 'msg_stream_e2e', model: 'claude-3-5-sonnet-20241022' } } },
    { event: 'content_block_delta', data: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi' } } },
    { event: 'content_block_delta', data: { type: 'content_block_delta', delta: { type: 'text_delta', text: ' there' } } },
    { event: 'message_delta', data: { type: 'message_delta', delta: { stop_reason: 'end_turn' } } },
    { event: 'message_stop', data: { type: 'message_stop' } },
  ];
  const sseText = sseEvents.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join('');

  await withMockedHttpsRequest(
    () => {
      const stream = Readable.from([Buffer.from(sseText, 'utf8')]);
      stream.statusCode = 200;
      stream.headers = { 'content-type': 'text/event-stream' };
      return stream;
    },
    async () => {
      const { startProxyServer } = await import('../src/proxy.js');
      const server = startProxyServer(0, 'https://api.anthropic.com', { level: 'standard', provider: 'auto' });
      await once(server, 'listening');
      try {
        const res = await postJson(server.address().port, '/v1/chat/completions', {
          model: 'claude-3-5-sonnet-20241022',
          stream: true,
          messages: [{ role: 'user', content: 'Say hi.' }],
        }, { Authorization: 'Bearer sk-ant-e2e-key' });

        assert.strictEqual(res.headers['content-type'], 'text/event-stream; charset=utf-8');
        const texts = res.body.split('\n\n')
          .filter((b) => b.startsWith('data:') && !b.includes('[DONE]'))
          .map((b) => JSON.parse(b.replace(/^data:\s*/, '')))
          .filter((c) => c.choices?.[0]?.delta?.content)
          .map((c) => c.choices[0].delta.content)
          .join('');
        assert.strictEqual(texts, 'Hi there');
        assert(res.body.includes('data: [DONE]'));
      } finally {
        server.close();
      }
    },
  );
});

await testAsync('end-to-end: OpenAI and Gemini targets are unaffected by the Anthropic bridge (no regression)', async () => {
  await withMockedHttpsRequest(
    () => jsonResponse(200, { ok: true }),
    async (captured) => {
      const { startProxyServer } = await import('../src/proxy.js');
      const server = startProxyServer(0, 'https://api.openai.com', { level: 'standard', provider: 'auto' });
      await once(server, 'listening');
      try {
        // A repeated, varied, code-shaped payload (not a one-liner) so the
        // net-negative fallback doesn't fire and mask the assertion below —
        // the same "too small to compress" gotcha test/context-router.js
        // already guards against via its usedAdaptiveFallback check.
        const repeatableCode = 'function handleClick(event) { const result = fetchData(event); return result; } '.repeat(25);
        await postJson(server.address().port, '/v1/chat/completions', {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Fix the error in the React frontend component. TypeError: cannot read property of undefined at line 42. ' + repeatableCode }],
        }, { Authorization: 'Bearer sk-openai-key' });
        assert.strictEqual(captured.url, 'https://api.openai.com/v1/chat/completions', 'non-Anthropic targets must keep their original path');
        assert.strictEqual(captured.options.headers['authorization'], 'Bearer sk-openai-key', 'non-Anthropic targets must keep the original Authorization header untouched');
        const forwarded = JSON.parse(captured.body);
        assert(forwarded.messages.some((m) => m.role === 'system'), 'OpenAI target should keep role: "system" as before — only Anthropic targets get translated');
      } finally {
        server.close();
      }
    },
  );
});

// ─── Native Anthropic clients (v1.32.5) ────────────────────────
// v1.24.0 fixed the proxy corrupting OpenAI-shaped requests sent to an
// Anthropic target, on the premise that every documented IDE integration
// speaks "OpenAI Compatible" mode. That premise breaks for a *native*
// Anthropic client — Claude Code, Claude Desktop, or the SDK pointed at the
// proxy via ANTHROPIC_BASE_URL — where re-running the OpenAI translator
// rebuilds the body from an allowlist and drops the top-level `system`
// prompt and the whole `tools` array. For an agentic client that means
// losing every tool it has.

function nativeAnthropicPayload() {
  return {
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: [{ type: 'text', text: 'You are Claude Code.' }],
    messages: [{ role: 'user', content: 'Fix the bug in src/app.ts' }],
    tools: [{ name: 'Read', description: 'read a file', input_schema: { type: 'object', properties: {} } }],
    tool_choice: { type: 'auto' },
    metadata: { user_id: 'abc' },
    thinking: { type: 'enabled', budget_tokens: 1024 },
  };
}

test('isNativeAnthropicRequest recognises a top-level system field', () => {
  assert.strictEqual(isNativeAnthropicRequest(nativeAnthropicPayload()), true);
  assert.strictEqual(isNativeAnthropicRequest({ system: 'plain string', messages: [] }), true);
});

test('isNativeAnthropicRequest recognises Anthropic-shaped tools without a system field', () => {
  assert.strictEqual(
    isNativeAnthropicRequest({ model: 'x', messages: [], tools: [{ name: 't', input_schema: { type: 'object' } }] }),
    true,
  );
});

test('isNativeAnthropicRequest does not misfire on OpenAI-shaped requests', () => {
  // A false positive here would skip the translation an OpenAI-shaped
  // request genuinely needs, reintroducing the v1.24.0 corruption.
  const openaiShaped = {
    model: 'gpt-4o',
    messages: [{ role: 'system', content: 'You are helpful.' }, { role: 'user', content: 'hi' }],
    tools: [{ type: 'function', function: { name: 'f', parameters: { type: 'object' } } }],
  };
  assert.strictEqual(isNativeAnthropicRequest(openaiShaped), false);
  assert.strictEqual(isNativeAnthropicRequest({ model: 'gpt-4o', messages: [] }), false);
  assert.strictEqual(isNativeAnthropicRequest(null), false);
  assert.strictEqual(isNativeAnthropicRequest(undefined), false);
});

test('a native Anthropic request keeps its system prompt', () => {
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'anthropic' });
  const { body } = compressNativeAnthropicRequest(nativeAnthropicPayload(), compressor);
  assert(body.system, 'the top-level system prompt must survive — dropping it silently changes model behavior');
});

test('a native Anthropic request keeps its tools', () => {
  // The failure that matters most: an agentic client stripped of its tools
  // still gets a 200 back, so the breakage is silent rather than loud.
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'anthropic' });
  const { body } = compressNativeAnthropicRequest(nativeAnthropicPayload(), compressor);
  assert(Array.isArray(body.tools) && body.tools.length === 1, 'tools must survive');
  assert.strictEqual(body.tools[0].name, 'Read');
  assert(body.tools[0].input_schema, 'Anthropic tool schema must not be reshaped');
});

test('a native Anthropic request keeps fields this bridge does not know about', () => {
  // Rebuilding from an allowlist is what caused the bug; anything the API
  // gains later must pass through untouched rather than silently vanish.
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'anthropic' });
  const { body } = compressNativeAnthropicRequest(nativeAnthropicPayload(), compressor);
  assert.deepStrictEqual(body.tool_choice, { type: 'auto' }, 'tool_choice must pass through');
  assert.deepStrictEqual(body.metadata, { user_id: 'abc' }, 'metadata must pass through');
  assert.deepStrictEqual(body.thinking, { type: 'enabled', budget_tokens: 1024 }, 'thinking must pass through');
  assert.strictEqual(body.max_tokens, 4096, 'max_tokens must not be replaced by the bridge default');
  assert.strictEqual(body.model, 'claude-sonnet-4-5');
});

test('the OpenAI translation path is unchanged by the native path', () => {
  // Control: the v1.24.0 behavior must be exactly as before for the shape it
  // was written for.
  const compressor = new GlyphCompressor({ level: 'standard', provider: 'anthropic' });
  const { body } = openaiRequestToAnthropic(
    {
      model: 'gpt-4o',
      messages: [{ role: 'system', content: 'You are helpful.' }, { role: 'user', content: 'hello there' }],
      tools: [{ type: 'function', function: { name: 'f', description: 'd', parameters: { type: 'object' } } }],
    },
    compressor,
  );
  assert(body.system, 'OpenAI system message must still be lifted to the top level');
  assert.strictEqual(body.tools.length, 1, 'OpenAI tools must still be mapped');
  assert.strictEqual(body.tools[0].name, 'f');
  assert(!body.messages.some((m) => m.role === 'system'), 'no illegal role:system may remain in messages');
});

console.log(`\nanthropic-bridge: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('anthropic-bridge suite ok');
}
