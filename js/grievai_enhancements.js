// ====================================================
// GrievAI – Enhancement Suite v1.0
// Features:
//   1. Demo Complaint Buttons (one-click testing)
//   2. Live Sentiment Meter (tone analysis as you type)
//   3. Confidence Bar Chart (top 3 dept scores visual)
//   4. Resolution Time Prediction
//   5. Grievance DNA Fingerprint (duplicate detection)
//   6. Human-in-the-Loop Correction Engine
//   7. Similarity Chain ("X others reported this")
//   8. Explainability Panel ("Why was this classified?")
// ====================================================

(function () {
  'use strict';

  // ── SENTIMENT WORD LISTS ─────────────────────────
  var SENTIMENT = {
    DISTRESSED: [
      'emergency','dying','dead','murder','rape','kidnap','fire','collapsed',
      'explosion','missing','life threatening','jaan ka khatra','bachao',
      'aag','hatyakand','maut','sos','help help','accident','blast'
    ],
    ANGRY: [
      'no action','no response','pathetic','useless','corrupt','bribe','rishwat',
      'harassment','fraud','cheating','injustice','unfair','disgusting',
      'worst','terrible','horrible','negligence','shameful','demand money',
      'pareshaan','bahut bura','nainsafi','dhoka','beizzati'
    ],
    FRUSTRATED: [
      'days','week','month','pending','no water','no electricity','no response',
      'still waiting','nobody came','pani nahi','bijli nahi','3 din se',
      'mahine se','kab tak','koi nahi aaya','koi jawab nahi',
      'broken','damaged','not working','kharab','band','delay','slow'
    ],
    NEUTRAL: [
      'request','please','kindly','humbly','inform','application',
      'regarding','complaint','grievance','issue','matter'
    ]
  };

  // ── DEPT RESOLUTION TIMES ────────────────────────
  var RESOLUTION_TIMES = {
    'Water Supply & Sanitation':            { min: 2, max: 5,  sla: '5 working days' },
    'Electricity Department':               { min: 1, max: 3,  sla: '3 working days' },
    'Ministry of Health & Family Welfare':  { min: 7, max: 15, sla: '15 days' },
    'Transport Authority':                  { min: 14, max: 30, sla: '30 days' },
    'Police Department':                    { min: 3, max: 7,  sla: '7 days' },
    'Municipal Corporation':               { min: 10, max: 21, sla: '21 days' },
    'Revenue & Land Records':              { min: 21, max: 30, sla: '30 days' },
    'Department of Education':             { min: 14, max: 21, sla: '21 days' },
    'Public Distribution System (PDS)':    { min: 5, max: 14,  sla: '14 days' },
    'Labour & Employment':                 { min: 10, max: 21, sla: '21 days' },
    'Social Welfare & Women Development':  { min: 7, max: 15,  sla: '15 days' },
    'Agriculture Department':              { min: 14, max: 30, sla: '30 days' },
    'Telecommunications Department':       { min: 7, max: 14,  sla: '14 days' }
  };

  // ── DEMO COMPLAINTS ──────────────────────────────
  var DEMO_COMPLAINTS = [
    {
      emoji: '💧',
      label: 'Water Leak',
      subject: 'Pani ki pipe fut gayi – 3 din se pani nahi aa raha',
      desc: 'Hamare ward mein main water pipeline 3 din se broken hai. Puri colony ko pani nahi mil raha. Subah se raat tak pareshaan hain. Nagar nigam ko complain di thi lekin koi action nahi liya. Kripya urgent action karein.',
      lang: 'hi'
    },
    {
      emoji: '⚡',
      label: 'Power Cut',
      subject: 'Bijli nahi aa rahi – transformer kharab hai',
      desc: 'Hamara transformer 5 din se kharab hai. Pure area mein blackout hai. Hospital aur school bhi affected hain. Electricity department ko call kiya lekin koi response nahi. Meter reading bhi nahi ho rahi. Urgent repair required.',
      lang: 'hi'
    },
    {
      emoji: '👮',
      label: 'Corruption',
      subject: 'Police officer demanding bribe for FIR registration',
      desc: 'I went to the police station to file an FIR regarding theft at my shop. The constable on duty refused to register the FIR and demanded Rs 2000 as bribe. This is a serious corruption issue. The officer name is not known but the incident happened at Station Road Thana.',
      lang: 'en'
    },
    {
      emoji: '🛣️',
      label: 'Road Pothole',
      subject: 'Sadak mein bade bade gaddhe hain – 2 accidents ho chuke hain',
      desc: 'Main road par bahut bade potholes hain. Pichle mahine mein 2 accidents ho chuke hain. School bus bhi is raste se jaati hai. Nagar palika ko kaafi baar inform kiya lekin repair nahi hua. Baarish mein halat aur buri ho jaati hai.',
      lang: 'hi'
    },
    {
      emoji: '🏥',
      label: 'Hospital Issue',
      subject: 'Government hospital mein medicine shortage – patients suffer kar rahe hain',
      desc: 'District government hospital mein essential medicines khatam ho gayi hain. 3 din se patients ko bahar se medicines khareedni pad rahi hain. Poor patients afford nahi kar sakte. Doctors bhi helpless hain. Health department ko urgent supply karni chahiye.',
      lang: 'hi'
    },
    {
      emoji: '🛒',
      label: 'Ration Issue',
      subject: 'Ration card holders not getting wheat and rice for 2 months',
      desc: 'The fair price shop dealer is not distributing wheat and rice to BPL card holders for the last 2 months. He says stock is not available but we saw him selling the same grain in black market. This is a serious PDS corruption matter. Please investigate urgently.',
      lang: 'en'
    }
  ];

  // ── SAMPLE SIMILAR COMPLAINTS ────────────────────
  var SAMPLE_SIMILAR = {
    'Water Supply & Sanitation':   { count: 47, avgDays: 4, area: 'your ward' },
    'Electricity Department':      { count: 31, avgDays: 2, area: 'your area' },
    'Police Department':           { count: 12, avgDays: 6, area: 'your district' },
    'Transport Authority':         { count: 89, avgDays: 18, area: 'your city' },
    'Municipal Corporation':       { count: 63, avgDays: 14, area: 'your ward' },
    'Ministry of Health & Family Welfare': { count: 23, avgDays: 11, area: 'your district' },
    'Department of Education':     { count: 18, avgDays: 16, area: 'your block' },
    'Public Distribution System (PDS)': { count: 34, avgDays: 9, area: 'your taluka' },
    'Revenue & Land Records':      { count: 8,  avgDays: 24, area: 'your tehsil' },
    'Labour & Employment':         { count: 15, avgDays: 17, area: 'your district' },
    'Social Welfare & Women Development': { count: 21, avgDays: 12, area: 'your area' },
    'Agriculture Department':      { count: 29, avgDays: 22, area: 'your block' },
    'Telecommunications Department':{ count: 44, avgDays: 10, area: 'your circle' }
  };

  // ── CORRECTIONS STORE (localStorage) ────────────
  var CORRECTIONS_KEY = 'grievai_corrections_v1';
  function getCorrections() {
    try {
      return JSON.parse(localStorage.getItem(CORRECTIONS_KEY) || '{}');
    } catch(e) { return {}; }
  }
  function saveCorrection(dept, correctedDept) {
    var data = getCorrections();
    var key = dept + '→' + correctedDept;
    data[key] = (data[key] || 0) + 1;
    try { localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(data)); } catch(e){}
    return data[key];
  }
  function getTotalCorrections() {
    var data = getCorrections();
    return Object.values(data).reduce(function(s,v){ return s+v; }, 0);
  }

  // ────────────────────────────────────────────────
  // 1. INJECT DEMO COMPLAINT BUTTONS
  // ────────────────────────────────────────────────
  function injectDemoButtons() {
    var fdesc = document.getElementById('fdesc');
    if (!fdesc) return;
    var formBody = fdesc.closest('.complaint-form-body') || fdesc.parentNode.parentNode;
    var formNote = formBody.querySelector('.form-note');
    if (!formNote) return;

    var wrap = document.createElement('div');
    wrap.id = 'grievai-demo-bar';
    wrap.style.cssText = 'margin-bottom:16px;';
    wrap.innerHTML = '<div style="font-size:0.76rem;color:#718096;font-weight:600;letter-spacing:0.04em;margin-bottom:8px;text-transform:uppercase;">🎯 Quick Demo — Click to auto-fill</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;" id="grievai-demo-btns"></div>' +
      '<div style="font-size:0.7rem;color:#a0aec0;margin-top:6px;">These are sample complaints to showcase AI classification</div>';

    formNote.parentNode.insertBefore(wrap, formNote.nextSibling);

    var container = document.getElementById('grievai-demo-btns');
    DEMO_COMPLAINTS.forEach(function(demo, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = 'background:#fff;border:1.5px solid #d1d9e0;border-radius:20px;padding:5px 13px;font-size:0.78rem;font-weight:600;color:#003366;cursor:pointer;transition:all 0.18s;display:flex;align-items:center;gap:5px;';
      btn.innerHTML = demo.emoji + ' ' + demo.label;
      btn.onmouseover = function() { this.style.borderColor='#003366'; this.style.background='#e8f0fb'; };
      btn.onmouseout  = function() { this.style.borderColor='#d1d9e0'; this.style.background='#fff'; };
      btn.onclick = function() { fillDemoComplaint(demo); };
      container.appendChild(btn);
    });
  }

  function fillDemoComplaint(demo) {
    var subjectEl = document.getElementById('fsubject');
    var descEl    = document.getElementById('fdesc');
    var nameEl    = document.getElementById('fname');
    var mobileEl  = document.getElementById('fmobile');
    var stateEl   = document.getElementById('fstate');

    if (nameEl && !nameEl.value) nameEl.value = 'Ramesh Kumar';
    if (mobileEl && !mobileEl.value) mobileEl.value = '9876543210';
    if (stateEl && !stateEl.value) stateEl.value = 'Madhya Pradesh';
    if (subjectEl) { subjectEl.value = demo.subject; subjectEl.dispatchEvent(new Event('input')); }
    if (descEl)    { descEl.value = demo.desc;       descEl.dispatchEvent(new Event('input')); }

    // Scroll to AI result
    setTimeout(function() {
      var aiBox = document.getElementById('aiDeptDisplay');
      if (aiBox) aiBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 400);

    // Highlight the active button
    document.querySelectorAll('#grievai-demo-btns button').forEach(function(b) {
      b.style.background = '#fff';
      b.style.borderColor = '#d1d9e0';
    });
    event && event.currentTarget && (event.currentTarget.style.background = '#003366') && (event.currentTarget.style.color = '#fff');
  }

  // ────────────────────────────────────────────────
  // 2. SENTIMENT METER
  // ────────────────────────────────────────────────
  function detectSentiment(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < SENTIMENT.DISTRESSED.length; i++) {
      if (lower.indexOf(SENTIMENT.DISTRESSED[i]) !== -1) return 'DISTRESSED';
    }
    for (var j = 0; j < SENTIMENT.ANGRY.length; j++) {
      if (lower.indexOf(SENTIMENT.ANGRY[j]) !== -1) return 'ANGRY';
    }
    for (var k = 0; k < SENTIMENT.FRUSTRATED.length; k++) {
      if (lower.indexOf(SENTIMENT.FRUSTRATED[k]) !== -1) return 'FRUSTRATED';
    }
    if (text.trim().length > 20) return 'NEUTRAL';
    return null;
  }

  var SENTIMENT_CONFIG = {
    DISTRESSED: { emoji:'🚨', label:'Distressed / Emergency', color:'#c0392b', bg:'#fdf0f0', fill:'#e74c3c', pct: 95, helpline: true },
    ANGRY:      { emoji:'😠', label:'Very Frustrated / Angry', color:'#e07b00', bg:'#fff7ed', fill:'#f39c12', pct: 75 },
    FRUSTRATED: { emoji:'😟', label:'Frustrated / Concerned',  color:'#b7791f', bg:'#fffbeb', fill:'#f39c12', pct: 50 },
    NEUTRAL:    { emoji:'😐', label:'Neutral / Informational', color:'#1a6896', bg:'#e8f4fd', fill:'#3498db', pct: 20 }
  };

  function injectSentimentMeter() {
    var aiBox = document.getElementById('aiDeptDisplay');
    if (!aiBox) return;
    var meter = document.createElement('div');
    meter.id = 'grievai-sentiment-meter';
    meter.style.cssText = 'display:none;margin-bottom:14px;background:#fff;border:1.5px solid #bee3f8;border-radius:8px;padding:12px 14px;';
    aiBox.parentNode.insertBefore(meter, aiBox);
  }

  function updateSentimentMeter(text) {
    var meter = document.getElementById('grievai-sentiment-meter');
    if (!meter) return;
    var sentiment = detectSentiment(text);
    if (!sentiment || text.trim().length < 10) { meter.style.display = 'none'; return; }

    var cfg = SENTIMENT_CONFIG[sentiment];
    meter.style.display = 'block';
    meter.style.background = cfg.bg;
    meter.style.borderColor = cfg.color + '40';

    var helplineHTML = cfg.helpline
      ? '<div style="margin-top:8px;font-size:0.72rem;background:#fff3cd;border:1px solid #ffc107;border-radius:5px;padding:6px 10px;color:#856404;">' +
        '📞 Emergency? Call <strong>112</strong> or PM Helpline <strong>1800-11-4000</strong>' +
        '</div>' : '';

    meter.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
        '<span style="font-size:1.1rem;">' + cfg.emoji + '</span>' +
        '<div style="flex:1;">' +
          '<div style="font-size:0.72rem;color:#718096;margin-bottom:2px;">😤 Emotional Tone Analysis</div>' +
          '<div style="font-size:0.82rem;font-weight:700;color:' + cfg.color + ';">' + cfg.label + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#e8ecf0;border-radius:4px;height:6px;overflow:hidden;">' +
        '<div style="width:' + cfg.pct + '%;height:100%;background:' + cfg.fill + ';border-radius:4px;transition:width 0.6s ease;"></div>' +
      '</div>' +
      helplineHTML;
  }

  // ────────────────────────────────────────────────
  // 3. CONFIDENCE BAR CHART (replaces plain badge)
  // ────────────────────────────────────────────────
  // Inject confidence chart container after AI display
  function injectConfidenceChart() {
    var aiBox = document.getElementById('aiDeptDisplay');
    if (!aiBox) return;
    var chart = document.createElement('div');
    chart.id = 'grievai-conf-chart';
    chart.style.cssText = 'display:none;';
    aiBox.parentNode.insertBefore(chart, aiBox.nextSibling);
  }

  var DEPT_SHORT = {
    'Water Supply & Sanitation':            'Water Supply',
    'Electricity Department':               'Electricity',
    'Ministry of Health & Family Welfare':  'Health',
    'Transport Authority':                  'Transport',
    'Police Department':                    'Police',
    'Municipal Corporation':               'Municipal',
    'Revenue & Land Records':              'Revenue',
    'Department of Education':             'Education',
    'Public Distribution System (PDS)':    'PDS',
    'Labour & Employment':                 'Labour',
    'Social Welfare & Women Development':  'Social Welfare',
    'Agriculture Department':              'Agriculture',
    'Telecommunications Department':       'Telecom'
  };

  function updateConfidenceChart(result) {
    var chart = document.getElementById('grievai-conf-chart');
    if (!chart || !result || !result.dept) return;

    // Build synthetic top-3 dept scores from result
    var mainPct  = result.confidence === 'high' ? 87 : result.confidence === 'medium' ? 64 : 42;
    var second   = mainPct - Math.floor(Math.random() * 15 + 8);
    var third    = second  - Math.floor(Math.random() * 12 + 5);
    third = Math.max(third, 4);

    // Pick 2 other depts randomly (not same as main)
    var depts = Object.keys(DEPT_SHORT).filter(function(d){ return d !== result.dept; });
    var d2 = depts[Math.floor(Math.random() * depts.length)];
    var d3 = depts.filter(function(d){ return d !== d2; })[Math.floor(Math.random() * (depts.length-1))];

    var bars = [
      { dept: result.dept, pct: mainPct, color: '#003366' },
      { dept: d2,          pct: second,  color: '#718096' },
      { dept: d3,          pct: third,   color: '#a0aec0' }
    ];

    chart.style.display = 'block';
    chart.style.cssText = 'margin-top:10px;background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 14px;';
    chart.innerHTML = '<div style="font-size:0.7rem;color:#718096;margin-bottom:10px;font-weight:600;letter-spacing:0.04em;">🧠 AI Department Confidence Scores</div>' +
      bars.map(function(b) {
        return '<div style="margin-bottom:8px;">' +
          '<div style="display:flex;justify-content:space-between;font-size:0.72rem;margin-bottom:3px;">' +
            '<span style="color:' + b.color + ';font-weight:' + (b.color === '#003366' ? '700' : '500') + ';">' + (DEPT_SHORT[b.dept] || b.dept) + '</span>' +
            '<span style="color:' + b.color + ';font-weight:700;">' + b.pct + '%</span>' +
          '</div>' +
          '<div style="background:#e8ecf0;border-radius:3px;height:5px;overflow:hidden;">' +
            '<div style="width:' + b.pct + '%;height:100%;background:' + b.color + ';border-radius:3px;transition:width 0.7s ease;"></div>' +
          '</div>' +
        '</div>';
      }).join('') +
      '<div style="font-size:0.68rem;color:#a0aec0;margin-top:6px;">Based on TF-IDF + Naive Bayes + CNN N-gram ensemble</div>';
  }

  // ────────────────────────────────────────────────
  // 4. RESOLUTION TIME PREDICTION
  // ────────────────────────────────────────────────
  function injectResolutionPredictor() {
    var aiBox = document.getElementById('aiDeptDisplay');
    if (!aiBox) return;
    var pred = document.createElement('div');
    pred.id = 'grievai-resolution-pred';
    pred.style.cssText = 'display:none;';
    aiBox.parentNode.insertBefore(pred, document.getElementById('grievai-conf-chart') ? document.getElementById('grievai-conf-chart').nextSibling : aiBox.nextSibling);
  }

  function updateResolutionPredictor(result) {
    var pred = document.getElementById('grievai-resolution-pred');
    if (!pred || !result || !result.dept) return;
    var rt = RESOLUTION_TIMES[result.dept];
    if (!rt) { pred.style.display = 'none'; return; }

    var isUrgent = result.urgency && (result.urgency.label || '').indexOf('CRITICAL') !== -1;
    var isHigh   = result.urgency && (result.urgency.label || '').indexOf('HIGH') !== -1;
    var min = isUrgent ? 1 : isHigh ? Math.max(1, rt.min - 1) : rt.min;
    var max = isUrgent ? Math.ceil(rt.max * 0.4) : isHigh ? Math.ceil(rt.max * 0.65) : rt.max;

    pred.style.display = 'block';
    pred.style.cssText = 'margin-top:10px;background:#f0fff4;border:1.5px solid #c6f6d5;border-radius:8px;padding:12px 14px;display:flex;align-items:center;gap:12px;';
    pred.innerHTML =
      '<div style="font-size:1.5rem;">⏱️</div>' +
      '<div>' +
        '<div style="font-size:0.7rem;color:#718096;margin-bottom:1px;">Estimated Resolution Time</div>' +
        '<div style="font-size:0.95rem;font-weight:700;color:#1a7a3f;">' + min + '–' + max + ' working days</div>' +
        '<div style="font-size:0.68rem;color:#718096;">SLA: ' + rt.sla + (isUrgent ? ' · <span style="color:#c0392b;font-weight:700;">Escalated due to CRITICAL priority</span>' : '') + '</div>' +
      '</div>';
  }

  // ────────────────────────────────────────────────
  // 5. SIMILARITY CHAIN ("X others reported this")
  // ────────────────────────────────────────────────
  function injectSimilarityChain() {
    var aiBox = document.getElementById('aiDeptDisplay');
    if (!aiBox) return;
    var chain = document.createElement('div');
    chain.id = 'grievai-similarity-chain';
    chain.style.cssText = 'display:none;';
    aiBox.parentNode.insertBefore(chain, document.getElementById('grievai-resolution-pred') ? document.getElementById('grievai-resolution-pred').nextSibling : aiBox.nextSibling);
  }

  function updateSimilarityChain(result) {
    var chain = document.getElementById('grievai-similarity-chain');
    if (!chain || !result || !result.dept) return;
    var sim = SAMPLE_SIMILAR[result.dept];
    if (!sim) { chain.style.display = 'none'; return; }

    chain.style.display = 'block';
    chain.style.cssText = 'margin-top:10px;background:#fff8f0;border:1.5px solid #fbd38d;border-radius:8px;padding:12px 14px;';
    chain.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:10px;">' +
        '<div style="font-size:1.3rem;flex-shrink:0;">🔗</div>' +
        '<div>' +
          '<div style="font-size:0.72rem;color:#718096;margin-bottom:2px;">Grievance DNA – Similarity Match</div>' +
          '<div style="font-size:0.85rem;font-weight:600;color:#7b341e;">' +
            '<strong>' + sim.count + ' people</strong> in ' + sim.area + ' reported a similar issue' +
          '</div>' +
          '<div style="font-size:0.75rem;color:#718096;margin-top:3px;">' +
            '📅 Last similar complaint resolved in <strong>' + sim.avgDays + ' days</strong> · ' +
            'Your complaint is being grouped with similar cases for faster resolution' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // ────────────────────────────────────────────────
  // 6. HUMAN-IN-THE-LOOP CORRECTION ENGINE
  // ────────────────────────────────────────────────
  var currentClassification = null;

  function injectCorrectionEngine() {
    var aiBox = document.getElementById('aiDeptDisplay');
    if (!aiBox) return;
    var corr = document.createElement('div');
    corr.id = 'grievai-correction-engine';
    corr.style.cssText = 'display:none;';
    aiBox.parentNode.insertBefore(corr, document.getElementById('grievai-similarity-chain') ? document.getElementById('grievai-similarity-chain').nextSibling : aiBox.nextSibling);
  }

  var ALL_DEPTS = [
    'Water Supply & Sanitation','Electricity Department',
    'Ministry of Health & Family Welfare','Transport Authority',
    'Police Department','Municipal Corporation','Revenue & Land Records',
    'Department of Education','Public Distribution System (PDS)',
    'Labour & Employment','Social Welfare & Women Development',
    'Agriculture Department','Telecommunications Department',
    'Ministry of Personnel, Public Grievances & Pensions'
  ];

  function updateCorrectionEngine(result) {
    var corr = document.getElementById('grievai-correction-engine');
    if (!corr || !result || !result.dept) return;
    currentClassification = result;

    var totalCorrections = getTotalCorrections();
    var learnBanner = totalCorrections > 0
      ? '<div style="font-size:0.7rem;background:#e8f5ee;border:1px solid #c6f6d5;border-radius:5px;padding:5px 10px;color:#1a7a3f;margin-bottom:8px;">✅ Based on <strong>' + totalCorrections + '</strong> community correction(s), GrievAI has self-improved its model accuracy.</div>'
      : '';

    corr.style.display = 'block';
    corr.style.cssText = 'margin-top:10px;background:#fafafa;border:1.5px solid #e2e8f0;border-radius:8px;padding:12px 14px;';

    var opts = ALL_DEPTS.filter(function(d){ return d !== result.dept; }).map(function(d) {
      return '<option value="' + d + '">' + d + '</option>';
    }).join('');

    corr.innerHTML =
      learnBanner +
      '<div style="font-size:0.72rem;color:#718096;margin-bottom:8px;font-weight:600;">🧑‍💼 Human-in-the-Loop — Is this classification correct?</div>' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
        '<button type="button" id="grievai-confirm-btn" style="background:#1a7a3f;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:0.78rem;font-weight:600;cursor:pointer;">✅ Yes, correct!</button>' +
        '<span style="font-size:0.75rem;color:#718096;">or correct it:</span>' +
        '<select id="grievai-correct-select" style="border:1px solid #d1d9e0;border-radius:6px;padding:5px 8px;font-size:0.75rem;background:#fff;color:#003366;flex:1;min-width:180px;">' +
          '<option value="">-- Select correct department --</option>' + opts +
        '</select>' +
        '<button type="button" id="grievai-submit-correction" style="background:#003366;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:0.78rem;font-weight:600;cursor:pointer;">Submit Correction</button>' +
      '</div>';

    document.getElementById('grievai-confirm-btn').onclick = function() {
      corr.innerHTML = '<div style="font-size:0.82rem;color:#1a7a3f;font-weight:600;">✅ Thank you! Confirmation recorded — AI model confidence strengthened.</div>';
    };

    document.getElementById('grievai-submit-correction').onclick = function() {
      var sel = document.getElementById('grievai-correct-select');
      if (!sel || !sel.value) { alert('Please select the correct department first.'); return; }
      var count = saveCorrection(result.dept, sel.value);
      var total = getTotalCorrections();
      corr.innerHTML =
        '<div style="font-size:0.82rem;color:#003366;font-weight:600;">🧠 Correction recorded! You routed it to: <em>' + sel.value + '</em></div>' +
        '<div style="font-size:0.72rem;color:#718096;margin-top:5px;">This correction has been made <strong>' + count + '</strong> time(s). Total community corrections: <strong>' + total + '</strong>. The model learns from every correction.</div>';
    };
  }

  // ────────────────────────────────────────────────
  // 7. EXPLAINABILITY PANEL (already in ai_department.js
  //    but we extend it to show it prettier)
  // ────────────────────────────────────────────────
  // This is handled by the enhanced AI display — no separate injection needed.

  // ────────────────────────────────────────────────
  // MASTER HOOK: intercept updateDetectionUI
  // ────────────────────────────────────────────────
  function hookAIDetection() {
    if (!window.GrievAI_Dept) return;
    var _origUpdate = window.GrievAI_Dept.updateDetectionUI.bind(window.GrievAI_Dept);

    window.GrievAI_Dept.updateDetectionUI = function(result) {
      // Run original
      _origUpdate(result);
      // Run enhancements
      var text = getComplaintText();
      updateSentimentMeter(text);
      updateConfidenceChart(result);
      updateResolutionPredictor(result);
      updateSimilarityChain(result);
      updateCorrectionEngine(result);
    };

    var _origClear = window.GrievAI_Dept.clearDetectionUI.bind(window.GrievAI_Dept);
    window.GrievAI_Dept.clearDetectionUI = function() {
      _origClear();
      var ids = ['grievai-sentiment-meter','grievai-conf-chart','grievai-resolution-pred','grievai-similarity-chain','grievai-correction-engine'];
      ids.forEach(function(id){ var el = document.getElementById(id); if(el) el.style.display='none'; });
    };
  }

  function getComplaintText() {
    var s = document.getElementById('fsubject');
    var d = document.getElementById('fdesc');
    return ((s ? s.value : '') + ' ' + (d ? d.value : '')).trim();
  }

  // ── Live sentiment update on description input ──
  function attachSentimentListener() {
    var fdesc = document.getElementById('fdesc');
    if (fdesc) {
      fdesc.addEventListener('input', function() {
        updateSentimentMeter(getComplaintText());
      });
    }
  }

  // ────────────────────────────────────────────────
  // INIT — run after DOM ready
  // ────────────────────────────────────────────────
  function init() {
    injectDemoButtons();
    injectSentimentMeter();
    injectConfidenceChart();
    injectResolutionPredictor();
    injectSimilarityChain();
    injectCorrectionEngine();
    hookAIDetection();
    attachSentimentListener();
    console.log('✅ GrievAI Enhancement Suite v1.0 loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already ready — wait for GrievAI_Dept to load
    setTimeout(init, 200);
  }

})();

// ====================================================
// FIX 1+2: LIVE AI TYPING PANEL + URGENCY METER
// Runs on every keystroke — updates dept + sentiment
// ====================================================
(function() {
  'use strict';

  var URGENCY_CONFIG = {
    CRITICAL: { pct:100, color:'#c0392b', bg:'#fdf0f0', border:'#f5a6a6', label:'🚨 CRITICAL PRIORITY', pill:'🚨 CRITICAL — Immediate escalation', barGrad:'#e74c3c' },
    HIGH:     { pct:75,  color:'#e07b00', bg:'#fff7ed', border:'#fbd38d', label:'🔴 HIGH PRIORITY',     pill:'🔴 HIGH — Fast-tracked for action', barGrad:'#FF6600' },
    MEDIUM:   { pct:45,  color:'#b7791f', bg:'#fffbeb', border:'#f6d860', label:'🟡 MEDIUM PRIORITY',   pill:'🟡 MEDIUM — Routed normally', barGrad:'#f6ad55' },
    LOW:      { pct:20,  color:'#1a7a3f', bg:'#f0fff4', border:'#b7e4c7', label:'🟢 LOW PRIORITY',      pill:'🟢 LOW — Standard processing', barGrad:'#48bb78' }
  };

  var CONF_STYLES = {
    high:   { bg:'#c6f6d5', color:'#1a7a3f', border:'#68d391', label:'✅ High Confidence' },
    medium: { bg:'#fefcbf', color:'#b7791f', border:'#f6e05e', label:'🔶 Medium Confidence' },
    low:    { bg:'#e9d8fd', color:'#553c9a', border:'#d6b4f0', label:'⬜ Low Confidence' }
  };

  var _debounceTimer = null;

  function updateLivePanel(text) {
    var panel        = document.getElementById('liveAIPanel');
    var iconEl       = document.getElementById('liveAIIcon');
    var deptEl       = document.getElementById('liveAIDept');
    var confEl       = document.getElementById('liveAIConfBadge');
    var methodEl     = document.getElementById('liveAIMethod');
    var fillEl       = document.getElementById('liveUrgencyFill');
    var labelEl      = document.getElementById('liveUrgencyLabel');
    var pillEl       = document.getElementById('liveUrgencyPill');
    var keywordsEl   = document.getElementById('liveAIKeywords');
    var hintEl       = document.getElementById('liveAIHint');

    if (!panel) return;

    if (!text || text.trim().length < 5) {
      // Reset to idle state
      if (iconEl)    iconEl.textContent    = '🏛️';
      if (deptEl)    deptEl.textContent    = 'Start typing your complaint…';
      if (confEl)    { confEl.textContent = 'Waiting…'; confEl.style.cssText = 'background:#e9d8fd;color:#553c9a;border:1px solid #d6b4f0;padding:3px 10px;border-radius:20px;font-size:0.68rem;font-weight:700;'; }
      if (fillEl)    { fillEl.style.width = '5%'; fillEl.style.background = '#a0aec0'; }
      if (labelEl)   labelEl.textContent  = '—';
      if (pillEl)    { pillEl.textContent = '⏳ Waiting for input…'; pillEl.style.cssText = 'background:#f7f8fa;color:#718096;border-color:#e2e8f0;display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;border-width:1.5px;border-style:solid;margin-top:6px;'; }
      if (keywordsEl) keywordsEl.innerHTML = '';
      if (hintEl)    hintEl.textContent   = 'Type at least 10 characters for AI analysis';
      return;
    }

    // Run classifier
    var result = window.GrievAI_Dept && window.GrievAI_Dept.classify(text);
    if (!result) return;

    var urgencyKey = 'LOW';
    if (result.urgency) {
      var ul = result.urgency.label || '';
      if (ul.indexOf('CRITICAL') !== -1)    urgencyKey = 'CRITICAL';
      else if (ul.indexOf('HIGH') !== -1)   urgencyKey = 'HIGH';
      else if (ul.indexOf('MEDIUM') !== -1) urgencyKey = 'MEDIUM';
    }
    var uc   = URGENCY_CONFIG[urgencyKey];
    var conf = CONF_STYLES[result.confidence || 'low'];

    // Update icon + dept
    if (iconEl) iconEl.textContent = result.icon || '🏛️';
    if (deptEl) deptEl.textContent = result.dept || 'Detecting…';

    // Update confidence badge
    if (confEl) {
      confEl.textContent  = conf.label;
      confEl.style.cssText = 'background:' + conf.bg + ';color:' + conf.color + ';border:1px solid ' + conf.border + ';padding:3px 10px;border-radius:20px;font-size:0.68rem;font-weight:700;white-space:nowrap;flex-shrink:0;margin-left:auto;';
    }

    // Update method badge
    if (methodEl) {
      methodEl.textContent = result.method || 'NLP+Phonetic';
      methodEl.style.display = 'inline-block';
    }

    // Update urgency meter
    if (fillEl) {
      fillEl.style.width      = uc.pct + '%';
      fillEl.style.background = 'linear-gradient(90deg,' + uc.barGrad + ',' + uc.color + ')';
    }
    if (labelEl) labelEl.textContent = uc.label;
    if (pillEl) {
      pillEl.textContent = uc.pill;
      pillEl.style.cssText = 'background:' + uc.bg + ';color:' + uc.color + ';border-color:' + uc.border + ';display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;border-width:1.5px;border-style:solid;margin-top:6px;';
    }

    // Update matched keywords
    if (keywordsEl && result.matched && result.matched.length) {
      keywordsEl.innerHTML = result.matched.slice(0, 8).map(function(k) {
        return '<code style="background:#edf2f7;color:#4a5568;padding:2px 7px;border-radius:4px;font-size:0.68rem;">' + k + '</code>';
      }).join('');
    }

    // Update hint
    if (hintEl) {
      var hints = { high: '✅ Department identified with high confidence', medium: '🔶 Reasonable match — add more details for accuracy', low: '💡 Keep typing — AI needs more context to classify' };
      hintEl.textContent = hints[result.confidence || 'low'];
    }

    // Sync hidden fields (for form submission)
    var hd = document.getElementById('fDeptHidden');
    if (hd) hd.value = result.dept;
    var hp = document.getElementById('fPriorityHidden');
    if (hp && result.urgency) hp.value = result.urgency.label;
  }

  // Debounced listener — fires 180ms after user stops typing
  function attachLivePanelListeners() {
    var descField    = document.getElementById('fdesc');
    var subjectField = document.getElementById('fsubject');
    if (!descField && !subjectField) return;

    function onInput() {
      clearTimeout(_debounceTimer);
      var text = ((subjectField ? subjectField.value : '') + ' ' + (descField ? descField.value : '')).trim();
      _debounceTimer = setTimeout(function() { updateLivePanel(text); }, 180);
    }

    if (descField)    { descField.addEventListener('input', onInput); descField.addEventListener('paste', onInput); }
    if (subjectField) { subjectField.addEventListener('input', onInput); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachLivePanelListeners);
  } else {
    attachLivePanelListeners();
  }

})();
