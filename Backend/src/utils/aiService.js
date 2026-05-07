// ─────────────────────────────────────────────────────
// GrievAI — AI Service Client
// Calls FastAPI microservice for NLP classification.
// Falls back to keyword-based mock if FastAPI is offline.
// ─────────────────────────────────────────────────────
const fetch = require('node-fetch');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

// ── Keyword-based fallback classifier (mirrors FastAPI mock) ──
const DEPT_KEYWORDS = {
  water: {
    dept: 'Water Supply & Sanitation',
    keys: ['pani','paani','water','pipe','leak','sewage','nali','naali','borewell','drain','flood','nalkoop'],
  },
  electricity: {
    dept: 'Electricity Department',
    keys: ['bijli','bijlee','electricity','power','current','light','transformer','meter','blackout','voltage'],
  },
  transport: {
    dept: 'Transport Authority',
    keys: ['sadak','sarak','road','pothole','traffic','bus','transport','highway','bridge','signal'],
  },
  police: {
    dept: 'Police Department',
    keys: ['police','fir','crime','theft','bribe','rishwat','corruption','harassment','thana','gundagiri'],
  },
  health: {
    dept: 'Ministry of Health & Family Welfare',
    keys: ['hospital','doctor','medicine','health','ambulance','clinic','medical','nurse','dispensary'],
  },
  pds: {
    dept: 'Public Distribution System (PDS)',
    keys: ['ration','anaj','wheat','rice','kerosene','pds','fair price','bpl','apl','rashan'],
  },
  municipal: {
    dept: 'Municipal Corporation',
    keys: ['kachra','garbage','safai','cleaning','dustbin','waste','municipal','nagar','sweeper'],
  },
  education: {
    dept: 'Department of Education',
    keys: ['school','teacher','education','scholarship','midday','book','fees','college','vidyalaya'],
  },
  revenue: {
    dept: 'Revenue & Land Records',
    keys: ['zameen','jamin','land','plot','mutation','patwari','khasra','khatian','registry','property'],
  },
  labour: {
    dept: 'Labour & Employment',
    keys: ['majdoor','mazdoor','labour','wages','salary','mgnrega','factory','worker','employment'],
  },
  social_welfare: {
    dept: 'Social Welfare & Women Development',
    keys: ['pension','mahila','women','widow','handicapped','disability','anganwadi','beti','ladki'],
  },
  agriculture: {
    dept: 'Agriculture Department',
    keys: ['kisan','farmer','khet','fasal','crop','fertilizer','pesticide','irrigation','msp','pm kisan'],
  },
  telecom: {
    dept: 'Telecommunications Department',
    keys: ['internet','network','signal','tower','broadband','mobile','telecom','jio','airtel','bsnl'],
  },
};

const PRIORITY_HIGH_KEYS    = ['emergency','urgent','aag','fire','dying','dead','danger','khatra','accident','bachao','kidnap','explosion'];
const PRIORITY_CRITICAL_KEYS= ['murder','rape','missing','blast','collapse','life','jaan','sos'];
const PRIORITY_LOW_KEYS     = ['request','kindly','humbly','whenever','if possible','jab bhi','kripya'];

function mockClassify(text) {
  const lower = text.toLowerCase();

  // Language detection (basic script check)
  let language = 'en';
  if (/[\u0900-\u097F]/.test(text)) language = 'hi';
  else if (/[\u0980-\u09FF]/.test(text)) language = 'bn';
  else if (/[\u0C00-\u0C7F]/.test(text)) language = 'te';
  else if (/[\u0B80-\u0BFF]/.test(text)) language = 'ta';

  // Department detection
  let bestDept = null;
  let bestCode = 'general';
  let bestScore = 0;

  for (const [code, info] of Object.entries(DEPT_KEYWORDS)) {
    const score = info.keys.filter((k) => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestDept  = info.dept;
      bestCode  = code;
    }
  }

  if (!bestDept) {
    bestDept = 'Ministry of Personnel, Public Grievances & Pensions';
    bestCode = 'general';
  }

  // Priority
  let priority = 'medium';
  let score    = 0.5;

  if (PRIORITY_CRITICAL_KEYS.some((k) => lower.includes(k))) {
    priority = 'critical';
    score    = 0.95;
  } else if (PRIORITY_HIGH_KEYS.some((k) => lower.includes(k))) {
    priority = 'high';
    score    = 0.8;
  } else if (PRIORITY_LOW_KEYS.some((k) => lower.includes(k))) {
    priority = 'low';
    score    = 0.2;
  }

  return {
    language,
    department:     bestDept,
    department_code:bestCode,
    priority,
    priority_score: score,
    source: 'mock',   // indicates fallback was used
  };
}

// ── Call FastAPI; fall back to mock on any error ──────
async function analyzeComplaint(text) {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 5000);   // 5s timeout

    const response = await fetch(`${AI_URL}/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
      signal:  controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`AI service HTTP ${response.status}`);

    const data = await response.json();
    return { ...data, source: 'fastapi' };

  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('[GrievAI] FastAPI unavailable, using mock classifier:', err.message);
    }
    return mockClassify(text);
  }
}

module.exports = { analyzeComplaint, mockClassify };
