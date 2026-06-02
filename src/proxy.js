import http from 'http';
import https from 'https';
import { GlyphCompressor } from './glyph-middleware.js';
import { getDashboardHTML } from './dashboard.js';

export function startProxyServer(port = 8080, targetApiUrl = 'https://api.openai.com', levelOrOptions = 'aggressive', sharedCompressor = null, outputChannel = null) {
  const options = normalizeProxyOptions(levelOrOptions, sharedCompressor, outputChannel, targetApiUrl);
  const compressor = options.compressor || new GlyphCompressor({
    level: options.level,
    provider: options.provider,
    trustPolicy: options.trustPolicy,
    privacyFirewall: options.privacyFirewall,
    attentionalDecay: options.attentionalDecay,
  });

  const statsHistory = [];
  const logHistory = [];
  let totalOriginalTokens = 0;
  let totalCompressedTokens = 0;
  let messagesProcessed = 0;

  const rawLog = createLogger(options.outputChannel);
  const log = (message) => {
    rawLog(message);
    logHistory.push({
      timestamp: new Date().toLocaleTimeString(),
      text: message
    });
    if (logHistory.length > 50) logHistory.shift();
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost:' + port}`);

    // Serve HTML Dashboard
    if (req.method === 'GET' && url.pathname === '/dashboard') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getDashboardHTML());
      return;
    }

    // Serve real-time JSON stats
    if (req.method === 'GET' && url.pathname === '/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'active',
        provider: options.compressionProvider,
        level: options.level,
        decay: options.attentionalDecay,
        target: targetApiUrl,
        history: statsHistory,
        logs: logHistory,
        totals: {
          original: totalOriginalTokens,
          compressed: totalCompressedTokens,
          saved: totalOriginalTokens - totalCompressedTokens,
          processed: messagesProcessed,
          ratio: totalOriginalTokens > 0 
            ? (totalOriginalTokens / Math.max(1, totalCompressedTokens)).toFixed(2) + 'x' 
            : '1.00x',
          pct: totalOriginalTokens > 0 
            ? ((1 - totalCompressedTokens / totalOriginalTokens) * 100).toFixed(0) + '%' 
            : '0%'
        }
      }));
      return;
    }

    // We only care about intercepting POST requests with JSON body (like chat/completions)
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      
      req.on('end', () => {
        try {
          // Parse the incoming request from the IDE
          const payload = JSON.parse(body);
          
          if (payload.messages && Array.isArray(payload.messages)) {
            log(`[Proxy] Intercepted ${req.method} ${req.url}`);
            
            const { messages: compressedMessages, stats } = compressor.compressMessages(payload.messages, options.compressionProvider);
            payload.messages = compressedMessages;
            
            log(`[Proxy] Provider=${options.compressionProvider} level=${compressor.level} trust=${compressor.trustPolicy}`);
            
            const thisMsg = stats.thisMessage;
            if (thisMsg) {
              log(`[Proxy] Compression ratio: ${thisMsg.ratio || '1.0x'} (Saved: ${thisMsg.savedPct || '0%'})`);
              
              totalOriginalTokens += thisMsg.originalTokens || 0;
              totalCompressedTokens += thisMsg.compressedTokens || 0;
              messagesProcessed++;

              statsHistory.unshift({
                id: messagesProcessed,
                timestamp: new Date().toLocaleTimeString(),
                originalTokens: thisMsg.originalTokens,
                compressedTokens: thisMsg.compressedTokens,
                saved: thisMsg.saved,
                ratio: thisMsg.ratio,
                savedPct: thisMsg.savedPct,
                selectedLevel: thisMsg.selectedLevel,
                provider: thisMsg.provider
              });
              if (statsHistory.length > 50) statsHistory.pop();
            }
          }
          
          // Forward the modified request to the actual LLM API
          forwardRequest(req, res, targetApiUrl, JSON.stringify(payload));
          
        } catch (e) {
          log('[Proxy] Error parsing/compressing JSON: ' + e.message);
          // Fallback to forwarding the raw body if it's not JSON or fails
          forwardRequest(req, res, targetApiUrl, body);
        }
      });
    } else {
      // Forward GET/OPTIONS and other requests directly
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => forwardRequest(req, res, targetApiUrl, body));
    }
  });

  server.listen(port, () => {
    log(`\nGlyphProxy is running on http://localhost:${server.address().port}`);
    log(`Forwarding to: ${targetApiUrl}`);
    log(`Compression: provider=${options.compressionProvider}, level=${options.level}, trust=${options.trustPolicy}`);
    if (options.attentionalDecay) {
      log(`Decay: experimental attentional decay compaction enabled`);
    }
    log(`Configure your IDE (Cursor, Cline, etc.) to use http://localhost:${server.address().port} as the OpenAI Base URL.`);
  });
  
  return server;
}

export function inferProviderFromTarget(targetApiUrl = '') {
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
    attentionalDecay: Boolean(raw.attentionalDecay || raw.decay || raw.compressor?.attentionalDecay),
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

    // Remove host header to avoid SSL mismatch
    delete options.headers['host'];
    // Update content-length since we modified the body
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

    if (body) {
      proxyReq.write(body);
    }
    proxyReq.end();
  } catch (err) {
    console.error('[Proxy] Request setup error:', err.message);
    clientRes.writeHead(500);
    clientRes.end('Proxy Setup Error: ' + err.message);
  }
}
