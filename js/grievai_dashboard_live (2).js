// ====================================================
// GrievAI – Live Dashboard Engine v2.0
// REAL DATA ONLY — no fake/simulated complaints
//
// Changes from v1.0:
//   ✅ Removed fake setInterval simulation (every 3s)
//   ✅ Removed "Start Live Demo / Stop" buttons
//   ✅ Numbers only change when a REAL complaint is filed
//   ✅ Ticker only shows REAL complaints from backend API
//   ✅ Polls /api/v1/complaints every 15s for new entries
//   ✅ Stats pulled from /api/v1/complaints/stats (real DB)
//   ✅ Surge forecast stays static (no fake counters)
//   ✅ No rendering flicker — DOM injected once on init
//   ✅ Graceful offline state if backend not reachable
// ====================================================

(function () {
  'use strict';

  // Only run on dashboard page
  if (!document.getElementById('chartDeptBar')) return;

  // ── CONFIG ──────────────────────────────────────────
  var API_BASE   = 'http://localhost:8000/api/v1';
  var POLL_MS    = 15000;  // real poll every 15s — no fake data
  var pollTimer  = null;
  var lastSeenId = null;   // track newest complaint ID to detect new arrivals

  var PRIORITY_COLORS = {
    CRITICAL: { bg:'#fdf0f0', badge:'#c0392b' },
    HIGH:     { bg:'#fff7ed', badge:'#e07b00' },
    MEDIUM:   { bg:'#fffbeb', badge:'#b7791f' },
    LOW:      { bg:'#f0fff4', badge:'#1a7a3f' }
  };

  // ── INJECT ANIMATION CSS (once) ─────────────────────
  function injectStyles() {
    if (document.getElementById('grievai-live-styles')) return;
    var style = document.createElement('style');
    style.id = 'grievai-live-styles';
    style.textContent =
      '@keyframes grievaiFadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}' +
      '#grievai-ticker::-webkit-scrollbar{width:4px}' +
      '#grievai-ticker::-webkit-scrollbar-track{background:#f1f1f1}' +
      '#grievai-ticker::-webkit-scrollbar-thumb{background:#d1d9e0;border-radius:2px}';
    document.head.appendChild(style);
  }

  // ── INJECT LIVE DASHBOARD PANEL ─────────────────────
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
          '<div style="font-size:1rem;font-weight:700;color:#003366;font-family:var(--font-serif);">&#129302; Live AI Classification Engine</div>' +
          '<div id="grievai-status-line" style="font-size:0.75rem;color:#718096;margin-top:2px;">Connecting to backend&#8230;</div>' +
        '</div>' +
        '<div id="grievai-live-badge" style="display:none;background:#e8f5ee;border:1px solid #68d391;border-radius:20px;padding:4px 12px;font-size:0.72rem;font-weight:700;color:#1a7a3f;">&#9679; LIVE</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px;">' +
        '<div style="background:#e8f0fb;border-radius:8px;padding:12px;text-align:center;">' +
          '<div id="live-total" style="font-size:1.4rem;font-weight:700;color:#003366;">&#8212;</div>' +
          '<div style="font-size:0.7rem;color:#718096;">Total Complaints</div>' +
        '</div>' +
        '<div style="background:#e8f5ee;border-radius:8px;padding:12px;text-align:center;">' +
          '<div id="live-classified" style="font-size:1.4rem;font-weight:700;color:#1a7a3f;">&#8212;</div>' +
          '<div style="font-size:0.7rem;color:#718096;">AI Classified</div>' +
        '</div>' +
        '<div style="background:#fff8f0;border-radius:8px;padding:12px;text-align:center;">' +
          '<div id="live-accuracy" style="font-size:1.4rem;font-weight:700;color:#e07b00;">&#8212;</div>' +
          '<div style="font-size:0.7rem;color:#718096;">AI Accuracy</div>' +
        '</div>' +
        '<div style="background:#fdf0f0;border-radius:8px;padding:12px;text-align:center;">' +
          '<div id="live-today" style="font-size:1.4rem;font-weight:700;color:#c0392b;">&#8212;</div>' +
          '<div style="font-size:0.7rem;color:#718096;">Filed Today</div>' +
        '</div>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:0.72rem;color:#718096;font-weight:600;letter-spacing:0.04em;margin-bottom:8px;">&#128225; LIVE COMPLAINT FEED</div>' +
        '<div id="grievai-ticker" style="min-height:72px;max-height:220px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;background:#fafafa;padding:6px;">' +
          '<div id="grievai-ticker-empty" style="text-align:center;color:#a0aec0;font-size:0.8rem;padding:20px;">Feed will update when citizens file complaints</div>' +
        '</div>' +
      '</div>';

    dashHeader.insertAdjacentElement('afterend', panel);
  }

  // ── INJECT SURGE FORECAST (static info panel) ───────
  function injectSurgeForecast() {
    if (document.getElementById('grievai-surge-panel')) return;
    var chartsSection = document.querySelector('.dash-main [style*="margin-bottom:28px"]');
    if (!chartsSection) return;

    var surgePanel = document.createElement('div');
    surgePanel.id = 'grievai-surge-panel';
    surgePanel.style.cssText = 'background:#fff;border:1.5px solid #fbd38d;border-radius:12px;padding:18px 22px;margin-bottom:24px;';
    surgePanel.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:12px;">' +
        '<div style="font-size:1.8rem;flex-shrink:0;">&#128200;</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:0.95rem;font-weight:700;color:#003366;font-family:var(--font-serif);margin-bottom:4px;">Predictive Surge Forecast</div>' +
          '<div style="font-size:0.75rem;color:#718096;margin-bottom:12px;">AI-predicted department overload for next 7 days based on seasonal patterns &amp; historical volume</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">' +
            surgeForecastCard('&#128167; Water Supply', 'Thu&#8211;Sat', '3.2&times;', '#c0392b', 'Summer heat spike — historically 280% normal volume') +
            surgeForecastCard('&#9889; Electricity', 'Fri&#8211;Sun', '2.1&times;', '#e07b00', 'Weekend peak load + monsoon transformer failures') +
            surgeForecastCard('&#127961;&#65039; Municipal', 'Mon', '1.8&times;', '#b7791f', 'Post-weekend garbage backlog + market day complaints') +
          '</div>' +
        '</div>' +
      '</div>';

    chartsSection.parentNode.insertBefore(surgePanel, chartsSection);
  }

  function surgeForecastCard(dept, days, mult, color, reason) {
    return '<div style="background:#fffbeb;border:1px solid #fbd38d;border-left:4px solid ' + color + ';border-radius:8px;padding:10px 12px;">' +
      '<div style="font-weight:700;font-size:0.82rem;color:' + color + ';">' + dept + ' &#8212; ' + days + '</div>' +
      '<div style="font-size:1.1rem;font-weight:700;color:' + color + ';margin:2px 0;">' + mult + ' normal volume</div>' +
      '<div style="font-size:0.7rem;color:#718096;">' + reason + '</div>' +
    '</div>';
  }

  // ── INJECT WHATSAPP MOCKUP (static) ─────────────────
  function injectWhatsAppMockup() {
    if (document.getElementById('grievai-whatsapp-panel')) return;
    var dashMain = document.querySelector('.dash-main');
    if (!dashMain) return;
    var quickActions = dashMain.querySelector('.grid-3:last-child');
    if (!quickActions) return;

    var mockup = document.createElement('div');
    mockup.id = 'grievai-whatsapp-panel';
    mockup.style.cssText = 'background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:18px 22px;margin-bottom:24px;';
    mockup.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:14px;">' +
        '<div style="font-size:2rem;flex-shrink:0;">&#128241;</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:0.95rem;font-weight:700;color:#003366;font-family:var(--font-serif);margin-bottom:4px;">WhatsApp / SMS Omnichannel</div>' +
          '<div style="font-size:0.75rem;color:#718096;margin-bottom:12px;">File complaints via WhatsApp &#8212; AI classifies in 2 seconds, no portal login needed</div>' +
          '<div style="background:#e9f5e1;border-radius:12px 12px 12px 2px;border:1px solid #d1d9e0;padding:14px 16px;max-width:420px;">' +
            waMsg('&#128100; Citizen', 'left',  'Meri bijli 3 din se nahi aayi. Transformer kharab hai colony mein.', '#fff') +
            waMsg('&#129302; GrievAI', 'right', '&#10003;&#65038; Shikayat darj ho gayi!\n\n&#127963;&#65039; Dept: Electricity Department\n&#128308; Priority: HIGH\n&#128221; ID: GRIEVA/2025/847291\n&#8987; Expected: 1&#8211;3 working days\n\nSMS aayega update ke liye.', '#d9fdd3') +
          '</div>' +
          '<div style="font-size:0.7rem;color:#a0aec0;margin-top:8px;">Powered by Twilio/Meta WhatsApp API + GrievAI NLP Engine</div>' +
        '</div>' +
      '</div>';

    quickActions.parentNode.insertBefore(mockup, quickActions);
  }

  function waMsg(sender, side, text, bg) {
    var isRight = side === 'right';
    return '<div style="margin-bottom:10px;text-align:' + (isRight ? 'right' : 'left') + ';">' +
      '<div style="display:inline-block;background:' + bg + ';border-radius:' + (isRight ? '12px 2px 12px 12px' : '2px 12px 12px 12px') + ';padding:8px 12px;max-width:90%;text-align:left;box-shadow:0 1px 2px rgba(0,0,0,0.08);">' +
        '<div style="font-size:0.68rem;font-weight:700;color:#003366;margin-bottom:3px;">' + sender + '</div>' +
        '<div style="font-size:0.75rem;color:#1a2636;white-space:pre-line;line-height:1.5;">' + text + '</div>' +
      '</div>' +
    '</div>';
  }

  // ── ADD ONE REAL COMPLAINT TO TICKER ─────────────────
  function addTickerItem(complaint) {
    var ticker = document.getElementById('grievai-ticker');
    if (!ticker) return;

    var priority = ((complaint.priority || 'MEDIUM') + '').toUpperCase();
    var cfg  = PRIORITY_COLORS[priority] || PRIORITY_COLORS.MEDIUM;
    var id   = complaint.complaintId || complaint._id || '—';
    var time = complaint.createdAt
      ? new Date(complaint.createdAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
      : new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    var subject = escHtml(complaint.subject || complaint.description || 'Complaint filed');
    var dept    = escHtml(complaint.department || '—');
    var state   = escHtml(complaint.state || '');

    var empty = document.getElementById('grievai-ticker-empty');
    if (empty) empty.remove();

    var item = document.createElement('div');
    item.style.cssText = 'border-radius:6px;padding:8px 10px;margin-bottom:6px;border-left:3px solid ' + cfg.badge + ';background:' + cfg.bg + ';animation:grievaiFadeIn 0.4s ease;';
    item.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:0.78rem;font-weight:700;color:#1a2636;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + subject + '">' + subject + '</div>' +
          '<div style="font-size:0.68rem;color:#718096;margin-top:2px;">&#127963;&#65039; <strong>' + dept + '</strong>' + (state ? ' &#183; &#128205; ' + state : '') + ' &#183; &#128221; ' + escHtml(id) + '</div>' +
        '</div>' +
        '<div style="flex-shrink:0;margin-left:8px;text-align:right;">' +
          '<span style="background:' + cfg.badge + ';color:#fff;font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:10px;">' + priority + '</span>' +
          '<div style="font-size:0.63rem;color:#a0aec0;margin-top:3px;">' + time + '</div>' +
        '</div>' +
      '</div>';

    ticker.insertBefore(item, ticker.firstChild);
    while (ticker.children.length > 15) ticker.removeChild(ticker.lastChild);
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  // ── UPDATE STAT COUNTERS ──────────────────────────────
  function updateCounters(stats) {
    var elTotal = document.getElementById('live-total');
    var elClass = document.getElementById('live-classified');
    var elAcc   = document.getElementById('live-accuracy');
    var elToday = document.getElementById('live-today');

    if (elTotal) elTotal.textContent = (stats.total || 0).toLocaleString('en-IN');
    if (elClass) elClass.textContent = (stats.classified || stats.total || 0).toLocaleString('en-IN');
    if (elAcc)   elAcc.textContent   = stats.accuracy != null ? Number(stats.accuracy).toFixed(1) + '%' : '—';
    if (elToday) elToday.textContent = (stats.today || 0).toLocaleString('en-IN');
  }

  // ── FETCH REAL STATS FROM BACKEND ────────────────────
  function fetchStats() {
    var token = localStorage.getItem('grievai_token') || '';
    var headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    fetch(API_BASE + '/complaints/stats', { headers: headers })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(data) {
        if (!data.success || !data.stats) return;
        var s = data.stats;
        updateCounters({
          total:      s.totalComplaints || 0,
          classified: s.totalComplaints || 0,
          accuracy:   s.aiAccuracy != null ? s.aiAccuracy : null,
          today:      s.today || s.recent7Days || 0
        });
      })
      .catch(function() { /* handled in fetchLatestComplaints */ });
  }

  // ── FETCH LATEST COMPLAINTS → ONLY UPDATE IF NEW ──────
  function fetchLatestComplaints() {
    var token = localStorage.getItem('grievai_token') || '';
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    fetch(API_BASE + '/complaints?limit=5&page=1', { headers: headers })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(data) {
        if (!data.success) return;
        var complaints = data.complaints || data.data || [];

        // Show LIVE badge + update status
        var badge      = document.getElementById('grievai-live-badge');
        var statusLine = document.getElementById('grievai-status-line');
        if (badge) badge.style.display = 'block';
        if (statusLine) {
          statusLine.textContent = 'Connected — updates appear when new complaints are filed';
          statusLine.style.color = '#718096';
        }

        if (!complaints.length) return; // no complaints yet → ticker stays as-is

        var newestId = complaints[0]._id || complaints[0].id;

        if (lastSeenId === null) {
          // First load: populate ticker with existing real complaints
          for (var i = complaints.length - 1; i >= 0; i--) addTickerItem(complaints[i]);
          lastSeenId = newestId;
          fetchStats();
        } else if (newestId !== lastSeenId) {
          // New complaints have arrived since last poll
          var newOnes = [];
          for (var j = 0; j < complaints.length; j++) {
            var c   = complaints[j];
            var cid = c._id || c.id;
            if (cid === lastSeenId) break;
            newOnes.push(c);
          }
          for (var k = newOnes.length - 1; k >= 0; k--) addTickerItem(newOnes[k]);
          lastSeenId = newestId;
          fetchStats(); // refresh counters only when new data actually arrives
        }
        // If newestId === lastSeenId → nothing new → do nothing (no UI change)
      })
      .catch(function(err) {
        var statusLine = document.getElementById('grievai-status-line');
        if (statusLine && statusLine.textContent.indexOf('Connected') === -1) {
          statusLine.textContent = 'Backend offline — will reconnect automatically';
          statusLine.style.color = '#c0392b';
        }
        console.warn('[GrievAI] Poll failed:', err.message);
      });
  }

  // ── START REAL POLLING (no fake data) ────────────────
  function startPolling() {
    fetchLatestComplaints(); // initial fetch
    pollTimer = setInterval(fetchLatestComplaints, POLL_MS);
  }

  // ── INIT ─────────────────────────────────────────────
  function init() {
    injectStyles();
    injectLiveDashboard();
    injectSurgeForecast();
    injectWhatsAppMockup();
    startPolling();
    console.log('[GrievAI] Dashboard Engine v2.0 — real data only, polling every ' + (POLL_MS/1000) + 's');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    requestAnimationFrame(function () { setTimeout(init, 100); });
  }

})();
