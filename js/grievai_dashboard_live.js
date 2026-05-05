// ====================================================
// GrievAI – Live Dashboard Engine v1.0
// Features:
//   1. Real-time complaint simulation (setInterval)
//   2. Predictive Surge Forecast
//   3. Live AI Accuracy meter
//   4. Department load animation
//   5. Incoming complaint ticker
// ====================================================

(function () {
  'use strict';

  // Only run on dashboard page
  if (!document.getElementById('chartDeptBar')) return;

  // ── DEPT CONFIG ─────────────────────────────────
  var DEPTS = [
    { name:'Municipal',   short:'Municipal',    color:'#003366', base: 96847 },
    { name:'Education',   short:'Education',    color:'#FF6600', base: 72341 },
    { name:'Health',      short:'Health',       color:'#1a7a3f', base: 32345 },
    { name:'Transport',   short:'Transport',    color:'#1a6896', base: 27380 },
    { name:'Police',      short:'Police',       color:'#b7791f', base: 19892 },
    { name:'Water',       short:'Water',        color:'#c0392b', base: 15234 },
    { name:'Revenue',     short:'Revenue',      color:'#6b46c1', base: 11002 },
    { name:'PDS',         short:'PDS',          color:'#0d9488', base: 8450  }
  ];

  var SAMPLE_COMPLAINTS = [
    { subject:'Bijli nahi aa rahi – 4 din se',    dept:'Electricity Dept',   priority:'HIGH',     state:'UP' },
    { subject:'Pani pipeline leak – sewage mix',   dept:'Water Supply',       priority:'CRITICAL', state:'MP' },
    { subject:'Pothole on NH-44 – accident risk',  dept:'Transport',          priority:'HIGH',     state:'Maharashtra' },
    { subject:'Ration not distributed this month', dept:'PDS',                priority:'MEDIUM',   state:'Bihar' },
    { subject:'School teacher absent 3 weeks',     dept:'Education',          priority:'MEDIUM',   state:'Rajasthan' },
    { subject:'Hospital OPD closed – no doctor',   dept:'Health',             priority:'HIGH',     state:'Gujarat' },
    { subject:'Garbage not collected – 10 days',   dept:'Municipal Corp',     priority:'MEDIUM',   state:'Karnataka' },
    { subject:'Land record mutation pending',       dept:'Revenue',            priority:'LOW',      state:'Haryana' },
    { subject:'FIR not registered – bribe demand', dept:'Police Dept',        priority:'CRITICAL', state:'Punjab' },
    { subject:'MGNREGA wages unpaid – 3 months',   dept:'Labour & Employment',priority:'HIGH',     state:'Jharkhand' },
    { subject:'Widow pension stopped without reason',dept:'Social Welfare',   priority:'HIGH',     state:'Odisha' },
    { subject:'Internet tower down – no network',  dept:'Telecom',            priority:'LOW',      state:'Sikkim' }
  ];

  var PRIORITY_COLORS = {
    CRITICAL: { bg:'#fdf0f0', text:'#c0392b', badge:'#c0392b' },
    HIGH:     { bg:'#fff7ed', text:'#e07b00', badge:'#e07b00' },
    MEDIUM:   { bg:'#fffbeb', text:'#b7791f', badge:'#b7791f' },
    LOW:      { bg:'#f0fff4', text:'#1a7a3f', badge:'#1a7a3f' }
  };

  var liveCount       = { total: 248563, classified: 1240, today: 312 };
  var simulationActive = false;
  var simulationInterval = null;
  var accuracyValue   = 93.2;
  var classifiedThisSession = 0;

  // ── INJECT LIVE DASHBOARD PANEL ─────────────────
  function injectLiveDashboard() {
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
          '<div style="font-size:0.75rem;color:#718096;margin-top:2px;">Simulating real-time complaint ingestion & auto-routing</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;">' +
          '<button id="grievai-sim-start" type="button" onclick="GrievAI_LiveDash.startSimulation()" style="background:#003366;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:0.82rem;font-weight:700;cursor:pointer;">▶ Start Live Demo</button>' +
          '<button id="grievai-sim-stop" type="button" onclick="GrievAI_LiveDash.stopSimulation()" style="background:#c0392b;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:0.82rem;font-weight:700;cursor:pointer;display:none;">⏹ Stop</button>' +
        '</div>' +
      '</div>' +

      // Live KPIs
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px;">' +
        '<div style="background:#e8f0fb;border-radius:8px;padding:12px;text-align:center;">' +
          '<div style="font-size:1.4rem;font-weight:700;color:#003366;" id="live-total">' + liveCount.total.toLocaleString('en-IN') + '</div>' +
          '<div style="font-size:0.7rem;color:#718096;">Total Complaints</div>' +
        '</div>' +
        '<div style="background:#e8f5ee;border-radius:8px;padding:12px;text-align:center;">' +
          '<div style="font-size:1.4rem;font-weight:700;color:#1a7a3f;" id="live-classified">' + liveCount.classified.toLocaleString() + '</div>' +
          '<div style="font-size:0.7rem;color:#718096;">AI Classified Today</div>' +
        '</div>' +
        '<div style="background:#fff8f0;border-radius:8px;padding:12px;text-align:center;">' +
          '<div style="font-size:1.4rem;font-weight:700;color:#e07b00;" id="live-accuracy">' + accuracyValue.toFixed(1) + '%</div>' +
          '<div style="font-size:0.7rem;color:#718096;">AI Accuracy</div>' +
        '</div>' +
        '<div style="background:#fdf0f0;border-radius:8px;padding:12px;text-align:center;">' +
          '<div style="font-size:1.4rem;font-weight:700;color:#c0392b;" id="live-today">' + liveCount.today + '</div>' +
          '<div style="font-size:0.7rem;color:#718096;">Incoming Today</div>' +
        '</div>' +
      '</div>' +

      // Live Ticker
      '<div>' +
        '<div style="font-size:0.72rem;color:#718096;font-weight:600;letter-spacing:0.04em;margin-bottom:8px;">📡 LIVE COMPLAINT FEED</div>' +
        '<div id="grievai-ticker" style="height:180px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;background:#fafafa;padding:6px;">' +
          '<div style="text-align:center;color:#a0aec0;font-size:0.8rem;padding:20px;">Click "▶ Start Live Demo" to see real-time complaint ingestion</div>' +
        '</div>' +
      '</div>';

    dashHeader.insertAdjacentElement('afterend', panel);
  }

  // ── INJECT SURGE FORECAST PANEL ─────────────────
  function injectSurgeForecast() {
    var chartsSection = document.querySelector('.dash-main [style*="margin-bottom:28px"]');
    if (!chartsSection) return;

    var surgePanel = document.createElement('div');
    surgePanel.id = 'grievai-surge-panel';
    surgePanel.style.cssText = 'background:#fff;border:1.5px solid #fbd38d;border-radius:12px;padding:18px 22px;margin-bottom:24px;';
    surgePanel.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:12px;">' +
        '<div style="font-size:1.8rem;flex-shrink:0;">📈</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:0.95rem;font-weight:700;color:#003366;font-family:var(--font-serif);margin-bottom:4px;">Predictive Surge Forecast</div>' +
          '<div style="font-size:0.75rem;color:#718096;margin-bottom:12px;">AI-predicted department overload for next 7 days based on seasonal patterns & current volume</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">' +
            surgeForecastCard('💧 Water Supply', 'Thu–Sat', '3.2×', '#c0392b', 'Summer heat spike — historically 280% normal volume') +
            surgeForecastCard('⚡ Electricity', 'Fri–Sun', '2.1×', '#e07b00', 'Weekend peak load + monsoon transformer failures') +
            surgeForecastCard('🏙️ Municipal', 'Mon', '1.8×', '#b7791f', 'Post-weekend garbage backlog + market day complaints') +
          '</div>' +
        '</div>' +
      '</div>';

    chartsSection.parentNode.insertBefore(surgePanel, chartsSection);
  }

  function surgeForecastCard(dept, days, mult, color, reason) {
    return '<div style="background:#fffbeb;border:1px solid #fbd38d;border-left:4px solid ' + color + ';border-radius:8px;padding:10px 12px;">' +
      '<div style="font-weight:700;font-size:0.82rem;color:' + color + ';">' + dept + ' — ' + days + '</div>' +
      '<div style="font-size:1.1rem;font-weight:700;color:' + color + ';margin:2px 0;">' + mult + ' normal volume</div>' +
      '<div style="font-size:0.7rem;color:#718096;">' + reason + '</div>' +
    '</div>';
  }

  // ── SIMULATION ENGINE ───────────────────────────
  function generateComplaintId() {
    return 'GRIEVA/2025/' + (Math.floor(Math.random() * 900000) + 100000);
  }

  function addTickerItem(complaint) {
    var ticker = document.getElementById('grievai-ticker');
    if (!ticker) return;

    var cfg = PRIORITY_COLORS[complaint.priority] || PRIORITY_COLORS.MEDIUM;
    var id = generateComplaintId();
    var time = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });

    var item = document.createElement('div');
    item.style.cssText = 'border-radius:6px;padding:8px 10px;margin-bottom:6px;border-left:3px solid ' + cfg.badge + ';background:' + cfg.bg + ';animation:grievaiFadeIn 0.4s ease;';
    item.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:0.78rem;font-weight:700;color:#1a2636;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + complaint.subject + '">' + complaint.subject + '</div>' +
          '<div style="font-size:0.68rem;color:#718096;margin-top:2px;">' +
            '🏛️ <strong>' + complaint.dept + '</strong> · 📍 ' + complaint.state + ' · 🆔 ' + id +
          '</div>' +
        '</div>' +
        '<div style="flex-shrink:0;margin-left:8px;text-align:right;">' +
          '<span style="background:' + cfg.badge + ';color:#fff;font-size:0.62rem;font-weight:700;padding:2px 7px;border-radius:10px;">' + complaint.priority + '</span>' +
          '<div style="font-size:0.63rem;color:#a0aec0;margin-top:3px;">' + time + '</div>' +
        '</div>' +
      '</div>';

    var empty = ticker.querySelector('[style*="text-align:center"]');
    if (empty) empty.remove();

    ticker.insertBefore(item, ticker.firstChild);

    // Keep max 15 items
    while (ticker.children.length > 15) {
      ticker.removeChild(ticker.lastChild);
    }
  }

  function updateLiveCounters() {
    liveCount.total      += Math.floor(Math.random() * 3 + 1);
    liveCount.classified += Math.floor(Math.random() * 2 + 1);
    liveCount.today      += 1;
    classifiedThisSession++;

    // Slightly vary accuracy
    accuracyValue = Math.min(96.8, Math.max(91.0, accuracyValue + (Math.random() - 0.45) * 0.2));

    var elTotal = document.getElementById('live-total');
    var elClass = document.getElementById('live-classified');
    var elAcc   = document.getElementById('live-accuracy');
    var elToday = document.getElementById('live-today');

    if (elTotal) elTotal.textContent = liveCount.total.toLocaleString('en-IN');
    if (elClass) elClass.textContent = liveCount.classified.toLocaleString();
    if (elAcc)   elAcc.textContent   = accuracyValue.toFixed(1) + '%';
    if (elToday) elToday.textContent = liveCount.today;
  }

  function runSimulationTick() {
    var complaint = SAMPLE_COMPLAINTS[Math.floor(Math.random() * SAMPLE_COMPLAINTS.length)];
    addTickerItem(complaint);
    updateLiveCounters();
  }

  window.GrievAI_LiveDash = {
    startSimulation: function() {
      if (simulationActive) return;
      simulationActive = true;
      document.getElementById('grievai-sim-start').style.display = 'none';
      document.getElementById('grievai-sim-stop').style.display = 'block';

      // First tick immediately
      runSimulationTick();
      simulationInterval = setInterval(runSimulationTick, 2800);
    },
    stopSimulation: function() {
      simulationActive = false;
      if (simulationInterval) clearInterval(simulationInterval);
      simulationInterval = null;
      document.getElementById('grievai-sim-start').style.display = 'block';
      document.getElementById('grievai-sim-stop').style.display = 'none';
    }
  };

  // ── INJECT ANIMATION CSS ─────────────────────────
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent =
      '@keyframes grievaiFadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }' +
      '#grievai-ticker::-webkit-scrollbar { width:4px; }' +
      '#grievai-ticker::-webkit-scrollbar-track { background:#f1f1f1; }' +
      '#grievai-ticker::-webkit-scrollbar-thumb { background:#d1d9e0; border-radius:2px; }';
    document.head.appendChild(style);
  }

  // ── WHATSAPP CHANNEL MOCKUP ──────────────────────
  function injectWhatsAppMockup() {
    var dashMain = document.querySelector('.dash-main');
    if (!dashMain) return;
    var quickActions = dashMain.querySelector('.grid-3:last-child');
    if (!quickActions) return;

    var mockup = document.createElement('div');
    mockup.style.cssText = 'background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:18px 22px;margin-bottom:24px;';
    mockup.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:14px;">' +
        '<div style="font-size:2rem;flex-shrink:0;">📱</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:0.95rem;font-weight:700;color:#003366;font-family:var(--font-serif);margin-bottom:4px;">WhatsApp / SMS Omnichannel</div>' +
          '<div style="font-size:0.75rem;color:#718096;margin-bottom:12px;">File complaints via WhatsApp — AI classifies in 2 seconds, no portal login needed</div>' +
          '<div style="background:#e9f5e1;border-radius:12px 12px 12px 2px;border:1px solid #d1d9e0;padding:14px 16px;max-width:420px;">' +
            whatsappMsg('👤 Citizen', 'left', 'Meri bijli 3 din se nahi aayi. Transformer kharab hai colony mein.', '#fff') +
            whatsappMsg('🤖 GrievAI', 'right', '✅ Shikayat darj ho gayi!\n\n🏛️ Dept: Electricity Department\n🔴 Priority: HIGH\n🆔 ID: GRIEVA/2025/847291\n⏱️ Expected: 1–3 working days\n\nSMS aayega update ke liye.', '#d9fdd3') +
          '</div>' +
          '<div style="font-size:0.7rem;color:#a0aec0;margin-top:8px;">Powered by Twilio/Meta WhatsApp API + GrievAI NLP Engine</div>' +
        '</div>' +
      '</div>';

    quickActions.parentNode.insertBefore(mockup, quickActions);
  }

  function whatsappMsg(sender, side, text, bg) {
    return '<div style="margin-bottom:10px;text-align:' + (side==='right'?'right':'left') + ';">' +
      '<div style="display:inline-block;background:' + bg + ';border-radius:' + (side==='right'?'12px 2px 12px 12px':'2px 12px 12px 12px') + ';padding:8px 12px;max-width:90%;text-align:left;box-shadow:0 1px 2px rgba(0,0,0,0.08);">' +
        '<div style="font-size:0.68rem;font-weight:700;color:#003366;margin-bottom:3px;">' + sender + '</div>' +
        '<div style="font-size:0.75rem;color:#1a2636;white-space:pre-line;line-height:1.5;">' + text + '</div>' +
      '</div>' +
    '</div>';
  }

  // ── INIT ─────────────────────────────────────────
  function init() {
    injectStyles();
    injectLiveDashboard();
    injectSurgeForecast();
    injectWhatsAppMockup();
    console.log('✅ GrievAI Live Dashboard Engine v1.0 loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }

})();
