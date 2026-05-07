# ─────────────────────────────────────────────────────
# GrievAI — AI Microservice (FastAPI)
# Port: 8001
# POST /analyze  → classify complaint text
# GET  /health   → health check
#
# Current: keyword-based mock (production-ready structure)
# Ready for: IndicBERT / HuggingFace Transformers swap
# ─────────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional
import re
import unicodedata
import time
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("grievai-ai")

# ─────────────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────────────
app = FastAPI(
    title="GrievAI AI Microservice",
    description="NLP classification engine for citizen grievances (IndicBERT-ready)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=5000, description="Complaint text")

    @validator("text")
    def strip_text(cls, v):
        return v.strip()

class AnalyzeResponse(BaseModel):
    language:        str
    department:      str
    department_code: str
    priority:        str
    priority_score:  float
    confidence:      float
    source:          str   # "mock" | "indicbert"
    processing_ms:   int

# ─────────────────────────────────────────────────────
# KEYWORD KNOWLEDGE BASE
# ─────────────────────────────────────────────────────
DEPARTMENTS = {
    "water": {
        "label": "Water Supply & Sanitation",
        "keywords": [
            "pani","paani","water","pipe","leak","sewage","nali","naali",
            "borewell","drain","flood","nalkoop","jal","tapka","tapkana",
            "ganda pani","water supply","nalka","hand pump","handpump",
        ],
        "weight": 1.0,
    },
    "electricity": {
        "label": "Electricity Department",
        "keywords": [
            "bijli","bijlee","electricity","power","current","light","transformer",
            "meter","blackout","voltage","load shedding","loadshedding","wire",
            "shock","short circuit","tripping","bill","electricity bill",
        ],
        "weight": 1.0,
    },
    "transport": {
        "label": "Transport Authority",
        "keywords": [
            "sadak","sarak","road","pothole","traffic","bus","transport","highway",
            "bridge","signal","nala","drain road","speed breaker","flyover",
            "gutter","khada","kharab sadak","rasta",
        ],
        "weight": 1.0,
    },
    "police": {
        "label": "Police Department",
        "keywords": [
            "police","fir","crime","theft","bribe","rishwat","corruption",
            "harassment","thana","gundagiri","chori","dacoity","robbery",
            "cybercrime","scam","fraud","extortion","rape","murder","kidnap",
            "loot","tapori",
        ],
        "weight": 1.2,   # higher weight — police often urgent
    },
    "health": {
        "label": "Ministry of Health & Family Welfare",
        "keywords": [
            "hospital","doctor","medicine","health","ambulance","clinic",
            "medical","nurse","dispensary","dawai","ilaaj","treatment",
            "vaccination","syringe","blood","surgery","operation","ward",
        ],
        "weight": 1.1,
    },
    "pds": {
        "label": "Public Distribution System (PDS)",
        "keywords": [
            "ration","anaj","wheat","rice","kerosene","pds","fair price",
            "bpl","apl","rashan","rashan card","ration card","dealer",
            "anaj vitaran","gehu","chawal","sukhi roti","dukaan",
        ],
        "weight": 1.0,
    },
    "municipal": {
        "label": "Municipal Corporation",
        "keywords": [
            "kachra","garbage","safai","cleaning","dustbin","waste","municipal",
            "nagar","sweeper","sewer","manhole","street light","streetlight",
            "park","encroachment","footpath","tree","cutting",
        ],
        "weight": 1.0,
    },
    "education": {
        "label": "Department of Education",
        "keywords": [
            "school","teacher","education","scholarship","midday","book","fees",
            "college","vidyalaya","shiksha","padhai","uniform","admission",
            "exam","result","hostel","coaching","rte",
        ],
        "weight": 1.0,
    },
    "revenue": {
        "label": "Revenue & Land Records",
        "keywords": [
            "zameen","jamin","land","plot","mutation","patwari","khasra",
            "khatian","registry","property","bhu naksha","nakal","intkal",
            "demarcation","survey","kisan bahi","khata","khatauni",
        ],
        "weight": 1.0,
    },
    "labour": {
        "label": "Labour & Employment",
        "keywords": [
            "majdoor","mazdoor","labour","wages","salary","mgnrega","factory",
            "worker","employment","job card","provident fund","pf","esic",
            "shramik","kamgar","bonus","overtime","contract labour",
        ],
        "weight": 1.0,
    },
    "social_welfare": {
        "label": "Social Welfare & Women Development",
        "keywords": [
            "pension","mahila","women","widow","handicapped","disability",
            "anganwadi","beti","ladki","old age","vridha","divyang",
            "samajik","kalyan","scholarship girl","child","bal",
        ],
        "weight": 1.0,
    },
    "agriculture": {
        "label": "Agriculture Department",
        "keywords": [
            "kisan","farmer","khet","fasal","crop","fertilizer","pesticide",
            "irrigation","msp","pm kisan","beej","seed","krishi","mandoor",
            "canal","nahar","pump set","kharif","rabi","aawara pashu",
        ],
        "weight": 1.0,
    },
    "telecom": {
        "label": "Telecommunications Department",
        "keywords": [
            "internet","network","signal","tower","broadband","mobile",
            "telecom","jio","airtel","bsnl","wifi","4g","5g","sim",
            "recharge","call drop","no network","coverage",
        ],
        "weight": 1.0,
    },
}

PRIORITY_WEIGHTS = {
    "critical": {
        "keywords": [
            "murder","rape","kidnap","missing","blast","explosion","collapse",
            "dying","dead","unconscious","jaan gai","help help","sos","fire aag",
            "aag lagi","building gira","building collapsed",
        ],
        "score": 0.95,
    },
    "high": {
        "keywords": [
            "emergency","urgent","jaldi","5 din","3 din","din se","hafte se",
            "accident","danger","khatra","khatarnak","bachao","save me",
            "no water","no electricity","bijli nahi","pani nahi","4 din",
        ],
        "score": 0.78,
    },
    "low": {
        "keywords": [
            "request","kindly","humbly","whenever","if possible","jab bhi",
            "kripya","sukrpya","agar ho sake","please",
        ],
        "score": 0.2,
    },
}

LANGUAGE_SCRIPTS = {
    "hi": (0x0900, 0x097F),   # Devanagari (Hindi, Marathi, Sanskrit)
    "bn": (0x0980, 0x09FF),   # Bengali
    "te": (0x0C00, 0x0C7F),   # Telugu
    "ta": (0x0B80, 0x0BFF),   # Tamil
    "gu": (0x0A80, 0x0AFF),   # Gujarati
    "kn": (0x0C80, 0x0CFF),   # Kannada
    "ml": (0x0D00, 0x0D7F),   # Malayalam
    "pa": (0x0A00, 0x0A7F),   # Punjabi (Gurmukhi)
    "ur": (0x0600, 0x06FF),   # Urdu (Arabic script)
}

MARATHI_MARKERS = ["माझ्या","आहे","नाही","पाणी","वीज","करायची","मला","आपण","तक्रार"]

# ─────────────────────────────────────────────────────
# CLASSIFICATION ENGINE
# ─────────────────────────────────────────────────────
def detect_language(text: str) -> str:
    """Detect language by Unicode script range."""
    for char in text:
        code = ord(char)
        for lang, (start, end) in LANGUAGE_SCRIPTS.items():
            if start <= code <= end:
                if lang == "hi":
                    # Differentiate Marathi from Hindi
                    if any(m in text for m in MARATHI_MARKERS):
                        return "mr"
                return lang
    return "en"


def preprocess(text: str) -> str:
    """Lowercase + normalize unicode."""
    text = unicodedata.normalize("NFC", text)
    return text.lower()


def classify_department(lower_text: str) -> tuple[str, str, float]:
    """Return (dept_code, dept_label, confidence_score)."""
    best_code  = "general"
    best_label = "Ministry of Personnel, Public Grievances & Pensions"
    best_score = 0.0

    for code, info in DEPARTMENTS.items():
        hits = sum(1 for kw in info["keywords"] if kw in lower_text)
        score = hits * info["weight"]
        if score > best_score:
            best_score = score
            best_code  = code
            best_label = info["label"]

    # Normalize confidence to [0, 1]
    confidence = min(best_score / 5.0, 1.0) if best_score > 0 else 0.3
    return best_code, best_label, confidence


def classify_priority(lower_text: str) -> tuple[str, float]:
    """Return (priority_label, priority_score)."""
    for level in ("critical", "high", "low"):
        info = PRIORITY_WEIGHTS[level]
        if any(kw in lower_text for kw in info["keywords"]):
            return level, info["score"]
    return "medium", 0.5


# ─────────────────────────────────────────────────────
# IndicBERT STUB — swap mock for real model here
# ─────────────────────────────────────────────────────
# Uncomment when IndicBERT is installed:
#
# from transformers import pipeline
# _nlp = pipeline("text-classification",
#                 model="ai4bharat/indic-bert",
#                 tokenizer="ai4bharat/indic-bert")
#
# def indicbert_classify(text):
#     result = _nlp(text[:512])
#     return result[0]["label"], result[0]["score"]

def run_model(text: str) -> AnalyzeResponse:
    """
    Main classification pipeline.
    Replace mock_classify calls with IndicBERT when ready.
    """
    start = time.time()

    lower    = preprocess(text)
    language = detect_language(text)

    dept_code, dept_label, confidence = classify_department(lower)
    priority, priority_score          = classify_priority(lower)

    ms = int((time.time() - start) * 1000)

    return AnalyzeResponse(
        language        = language,
        department      = dept_label,
        department_code = dept_code,
        priority        = priority,
        priority_score  = round(priority_score, 3),
        confidence      = round(confidence, 3),
        source          = "mock",    # change to "indicbert" after model swap
        processing_ms   = ms,
    )

# ─────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":  "ok",
        "service": "GrievAI AI Microservice",
        "version": "1.0.0",
        "model":   "keyword-mock (IndicBERT-ready)",
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    try:
        logger.info(f"Analyzing: '{req.text[:80]}…'")
        result = run_model(req.text)
        logger.info(f"Result: {result.department} / {result.priority} ({result.confidence:.2f})")
        return result
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")


@app.get("/departments")
def list_departments():
    return {
        "departments": [
            {"code": code, "label": info["label"]}
            for code, info in DEPARTMENTS.items()
        ]
    }


# ─────────────────────────────────────────────────────
# RUN (dev)
# ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
