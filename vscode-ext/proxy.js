import http from 'http';
import https from 'https';
import { GlyphCompressor } from './glyph-middleware.js';

export function startProxyServer(port = 8080, targetApiUrl = 'https://api.openai.com', level = 'aggressive', sharedCompressor = null, outputChannel = null) {
  const compressor = sharedCompressor || new GlyphCompressor({ level });
  
  const log = (msg) => {
    if (outputChannel) outputChannel.appendLine(msg);
    console.log(msg);
  };

  const server = http.createServer((req, res) => {
    // We only care about intercepting POST requests with JSON body (like chat/completions)
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      
      req.on('end', () => {
        try {
          // Parse the incoming request from the IDE
          const payload = JSON.parse(body);
          
          if (payload.messages && Array.isArray(payload.messages)) {
            log(`[Proxy] Intercepted POST request to ${req.url}`);
            log(`[Proxy] PRE-Compression stats for shared instance: processed=${compressor.stats.messagesProcessed}`);
            
            // Compress the messages!
            const { messages: compressedMessages, stats } = compressor.compressMessages(payload.messages, 'auto');
            payload.messages = compressedMessages;
            
            log(`[Proxy] POST-Compression: Ratio ${stats.thisMessage?.ratio || '1.0x'} (Saved: ${stats.thisMessage?.savedPct || '0%'})`);
            log(`[Proxy] POST-Compression stats for shared instance: processed=${compressor.stats.messagesProcessed}`);
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
    log(`\n🚀 GlyphProxy is running on http://localhost:${port}`);
    log(`📡 Forwarding to: ${targetApiUrl}`);
    log(`✨ Compression Level: ${level}\n`);
    log(`💡 Configure your IDE (Cursor, Cline, etc.) to use http://localhost:${port} as the OpenAI Base URL.`);
  });
  
  return server;
}

function forwardRequest(clientReq, clientRes, targetApiUrl, body) {
  try {
    let requestPath = clientReq.url;
    // Map standard OpenAI endpoints to Google's OpenAI-compatible endpoints
    if (targetApiUrl.includes('generativelanguage.googleapis.com')) {
      if (requestPath.startsWith('/v1/')) {
        requestPath = requestPath.replace('/v1/', '/v1beta/openai/');
      }
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

    const proxyReq = https.request(url, options, (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
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
