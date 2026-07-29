import http from 'http';
import https from 'https';
import { GlyphCompressor } from './glyph-middleware.js';
import { getDashboardHTML } from './dashboard.js';
import { createStructuredLogger, redactForLog } from './logger.js';
import {
  isAnthropicNativeTarget,
  isNativeAnthropicRequest,
  compressNativeAnthropicRequest,
  openaiRequestToAnthropic,
  anthropicHeadersFromOpenAI,
  anthropicResponseToOpenAI,
  createAnthropicToOpenAISSETransform,
} from './anthropic-bridge.js';

export function startProxyServer(port = 8080, targetApiUrl = 'https://api.openai.com', levelOrOptions = 'aggressive', sharedCompressor = null, outputChannel = null) {
  const options = normalizeProxyOptions(levelOrOptions, sharedCompressor, outputChannel, targetApiUrl);
  const compressor = options.compressor || new GlyphCompressor({
    level: options.level,
    provider: options.provider,
    trustPolicy: options.trustPolicy,
    privacyFirewall: options.privacyFirewall,
    attentionalDecay: options.attentionalDecay,
    holographicFolding: options.holographicFolding,
    intentDiffs: options.intentDiffs,
  });

  const statsHistory = [];
  const logHistory = [];
  let totalOriginalTokens = 0;
  let totalCompressedTokens = 0;
  let messagesProcessed = 0;

  const structuredLogger = createStructuredLogger({
    logFile: options.logFile,
    outputChannel: options.outputChannel,
    onEntry: (entry) => {
      logHistory.push({
        // Kept for the existing dashboard UI (src/dashboard.js reads
        // log.timestamp/log.text directly) — isoTimestamp/level are the
        // new structured fields for programmatic consumers.
        timestamp: new Date(entry.timestamp).toLocaleTimeString(),
        text: entry.message,
        isoTimestamp: entry.timestamp,
        level: entry.level,
      });
      if (logHistory.length > 50) logHistory.shift();
    },
  });
  const log = (message, meta) => structuredLogger.info(message, meta);

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
          const anthropicBridge = isAnthropicNativeTarget(targetApiUrl);
          let forwardBody = body;
          let bridgeInfo = null;

          if (payload.messages && Array.isArray(payload.messages)) {
            log(`[Proxy] Intercepted ${req.method} ${req.url}`, { requestId: messagesProcessed + 1 });

            let stats;
            if (anthropicBridge && isNativeAnthropicRequest(payload)) {
              // A native Anthropic client (Claude Code / Claude Desktop / the
              // SDK via ANTHROPIC_BASE_URL) already speaks the Messages API.
              // Running the OpenAI translator over it would rebuild the body
              // from an allowlist and silently drop the top-level `system`
              // prompt and the whole `tools` array — which for an agentic
              // client means losing every tool it has. Compress in place.
              const compressedNative = compressNativeAnthropicRequest(payload, compressor);
              stats = compressedNative.stats;
              forwardBody = JSON.stringify(compressedNative.body);
              bridgeInfo = { requestedModel: payload.model, isStreaming: payload.stream === true, native: true };
              log(`[Proxy] Anthropic native request compressed in place (model=${payload.model})`);
            } else if (anthropicBridge) {
              // Every documented IDE integration sends OpenAI-shaped chat/
              // completions requests regardless of the upstream target, but
              // api.anthropic.com only understands its own Messages API
              // shape (top-level `system`, x-api-key auth, /v1/messages).
              // Translate instead of forwarding the OpenAI shape as-is.
              const translated = openaiRequestToAnthropic(payload, compressor);
              stats = translated.stats;
              forwardBody = JSON.stringify(translated.body);
              bridgeInfo = { requestedModel: payload.model, isStreaming: payload.stream === true };
              log(`[Proxy] Anthropic bridge: translated OpenAI request to native Messages API shape (model=${translated.body.model})`);
            } else {
              const compressedResult = compressor.compressMessages(payload.messages, options.compressionProvider);
              payload.messages = compressedResult.messages;
              forwardBody = JSON.stringify(payload);
              stats = compressedResult.stats;
            }

            // Richer routing/trust diagnostics: which knobs actually shaped
            // this request, not just the ratio it produced.
            log(`[Proxy] Provider=${options.compressionProvider} level=${compressor.level} trust=${compressor.trustPolicy}`, {
              privacyFirewall: compressor.privacyFirewall,
              attentionalDecay: compressor.attentionalDecay,
              holographicFolding: compressor.holographicFolding,
              intentDiffs: compressor.intentDiffs,
              dynamicDictSize: compressor.dynamicDict.size,
              fileIndexSize: compressor.fileIndex.size,
              teamCodebookLoaded: compressor.getTeamCodebookInfo().loaded,
              fallback: stats?.thisMessage?.fallback === true,
            });

            const thisMsg = stats?.thisMessage;
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
          forwardRequest(req, res, targetApiUrl, forwardBody, structuredLogger, bridgeInfo);
          
        } catch (e) {
          log('[Proxy] Error parsing/compressing JSON: ' + e.message);
          // Fallback to forwarding the raw body if it's not JSON or fails
          forwardRequest(req, res, targetApiUrl, body, structuredLogger);
        }
      });
    } else {
      // Forward GET/OPTIONS and other requests directly
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => forwardRequest(req, res, targetApiUrl, body, structuredLogger));
    }
  });

  // Without this handler a failed bind is an *asynchronous* 'error' event with
  // no listener, which Node escalates to an uncaught exception. In the VS Code
  // extension host that never reaches the try/catch around this call, so the
  // command reported nothing at all: no "running" line, no error toast, no
  // proxy. The commonest cause is the port already being held — often by a
  // previous proxy that outlived the window that started it.
  server.on('error', (err) => {
    const detail = err && err.code === 'EADDRINUSE'
      ? `port ${port} is already in use — another GlyphProxy (or another process) is holding it. `
        + `Stop it and retry, or start this one on a different port.`
      : (err && err.message) || String(err);
    log(`[Proxy] Failed to start: ${detail}`);
    if (typeof options.onError === 'function') options.onError(err, detail);
    else if (!server.listening) {
      // No caller-supplied handler: re-throwing here would be the same uncaught
      // exception this guard exists to remove, so surface it and stop quietly.
      structuredLogger.error('[Proxy] No onError handler supplied; the proxy is not running.');
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
    holographicFolding: Boolean(raw.holographicFolding || raw.folding || raw.compressor?.holographicFolding),
    intentDiffs: Boolean(raw.intentDiffs || raw.intents || raw.compressor?.intentDiffs),
    compressor: raw.compressor || sharedCompressor || null,
    outputChannel: raw.outputChannel || outputChannel || null,
    logFile: raw.logFile || null,
    // Called when the server cannot bind. Without it a bind failure is an
    // uncaught async exception the caller never sees — see server.on('error').
    onError: typeof raw.onError === 'function' ? raw.onError : null,
  };
}

const fallbackLogger = createStructuredLogger();

function forwardRequest(clientReq, clientRes, targetApiUrl, body, logger = fallbackLogger, bridge = null) {
  try {
    let requestPath = clientReq.url;
    let headers = { ...clientReq.headers };

    if (bridge) {
      // Anthropic's Messages API is a fixed endpoint with its own auth
      // headers — never the path/headers the OpenAI-compatible client sent.
      requestPath = '/v1/messages';
      headers = anthropicHeadersFromOpenAI(clientReq.headers);
    } else if (targetApiUrl.includes('generativelanguage.googleapis.com') && requestPath.startsWith('/v1/')) {
      requestPath = requestPath.replace('/v1/', '/v1beta/openai/');
    }
    const url = new URL(requestPath, targetApiUrl);

    const options = {
      method: clientReq.method,
      headers,
    };

    // Remove host header to avoid SSL mismatch
    delete options.headers['host'];
    // Update content-length since we modified the body
    if (body) {
      options.headers['content-length'] = Buffer.byteLength(body);
    }

    const requestClient = url.protocol === 'http:' ? http : https;
    const proxyReq = requestClient.request(url, options, (proxyRes) => {
      logger.info(`[Proxy] Upstream ${proxyRes.statusCode} ${proxyRes.statusMessage || ''}`.trim());

      if (proxyRes.statusCode >= 400) {
        const chunks = [];
        proxyRes.on('data', chunk => chunks.push(chunk));
        proxyRes.on('end', () => {
          const responseBody = Buffer.concat(chunks);
          logger.error('[Proxy] Upstream error body: ' + redactForLog(responseBody.toString('utf8'), 1200));
          clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
          clientRes.end(responseBody);
        });
        return;
      }

      if (bridge) {
        // The client only understands OpenAI-shaped responses — translate
        // Anthropic's native response (JSON or SSE) back before returning it.
        if (bridge.isStreaming) {
          clientRes.writeHead(proxyRes.statusCode, {
            'content-type': 'text/event-stream; charset=utf-8',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          });
          const transform = createAnthropicToOpenAISSETransform({ model: bridge.requestedModel });
          proxyRes.pipe(transform).pipe(clientRes, { end: true });
        } else {
          const chunks = [];
          proxyRes.on('data', chunk => chunks.push(chunk));
          proxyRes.on('end', () => {
            try {
              const anthropicJson = JSON.parse(Buffer.concat(chunks).toString('utf8'));
              const openaiJson = anthropicResponseToOpenAI(anthropicJson, bridge.requestedModel);
              const responseBody = JSON.stringify(openaiJson);
              clientRes.writeHead(proxyRes.statusCode, {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(responseBody),
              });
              clientRes.end(responseBody);
            } catch (err) {
              logger.error('[Proxy] Anthropic response translation error: ' + err.message);
              const raw = Buffer.concat(chunks);
              clientRes.writeHead(proxyRes.statusCode, { 'content-type': 'application/json' });
              clientRes.end(raw);
            }
          });
        }
        return;
      }

      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      let responseBytes = 0;
      proxyRes.on('data', chunk => { responseBytes += chunk.length; });
      proxyRes.on('end', () => {
        logger.info(`[Proxy] Upstream response completed (${responseBytes} bytes)`);
      });
      clientRes.on('close', () => {
        if (!clientRes.writableEnded) {
          logger.warn('[Proxy] Client closed response before stream completed');
        }
      });
      proxyRes.pipe(clientRes, { end: true });
    });

    proxyReq.on('error', (err) => {
      logger.error('[Proxy] Forwarding error: ' + err.message);
      clientRes.writeHead(500);
      clientRes.end('Proxy Error: ' + err.message);
    });

    if (body) {
      proxyReq.write(body);
    }
    proxyReq.end();
  } catch (err) {
    logger.error('[Proxy] Request setup error: ' + err.message);
    clientRes.writeHead(500);
    clientRes.end('Proxy Setup Error: ' + err.message);
  }
}
