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
  const { startProxyServer } = await import('../vscode-ext/proxy.js');
  const logs = [];
  server = startProxyServer(0, 'https://api.openai.com', 'standard', null, {
    appendLine(message) { logs.push(String(message)); },
  });

  await once(server, 'listening');
  const response = await postJson(server.address().port, '/v1/chat/completions', {
    messages: [{ role: 'user', content: 'fix the error in src/app.tsx' }],
  });

  assert(response.statusCode === 200, 'proxy should relay upstream status code');
  assert(response.body === '{"ok":true}', 'proxy should relay upstream response body');
  assert(forwardedUrl === 'https://api.openai.com/v1/chat/completions', 'proxy should preserve OpenAI request path');
  assert(forwardedOptions.method === 'POST', 'proxy should forward POST method');
  assert(Number(forwardedOptions.headers['content-length']) === Buffer.byteLength(forwardedBody), 'proxy should update content-length');

  const payload = JSON.parse(forwardedBody);
  const content = payload.messages.map((message) => String(message.content || '')).join('\n');
  assert(content.includes('[GLYPH PROTOCOL'), 'proxy should inject the glyph protocol');
  assert(content.includes('src/app.tsx') || content.includes('₍'), 'proxy should forward compressed user context');
  assert(logs.some((line) => line.includes('POST-Compression')), 'proxy should report compression logs');
} finally {
  https.request = originalRequest;
  if (server) server.close();
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