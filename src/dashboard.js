/**
 * GlyphCompress Dashboard Template
 * A premium, beautiful, real-time UI dashboard for context savings visualization.
 */

export function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GlyphCompress — Real-time Dashboard</title>
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
          <span class="logo-glow">GlyphCompress 🔮</span>
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
    // surface as an error — the dashboard would just silently stop updating.
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
