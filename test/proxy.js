import assert from 'assert';
import { EventEmitter, once } from 'events';
import http from 'http';
import https from 'https';
import { Readable } from 'stream';

let forwardedBody = '';
let forwardedUrl = '';
let forwardedOptions = null;
const originalRequest = https.request;

https.request = (url, options, callback) => {
  forwardedUrl = url.toString();
  forwardedOptions = options;

  const request = new EventEmitter();
  request.write = (chunk) => {
    forwardedBody += chunk.toString();
  };
  request.end = () => {
    const proxyResponse = Readable.from(['{"ok":true}']);
    proxyResponse.statusCode = 200;
    proxyResponse.headers = { 'content-type': 'application/json' };
    queueMicrotask(() => callback(proxyResponse));
  };
  return request;
};

let server;

try {
  const { startProxyServer } = await import('../src/proxy.js');
  const logs = [];
  server = startProxyServer(0, 'https://generativelanguage.googleapis.com', {
    level: 'standard',
    provider: 'auto',
    trustPolicy: 'privacy',
    outputChannel: {
      appendLine(message) { logs.push(String(message)); },
    },
  });

  await once(server, 'listening');
  const response = await postJson(server.address().port, '/v1/chat/completions', {
    messages: [{ role: 'user', content: 'fix the error in src/app.tsx' }],
  });

  assert(response.statusCode === 200, 'proxy should relay upstream status code');
  assert(response.body === '{"ok":true}', 'proxy should relay upstream response body');
  assert(forwardedUrl === 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', 'proxy should map OpenAI-compatible Gemini request path');
  assert(forwardedOptions.method === 'POST', 'proxy should forward POST method');
  assert(Number(forwardedOptions.headers['content-length']) === Buffer.byteLength(forwardedBody), 'proxy should update content-length');

  const payload = JSON.parse(forwardedBody);
  const content = payload.messages.map((message) => String(message.content || '')).join('\n');
  const usedAdaptiveFallback = payload.messages.length === 1
    && payload.messages[0].role === 'user'
    && payload.messages[0].content === 'fix the error in src/app.tsx';
  assert(content.includes('[GLYPH PROTOCOL') || usedAdaptiveFallback, 'proxy should either inject the glyph protocol or preserve the original payload via adaptive fallback');
  assert(content.includes('src/app.tsx') || content.includes('₍') || usedAdaptiveFallback, 'proxy should forward either compressed or preserved user context');
  assert(logs.some((line) => line.includes('Provider=gemini')), 'proxy should infer Gemini provider from target when provider is auto');
  assert(logs.some((line) => line.includes('trust=privacy')), 'proxy should preserve trust policy options');
  assert(logs.some((line) => line.includes('Compression ratio')), 'proxy should report compression logs');
} finally {
  https.request = originalRequest;
  if (server) server.close();
}

// vscode-ext/proxy.js used to be a hand-maintained CJS duplicate of this
// file that had visibly drifted (missing attentionalDecay/holographicFolding/
// intentDiffs options, no dashboard/stats endpoints, no structured logging).
// It's now esbuild-generated from this same source (scripts/build-middleware.js)
// instead, but had zero test coverage before or after that change — nothing
// exercised the require("./glyph-middleware.cjs") rewrite the build performs.
// This closes that gap by actually starting the CJS build and hitting it.
let cjsServer;
https.request = (url, options, callback) => {
  forwardedUrl = url.toString();
  const request = new EventEmitter();
  request.write = () => {};
  request.end = () => {
    const proxyResponse = Readable.from(['{"ok":true}']);
    proxyResponse.statusCode = 200;
    proxyResponse.headers = { 'content-type': 'application/json' };
    queueMicrotask(() => callback(proxyResponse));
  };
  return request;
};

try {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const { startProxyServer: startProxyServerCjs } = require('../vscode-ext/proxy.js');
  cjsServer = startProxyServerCjs(0, 'https://api.anthropic.com', { level: 'standard', provider: 'auto' });
  await once(cjsServer, 'listening');
  const response = await postJson(cjsServer.address().port, '/v1/messages', {
    messages: [{ role: 'user', content: 'explain how the compressor works' }],
  });
  assert(response.statusCode === 200, 'vscode-ext CJS proxy build should relay upstream status code');
  assert(forwardedUrl.includes('api.anthropic.com'), 'vscode-ext CJS proxy build should forward to the target API');
} finally {
  https.request = originalRequest;
  if (cjsServer) cjsServer.close();
}

console.log('proxy smoke suite ok');

function postJson(port, path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    }, (response) => {
      let responseBody = '';
      response.on('data', (chunk) => { responseBody += chunk.toString(); });
      response.on('end', () => resolve({ statusCode: response.statusCode, body: responseBody }));
    });

    request.on('error', reject);
    request.write(body);
    request.end();
  });
}