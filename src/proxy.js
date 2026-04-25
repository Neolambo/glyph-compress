import http from 'http';
import https from 'https';
import { GlyphCompressor } from '../vscode-ext/glyph-middleware.js';

export function startProxyServer(port = 8080, targetApiUrl = 'https://api.openai.com', level = 'aggressive') {
  const compressor = new GlyphCompressor({ level });

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
            console.log(`[Proxy] Intercepted request to ${req.url}`);
            
            // Compress the messages!
            const { messages: compressedMessages, stats } = compressor.compressMessages(payload.messages, 'auto');
            payload.messages = compressedMessages;
            
            console.log(`[Proxy] Compression ratio: ${stats.thisMessage?.ratio || '1.0x'} (Saved: ${stats.thisMessage?.savedPct || '0%'})`);
          }
          
          // Forward the modified request to the actual LLM API
          forwardRequest(req, res, targetApiUrl, JSON.stringify(payload));
          
        } catch (e) {
          console.error('[Proxy] Error parsing/compressing JSON:', e.message);
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
    console.log(`\n🚀 GlyphProxy is running on http://localhost:${port}`);
    console.log(`📡 Forwarding to: ${targetApiUrl}`);
    console.log(`✨ Compression Level: ${level}\n`);
    console.log(`💡 Configure your IDE (Cursor, Cline, etc.) to use http://localhost:${port} as the OpenAI Base URL.`);
  });
  
  return server;
}

function forwardRequest(clientReq, clientRes, targetApiUrl, body) {
  try {
    const url = new URL(clientReq.url, targetApiUrl);
    
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
