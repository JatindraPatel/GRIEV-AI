/**
 * GrievAI – Live Dashboard Engine v3.0 (No-Backend)
 * Uses GrievData (localStorage) instead of API calls.
 * Shows real complaints from localStorage + demo seed data.
 */
(function () {
  'use strict';

  if (!document.getElementById('chartDeptBar') && !document.querySelector('.dash-main')) return;

  var POLL_MS    = 8000;  // refresh every 8s
  var pollTimer  = null;
  var lastCount  = 0;

  var PRIORITY_COLORS = {
    CRITICAL: { bg:'#fdf0f0', badge:'#c0392b' },
    HIGH:     { bg:'#fff7ed', badge:'#e07b00' },
    MEDIUM:   { bg:'#fffbeb', badge:'#b7791f' },
    LOW:      { bg:'#f0fff4', badge:'#1a7a3f' }
  };

  // ── INJECT CSS ────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('grievai-live-styles')) return;
    var style = document.createElement('style');
    style.id = 'grievai-live-styles';
    style.textContent =
      '@keyframes grievaiFadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}' +
      '@keyframes grievaiPulse{0%{opacity:1}50%{opacity:0.5}100%{opacity:1}}' +
      '#grievai-ticker::-webkit-scrollbar{width:4px}' +
      '#grievai-ticker::-webkit-scrollbar-thumb{background:#d1d9e0;border-radius:2px}' +
      '.live-dot{animation:grievaiPulse 2s infinite;}';
    document.head.appendChild(style);
  }

  // ── INJECT LIVE PANEL ─────────────────────────────────────────────────
  function injectLiveDashboard() {
    if (document.getElementById('grievai-live-panel')) return;
    var dashMain = document.querySelector('.dash-main');
    if (!dashMain) return;
    var dashHeader = dashMain.querySelector('.dash-header');
    if (!dashHeader) return;

    var panel = document.createElement('div');
    panel.id = 'grievai-live-panel';
    panel.style.cssText = 'background:#fff;border:1.5px solid #bee3f8;border-radius:12px;padding:18px 22px;margin-bottom:24px;';
    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">' +
        '<div>' +
          '<div style="font-size:1rem;font-weight:700;color:#003366;font-family:var(--font-serif);">🤖 Live AI Classification Engine</div>' +
          '<div id="grievai-status-line" style="font-size:0.75rem;color:#718096;margin-top:2px;">Loading live data…</div>' +
        '</div>' +
        '<div id="grievai-live-badge" style="background:#e8f5ee;border:1px solid #68d391;border-radius:20px;padding:4px 12px;font-size:0.72rem;font-weight:700;color:#1a7a3f;">' +
          '<span class="live-dot">●</span> LIVE' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px;">' +
        '<div style="background:#e8f0fb;border-radius:8px;padding:12px;text-align:center;">' +
          '<div id="live-total" style="font-size:1.4rem;font-weight:700;color:#003366;">—</div>' +
          '<div style="font-size:0.7rem;color:#718096;">Total Complaints</div>' +
        '</div>' +
        '<div style="background:#e8f5ee;border-radius:8px;padding:12px;text-align:center;">' +
          '<div id="live-classified" style="font-size:1.4rem;font-weight:700;color:#1a7a3f;">—</div>' +
          '<div style="font-size:0.7rem;color:#718096;">AI Classified</div>' +
        '</div>' +
        '<div style="background:#fff8f0;border-radius:8px;padding:12px;text-align:center;">' +
          '<div id="live-accuracy" style="font-size:1.4rem;font-weight:700;color:#e07b00;">—</div>' +
          '<div style="font-size:0.7rem;color:#718096;">AI Accuracy</div>' +
        '</div>' +
        '<div style="background:#fdf0f0;border-radius:8px;padding:12px;text-align:center;">' +
          '<div id="live-today" style="font-size:1.4rem;font-weight:700;color:#c0392b;">—</div>' +
          '<div style="font-size:0.7rem;color:#718096;">Filed Today</div>' +
        '</div>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:0.72rem;color:#718096;font-weight:600;letter-spacing:0.04em;margin-bottom:8px;">📡 LIVE COMPLAINT FEED</div>' +
        '<div id="grievai-ticker" style="min-height:80px;max-height:240px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;background:#fafafa;padding:6px;">' +
          '<div id="grievai-ticker-empty" style="text-align:center;color:#a0aec0;font-size:0.8rem;padding:24px;">Loading complaints…</div>' +
        '</div>' +
      '</div>';

    dashHeader.insertAdjacentElement('afterend', panel);
  }

  // ── INJECT SURGE FORECAST ─────────────────────────────────────────────
  function injectSurgeForecast() {
    if (document.getElementById('grievai-surge-panel')) return;
    var dashMain = document.querySelector('.dash-main');
    if (!dashMain) return;
    var chartsSection = dashMain.querySelector('[style*="margin-bottom:28px"]');
    if (!chartsSection) { chartsSection = dashMain.querySelector('.dash-charts'); }
    if (!chartsSection) return;

    var panel = document.createElement('div');
    panel.id = 'grievai-surge-panel';
    panel.style.cssText = 'background:#fff;border:1.5px solid #fbd38d;border-radius:12px;padding:18px 22px;margin-bottom:24px;';
    panel.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:12px;">' +
        '<div style="font-size:1.8rem;flex-shrink:0;">📈</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:0.95rem;font-weight:700;color:#003366;font-family:var(--font-serif);margin-bottom:4px;">Predictive Surge Forecast</div>' +
          '<div style="font-size:0.75rem;color:#718096;margin-bottom:12px;">AI-predicted department overload for next 7 days based on seasonal patterns & historical volume</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">' +
            _surgeCard('💧 Water Supply', 'Thu–Sat', '3.2×', '#c0392b', 'Summer heat spike — historically 280% normal volume') +
            _surgeCard('⚡ Electricity', 'Fri–Sun', '2.1×', '#e07b00', 'Weekend peak load + monsoon transformer failures') +
            _surgeCard('🏙️ Municipal', 'Mon', '1.8×', '#b7791f', 'Post-weekend garbage backlog + market day complaints') +
          '</div>' +
        '</div>' +
      '</div>';

    chartsSection.parentNode.insertBefore(panel, chartsSection);
  }

  function _surgeCard(dept, days, mult, color, reason) {
    return '<div style="background:#fffbeb;border:1px solid #fbd38d;border-left:4px solid ' + color + ';border-radius:8px;padding:10px 12px;">' +
      '<div style="font-weight:700;font-size:0.82rem;color:' + color + ';">' + dept + ' — ' + days + '</div>' +
      '<div style="font-size:1.1rem;font-weight:700;color:' + color + ';margin:2px 0;">' + mult + ' normal volume</div>' +
      '<div style="font-size:0.7rem;color:#718096;">' + reason + '</div>' +
    '</div>';
  }

  // ── TICKER ITEM ────────────────────────────────────────────────────────
  function addTickerItem(c) {
    var ticker = document.getElementById('grievai-ticker');
    if (!ticker) return;
    var empty = document.getElementById('grievai-ticker-empty');
    if (empty) empty.remove();

    var priority = ((c.priority || 'MEDIUM') + '').toUpperCase();
    var cfg  = PRIORITY_COLORS[priority] || PRIORITY_COLORS.MEDIUM;
    var id   = c.id || c.complaint_id || '—';
    var time = c.filed_on
      ? new Date(c.filed_on).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
      : new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

    var item = document.createElement('div');
    item.style.cssText = 'border-radius:6px;padding:8px 10px;margin-bottom:6px;border-left:3px solid ' + cfg.badge + ';background:' + cfg.bg + ';animation:grievaiFadeIn 0.4s ease;';
    item.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:0.78rem;font-weight:700;color:#1a2636;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _esc(c.subject || 'Complaint filed') + '</div>' +
          '<div style="font-size:0.68rem;color:#718096;margin-top:2px;">🏛️ <strong>' + _esc(c.department || '—') + '</strong>' + (c.location ? ' · 📍 ' + _esc(c.location) : '') + ' · ' + _esc(id) + '</div>' +
        '</div>' +
        '<div style="flex-shrink:0;margin-left:8px;text-align:right;">' +
          '<span style="background:' + cfg.badge + ';color:#fff;font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:10px;">' + priority + '</span>' +
          '<div style="font-size:0.63rem;color:#a0aec0;margin-top:3px;">' + time + '</div>' +
        '</div>' +
      '</div>';

    ticker.insertBefore(item, ticker.firstChild);
    while (ticker.children.length > 20) ticker.removeChild(ticker.lastChild);
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── UPDATE STAT COUNTERS ───────────────────────────────────────────────
  function updateCounters(stats) {
    var el = function(id) { return document.getElementById(id); };
    if (el('live-total'))      el('live-total').textContent      = (stats.total || 0).toLocaleString('en-IN');
    if (el('live-classified')) el('live-classified').textContent = (stats.total || 0).toLocaleString('en-IN');
    if (el('live-accuracy'))   el('live-accuracy').textContent   = (stats.accuracy || 94) + '%';
    if (el('live-today'))      el('live-today').textContent      = (stats.today || 0).toLocaleString('en-IN');
  }

  // ── MAIN REFRESH — reads from GrievData ───────────────────────────────
  function refresh() {
    if (!window.GrievData) return;

    var stats = window.GrievData.getDashboardStats();
    updateCounters(stats);

    var statusLine = document.getElementById('grievai-status-line');
    if (statusLine) {
      statusLine.textContent = 'Live · Last refreshed ' + new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
      statusLine.style.color = '#1a7a3f';
    }

    // Only re-render ticker if count changed
    if (stats.total !== lastCount) {
      lastCount = stats.total;
      var ticker = document.getElementById('grievai-ticker');
      if (ticker) ticker.innerHTML = '';  // clear

      var feed = stats.feed || [];
      for (var i = feed.length - 1; i >= 0; i--) {
        addTickerItem(feed[i]);
      }
      if (!feed.length) {
        var ticker2 = document.getElementById('grievai-ticker');
        if (ticker2) ticker2.innerHTML = '<div id="grievai-ticker-empty" style="text-align:center;color:#a0aec0;font-size:0.8rem;padding:24px;">No complaints yet. File the first one!</div>';
      }
    }
  }

  // ── INIT ──────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    injectLiveDashboard();
    injectSurgeForecast();
    setTimeout(refresh, 300);
    pollTimer = setInterval(refresh, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    requestAnimationFrame(function () { setTimeout(init, 100); });
  }

})();
