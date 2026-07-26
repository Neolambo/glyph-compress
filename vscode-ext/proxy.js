var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/proxy.js
var proxy_exports = {};
__export(proxy_exports, {
  inferProviderFromTarget: () => inferProviderFromTarget,
  startProxyServer: () => startProxyServer
});
module.exports = __toCommonJS(proxy_exports);
var import_http = __toESM(require("http"), 1);
var import_https = __toESM(require("https"), 1);
var import_glyph_middleware = require("./glyph-middleware.cjs");

// src/dashboard.js
function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GlyphCompress \u2014 Real-time Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0a0b0d;
      --bg-secondary: #12141c;
      --bg-card: rgba(22, 25, 35, 0.6);
      --bg-glow: rgba(0, 242, 254, 0.03);
      --border-color: rgba(255, 255, 255, 0.06);
      --border-glow: rgba(0, 242, 254, 0.15);
      
      --accent-cyan: #00f2fe;
      --accent-purple: #9d4edd;
      --accent-green: #39ff14;
      --accent-red: #ff3838;
      
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      
      --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-primary);
      color: var(--text-main);
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(157, 78, 221, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(0, 242, 254, 0.08) 0%, transparent 40%);
    }

    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    /* Header styling */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1.5rem;
    }

    .brand {
      display: flex;
      flex-direction: column;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-glow {
      font-family: 'Outfit', sans-serif;
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-purple) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
      position: relative;
    }

    .badge-live {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(57, 255, 20, 0.1);
      border: 1px solid rgba(57, 255, 20, 0.2);
      color: var(--accent-green);
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-live::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 6px;
      background-color: var(--accent-green);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--accent-green);
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0% { opacity: 0.4; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.1); box-shadow: 0 0 12px var(--accent-green); }
      100% { opacity: 0.4; transform: scale(0.9); }
    }

    .subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .upstream-badge {
      font-size: 0.825rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      padding: 0.5rem 1rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .upstream-target {
      color: var(--accent-cyan);
      font-family: 'Fira Code', monospace;
      font-weight: 500;
    }

    /* Grid layout for KPI */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    .card {
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
      transition: var(--transition);
    }

    .card:hover {
      transform: translateY(-4px);
      border-color: var(--border-glow);
      box-shadow: 0 12px 30px rgba(0, 242, 254, 0.05);
    }

    .card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at top right, rgba(0, 242, 254, 0.05) 0%, transparent 60%);
      pointer-events: none;
    }

    .card-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
      margin-bottom: 0.75rem;
    }

    .card-value {
      font-family: 'Outfit', sans-serif;
      font-size: 2.25rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #fff;
    }

    .card-value.saved-tokens {
      background: linear-gradient(135deg, #fff 0%, var(--accent-cyan) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .card-value.ratio {
      background: linear-gradient(135deg, #fff 0%, var(--accent-purple) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .card-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .card-desc strong {
      color: var(--accent-cyan);
    }

    /* Visualization Section */
    .dashboard-layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    @media (max-width: 900px) {
      .dashboard-layout {
        grid-template-columns: 1fr;
      }
    }

    .panel-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .panel-title span.badge {
      font-size: 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      color: var(--text-muted);
    }

    /* Comparison Bar Chart */
    .visualizer-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .bar-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .bar-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .bar-label {
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .bar-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .bar-indicator.original { background-color: var(--text-muted); }
    .bar-indicator.compressed { background: linear-gradient(to right, var(--accent-cyan), var(--accent-purple)); }

    .bar-value {
      font-weight: 600;
    }

    .bar-bg {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      height: 24px;
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 6px;
      width: 0%;
      transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bar-fill.original {
      background-color: rgba(255, 255, 255, 0.15);
    }

    .bar-fill.compressed {
      background: linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-purple) 100%);
      box-shadow: 0 0 10px rgba(0, 242, 254, 0.2);
    }

    /* Savings savings indicator */
    .savings-efficiency-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      height: 100%;
      position: relative;
    }

    .donut-chart-container {
      position: relative;
      width: 140px;
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .donut-ring {
      fill: none;
      stroke: rgba(255, 255, 255, 0.03);
      stroke-width: 4;
    }

    .donut-segment {
      fill: none;
      stroke: url(#cyan-purple-grad);
      stroke-width: 4;
      stroke-dasharray: 283; /* 2 * PI * r (r=45) => 282.7 */
      stroke-dashoffset: 283;
      stroke-linecap: round;
      transition: stroke-dashoffset 1s ease-out;
      transform: rotate(-90deg);
      transform-origin: 50% 50%;
    }

    .donut-text {
      position: absolute;
      font-family: 'Outfit', sans-serif;
      font-size: 1.75rem;
      font-weight: 700;
      color: #fff;
    }

    /* Requests list */
    .request-list-container {
      max-height: 380px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-right: 0.5rem;
    }

    .request-list-container::-webkit-scrollbar {
      width: 6px;
    }

    .request-list-container::-webkit-scrollbar-track {
      background: rgba(0,0,0,0.1);
      border-radius: 99px;
    }

    .request-list-container::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.08);
      border-radius: 99px;
    }

    .request-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1.25rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      transition: var(--transition);
      animation: fadeIn 0.4s ease-out;
    }

    .request-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(0, 242, 254, 0.2);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .req-meta {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .req-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .req-level {
      font-size: 0.7rem;
      padding: 0.1rem 0.4rem;
      background: rgba(157, 78, 221, 0.15);
      border: 1px solid rgba(157, 78, 221, 0.2);
      color: #b79ced;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 500;
    }

    .req-time {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .req-stats {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .req-tokens {
      font-size: 0.825rem;
      color: var(--text-muted);
      text-align: right;
    }

    .req-tokens span {
      font-weight: 600;
      color: #fff;
    }

    .req-badge {
      font-size: 0.775rem;
      font-weight: 600;
      background: rgba(0, 242, 254, 0.1);
      border: 1px solid rgba(0, 242, 254, 0.2);
      color: var(--accent-cyan);
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
    }

    /* Live Console Panel */
    .console-panel {
      grid-column: span 2;
    }

    @media (max-width: 900px) {
      .console-panel {
        grid-column: span 1;
      }
    }

    .console-body {
      background-color: #050608;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 1.25rem;
      font-family: 'Fira Code', monospace;
      font-size: 0.825rem;
      line-height: 1.5;
      color: #e5e7eb;
      max-height: 250px;
      overflow-y: auto;
      box-shadow: inset 0 4px 20px rgba(0,0,0,0.5);
    }

    .console-line {
      margin-bottom: 0.25rem;
      word-break: break-all;
    }

    .console-line .timestamp {
      color: #4b5563;
      margin-right: 0.5rem;
    }

    .console-line .log-tag {
      color: var(--accent-purple);
      margin-right: 0.25rem;
    }

    .console-line .log-text {
      color: #f3f4f6;
    }

    .console-line.success .log-text { color: var(--accent-green); }
    .console-line.info .log-text { color: var(--accent-cyan); }
    .console-line.warning .log-text { color: #f59e0b; }
    .console-line.error .log-text { color: var(--accent-red); }

    .no-data {
      color: var(--text-muted);
      font-size: 0.9rem;
      text-align: center;
      padding: 3rem 0;
      font-style: italic;
    }

  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="logo-container">
          <span class="logo-glow">GlyphCompress \u{1F52E}</span>
          <span class="badge-live">Live</span>
        </div>
        <p class="subtitle">Context window token saving & compression engine for Antigravity</p>
      </div>
      <div class="upstream-badge">
        <span>Server Status:</span>
        <span class="upstream-target" id="upstreamTarget">http://127.0.0.1:...</span>
      </div>
    </header>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div class="card">
        <p class="card-label">Total Tokens Saved</p>
        <h2 class="card-value saved-tokens" id="kpiSaved">0</h2>
        <p class="card-desc">Estimated value: <strong id="kpiValue">$0.00</strong></p>
      </div>
      <div class="card">
        <p class="card-label">Average Compression Ratio</p>
        <h2 class="card-value ratio" id="kpiRatio">1.00x</h2>
        <p class="card-desc">Total volume reduced</p>
      </div>
      <div class="card">
        <p class="card-label">Overall Efficiency</p>
        <h2 class="card-value" style="color: var(--accent-cyan)" id="kpiPct">0%</h2>
        <p class="card-desc">Of prompt context saved</p>
      </div>
      <div class="card">
        <p class="card-label">Requests Processed</p>
        <h2 class="card-value" style="color: #fff" id="kpiProcessed">0</h2>
        <p class="card-desc">Requests optimized in session</p>
      </div>
    </div>

    <!-- Main Section -->
    <div class="dashboard-layout">
      
      <!-- Visualizer & History -->
      <div class="card">
        <h3 class="panel-title">Context Footprint (Tokens)</h3>
        
        <div class="visualizer-container" style="margin-bottom: 2rem;">
          <div class="bar-wrapper">
            <div class="bar-header">
              <div class="bar-label">
                <span class="bar-indicator original"></span>
                <span>Original Size</span>
              </div>
              <span class="bar-value" id="valOriginal">0 tokens</span>
            </div>
            <div class="bar-bg">
              <div class="bar-fill original" id="barOriginal"></div>
            </div>
          </div>

          <div class="bar-wrapper">
            <div class="bar-header">
              <div class="bar-label">
                <span class="bar-indicator compressed"></span>
                <span>Optimized Size (Glyphs)</span>
              </div>
              <span class="bar-value" id="valCompressed" style="color: var(--accent-cyan)">0 tokens</span>
            </div>
            <div class="bar-bg">
              <div class="bar-fill compressed" id="barCompressed"></div>
            </div>
          </div>
        </div>

        <h3 class="panel-title" style="border-top: 1px solid var(--border-color); padding-top: 1.5rem; margin-top: 1rem;">
          Session Requests History
        </h3>
        
        <div class="request-list-container" id="requestsList">
          <div class="no-data">No requests intercepted yet. Send a prompt to start.</div>
        </div>
      </div>

      <!-- Donut Savings Chart -->
      <div class="card" style="display: flex; flex-direction: column;">
        <h3 class="panel-title">Savings Rate</h3>
        <div class="savings-efficiency-panel">
          <div class="donut-chart-container">
            <svg width="140" height="140" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="cyan-purple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--accent-cyan)" />
                  <stop offset="100%" stop-color="var(--accent-purple)" />
                </linearGradient>
              </defs>
              <circle class="donut-ring" cx="50" cy="50" r="45" />
              <circle class="donut-segment" id="donutSegment" cx="50" cy="50" r="45" />
            </svg>
            <div class="donut-text" id="donutText">0%</div>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; line-height: 1.4;">
            Compression is active using <strong style="color: var(--accent-cyan)">Aggressive</strong> profile and ADC (Attentional Decay Compaction) algorithms.
          </p>
        </div>
      </div>

      <!-- Live Logs Panel -->
      <div class="card console-panel">
        <h3 class="panel-title">Real-time Operations Log Console <span class="badge" id="logsCount">0</span></h3>
        <div class="console-body" id="consoleLogs">
          <div style="color: #4b5563;">Waiting for events...</div>
        </div>
      </div>

    </div>
  </div>

  <script>
    // Poll stats from backend
    async function updateStats() {
      try {
        const res = await fetch('/stats');
        const data = await res.json();
        
        // Upstream
        document.getElementById('upstreamTarget').textContent = data.target || 'N/A';
        
        // KPIs
        document.getElementById('kpiSaved').textContent = data.totals.saved.toLocaleString();
        
        // Calculate monetary value based on Claude 3.5 Sonnet ($3.00 / million input tokens)
        const savedCost = (data.totals.saved / 1000000) * 3.00;
        document.getElementById('kpiValue').textContent = '$' + savedCost.toFixed(4);
        
        document.getElementById('kpiRatio').textContent = data.totals.ratio;
        document.getElementById('kpiPct').textContent = data.totals.pct;
        document.getElementById('kpiProcessed').textContent = data.totals.processed || data.history.length;
        
        // Visualizer
        const totalOriginal = data.totals.original;
        const totalCompressed = data.totals.compressed;
        
        document.getElementById('valOriginal').textContent = totalOriginal.toLocaleString() + ' tokens';
        document.getElementById('valCompressed').textContent = totalCompressed.toLocaleString() + ' tokens';
        
        if (totalOriginal > 0) {
          document.getElementById('barOriginal').style.width = '100%';
          document.getElementById('barCompressed').style.width = ((totalCompressed / totalOriginal) * 100) + '%';
        } else {
          document.getElementById('barOriginal').style.width = '0%';
          document.getElementById('barCompressed').style.width = '0%';
        }
        
        // Donut Chart
        const savedPctNum = parseInt(data.totals.pct) || 0;
        document.getElementById('donutText').textContent = data.totals.pct;
        const offset = 283 - (283 * savedPctNum) / 100;
        document.getElementById('donutSegment').style.strokeDashoffset = offset;
        
        // History List
        const listContainer = document.getElementById('requestsList');
        if (data.history.length === 0) {
          listContainer.innerHTML = '<div class="no-data">No requests intercepted yet. Send a prompt to start.</div>';
        } else {
          let listHtml = '';
          data.history.forEach(item => {
            listHtml += \`
              <div class="request-item">
                <div class="req-meta">
                  <div class="req-title">
                    Request #\${escapeHtml(item.id)}
                    <span class="req-level">\${escapeHtml(item.selectedLevel || 'Aggressive')}</span>
                  </div>
                  <span class="req-time">Processed at \${escapeHtml(item.timestamp)}</span>
                </div>
                <div class="req-stats">
                  <div class="req-tokens">
                    Original: <span>\${escapeHtml(item.originalTokens)}</span><br>
                    Optimized: <span style="color: var(--accent-cyan)">\${escapeHtml(item.compressedTokens)}</span>
                  </div>
                  <div class="req-badge">\${escapeHtml(item.savedPct)} Saved</div>
                </div>
              </div>
            \`;
          });
          listContainer.innerHTML = listHtml;
        }
        
        // Logs
        const logsContainer = document.getElementById('consoleLogs');
        if (data.logs && data.logs.length > 0) {
          document.getElementById('logsCount').textContent = data.logs.length;
          let logsHtml = '';
          data.logs.forEach(log => {
            let className = '';
            if (log.text.includes('Error') || log.text.includes('error')) className = 'error';
            else if (log.text.includes('ratio:') || log.text.includes('Saved:')) className = 'success';
            else if (log.text.includes('Intercepted')) className = 'info';
            
            logsHtml += \`
              <div class="console-line \${className}">
                <span class="timestamp">[\${log.timestamp}]</span>
                <span class="log-text">\${escapeHtml(log.text)}</span>
              </div>
            \`;
          });
          logsContainer.innerHTML = logsHtml;
          // Auto scroll to bottom
          logsContainer.scrollTop = logsContainer.scrollHeight;
        }
        
      } catch (e) {
        console.error('Failed to poll stats:', e);
      }
    }
    
    // Coerces before escaping: callers pass numbers and possibly-undefined
    // stats fields as well as log strings, and a bare str.replace() throws on
    // those. The render loop is inside a try/catch, so such a throw would not
    // surface as an error \u2014 the dashboard would just silently stop updating.
    function escapeHtml(value) {
      if (value === null || value === undefined) return '';
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Initial and periodic update
    updateStats();
    setInterval(updateStats, 1500);
  </script>
</body>
</html>`;
}

// src/logger.js
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var REDACTION_PATTERNS = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]{10,}/gi, "Bearer [REDACTED]"],
  [/"api[_-]?key"\s*:\s*"[^"]+"/gi, '"apiKey":"[REDACTED]"'],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, "sk-[REDACTED]"],
  [/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g, "[REDACTED_GH_TOKEN]"],
  [/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, "[REDACTED_AWS_KEY]"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_JWT]"]
];
function redactForLog(value = "", maxLength = 2e3) {
  let text = typeof value === "string" ? value : JSON.stringify(value);
  for (const [pattern, replacement] of REDACTION_PATTERNS) {
    text = text.replace(pattern, replacement);
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}\u2026[truncated]` : text;
}
function redactMeta(meta) {
  if (!meta || typeof meta !== "object") return meta;
  const redacted = {};
  for (const [key, value] of Object.entries(meta)) {
    redacted[key] = typeof value === "string" ? redactForLog(value, 500) : value;
  }
  return redacted;
}
function createStructuredLogger(options = {}) {
  const { logFile, outputChannel, onEntry, console: toConsole = true } = options;
  let fileReady = false;
  if (logFile) {
    try {
      import_fs.default.mkdirSync(import_path.default.dirname(logFile), { recursive: true });
      fileReady = true;
    } catch {
      fileReady = false;
    }
  }
  function log(level, message, meta) {
    const entry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      message: redactForLog(message),
      ...meta ? { meta: redactMeta(meta) } : {}
    };
    if (toConsole) {
      const line = `[${entry.timestamp}] [${level.toUpperCase()}] ${entry.message}`;
      if (level === "error") console.error(line);
      else if (level === "warn") console.warn(line);
      else console.log(line);
    }
    if (outputChannel) {
      outputChannel.appendLine(`[${entry.timestamp}] [${level.toUpperCase()}] ${entry.message}`);
    }
    if (fileReady) {
      try {
        import_fs.default.appendFileSync(logFile, `${JSON.stringify(entry)}
`);
      } catch {
      }
    }
    if (onEntry) onEntry(entry);
    return entry;
  }
  return {
    info: (message, meta) => log("info", message, meta),
    warn: (message, meta) => log("warn", message, meta),
    error: (message, meta) => log("error", message, meta),
    close: () => {
    }
  };
}

// src/anthropic-bridge.js
var import_stream = require("stream");
var DEFAULT_ANTHROPIC_VERSION = "2023-06-01";
var DEFAULT_MAX_TOKENS = 4096;
function isAnthropicNativeTarget(targetApiUrl = "") {
  return String(targetApiUrl).toLowerCase().includes("api.anthropic.com");
}
function markUntranslatableParts(content) {
  if (!Array.isArray(content)) return content;
  return content.map((part) => {
    if (part && typeof part === "object" && part.type && part.type !== "text") {
      return { type: "text", text: `[${part.type} omitted: not yet supported by the GlyphCompress Anthropic proxy bridge]` };
    }
    return part;
  });
}
function mapOpenAITools(tools) {
  if (!Array.isArray(tools)) return [];
  return tools.filter((tool) => tool && tool.type === "function" && tool.function && tool.function.name).map((tool) => ({
    name: tool.function.name,
    description: tool.function.description || "",
    input_schema: tool.function.parameters || { type: "object", properties: {} }
  }));
}
function isNativeAnthropicRequest(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.system !== void 0) return true;
  if (Array.isArray(payload.tools) && payload.tools.length > 0) {
    return payload.tools.some((tool) => tool && tool.input_schema !== void 0 && tool.function === void 0);
  }
  return false;
}
function compressNativeAnthropicRequest(payload, compressor) {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const { system, messages: compressedMessages, stats } = compressor._prepareAnthropicPayload(
    payload.system,
    messages.map((message) => ({ role: message.role, content: markUntranslatableParts(message.content) }))
  );
  const body = { ...payload, messages: compressedMessages };
  if (system) {
    body.system = system;
  } else if (payload.system !== void 0) {
    body.system = payload.system;
  }
  return { body, stats };
}
function openaiRequestToAnthropic(payload, compressor) {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const systemMessages = messages.filter((message) => message.role === "system");
  const systemText = systemMessages.map((message) => compressor._anthropicSystemText(markUntranslatableParts(message.content))).filter(Boolean).join("\n\n");
  const otherMessages = messages.filter((message) => message.role !== "system").map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: markUntranslatableParts(message.content)
  }));
  const { system, messages: anthropicMessages, stats } = compressor._prepareAnthropicPayload(systemText, otherMessages);
  const body = {
    model: payload.model,
    max_tokens: payload.max_tokens || payload.max_completion_tokens || DEFAULT_MAX_TOKENS,
    messages: anthropicMessages
  };
  if (system) body.system = system;
  if (typeof payload.temperature === "number") body.temperature = payload.temperature;
  if (typeof payload.top_p === "number") body.top_p = payload.top_p;
  if (payload.stop !== void 0 && payload.stop !== null) {
    body.stop_sequences = Array.isArray(payload.stop) ? payload.stop : [payload.stop];
  }
  if (payload.stream === true) body.stream = true;
  const tools = mapOpenAITools(payload.tools);
  if (tools.length) body.tools = tools;
  return { body, stats };
}
function extractApiKey(value) {
  if (!value) return "";
  const match = /^Bearer\s+(.+)$/i.exec(String(value).trim());
  return match ? match[1].trim() : String(value).trim();
}
function anthropicHeadersFromOpenAI(headers = {}) {
  const next = { ...headers };
  delete next.authorization;
  delete next.Authorization;
  delete next.host;
  delete next.Host;
  delete next["content-length"];
  delete next["Content-Length"];
  const apiKey = extractApiKey(headers.authorization || headers.Authorization) || headers["x-api-key"] || headers["X-Api-Key"];
  if (apiKey) next["x-api-key"] = apiKey;
  next["anthropic-version"] = headers["anthropic-version"] || DEFAULT_ANTHROPIC_VERSION;
  next["content-type"] = "application/json";
  return next;
}
function mapAnthropicStopReason(reason) {
  switch (reason) {
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool_calls";
    case "end_turn":
    case "stop_sequence":
    default:
      return "stop";
  }
}
function anthropicResponseToOpenAI(anthropicJson, requestedModel) {
  const blocks = Array.isArray(anthropicJson.content) ? anthropicJson.content : [];
  const text = blocks.filter((block) => block.type === "text").map((block) => block.text).join("");
  const toolUseBlocks = blocks.filter((block) => block.type === "tool_use");
  const message = { role: "assistant", content: text || null };
  if (toolUseBlocks.length) {
    message.tool_calls = toolUseBlocks.map((block, index) => ({
      id: block.id || `call_${index}`,
      type: "function",
      function: {
        name: block.name,
        arguments: JSON.stringify(block.input || {})
      }
    }));
  }
  const inputTokens = anthropicJson.usage?.input_tokens || 0;
  const outputTokens = anthropicJson.usage?.output_tokens || 0;
  return {
    id: anthropicJson.id || `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1e3),
    model: anthropicJson.model || requestedModel,
    choices: [{
      index: 0,
      message,
      finish_reason: mapAnthropicStopReason(anthropicJson.stop_reason)
    }],
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens
    }
  };
}
function extractSSEEvents(buffer) {
  const events = [];
  let rest = buffer;
  let boundary = rest.indexOf("\n\n");
  while (boundary !== -1) {
    const rawEvent = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    let eventType = "message";
    const dataLines = [];
    for (const line of rawEvent.split("\n")) {
      if (line.startsWith("event:")) eventType = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length > 0) {
      try {
        events.push({ event: eventType, data: JSON.parse(dataLines.join("\n")) });
      } catch {
      }
    }
    boundary = rest.indexOf("\n\n");
  }
  return { events, rest };
}
function formatOpenAIChunk({ id, model, delta, finishReason = null }) {
  const chunk = {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1e3),
    model: model || "unknown",
    choices: [{ index: 0, delta, finish_reason: finishReason }]
  };
  return `data: ${JSON.stringify(chunk)}

`;
}
function createAnthropicToOpenAISSETransform({ model } = {}) {
  let buffer = "";
  let responseId = `chatcmpl-${Date.now()}`;
  let sentRoleChunk = false;
  let resolvedModel = model;
  function handleEvent(stream, event, data) {
    if (event === "message_start") {
      responseId = data.message?.id || responseId;
      resolvedModel = resolvedModel || data.message?.model;
      if (!sentRoleChunk) {
        stream.push(formatOpenAIChunk({ id: responseId, model: resolvedModel, delta: { role: "assistant" } }));
        sentRoleChunk = true;
      }
      return;
    }
    if (event === "content_block_delta" && data.delta?.type === "text_delta") {
      stream.push(formatOpenAIChunk({ id: responseId, model: resolvedModel, delta: { content: data.delta.text } }));
      return;
    }
    if (event === "message_delta") {
      const finishReason = mapAnthropicStopReason(data.delta?.stop_reason);
      stream.push(formatOpenAIChunk({ id: responseId, model: resolvedModel, delta: {}, finishReason }));
      return;
    }
    if (event === "message_stop") {
      stream.push("data: [DONE]\n\n");
    }
  }
  return new import_stream.Transform({
    transform(chunk, _enc, callback) {
      buffer += chunk.toString("utf8");
      const { events, rest } = extractSSEEvents(buffer);
      buffer = rest;
      for (const { event, data } of events) handleEvent(this, event, data);
      callback();
    },
    flush(callback) {
      if (buffer.trim()) {
        const { events } = extractSSEEvents(buffer + "\n\n");
        for (const { event, data } of events) handleEvent(this, event, data);
      }
      callback();
    }
  });
}

// src/proxy.js
function startProxyServer(port = 8080, targetApiUrl = "https://api.openai.com", levelOrOptions = "aggressive", sharedCompressor = null, outputChannel = null) {
  const options = normalizeProxyOptions(levelOrOptions, sharedCompressor, outputChannel, targetApiUrl);
  const compressor = options.compressor || new import_glyph_middleware.GlyphCompressor({
    level: options.level,
    provider: options.provider,
    trustPolicy: options.trustPolicy,
    privacyFirewall: options.privacyFirewall,
    attentionalDecay: options.attentionalDecay,
    holographicFolding: options.holographicFolding,
    intentDiffs: options.intentDiffs
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
        level: entry.level
      });
      if (logHistory.length > 50) logHistory.shift();
    }
  });
  const log = (message, meta) => structuredLogger.info(message, meta);
  const server = import_http.default.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost:" + port}`);
    if (req.method === "GET" && url.pathname === "/dashboard") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getDashboardHTML());
      return;
    }
    if (req.method === "GET" && url.pathname === "/stats") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "active",
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
          ratio: totalOriginalTokens > 0 ? (totalOriginalTokens / Math.max(1, totalCompressedTokens)).toFixed(2) + "x" : "1.00x",
          pct: totalOriginalTokens > 0 ? ((1 - totalCompressedTokens / totalOriginalTokens) * 100).toFixed(0) + "%" : "0%"
        }
      }));
      return;
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const payload = JSON.parse(body);
          const anthropicBridge = isAnthropicNativeTarget(targetApiUrl);
          let forwardBody = body;
          let bridgeInfo = null;
          if (payload.messages && Array.isArray(payload.messages)) {
            log(`[Proxy] Intercepted ${req.method} ${req.url}`, { requestId: messagesProcessed + 1 });
            let stats;
            if (anthropicBridge && isNativeAnthropicRequest(payload)) {
              const compressedNative = compressNativeAnthropicRequest(payload, compressor);
              stats = compressedNative.stats;
              forwardBody = JSON.stringify(compressedNative.body);
              bridgeInfo = { requestedModel: payload.model, isStreaming: payload.stream === true, native: true };
              log(`[Proxy] Anthropic native request compressed in place (model=${payload.model})`);
            } else if (anthropicBridge) {
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
            log(`[Proxy] Provider=${options.compressionProvider} level=${compressor.level} trust=${compressor.trustPolicy}`, {
              privacyFirewall: compressor.privacyFirewall,
              attentionalDecay: compressor.attentionalDecay,
              holographicFolding: compressor.holographicFolding,
              intentDiffs: compressor.intentDiffs,
              dynamicDictSize: compressor.dynamicDict.size,
              fileIndexSize: compressor.fileIndex.size,
              teamCodebookLoaded: compressor.getTeamCodebookInfo().loaded,
              fallback: stats?.thisMessage?.fallback === true
            });
            const thisMsg = stats?.thisMessage;
            if (thisMsg) {
              log(`[Proxy] Compression ratio: ${thisMsg.ratio || "1.0x"} (Saved: ${thisMsg.savedPct || "0%"})`);
              totalOriginalTokens += thisMsg.originalTokens || 0;
              totalCompressedTokens += thisMsg.compressedTokens || 0;
              messagesProcessed++;
              statsHistory.unshift({
                id: messagesProcessed,
                timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
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
          forwardRequest(req, res, targetApiUrl, forwardBody, structuredLogger, bridgeInfo);
        } catch (e) {
          log("[Proxy] Error parsing/compressing JSON: " + e.message);
          forwardRequest(req, res, targetApiUrl, body, structuredLogger);
        }
      });
    } else {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => forwardRequest(req, res, targetApiUrl, body, structuredLogger));
    }
  });
  server.listen(port, () => {
    log(`
GlyphProxy is running on http://localhost:${server.address().port}`);
    log(`Forwarding to: ${targetApiUrl}`);
    log(`Compression: provider=${options.compressionProvider}, level=${options.level}, trust=${options.trustPolicy}`);
    if (options.attentionalDecay) {
      log(`Decay: experimental attentional decay compaction enabled`);
    }
    log(`Configure your IDE (Cursor, Cline, etc.) to use http://localhost:${server.address().port} as the OpenAI Base URL.`);
  });
  return server;
}
function inferProviderFromTarget(targetApiUrl = "") {
  const target = String(targetApiUrl).toLowerCase();
  if (target.includes("anthropic.com")) return "anthropic";
  if (target.includes("generativelanguage.googleapis.com") || target.includes("googleapis.com")) return "gemini";
  if (target.includes("openai.com")) return "openai";
  if (target.includes("localhost") || target.includes("127.0.0.1")) return "local";
  return "openai";
}
function normalizeProxyOptions(levelOrOptions, sharedCompressor, outputChannel, targetApiUrl) {
  const raw = typeof levelOrOptions === "object" && levelOrOptions !== null ? levelOrOptions : { level: levelOrOptions, compressor: sharedCompressor, outputChannel };
  const provider = raw.provider || raw.compressor?.provider || "auto";
  return {
    level: raw.level || raw.compressor?.level || "aggressive",
    provider,
    compressionProvider: provider === "auto" ? inferProviderFromTarget(targetApiUrl) : provider,
    trustPolicy: raw.trustPolicy || raw.policy || raw.compressor?.trustPolicy || "auto",
    privacyFirewall: Boolean(raw.privacyFirewall || raw.privacy),
    attentionalDecay: Boolean(raw.attentionalDecay || raw.decay || raw.compressor?.attentionalDecay),
    holographicFolding: Boolean(raw.holographicFolding || raw.folding || raw.compressor?.holographicFolding),
    intentDiffs: Boolean(raw.intentDiffs || raw.intents || raw.compressor?.intentDiffs),
    compressor: raw.compressor || sharedCompressor || null,
    outputChannel: raw.outputChannel || outputChannel || null,
    logFile: raw.logFile || null
  };
}
var fallbackLogger = createStructuredLogger();
function forwardRequest(clientReq, clientRes, targetApiUrl, body, logger = fallbackLogger, bridge = null) {
  try {
    let requestPath = clientReq.url;
    let headers = { ...clientReq.headers };
    if (bridge) {
      requestPath = "/v1/messages";
      headers = anthropicHeadersFromOpenAI(clientReq.headers);
    } else if (targetApiUrl.includes("generativelanguage.googleapis.com") && requestPath.startsWith("/v1/")) {
      requestPath = requestPath.replace("/v1/", "/v1beta/openai/");
    }
    const url = new URL(requestPath, targetApiUrl);
    const options = {
      method: clientReq.method,
      headers
    };
    delete options.headers["host"];
    if (body) {
      options.headers["content-length"] = Buffer.byteLength(body);
    }
    const requestClient = url.protocol === "http:" ? import_http.default : import_https.default;
    const proxyReq = requestClient.request(url, options, (proxyRes) => {
      logger.info(`[Proxy] Upstream ${proxyRes.statusCode} ${proxyRes.statusMessage || ""}`.trim());
      if (proxyRes.statusCode >= 400) {
        const chunks = [];
        proxyRes.on("data", (chunk) => chunks.push(chunk));
        proxyRes.on("end", () => {
          const responseBody = Buffer.concat(chunks);
          logger.error("[Proxy] Upstream error body: " + redactForLog(responseBody.toString("utf8"), 1200));
          clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
          clientRes.end(responseBody);
        });
        return;
      }
      if (bridge) {
        if (bridge.isStreaming) {
          clientRes.writeHead(proxyRes.statusCode, {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache",
            connection: "keep-alive"
          });
          const transform = createAnthropicToOpenAISSETransform({ model: bridge.requestedModel });
          proxyRes.pipe(transform).pipe(clientRes, { end: true });
        } else {
          const chunks = [];
          proxyRes.on("data", (chunk) => chunks.push(chunk));
          proxyRes.on("end", () => {
            try {
              const anthropicJson = JSON.parse(Buffer.concat(chunks).toString("utf8"));
              const openaiJson = anthropicResponseToOpenAI(anthropicJson, bridge.requestedModel);
              const responseBody = JSON.stringify(openaiJson);
              clientRes.writeHead(proxyRes.statusCode, {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(responseBody)
              });
              clientRes.end(responseBody);
            } catch (err) {
              logger.error("[Proxy] Anthropic response translation error: " + err.message);
              const raw = Buffer.concat(chunks);
              clientRes.writeHead(proxyRes.statusCode, { "content-type": "application/json" });
              clientRes.end(raw);
            }
          });
        }
        return;
      }
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      let responseBytes = 0;
      proxyRes.on("data", (chunk) => {
        responseBytes += chunk.length;
      });
      proxyRes.on("end", () => {
        logger.info(`[Proxy] Upstream response completed (${responseBytes} bytes)`);
      });
      clientRes.on("close", () => {
        if (!clientRes.writableEnded) {
          logger.warn("[Proxy] Client closed response before stream completed");
        }
      });
      proxyRes.pipe(clientRes, { end: true });
    });
    proxyReq.on("error", (err) => {
      logger.error("[Proxy] Forwarding error: " + err.message);
      clientRes.writeHead(500);
      clientRes.end("Proxy Error: " + err.message);
    });
    if (body) {
      proxyReq.write(body);
    }
    proxyReq.end();
  } catch (err) {
    logger.error("[Proxy] Request setup error: " + err.message);
    clientRes.writeHead(500);
    clientRes.end("Proxy Setup Error: " + err.message);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  inferProviderFromTarget,
  startProxyServer
});
