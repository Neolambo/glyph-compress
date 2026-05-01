const http = require('http');
const https = require('https');
const { GlyphCompressor } = require('./glyph-middleware.cjs');

function startProxyServer(port = 8080, targetApiUrl = 'https://api.openai.com', levelOrOptions = 'aggressive', sharedCompressor = null, outputChannel = null) {
  const options = normalizeProxyOptions(levelOrOptions, sharedCompressor, outputChannel, targetApiUrl);
  const compressor = options.compressor || new GlyphCompressor({
    level: options.level,
    provider: options.provider,
    trustPolicy: options.trustPolicy,
    privacyFirewall: options.privacyFirewall,
  });
  const log = createLogger(options.outputChannel);

  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          if (payload.messages && Array.isArray(payload.messages)) {
            log(`[Proxy] Intercepted ${req.method} ${req.url}`);
            const { messages: compressedMessages, stats } = compressor.compressMessages(payload.messages, options.compressionProvider);
            payload.messages = compressedMessages;
            log(`[Proxy] Provider=${options.compressionProvider} level=${compressor.level} trust=${compressor.trustPolicy}`);
            log(`[Proxy] POST-Compression: Ratio ${stats.thisMessage?.ratio || '1.0x'} (Saved: ${stats.thisMessage?.savedPct || '0%'})`);
          }
          forwardRequest(req, res, targetApiUrl, JSON.stringify(payload));
        } catch (e) {
          log('[Proxy] Error parsing/compressing JSON: ' + e.message);
          forwardRequest(req, res, targetApiUrl, body);
        }
      });
    } else {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => forwardRequest(req, res, targetApiUrl, body));
    }
  });

  server.listen(port, () => {
    log(`\nGlyphProxy is running on http://localhost:${port}`);
    log(`Forwarding to: ${targetApiUrl}`);
    log(`Compression: provider=${options.compressionProvider}, level=${compressor.level}, trust=${compressor.trustPolicy}`);
    log(`Configure your IDE (Cursor, Cline, etc.) to use http://localhost:${port} as the OpenAI Base URL.`);
  });

  return server;
}

function inferProviderFromTarget(targetApiUrl = '') {
  const target = String(targetApiUrl).toLowerCase();
  if (target.includes('anthropic.com')) return 'anthropic';
  if (target.includes('generativelanguage.googleapis.com') || target.includes('googleapis.com')) return 'gemini';
  if (target.includes('openai.com')) return 'openai';
  if (target.includes('localhost') || target.includes('127.0.0.1')) return 'local';
  return 'openai';
}

function normalizeProxyOptions(levelOrOptions, sharedCompressor, outputChannel, targetApiUrl) {
  const raw = typeof levelOrOptions === 'object' && levelOrOptions !== null
    ? levelOrOptions
    : { level: levelOrOptions, compressor: sharedCompressor, outputChannel };
  const provider = raw.provider || raw.compressor?.provider || 'auto';
  return {
    level: raw.level || raw.compressor?.level || 'aggressive',
    provider,
    compressionProvider: provider === 'auto' ? inferProviderFromTarget(targetApiUrl) : provider,
    trustPolicy: raw.trustPolicy || raw.policy || raw.compressor?.trustPolicy || 'auto',
    privacyFirewall: Boolean(raw.privacyFirewall || raw.privacy),
    compressor: raw.compressor || sharedCompressor || null,
    outputChannel: raw.outputChannel || outputChannel || null,
  };
}

function createLogger(outputChannel) {
  return (message) => {
    if (outputChannel) outputChannel.appendLine(message);
    console.log(message);
  };
}

function redactForLog(value = '') {
  return String(value)
    .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+/gi, 'Bearer [REDACTED]')
    .replace(/"api[_-]?key"\s*:\s*"[^"]+"/gi, '"apiKey":"[REDACTED]"')
    .slice(0, 1200);
}

function forwardRequest(clientReq, clientRes, targetApiUrl, body) {
  try {
    let requestPath = clientReq.url;
    if (targetApiUrl.includes('generativelanguage.googleapis.com') && requestPath.startsWith('/v1/')) {
      requestPath = requestPath.replace('/v1/', '/v1beta/openai/');
    }
    const url = new URL(requestPath, targetApiUrl);
    const options = {
      method: clientReq.method,
      headers: { ...clientReq.headers },
    };

    delete options.headers.host;
    if (body) {
      options.headers['content-length'] = Buffer.byteLength(body);
    }

    const requestClient = url.protocol === 'http:' ? http : https;
    const proxyReq = requestClient.request(url, options, (proxyRes) => {
      console.log(`[Proxy] Upstream ${proxyRes.statusCode} ${proxyRes.statusMessage || ''}`.trim());

      if (proxyRes.statusCode >= 400) {
        const chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        proxyRes.on('end', () => {
          const responseBody = Buffer.concat(chunks);
          console.error('[Proxy] Upstream error body:', redactForLog(responseBody.toString('utf8')));
          clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
          clientRes.end(responseBody);
        });
        return;
      }

      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      let responseBytes = 0;
      proxyRes.on('data', chunk => { responseBytes += chunk.length; });
      proxyRes.on('end', () => {
        console.log(`[Proxy] Upstream response completed (${responseBytes} bytes)`);
      });
      clientRes.on('close', () => {
        if (!clientRes.writableEnded) {
          console.warn('[Proxy] Client closed response before stream completed');
        }
      });
      proxyRes.pipe(clientRes, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy] Forwarding error:', err.message);
      clientRes.writeHead(500);
      clientRes.end('Proxy Error: ' + err.message);
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  } catch (err) {
    console.error('[Proxy] Request setup error:', err.message);
    clientRes.writeHead(500);
    clientRes.end('Proxy Setup Error: ' + err.message);
  }
}

module.exports = { startProxyServer, inferProviderFromTarget };
