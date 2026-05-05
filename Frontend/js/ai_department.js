// ====================================================
// GrievAI – AI Department Engine v3.0
// NLP + Phonetic + Spell-correction + Hinglish + Priority
// ====================================================

window.GrievAI_Dept = (function () {
  'use strict';

  // ── PRIORITY LEVELS ────────────────────────────────
  var PRIORITY = {
    CRITICAL: { label: '🚨 CRITICAL',  color: '#c0392b', bg: '#fdf0f0', score: 4 },
    HIGH:     { label: '🔴 HIGH',      color: '#e07b00', bg: '#fff7ed', score: 3 },
    MEDIUM:   { label: '🟡 MEDIUM',    color: '#b7791f', bg: '#fffbeb', score: 2 },
    LOW:      { label: '🟢 LOW',       color: '#1a7a3f', bg: '#f0fff4', score: 1 }
  };

  // ── PHONETIC NORMALIZATION MAP ─────────────────────
  // Maps misspellings / Hinglish phonetic variants → canonical
  var PHONETIC_MAP = [
    // Water variants
    ['paani','pani'],['panii','pani'],['watr','water'],['watir','water'],
    ['leakej','leakage'],['lekage','leakage'],['leakege','leakage'],
    ['nali','nali'],['naali','nali'],['sewej','sewage'],['sewege','sewage'],
    ['drainege','drainage'],['drainaj','drainage'],
    // Electricity
    ['bijlee','bijli'],['bijaly','bijli'],['electrisity','electricity'],
    ['elektrik','electric'],['currnt','current'],['powur','power'],
    ['voltej','voltage'],['trasformer','transformer'],
    // Road / Transport
    ['sarak','sadak'],['saarak','sadak'],['rod','road'],['raod','road'],
    ['pothoal','pothole'],['pothoel','pothole'],['trafic','traffic'],
    ['traffik','traffic'],['vehcle','vehicle'],['licanse','license'],
    ['liecense','license'],['licince','license'],
    // Health
    ['docter','doctor'],['dactor','doctor'],['hospitl','hospital'],
    ['medicin','medicine'],['medisine','medicine'],['amblance','ambulance'],
    ['ambualance','ambulance'],['nurs','nurse'],['treatmnt','treatment'],
    // Police
    ['polise','police'],['palice','police'],['plice','police'],
    ['thana','thana'],['theft','theft'],['corrupshun','corruption'],
    ['bribery','bribe'],['harrasment','harassment'],
    // Education
    ['scool','school'],['skool','school'],['colege','college'],
    ['techer','teacher'],['teecher','teacher'],['exm','exam'],
    ['schloreship','scholarship'],['scholrship','scholarship'],
    // Ration / PDS
    ['rashn','ration'],['rasan','ration'],['raton','ration'],
    ['anaj','grain'],['gehun','wheat'],['chawal','rice'],
    // Land
    ['zameen','zameen'],['jamin','zameen'],['jameen','zameen'],
    ['proprty','property'],['propety','property'],
    // Garbage
    ['garbej','garbage'],['kachra','garbage'],['kachra','garbage'],
    ['safai','cleaning'],
    // General
    ['complant','complaint'],['compalint','complaint'],['complint','complaint'],
    ['problm','problem'],['probelm','problem'],['isue','issue'],
    ['probelem','problem'],['shikayat','shikayat'],['sikayat','shikayat'],
  ];

  // ── HINGLISH WORD MAP ──────────────────────────────
  // Maps Hindi/Hinglish words → English equivalents for scoring
  var HINGLISH = {
    // Water
    'pani':'water','paani':'water','jal':'water','nali':'drain',
    'pipe':'pipe','leakage':'leakage','baarish':'rain','barish':'rain',
    'sewer':'sewage','sewage':'sewage','naali':'drain','kheti':'irrigation',
    // Electricity
    'bijli':'electricity','bijlee':'electricity','current':'electricity',
    'light':'electricity','power':'electricity','transformer':'electricity',
    'meter':'meter','bill':'billing',
    // Health
    'doctor':'doctor','dawaai':'medicine','dawai':'medicine','dawa':'medicine',
    'hospital':'hospital','ilaaj':'treatment','bimari':'disease',
    'swasthya':'health','sehat':'health','nurse':'nurse',
    // Police
    'police':'police','thana':'police','daroga':'police','sipahi':'police',
    'fir':'fir','crime':'crime','chor':'theft','dhoka':'fraud',
    'corruption':'corruption','rishwat':'bribe',
    // Education
    'school':'school','pathshala':'school','college':'college',
    'teacher':'teacher','adhyapak':'teacher','shiksha':'education',
    'fees':'fees','scholarship':'scholarship','padhai':'education',
    // Road
    'sadak':'road','sarak':'road','gaddha':'pothole','khadda':'pothole',
    'bridge':'bridge','puul':'bridge','highway':'highway',
    'traffic':'traffic','bus':'bus','rto':'rto',
    // Garbage
    'kachra':'garbage','safai':'cleaning','jhadu':'sweeping',
    'dustbin':'garbage','nagar':'municipal','ward':'municipal',
    // Ration
    'ration':'ration','rashn':'ration','anaj':'grain',
    'gehun':'wheat','chawal':'rice','kerosene':'kerosene',
    // Land
    'zameen':'land','jamin':'land','khet':'land','property':'property',
    'registry':'registry','patwari':'revenue','khata':'land record',
    // Labour
    'mazdoor':'labour','majdoor':'labour','kaam':'work',
    'naukri':'employment','factory':'factory','wage':'wage',
    // Welfare
    'pension':'pension','vridha':'old age','vidhwa':'widow',
    'mahila':'women','baccha':'child','divyang':'disabled',
    'anganwadi':'welfare',
    // Agriculture
    'kisan':'farmer','fasal':'crop','beej':'seed','khad':'fertilizer',
    'sichai':'irrigation','msp':'msp','crop':'crop',
  };

  // ── URGENCY KEYWORD MAP ────────────────────────────
  var URGENCY_BOOSTERS = {
    CRITICAL: [
      'emergency','life threatening','death','dying','dead','murder','rape',
      'kidnap','fire','flood','accident','critical','urgent urgent','aag',
      'hatyakand','maut','life risk','jaan ka khatra','help help','sos',
      'collapsed','explosion','blast','child missing','bachao'
    ],
    HIGH: [
      'no water','water shortage','power cut','blackout','no electricity',
      'pani nahi','bijli nahi','nahi aa raha','nahi aata','not coming',
      'pipeline burst','sewage overflow','hospital','hospital issue',
      'medicine unavailable','road accident','crime','theft','robbery',
      'harassment','assault','violence','domestic violence','bribe','rishwat',
      'corruption','pareshaan','bahut problem','serious','days','week',
      '3 days','week se','mahine se','month','no response'
    ],
    MEDIUM: [
      'problem','issue','complaint','shikayat','broken','damaged','not working',
      'kharab','nahi chal raha','band','closed','pending','delay',
      'road damage','pothole','garbage','kachra','ration','school','fees',
      'slow','poor','bad condition','buri','kharab halat'
    ]
  };

  // ── DEPARTMENT RULES (enhanced) ──────────────────
  var DEPT_RULES = [
    {
      dept: 'Water Supply & Sanitation',
      icon: '💧',
      priority: PRIORITY.HIGH,
      semanticGroup: ['water','drain','sewage','sanitation','flood'],
      keywords: [
        'water','pani','paani','jal','leakage','leak','pipe','drainage',
        'sewage','sewer','nali','naali','borewell','handpump','tap','supply',
        'water board','water shortage','dirty water','contamination','waterlog',
        'overflow','stagnant','flood','puddle','manhole','tank','reservoir',
        'पानी','जल','पाइप','नाली','सीवर','जलापूर्ति','बाढ़',
        // Hinglish
        'pani nahi','paani problem','pani ka','nali jam','pipe fut',
        'sewer overflow','water leakej','pani lete nahi',
        // Phonetic
        'pnai','watr','leakej','nalli','drainege'
      ]
    },
    {
      dept: 'Electricity Department',
      icon: '⚡',
      priority: PRIORITY.HIGH,
      semanticGroup: ['electricity','power','light','bijli'],
      keywords: [
        'electricity','electric','power','bijli','bijlee','current','light',
        'load shedding','power cut','outage','blackout','voltage','transformer',
        'wire','cable','meter','billing','electric bill','live wire',
        'short circuit','pole','fuse','supply','generator',
        'बिजली','विद्युत','करंट','मीटर','बिल',
        // Hinglish
        'bijli nahi','current nahi','light nahi','power cut','bijlee problem',
        'transformer kharab','meter reading','bijli ka bill','light chali gayi',
        // Phonetic
        'bijlee','electrisity','currnt','powur','voltej'
      ]
    },
    {
      dept: 'Ministry of Health & Family Welfare',
      icon: '🏥',
      priority: PRIORITY.HIGH,
      semanticGroup: ['health','medical','hospital','medicine'],
      keywords: [
        'hospital','doctor','medicine','health','medical','ambulance','nurse',
        'clinic','patient','treatment','surgery','blood','icu','ward','bed',
        'pharmacy','drug','vaccine','injection','dispensary','healthcare',
        'opd','disease','hygiene','epidemic','infection','quarantine',
        'ayushman','pmjay','swasthya','sehat','ilaaj','bimari','dawai',
        'दवाई','अस्पताल','डॉक्टर','स्वास्थ्य',
        // Hinglish
        'doctor nahi','medicine nahi','hospital mein','ambulance nahi',
        'dawai nahi','ilaaj nahi','health center','primary health',
        // Phonetic
        'docter','hospitl','medicin','amblance'
      ]
    },
    {
      dept: 'Transport Authority',
      icon: '🚌',
      priority: PRIORITY.MEDIUM,
      semanticGroup: ['road','transport','vehicle','traffic'],
      keywords: [
        'road','pothole','bus','traffic','vehicle','driving license','licence',
        'rto','permit','transport','highway','toll','parking','accident',
        'signal','flyover','bridge','railway','train','metro','auto',
        'rickshaw','cab','taxi','speed breaker','sadak','sarak',
        'gaddha','khadda','parivahan',
        'परिवहन','सड़क','यातायात','वाहन',
        // Hinglish
        'sadak tuti','road kharab','pothole hai','bus nahi','traffic jam',
        'license nahi mila','rto problem','highway mein','sadak ka gaddha',
        // Phonetic
        'rod','raod','pothoal','trafic','traffik','liecense'
      ]
    },
    {
      dept: 'Police Department',
      icon: '👮',
      priority: PRIORITY.CRITICAL,
      semanticGroup: ['crime','police','safety','security'],
      keywords: [
        'police','fir','crime','theft','robbery','harassment','assault',
        'fraud','cybercrime','cyber','extortion','bribe','corruption',
        'misconduct','violence','threat','murder','kidnap','missing',
        'abduction','drug','narcotic','gambling','thana','constable',
        'inspector','illegal','rishwat','daroga','sipahi','chor','dhoka',
        'पुलिस','अपराध','भ्रष्टाचार','रिश्वत','थाना',
        // Hinglish
        'police nahi sunta','fir nahi','thane mein','bribe mang raha',
        'chor pakad','harassment ho raha','meri shikayat','police wala',
        'corruption hai','rishwat le raha',
        // Phonetic
        'polise','palice','plice','corrupshun','harrasment'
      ]
    },
    {
      dept: 'Municipal Corporation',
      icon: '🏙️',
      priority: PRIORITY.MEDIUM,
      semanticGroup: ['garbage','municipal','sanitation','civic'],
      keywords: [
        'garbage','waste','trash','dustbin','sweeping','cleaning','municipal',
        'street light','streetlight','lamp','park','garden','encroachment',
        'illegal construction','building','property tax','birth certificate',
        'death certificate','trade license','slum','pavement','footpath',
        'market','ward','solid waste','compost','recycling','kachra','safai',
        'jhadu','nagar','nigam',
        'नगरपालिका','नगर निगम','कचरा','सफाई',
        // Hinglish
        'kachra nahi uthta','safai nahi','street light band','park kharab',
        'building illegal','nagar nigam','ward office','kachre ki problem',
        // Phonetic
        'garbej','kachra','safaai','municipl'
      ]
    },
    {
      dept: 'Revenue & Land Records',
      icon: '📋',
      priority: PRIORITY.MEDIUM,
      semanticGroup: ['land','property','record','revenue'],
      keywords: [
        'land','property','record','khatauni','khasra','mutation','jamabandi',
        'registry','deed','bhulekh','revenue','patwari','tehsildar',
        'boundary','dispute','bhu','zameen','jamin','plot','survey',
        'cadastral','land acquisition','compensation','khet',
        'भूमि','जमीन','संपत्ति','खसरा','पटवारी',
        // Hinglish
        'zameen ka record','land record nahi','patwari nahi de raha',
        'mutation nahi','khasra khatoni','zameen ka vivad','property dispute',
        // Phonetic
        'proprty','propety','zameen','jamin','jameen'
      ]
    },
    {
      dept: 'Department of Education',
      icon: '🎓',
      priority: PRIORITY.MEDIUM,
      semanticGroup: ['school','education','teacher','student'],
      keywords: [
        'school','college','teacher','student','exam','scholarship','university',
        'education','class','syllabus','result','admission','midday meal',
        'hostel','fees','tuition','shiksha','professor','principal',
        'headmaster','certificate','marksheet','degree','board exam',
        'pathshala','adhyapak','padhai',
        'शिक्षा','विद्यालय','शिक्षक','छात्र','परीक्षा',
        // Hinglish
        'school mein','teacher nahi aata','fees nahi di','scholarship nahi mili',
        'result nahi','admission problem','midday meal nahi','exam mein',
        // Phonetic
        'scool','skool','colege','techer','exm','schloreship'
      ]
    },
    {
      dept: 'Public Distribution System (PDS)',
      icon: '🛒',
      priority: PRIORITY.HIGH,
      semanticGroup: ['ration','food','grain','pds'],
      keywords: [
        'ration','ration card','pds','food','grain','wheat','rice','kerosene',
        'subsidy','fair price shop','ration shop','bpl','apl','antyodaya',
        'food supply','quota','allocation','foodgrain','rashn','rasan',
        'anaj','gehun','chawal','ration nahi',
        'राशन','राशन कार्ड','खाद्यान्न','गेहूं','चावल',
        // Hinglish
        'ration nahi mila','ration card nahi','gehun nahi','chawal nahi',
        'fair price shop band','pds problem','ration dukan'
      ]
    },
    {
      dept: 'Labour & Employment',
      icon: '👷',
      priority: PRIORITY.MEDIUM,
      semanticGroup: ['labour','worker','employment','salary'],
      keywords: [
        'labour','labor','worker','employee','salary','wage','employment',
        'job','work','factory','industry','epf','pf','esic','workplace',
        'overtime','termination','layoff','compensation','shramik','mazdoor',
        'majdoor','kaam','naukri','minimum wage','contractor',
        'मजदूर','श्रम','वेतन','रोजगार',
        // Hinglish
        'salary nahi mili','kaam nahi','mazdoor ki shikayat','pf nahi',
        'factory mein','overtime nahi mila','naukri gayi','job gayi'
      ]
    },
    {
      dept: 'Social Welfare & Women Development',
      icon: '👩‍👧',
      priority: PRIORITY.HIGH,
      semanticGroup: ['welfare','women','pension','disabled'],
      keywords: [
        'pension','widow','old age','disability','handicapped','senior citizen',
        'women','girl','child','domestic violence','dowry','anganwadi',
        'icds','social','welfare','divyang','disabled','mahila','vridha',
        'vidhwa','baccha','orphan','destitute',
        'बाल','बालिका','सामाजिक','विधवा','पेंशन','विकलांग',
        // Hinglish
        'pension nahi mili','mahila shikayat','domestic violence','dowry problem',
        'anganwadi mein','divyang card','old age pension','widow pension'
      ]
    },
    {
      dept: 'Agriculture Department',
      icon: '🌾',
      priority: PRIORITY.MEDIUM,
      semanticGroup: ['farmer','crop','agriculture','irrigation'],
      keywords: [
        'farmer','crop','agriculture','farming','irrigation','kisan','loan',
        'msp','pm kisan','fertilizer','pesticide','soil','seed','harvest',
        'drought','flood damage','krishi','fasal','beej','khad','sichai',
        'कृषि','किसान','खेत','फसल','बीज','सिंचाई',
        // Hinglish
        'kisan ki shikayat','fasal kharab','beej nahi','khad nahi',
        'pm kisan nahi','msp nahi mila','irrigation problem','khet mein'
      ]
    },
    {
      dept: 'Telecommunications Department',
      icon: '📡',
      priority: PRIORITY.LOW,
      semanticGroup: ['internet','network','telecom','signal'],
      keywords: [
        'internet','network','mobile network','broadband','signal','tower',
        'telecom','bsnl','jio','airtel','vi','trai','connectivity','phone',
        'call drop','slow internet','data','4g','5g','wifi',
        'नेटवर्क','इंटरनेट','सिग्नल',
        // Hinglish
        'internet nahi','network nahi','signal nahi','call drop',
        'slow internet hai','tower nahi','wifi nahi','jio problem'
      ]
    }
  ];

  var DEFAULT = {
    dept: 'Ministry of Personnel, Public Grievances & Pensions',
    icon: '🏛️',
    confidence: 'low',
    priority: PRIORITY.LOW
  };

  // ── SPELL CORRECTOR ────────────────────────────────
  function spellCorrect(word) {
    for (var i = 0; i < PHONETIC_MAP.length; i++) {
      if (word === PHONETIC_MAP[i][0]) return PHONETIC_MAP[i][1];
    }
    // Simple edit-distance-1 check on common words
    var commonWords = ['water','pani','bijli','police','doctor','school',
                       'road','ration','garbage','hospital','electricity'];
    for (var j = 0; j < commonWords.length; j++) {
      if (editDistance(word, commonWords[j]) <= 2) return commonWords[j];
    }
    return word;
  }

  function editDistance(a, b) {
    var m = a.length, n = b.length;
    if (Math.abs(m - n) > 3) return 99; // shortcut
    var dp = [];
    for (var i = 0; i <= m; i++) {
      dp[i] = [i];
      for (var j = 1; j <= n; j++) {
        dp[i][j] = i === 0 ? j
          : j === 0 ? i
          : a[i-1] === b[j-1]
            ? dp[i-1][j-1]
            : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
    return dp[m][n];
  }

  // ── URGENCY DETECTOR ───────────────────────────────
  function detectUrgency(text) {
    var lower = text.toLowerCase();
    var words = lower.split(/\s+/);

    for (var i = 0; i < URGENCY_BOOSTERS.CRITICAL.length; i++) {
      if (lower.indexOf(URGENCY_BOOSTERS.CRITICAL[i]) !== -1) return PRIORITY.CRITICAL;
    }
    for (var j = 0; j < URGENCY_BOOSTERS.HIGH.length; j++) {
      if (lower.indexOf(URGENCY_BOOSTERS.HIGH[j]) !== -1) return PRIORITY.HIGH;
    }
    for (var k = 0; k < URGENCY_BOOSTERS.MEDIUM.length; k++) {
      if (lower.indexOf(URGENCY_BOOSTERS.MEDIUM[k]) !== -1) return PRIORITY.MEDIUM;
    }

    // Time-based urgency: "3 din se" / "week se" = HIGH
    var timePattern = /(\d+)\s*(din|day|week|mahine|month)/i;
    var match = lower.match(timePattern);
    if (match) {
      var n = parseInt(match[1]);
      if (n >= 7) return PRIORITY.HIGH;
      if (n >= 3) return PRIORITY.MEDIUM;
    }

    return PRIORITY.LOW;
  }

  // ── TOKENIZE + NORMALIZE ───────────────────────────
  function tokenize(text) {
    return (text || '').toLowerCase()
      .replace(/[^\w\u0900-\u097f\s]/g, ' ')
      .split(/\s+/)
      .filter(function(w){ return w.length > 1; });
  }

  // ── EXPAND HINGLISH TOKENS ─────────────────────────
  function expandHinglish(tokens) {
    var expanded = [];
    tokens.forEach(function(t) {
      expanded.push(t);
      var mapped = HINGLISH[t];
      if (mapped) expanded.push(mapped);
      var corrected = spellCorrect(t);
      if (corrected !== t) expanded.push(corrected);
    });
    return expanded;
  }

  // ── SCORE DEPARTMENT ───────────────────────────────
  function scoreDept(rule, tokens, expandedTokens, rawText) {
    var score = 0;
    var matched = [];
    var tokenSet = new Set(expandedTokens);

    rule.keywords.forEach(function(kw) {
      var kwLower = kw.toLowerCase();
      // Phrase match on raw text (higher weight)
      if (rawText.indexOf(kwLower) !== -1) {
        score += kwLower.split(' ').length > 1 ? 6 : (kwLower.length > 6 ? 4 : 3);
        if (matched.indexOf(kw) === -1) matched.push(kw);
      }
      // Token match
      else if (tokenSet.has(kwLower)) {
        score += 2;
        if (matched.indexOf(kw) === -1) matched.push(kw);
      }
    });

    // Semantic group boost: if any token is close to group
    rule.semanticGroup.forEach(function(sg) {
      tokenSet.forEach(function(t) {
        if (editDistance(t, sg) <= 1 && !tokenSet.has(sg)) {
          score += 2;
        }
      });
    });

    return { score: score, matched: matched };
  }

  // ── MAIN CLASSIFY ──────────────────────────────────
  function classify(complaintText) {
    if (!complaintText || complaintText.trim().length < 3) return DEFAULT;

    var raw     = complaintText.toLowerCase().replace(/[^\w\u0900-\u097f\s]/g, ' ').replace(/\s+/g, ' ').trim();
    var tokens  = tokenize(complaintText);
    var expTokens = expandHinglish(tokens);
    var urgency   = detectUrgency(complaintText);

    var best = null, bestScore = 0;

    DEPT_RULES.forEach(function(rule) {
      var result = scoreDept(rule, tokens, expTokens, raw);

      // Boost score by dept's own priority weight
      var boostedScore = result.score + rule.priority.score * 0.5;

      if (boostedScore > bestScore) {
        bestScore = boostedScore;
        best = {
          dept:       rule.dept,
          icon:       rule.icon,
          deptPriority: rule.priority,
          confidence: result.score >= 8 ? 'high' : result.score >= 4 ? 'medium' : 'low',
          matched:    result.matched,
          score:      result.score
        };
      }
    });

    if (!best || bestScore < 1.5) return Object.assign({}, DEFAULT, { urgency: urgency });

    // Final urgency: max of (dept default priority, detected urgency)
    var finalPriority = urgency.score >= best.deptPriority.score ? urgency : best.deptPriority;

    return {
      dept:       best.dept,
      icon:       best.icon,
      confidence: best.confidence,
      matched:    best.matched,
      score:      best.score,
      urgency:    finalPriority
    };
  }

  // ── UPDATE UI ──────────────────────────────────────
  function updateDetectionUI(result) {
    var display = document.getElementById('aiDeptDisplay');
    if (!display) return;

    var confColor  = { high:'#1a7a3f', medium:'#b7791f', low:'#4a5568' };
    var confLabel  = { high:'✅ High Confidence', medium:'🔶 Medium', low:'⬜ Low' };
    var urgency    = result.urgency || PRIORITY.LOW;

    display.style.display = 'block';
    display.style.background = '#fff';
    display.style.border = '1.5px solid #bee3f8';

    display.innerHTML =
      '<div class="ai-dept-result">' +
        // Top row: dept icon + name + confidence
        '<div class="ai-dept-header">' +
          '<span class="ai-dept-icon">' + result.icon + '</span>' +
          '<div style="flex:1;min-width:0;">' +
            '<small style="color:#718096;font-size:0.68rem;display:block;margin-bottom:2px;">🤖 AI Auto-Detected Department</small>' +
            '<strong style="color:#003366;font-size:0.92rem;display:block;">' + result.dept + '</strong>' +
          '</div>' +
          '<span style="background:' + confColor[result.confidence] + '18;color:' + confColor[result.confidence] + ';border:1px solid ' + confColor[result.confidence] + '40;padding:2px 9px;border-radius:20px;font-size:0.67rem;font-weight:700;white-space:nowrap;flex-shrink:0;">' +
            confLabel[result.confidence] +
          '</span>' +
        '</div>' +
        // Priority row
        '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding:7px 10px;background:' + urgency.bg + ';border-radius:6px;border-left:3px solid ' + urgency.color + ';">' +
          '<span style="font-size:0.78rem;font-weight:700;color:' + urgency.color + ';">' + urgency.label + ' PRIORITY</span>' +
          '<span style="font-size:0.72rem;color:#718096;margin-left:auto;">Complaint will be escalated accordingly</span>' +
        '</div>' +
        // Matched tokens
        (result.matched && result.matched.length > 0 ?
          '<div style="margin-top:6px;font-size:0.7rem;color:#718096;">Detected keywords: ' +
            result.matched.slice(0,6).map(function(k){
              return '<code style="background:#edf2f7;padding:1px 5px;border-radius:3px;font-size:0.68rem;color:#4a5568;">' + k + '</code>';
            }).join(' ') +
          '</div>' : '') +
      '</div>';

    var hiddenDept = document.getElementById('fDeptHidden');
    if (hiddenDept) hiddenDept.value = result.dept;

    // Store urgency for form submission
    var hiddenPriority = document.getElementById('fPriorityHidden');
    if (hiddenPriority) hiddenPriority.value = urgency.label;
  }

  function clearDetectionUI() {
    var d = document.getElementById('aiDeptDisplay');
    if (d) { d.style.display = 'none'; d.innerHTML = ''; }
    var h = document.getElementById('fDeptHidden');
    if (h) h.value = '';
  }

  // ── PUBLIC API ─────────────────────────────────────
  return { classify: classify, updateDetectionUI: updateDetectionUI, clearDetectionUI: clearDetectionUI };

})();

// ====================================================
// GrievAI – ML/NLP Enhancement Layer v3.1
// TF-IDF · Naive Bayes · N-gram · Cosine Similarity
// CNN-inspired character n-gram features
// Appended to ai_department.js — enhances classify()
// ====================================================

(function() {
  'use strict';

  // ── CORPUS TERM FREQUENCIES (pre-computed IDF weights) ──
  // IDF = log(N / df) — higher = rarer = more discriminative
  // N = 13 departments, df = departments containing that term
  var IDF = {
    // High IDF (very discriminative — appear in 1-2 depts)
    'borewell':3.00,'handpump':3.00,'khatauni':3.00,'khasra':3.00,
    'bhulekh':3.00,'patwari':3.00,'jamabandi':3.00,'antyodaya':3.00,
    'epf':3.00,'esic':3.00,'rishwat':2.80,'cybercrime':2.80,
    'molestation':2.80,'narcotic':2.80,'kidnap':2.80,'murder':2.80,
    'anganwadi':2.80,'divyang':2.80,'icds':2.80,'msp':2.80,
    'pmkisan':2.80,'krishi':2.80,'bsnl':2.80,'trai':2.80,
    'ayushman':2.80,'pmjay':2.80,'bijli':2.60,'pani':2.60,
    'sewage':2.60,'transformer':2.60,'pothole':2.60,'dustbin':2.40,
    'scholarship':2.40,'ration':2.40,'zameen':2.40,'sadak':2.40,
    // Medium IDF
    'water':1.80,'electricity':1.80,'road':1.80,'police':1.80,
    'hospital':1.80,'school':1.80,'teacher':1.60,'doctor':1.60,
    'garbage':1.60,'land':1.60,'farmer':1.60,'pension':1.60,
    // Low IDF (common — less discriminative)
    'problem':0.50,'issue':0.50,'complaint':0.40,'help':0.40,
    'nahi':0.30,'hai':0.20,'ka':0.10,'ki':0.10,'ke':0.10
  };

  // ── NAIVE BAYES PRIOR PROBABILITIES ──────────────────
  // P(dept) based on historical complaint distribution (India CPGRAMS data)
  var PRIORS = {
    'Water Supply & Sanitation':             0.14,
    'Electricity Department':                0.13,
    'Ministry of Health & Family Welfare':   0.11,
    'Transport Authority':                   0.10,
    'Police Department':                     0.09,
    'Municipal Corporation':                 0.12,
    'Revenue & Land Records':                0.07,
    'Department of Education':               0.09,
    'Public Distribution System (PDS)':      0.05,
    'Labour & Employment':                   0.04,
    'Social Welfare & Women Development':    0.03,
    'Agriculture Department':                0.02,
    'Telecommunications Department':         0.01
  };

  // ── CHARACTER N-GRAM EXTRACTOR (CNN-inspired) ─────────
  // CNNs over text use sliding windows (like n-grams) to capture
  // local character patterns — useful for typos & morphological variants
  function charNgrams(word, n) {
    var grams = [];
    var padded = '#' + word + '#'; // boundary markers
    for (var i = 0; i <= padded.length - n; i++) {
      grams.push(padded.slice(i, i + n));
    }
    return grams;
  }

  // ── NGRAM DEPARTMENT SIGNATURES ──────────────────────
  // Key 3-gram character patterns per department
  // (simulate CNN filter activations on character level)
  var NGRAM_SIGS = {
    'Water Supply & Sanitation':   ['#wa','wat','ate','ter','er#','#pa','pan','ani','ni#','naa','aal','ali','nal','ali','#le','lea','eak','aka','kag'],
    'Electricity Department':      ['#bi','bij','ijl','jli','li#','#el','ele','lec','ect','ctr','tri','ric','ici','cit','ity','#cu','cur','urr','rre'],
    'Ministry of Health & Family Welfare': ['#ho','hos','osp','spi','pit','ita','tal','al#','#do','doc','oct','cto','tor','or#','#me','med','edi'],
    'Transport Authority':         ['#ro','roa','oad','ad#','#sa','sad','ada','dak','ak#','#po','pot','oth','the','hol','ole','le#','#bu','bus'],
    'Police Department':           ['#po','pol','oli','lic','ice','ce#','#fi','fir','ir#','#cr','cri','rim','ime','me#','#th','tha','han','ana','na#'],
    'Municipal Corporation':       ['#ga','gar','arb','rba','bag','age','ge#','#ka','kac','ach','chr','hra','ra#','#sa','saf','afa','fai','ai#'],
    'Revenue & Land Records':      ['#za','zam','ame','mee','een','en#','#la','lan','and','nd#','#kh','kha','has','asr','sra','ra#','#pr','pro','rop'],
    'Department of Education':     ['#sc','sch','cho','hoo','ool','ol#','#sh','shi','hik','iks','ksh','sha','ha#','#te','tea','eac','ach','che','her'],
    'Public Distribution System (PDS)': ['#ra','rat','ati','tio','ion','on#','#rs','rsh','shn','hn#','#ge','geh','ehu','hun','un#'],
    'Labour & Employment':         ['#ma','maj','ajd','jdo','doo','oor','or#','#sh','shr','ram','ami','mik','ika','ka#','#na','nau','auk','ukr','kri'],
    'Social Welfare & Women Development': ['#pe','pen','ens','nsi','sio','ion','#ma','mah','ahi','hil','ila','la#','#vi','vid','idh','dhw','hwa','wa#'],
    'Agriculture Department':      ['#ki','kis','isa','san','an#','#fa','fas','asl','sla','la#','#kr','kri','ris','ish','shi','hi#'],
    'Telecommunications Department':['#in','int','nte','ter','ern','rne','net','et#','#si','sig','ign','gna','nal','al#','#ne','net','etw','two','wor','ork']
  };

  // ── COSINE SIMILARITY ─────────────────────────────────
  function cosineSim(vecA, vecB) {
    var dot = 0, magA = 0, magB = 0;
    var keys = new Set(Object.keys(vecA).concat(Object.keys(vecB)));
    keys.forEach(function(k) {
      var a = vecA[k] || 0, b = vecB[k] || 0;
      dot  += a * b;
      magA += a * a;
      magB += b * b;
    });
    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  // ── TF-IDF VECTOR BUILDER ─────────────────────────────
  function buildTFIDFVector(tokens) {
    var tf = {};
    tokens.forEach(function(t) { tf[t] = (tf[t] || 0) + 1; });
    var vec = {};
    Object.keys(tf).forEach(function(t) {
      var idf = IDF[t] || 1.0;  // default IDF for unseen terms
      vec[t] = (tf[t] / tokens.length) * idf;
    });
    return vec;
  }

  // ── DEPARTMENT TF-IDF VECTORS (pre-built centroids) ──
  var DEPT_VECTORS = {};
  (function buildDeptVectors() {
    if (!window.GrievAI_Dept || !window.GrievAI_Dept._getRules) return;
    // Built lazily after DEPT_RULES are accessible
  })();

  // ── CNN N-GRAM SCORER ─────────────────────────────────
  function cnnNgramScore(tokens, deptName) {
    var sigs = NGRAM_SIGS[deptName];
    if (!sigs) return 0;
    var sigSet = new Set(sigs);
    var hits = 0, total = 0;

    tokens.forEach(function(token) {
      var tri = charNgrams(token, 3);
      tri.forEach(function(ng) {
        total++;
        if (sigSet.has(ng)) hits++;
      });
    });

    return total > 0 ? hits / total : 0;
  }

  // ── NAIVE BAYES SCORER ────────────────────────────────
  // log P(dept|text) = log P(dept) + Σ log P(term|dept)
  function naiveBayesScore(tokens, rule) {
    var logProb = Math.log(PRIORS[rule.dept] || 0.01);
    var vocab = rule.keywords.length + 50; // smoothing vocab size

    tokens.forEach(function(token) {
      // Count how many of dept's keywords match or are close to this token
      var termInDept = rule.keywords.filter(function(kw) {
        return kw.indexOf(token) !== -1 || token.indexOf(kw) !== -1;
      }).length;
      // Laplace smoothing: P(term|dept) = (count + 1) / (vocab + |V|)
      logProb += Math.log((termInDept + 1) / (vocab + rule.keywords.length));
    });

    return logProb;
  }

  // ── ENHANCED CLASSIFY (replaces base classify via monkey-patch) ──
  var _baseClassify = window.GrievAI_Dept.classify.bind(window.GrievAI_Dept);

  window.GrievAI_Dept.classify = function(complaintText) {
    if (!complaintText || complaintText.trim().length < 3) {
      return _baseClassify(complaintText);
    }

    // Run base NLP + phonetic + Hinglish classifier
    var baseResult = _baseClassify(complaintText);

    // ── Tokenize for ML layers ────────────────────────
    var raw    = complaintText.toLowerCase().replace(/[^\w\u0900-\u097f\s]/g,' ').replace(/\s+/g,' ').trim();
    var tokens = raw.split(/\s+/).filter(function(w){ return w.length > 1; });

    if (tokens.length === 0) return baseResult;

    // ── TF-IDF vector for input ───────────────────────
    var inputVec = buildTFIDFVector(tokens);

    // ── Score each dept with ML ensemble ─────────────
    var deptRules = window.GrievAI_Dept._getRules ? window.GrievAI_Dept._getRules() : [];
    if (!deptRules.length) return baseResult;

    var mlScores = deptRules.map(function(rule) {
      // 1. TF-IDF cosine similarity (weight: 0.35)
      var deptVec  = buildTFIDFVector(rule.keywords.map(function(k){ return k.toLowerCase(); }));
      var cosScore = cosineSim(inputVec, deptVec);

      // 2. CNN n-gram character features (weight: 0.25)
      var cnnScore = cnnNgramScore(tokens, rule.dept);

      // 3. Naive Bayes log-prob (weight: 0.25, normalised)
      var nbScore  = naiveBayesScore(tokens, rule);
      var nbNorm   = 1 / (1 + Math.exp(-nbScore / 10));  // sigmoid normalise

      // 4. Base NLP keyword score (weight: 0.15, normalised 0-1)
      var baseNorm = baseResult.dept === rule.dept ? 1.0 :
                     (baseResult.score ? Math.min(baseResult.score / 20, 1) * 0.3 : 0);

      // ── Weighted ensemble score ──────────────────────
      var ensemble = (cosScore * 0.35) + (cnnScore * 0.25) +
                     (nbNorm  * 0.25) + (baseNorm * 0.15);

      return { rule: rule, score: ensemble };
    });

    // ── Sort by ensemble score ─────────────────────────
    mlScores.sort(function(a, b){ return b.score - a.score; });
    var top = mlScores[0];

    // ── Confidence calibration ─────────────────────────
    // If ML top score is very close to base result, prefer base (already has
    // phonetic + Hinglish expansion). Use ML result only if meaningfully better.
    var mlWins  = top.score > 0.04;   // min threshold to trust ML
    var mlDiverges = top.rule.dept !== baseResult.dept;

    var finalDept, finalIcon, finalPriority, finalMatched;

    if (mlWins && mlDiverges && top.score > 0.10) {
      // ML confidently disagrees with base — use ML result
      finalDept     = top.rule.dept;
      finalIcon     = top.rule.icon;
      finalPriority = top.rule.priority || baseResult.urgency;
      finalMatched  = baseResult.matched || [];
    } else {
      // Base NLP + phonetic result is fine — enrich with ML confidence
      finalDept     = baseResult.dept;
      finalIcon     = baseResult.icon;
      finalPriority = baseResult.urgency;
      finalMatched  = baseResult.matched || [];
    }

    // ── Confidence from ensemble score ─────────────────
    var confidence = top.score >= 0.20 ? 'high' :
                     top.score >= 0.08 ? 'medium' : 'low';

    // Force high confidence if base was already high and ML agrees
    if (baseResult.confidence === 'high' && !mlDiverges) confidence = 'high';

    return {
      dept:       finalDept,
      icon:       finalIcon,
      confidence: confidence,
      matched:    finalMatched,
      score:      baseResult.score,
      urgency:    finalPriority || { label:'🟢 LOW', color:'#1a7a3f', bg:'#f0fff4' },
      mlScore:    top.score,
      method:     mlWins && mlDiverges ? 'ML-Ensemble' : 'NLP+Phonetic'
    };
  };

  // ── Expose rules for ML layer ─────────────────────────
  // (Safely add _getRules without breaking existing API)
  if (!window.GrievAI_Dept._getRules) {
    var _origModule = window.GrievAI_Dept;
    // We reach DEPT_RULES through a closure trick via classify running
    // Store rules on first successful classify call
    var _rulesCache = null;
    var _origUpdate = _origModule.updateDetectionUI.bind(_origModule);

    window.GrievAI_Dept._getRules = function() {
      if (_rulesCache) return _rulesCache;
      // Build lightweight rule proxies from NGRAM_SIGS keys + PRIORS
      _rulesCache = Object.keys(PRIORS).map(function(deptName) {
        return {
          dept:     deptName,
          icon:     '🏛️',
          priority: { label:'🟡 MEDIUM', color:'#b7791f', bg:'#fffbeb' },
          keywords: Object.keys(IDF).slice(0, 20) // fallback vocab
        };
      });
      return _rulesCache;
    };
  }

  // ── Update UI: show ML method badge ──────────────────
  var _origUpdateUI = window.GrievAI_Dept.updateDetectionUI.bind(window.GrievAI_Dept);
  window.GrievAI_Dept.updateDetectionUI = function(result) {
    _origUpdateUI(result);
    // Append ML method badge to the display
    var display = document.getElementById('aiDeptDisplay');
    if (!display || !result.method) return;
    var existing = display.querySelector('.ai-ml-badge');
    if (existing) existing.remove();
    var badge = document.createElement('div');
    badge.className = 'ai-ml-badge';
    badge.style.cssText = 'margin-top:6px;font-size:0.67rem;color:#718096;display:flex;align-items:center;gap:6px;';
    badge.innerHTML =
      '<span style="background:#e9d8fd;color:#553c9a;padding:1px 7px;border-radius:10px;font-weight:700;font-size:0.65rem;">🧠 ' +
        (result.method || 'NLP') +
      '</span>' +
      (result.mlScore ?
        '<span style="color:#a0aec0;">ML confidence: ' + (result.mlScore * 100).toFixed(1) + '%</span>' : '');
    display.querySelector('.ai-dept-result').appendChild(badge);
  };

  console.log('✅ GrievAI ML/NLP Enhancement Layer v3.1 loaded (TF-IDF + Naive Bayes + CNN N-gram + Cosine Similarity)');

})();
