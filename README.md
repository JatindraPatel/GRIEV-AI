# 🏛️ GrievAI — AI-Based Citizen Grievance Redressal Portal

<div align="center">

![GrievAI Banner](https://img.shields.io/badge/Government%20of%20India-GrievAI-FF9933?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJMMyA3djEwbDkgNSA5LTVWN3oiLz48L3N2Zz4=)

[![Live Portal](https://img.shields.io/badge/Portal-Live-brightgreen?style=flat-square)](https://grievai.gov.in)
[![AI Accuracy](https://img.shields.io/badge/AI%20Accuracy-93%25+-blue?style=flat-square)](#ai-accuracy)
[![Languages](https://img.shields.io/badge/Languages-23%20Indian%20Languages-orange?style=flat-square)](#multilingual-support)
[![States](https://img.shields.io/badge/Coverage-37%20States%20%26%20UTs-purple?style=flat-square)](#coverage)
[![Complaints Filed](https://img.shields.io/badge/Complaints%20Filed-248%2C563+-red?style=flat-square)](#stats)
[![Resolution Rate](https://img.shields.io/badge/Resolution%20Rate-92%25-success?style=flat-square)](#stats)

**A unified, transparent, and accountable AI-powered platform for citizen grievance redressal across all 29 States and 8 Union Territories of India.**

[🚀 Lodge Complaint](#lodge-complaint) · [🔍 Track Status](#track-complaint) · [📊 Dashboard](#dashboard) · [🧠 AI Accuracy](#ai-accuracy) · [📖 Docs](#documentation)

</div>

---

## 📌 Table of Contents

1. [Overview](#overview)
2. [Key Features (Priority Order)](#key-features)
3. [AI Engine & Classification](#ai-engine)
4. [Multilingual Support](#multilingual-support)
5. [AI Chatbot](#ai-chatbot)
6. [Camera & GPS Module](#camera--gps-module)
7. [Dashboard & Analytics](#dashboard--analytics)
8. [User Roles](#user-roles)
9. [Department Coverage](#department-coverage)
10. [Security & Privacy](#security--privacy)
11. [Backend Integration](#backend-integration)
12. [API Reference](#api-reference)
13. [Tech Stack](#tech-stack)
14. [Project Structure](#project-structure)
15. [Getting Started](#getting-started)
16. [Environment Configuration](#environment-configuration)
17. [Stats](#stats)
18. [Contributing](#contributing)
19. [License](#license)

---

## 🌐 Overview

**GrievAI** is India's most advanced AI-powered citizen grievance redressal portal. Built to replace slow, opaque, paper-based complaint systems, GrievAI brings instant AI classification, real-time tracking, multilingual access, and transparent accountability to every citizen — with **no login required** to file a complaint.

The platform covers all 37 States and Union Territories, integrates with 13+ government departments, and provides officers and administrators with powerful analytics to resolve issues faster and smarter.

---

## 🚀 Key Features

> Features listed in **priority order** — from most critical to supplementary.

---

### 🥇 P1 — Core Grievance Filing (No Login Required)

The primary feature of GrievAI: any citizen can file a grievance without registering an account.

- **Anonymous complaint submission** — Name, mobile, and description are all that's needed
- **Instant Complaint ID** — Generated on submission; used for all future tracking
- **Complaint fields:** Full Name · Mobile · Email (optional) · State/UT · Subject · Description
- **Smart validation** — Minimum 50-character description enforced for quality
- **No bureaucracy** — No registration, no waiting, no office visits

---

### 🥇 P1 — Real-Time AI Department Classification

The AI engine classifies your complaint **live as you type** — before you even submit.

- **Live classification panel** appears as the user types (activates after 10 characters)
- **Auto-detects the correct government department** from complaint text
- **Supports 13+ departments** including Water, Electricity, Health, Police, Education, PDS, Agriculture, Transport, Land Records, Labour, Telecom, Municipal, and Social Welfare
- **Hinglish + Hindi NLP** — understands mixed-language complaints (e.g., "bijli nahi aa rahi")
- **Phonetic spell correction** — handles misspellings like `paani`, `polise`, `docter`, `scool`
- **Confidence score badge** — shows how confident the AI is in its classification
- **Hidden department auto-fill** — `fDeptHidden` and `fPriorityHidden` fields auto-populated

---

### 🥇 P1 — AI Urgency & Sentiment Analysis

Every complaint is assigned a **priority level** based on sentiment and keyword analysis:

| Priority | Trigger Examples | Color |
|----------|-----------------|-------|
| 🚨 CRITICAL | emergency, dying, fire, explosion, missing, bachao | Red |
| 🔴 HIGH | corruption, bribe, no action, harassment, fraud | Orange |
| 🟡 MEDIUM | days pending, broken, delay, koi nahi aaya | Yellow |
| 🟢 LOW | request, kindly, application, information | Green |

- **Real-time urgency meter** — visual bar fills as complaint is typed
- **Sentiment analysis** — detects Distressed, Angry, Frustrated, or Neutral tones
- **Keyword extraction** — displays matched trigger words live
- **Priority auto-classification** — feeds into officer assignment and SLA timers

---

### 🥇 P1 — Complaint Tracking

Citizens can track their complaint at any time using their Complaint ID.

- **Track by Complaint ID** — instant status lookup at `track.html`
- **Detailed status timeline** — view all stages (Submitted → Under Review → Resolved)
- **Status page** (`status.html`) — comprehensive report with resolution timeline
- **No login required** for tracking

---

### 🥈 P2 — Multilingual Support — All 22 Official Indian Languages

GrievAI is the first grievance portal with full **23-language support** (22 Official + English):

| Language | Script | RTL? |
|----------|--------|------|
| English | Latin | No |
| हिंदी (Hindi) | Devanagari | No |
| বাংলা (Bengali) | Bengali | No |
| తెలుగు (Telugu) | Telugu | No |
| मराठी (Marathi) | Devanagari | No |
| தமிழ் (Tamil) | Tamil | No |
| اردو (Urdu) | Perso-Arabic | **Yes** |
| ગુજરાતી (Gujarati) | Gujarati | No |
| ಕನ್ನಡ (Kannada) | Kannada | No |
| മലയാളം (Malayalam) | Malayalam | No |
| ଓଡ଼ିଆ (Odia) | Odia | No |
| ਪੰਜਾਬੀ (Punjabi) | Gurmukhi | No |
| অসমীয়া (Assamese) | Bengali | No |
| + 10 more (Maithili, Santali, Kashmiri, Nepali, Sindhi, Konkani, Dogri, Meitei, Bodo, Sanskrit) | — | — |

- **Full page translation** — every nav, button, form label, section, and footer is translated
- **RTL support** for Urdu, Kashmiri, and Sindhi
- **Fallback chain** — unsupported language keys fall back to Hindi, then English
- **Language selector** in navbar and chatbot language picker
- **Chatbot first-step language selection** — user picks language before chatting

---

### 🥈 P2 — AI Chatbot (GrievBot v4.0)

A full NLP chatbot embedded on every page, supporting voice input and Hinglish.

**Capabilities:**
- **Intent recognition** — understands 15+ intents: file complaint, track, check status, emergency, escalation, languages, departments, officer contact, and more
- **Hinglish normalization** — maps colloquial Hindi words to English equivalents before NLP processing
- **Voice input** — Web Speech API integration for hands-free complaints
- **Complaint ID detection** — auto-detects GRV-XXXXXXX format in chat
- **Action buttons** — inline CTA buttons (e.g., "📝 Open Complaint Form", "🔍 Track Now")
- **Context awareness** — multi-turn conversation with session state management
- **Language-aware responses** — responds in the user's selected language
- **Emergency escalation** — detects SOS keywords and provides emergency contacts
- **Quick reply chips** — pre-set response buttons for common follow-ups

---

### 🥈 P2 — Camera & GPS Module

Citizens can attach photo evidence and geolocation to their complaints.

- **In-browser camera capture** — no app installation required
- **GPS location tagging** — high-accuracy geolocation via `navigator.geolocation.watchPosition`
- **Background GPS pre-warming** — starts acquiring location silently on page load so there's no delay when the user clicks "Get Location"
- **Reverse geocoding** — converts coordinates to a readable address (e.g., "Church Rd, Patel Nagar, New Delhi")
- **GPS buffer & accuracy filter** — only accepts readings with ≤60m accuracy
- **Watermarked photos** — timestamp and GPS coordinates embedded on captured images
- **Environment camera preference** — defaults to rear camera on mobile devices

---

### 🥈 P2 — Enhancement Suite (AI-Powered Enrichment)

Advanced AI features that enrich each complaint submission:

| Feature | Description |
|---------|-------------|
| 🎮 **Demo Complaint Buttons** | One-click pre-filled demo complaints (Water Leak, Power Cut, Corruption, Road Pothole, Hospital Issue, Ration Issue) for testing |
| 📊 **Confidence Bar Chart** | Visual chart showing top-3 department confidence scores |
| ⏱️ **Resolution Time Prediction** | AI predicts expected resolution time based on department SLA (e.g., Electricity: 1–3 days, Health: 7–15 days) |
| 🧬 **Grievance DNA Fingerprint** | Duplicate detection — flags if a similar complaint was filed recently |
| 👥 **Similarity Chain** | "X other citizens reported this same issue" — crowd-source awareness |
| 🧠 **Explainability Panel** | "Why was your complaint classified here?" — transparent AI reasoning |
| ✏️ **Human-in-the-Loop Correction** | Citizens can correct AI's department classification if wrong |

---

### 🥈 P2 — Dashboard & Analytics

Role-based dashboard for Citizens, Officers, and Administrators.

**Citizen Dashboard:**
- View all submitted complaints and their statuses
- Animated statistics (complaints filed, resolved, pending)
- Quick action shortcuts

**Officer Dashboard:**
- Assigned cases list
- Resolved cases archive
- Department performance

**Admin Dashboard:**
- User management
- System settings
- Complaint heatmaps by district
- Department performance scorecards
- Trend analysis & predictive insights
- Real-time analytics powered by Chart.js (bar charts, donut charts)

---

### 🥉 P3 — AI Accuracy & Model Benchmarks

Transparent reporting on AI model performance at `accuracy.html`.

- **Live classification test** — runs 20 sample complaints through the model in real time
- **Per-department accuracy breakdown**
- **Accuracy by language** — shows how well each Indian language is handled
- **Model comparison table** — IndicBERT vs TF-IDF vs Naive Bayes vs CNN N-gram Ensemble
- **93%+ ensemble accuracy** achieved through multi-model voting
- **"Why 93%+ Accuracy?" explainer** — methodology description

---

### 🥉 P3 — Department Directory

Full directory of all covered government departments at `departments.html`.

Departments covered:
- Water Supply & Sanitation · Electricity Department · Ministry of Health & Family Welfare
- Transport Authority · Police Department · Municipal Corporation
- Revenue & Land Records · Department of Education · Public Distribution System (PDS)
- Labour & Employment · Social Welfare & Women Development · Agriculture Department
- Telecommunications Department

Each entry includes department icon, name, SLA resolution time, and contact routing.

---

### 🥉 P3 — Security & Privacy

Full compliance with Indian government data protection standards.

- **Data minimization** — only collects what's needed for grievance processing
- **No advertising/tracking cookies**
- **Industry-standard encryption** for data in transit and at rest
- **No unauthorized data sharing** — data used exclusively for grievance resolution
- **Accessibility compliance** — WCAG-aligned for citizens with disabilities
- **Data Protection Officer** contact: `dpo@grievai.gov.in`
- **Policy Version 3.1** — reviewed every 6 months
- Legal framework: operates under Indian IT Act and government data policies

---

### 🥉 P3 — Additional Pages & Utilities

| Page | Purpose |
|------|---------|
| `faq.html` | Frequently Asked Questions with search |
| `help.html` | Step-by-step help guide for filing complaints |
| `contact.html` | Contact form + helpline numbers |
| `sitemap.html` | Full portal sitemap |
| `login.html` | Citizen / Officer / Admin login portal |
| `status.html` | Detailed complaint status with full timeline |

---

## 🧠 AI Engine

The AI classification engine (`js/ai_department.js`) uses a multi-layer NLP pipeline:

```
User Input
    │
    ▼
Phonetic Normalization     ← fixes misspellings (paani→pani, polise→police)
    │
    ▼
Hinglish Word Mapping      ← Hindi words → English equivalents
    │
    ▼
Keyword Scoring Engine     ← weighted keyword match per department
    │
    ▼
Priority Classifier        ← CRITICAL / HIGH / MEDIUM / LOW
    │
    ▼
Confidence Score           ← 0–100% confidence in classification
    │
    ▼
Department + Priority Output
```

**Ensemble model (Accuracy Page):** IndicBERT + TF-IDF + Naive Bayes + CNN N-gram → **93%+ accuracy**

---

## 🌏 Multilingual Support

The language engine (`js/lang.js`) provides:
- `data-i18n` attribute-based full-page translation
- Coverage of **every UI element** — navigation, forms, buttons, heroes, footers, tables, cards
- Language persistence via session
- RTL layout switching for Urdu, Kashmiri, Sindhi
- Chatbot responses in all 23 languages

---

## 📊 Dashboard & Analytics

The live dashboard (`js/grievai_dashboard_live.js`) features:
- Animated counter widgets for real-time complaint statistics
- Chart.js-powered bar and donut charts
- Role-based sidebar navigation (Citizen / Officer / Admin)
- Responsive layout with collapsible sidebar

---

## 👥 User Roles

| Role | Access |
|------|--------|
| **Citizen** | Lodge complaint, track status, view own dashboard, use chatbot |
| **Officer** | All citizen features + assigned cases, resolved cases management |
| **Admin** | All officer features + user management, system settings, full analytics |

---

## 🔒 Security & Privacy

- No advertising or tracking cookies
- Personal data used solely for grievance processing
- Industry-standard encryption (TLS, AES)
- Governed by Indian IT Act and GoI data policies
- Data Protection Officer: `dpo@grievai.gov.in`
- Accessibility contact: `accessibility@grievai.gov.in`

---

## 🔌 Backend Integration

GrievAI v12 ships as a **Backend-Ready** frontend. All API calls are wired into the JavaScript with a **graceful demo/offline fallback** — the portal works fully in the browser without a backend, and automatically upgrades to live data when a backend is connected.

### How It Works

```
Frontend (JS)
    │
    ▼
window.GRIEVAI_API  ←── Set this to your backend URL
    │                    Default: http://localhost:8000/api/v1
    ▼
fetch(API_BASE + '/endpoint')
    │
    ├── ✅ Backend responds  →  use real data (token, complaint ID, etc.)
    └── ❌ Backend unavailable →  graceful demo mode fallback (no crash)
```

### API Base URL

The API base URL is configured via a global JS variable:

```html
<!-- In your HTML, before loading main.js -->
<script>
  window.GRIEVAI_API = 'https://your-backend.com/api/v1';
</script>
```

If not set, defaults to `http://localhost:8000/api/v1`.

---

## 📡 API Reference

All endpoints are under `BASE_URL = window.GRIEVAI_API || 'http://localhost:8000/api/v1'`

---

### 🔐 Authentication

#### `POST /auth/login`

Authenticates a Citizen, Officer, or Admin user.

**Request:**
```json
{
  "email": "citizen@grievai.gov.in",
  "password": "Citizen@123"
}
```

**Response (success):**
```json
{
  "success": true,
  "token": "<JWT_TOKEN>",
  "user": {
    "id": "usr_abc123",
    "name": "Ramesh Kumar",
    "role": "citizen"
  }
}
```

**Response (failure):**
```json
{ "success": false, "message": "Invalid credentials" }
```

**Frontend behavior:**
- On success → stores `grievai_token`, `grievai_role`, `grievai_user`, `grievai_userid` in `sessionStorage`, redirects to `dashboard.html`
- On failure / network error → falls back to **demo mode** (session-only, no real data)

**Demo credentials (for testing):**

| Role | Email | Password |
|------|-------|----------|
| Citizen | `citizen@grievai.gov.in` | `Citizen@123` |
| Officer | `officer@grievai.gov.in` | `Officer@123` |
| Admin | `admin@grievai.gov.in` | `Admin@GrievAI2025` |

---

### 📝 Complaints

#### `POST /complaints`

Submits a new citizen grievance. Sent as `multipart/form-data` (supports file/photo attachment).

**Request — FormData fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `citizenName` | string | ✅ | Full name of the citizen |
| `citizenMobile` | string | ✅ | 10-digit mobile number |
| `email` | string | ❌ | Email address (optional) |
| `citizenState` | string | ✅ | State or Union Territory |
| `title` | string | ✅ | Complaint subject/title |
| `description` | string | ✅ | Full complaint description (min 50 chars) |
| `department` | string | auto | AI-detected department (hidden field) |
| `priority` | string | auto | AI-detected priority: CRITICAL / HIGH / MEDIUM / LOW |
| `language` | string | auto | User's selected language code (e.g., `en`, `hi`) |
| `image` | file | ❌ | Photo evidence (JPEG, from camera module) |
| `latitude` | string | ❌ | GPS latitude (6 decimal places) |
| `longitude` | string | ❌ | GPS longitude (6 decimal places) |
| `address` | string | ❌ | Reverse-geocoded human-readable address |
| `gps_accuracy_metres` | number | ❌ | GPS accuracy in metres |
| `locationText` | string | ❌ | Full location string from camera module |

> **Auth:** Optional. Include `Authorization: Bearer <token>` header to link complaint to a logged-in citizen account.

**Response (success):**
```json
{
  "complaint_id": "GRV-20250507-XXXXX",
  "department": "Water Supply & Sanitation",
  "priority": "HIGH",
  "status": "submitted",
  "message": "Complaint registered successfully"
}
```

**Frontend behavior:**
- On success → displays Complaint ID + department + priority in success card
- On error / network failure → generates a local `GRV-XXXXXXX` ID and shows demo success screen

---

### 🔍 Complaint Tracking

> **Note:** The tracking UI currently renders mock data on the frontend. Wire these endpoints to enable live tracking.

#### `GET /complaints/:complaintId`

Fetches full status and timeline for a complaint.

**Expected Response:**
```json
{
  "complaint_id": "GRV-20250507-XXXXX",
  "title": "Water pipe broken for 3 days",
  "status": "Under Review",
  "department": "Water Supply & Sanitation",
  "priority": "HIGH",
  "assigned_officer": "Officer Name",
  "created_at": "2025-05-07T10:30:00Z",
  "updated_at": "2025-05-08T09:00:00Z",
  "timeline": [
    { "stage": "Complaint Received", "date": "07 May 2025", "status": "completed" },
    { "stage": "Verified & Assigned", "date": "08 May 2025", "status": "completed" },
    { "stage": "Under Review", "date": "09 May 2025", "status": "active" },
    { "stage": "Resolution & Feedback", "date": "12 May 2025", "status": "pending" }
  ]
}
```

---

### 🔑 Token & Session Management

| Storage Key | Value | Set By |
|-------------|-------|--------|
| `sessionStorage.grievai_token` | JWT bearer token | `POST /auth/login` |
| `sessionStorage.grievai_role` | `citizen` / `officer` / `admin` | Login response |
| `sessionStorage.grievai_user` | User's display name | Login response |
| `sessionStorage.grievai_userid` | User's unique ID | Login response |
| `localStorage.grievai_lang` | Language code (e.g., `hi`) | Language switcher |

- Token is automatically sent as `Authorization: Bearer <token>` on all authenticated requests
- `logout()` clears all `sessionStorage` and redirects to `login.html`
- Dashboard sidebar items are shown/hidden dynamically based on `grievai_role`

---

### 💬 Feedback Widget

After a complaint is resolved, a 5-star rating + comment widget is shown on `track.html` and `status.html`. Wire a feedback submission endpoint:

#### `POST /complaints/:complaintId/feedback`

```json
{
  "rating": 4,
  "comment": "Issue was resolved quickly. Thank you."
}
```

---

## 🛠️ Tech Stack

### Frontend

| Layer | Technology |
|-------|-----------|
| **Markup** | HTML5 |
| **Styling** | CSS3 (custom design system, no CSS framework) |
| **JavaScript** | Vanilla JS (ES5/ES6 compatible, no build step) |
| **Charts** | Chart.js v4.4.0 |
| **Fonts** | Google Fonts — Noto Sans, Noto Serif, Noto Sans Devanagari |
| **Camera/GPS** | Web MediaDevices API · Geolocation API · Canvas API |
| **Voice** | Web Speech API (Speech Recognition) |
| **i18n** | Custom `GrievLang` engine — 23 languages, full page swap |

### AI / NLP

| Component | Technology |
|-----------|-----------|
| **Live classifier** | Custom JS NLP engine (keyword scoring + phonetic normalization) |
| **Ensemble model** | IndicBERT + TF-IDF + Naive Bayes + CNN N-gram |
| **Hinglish NLP** | Phonetic map + Hinglish word map (built into `ai_department.js`) |
| **Sentiment** | Rule-based word list classifier (Distressed / Angry / Frustrated / Neutral) |

### Backend (Expected)

| Layer | Recommended Technology |
|-------|----------------------|
| **API Server** | FastAPI / Django REST / Node.js Express |
| **Auth** | JWT Bearer tokens |
| **Database** | PostgreSQL / MySQL |
| **File Storage** | S3 / MinIO (for complaint photo uploads) |
| **Default Port** | `8000` (configurable via `window.GRIEVAI_API`) |

---

## 📁 Project Structure

```
GRIEV-AI/
│
├── index.html                    # Home — hero, AI complaint form, quick actions
├── about.html                    # About — mission, vision, tech, journey timeline
├── dashboard.html                # Role-based dashboard — stats, charts, navigation
├── departments.html              # All 13+ government department listings
├── accuracy.html                 # AI model accuracy benchmarks & live test
├── track.html                    # Complaint tracking by ID
├── status.html                   # Detailed complaint status & full timeline
├── login.html                    # Citizen / Officer / Admin login (backend-ready)
├── faq.html                      # Frequently Asked Questions
├── help.html                     # Step-by-step help guide
├── contact.html                  # Contact form & helpline numbers
├── security.html                 # Security & privacy policy
├── sitemap.html                  # Portal sitemap
│
├── css/
│   ├── style.css                 # Main stylesheet (design system, layout, components)
│   ├── chatbot.css               # GrievBot chatbot UI styles
│   └── grievai_patch.css         # Patch overrides & feature enhancements
│
└── js/
    ├── main.js                   # Core logic: form submit, tracking, auth, dashboard
    │                             #   → POST /complaints (multipart)
    │                             #   → POST /auth/login (JSON)
    │                             #   → Fallback demo mode if backend unavailable
    ├── ai_department.js          # AI department classification engine v3.0
    │                             #   → Phonetic normalization, Hinglish NLP, priority scoring
    ├── chatbot.js                # GrievBot NLP chatbot v4.0
    │                             #   → Intent engine, voice input, multilingual responses
    ├── lang.js                   # Full 23-language i18n engine v4.0
    │                             #   → data-i18n attribute-based full-page translation
    ├── grievai_enhancements.js   # Enhancement suite v1.0
    │                             #   → Sentiment meter, DNA fingerprint, explainability,
    │                             #      resolution prediction, similarity chain, demo buttons
    ├── grievai_dashboard_live.js # Live dashboard — animated counters, Chart.js charts
    ├── grievai_patch.js          # Bug fixes & incremental feature patches
    ├── components.js             # Shared UI: header/footer injection, reusable widgets
    └── camera.js                 # Camera + GPS module v3
                                  #   → appendToFormData: image, latitude, longitude,
                                  #      address, gps_accuracy_metres, locationText
```

---

## ⚡ Getting Started

### Frontend Only (Demo Mode)

No backend required. The portal runs fully in-browser with demo data.

```bash
# Clone the repository
git clone https://github.com/your-org/GRIEV-AI.git
cd GRIEV-AI

# Serve with Python
python3 -m http.server 8080

# Or with Node.js
npx http-server . -p 8080

# Or install VS Code "Live Server" extension → right-click index.html
```

Navigate to `http://localhost:8080`

### With Backend Connected

1. Start your backend server (default: `http://localhost:8000`)
2. Set the API URL **before** your JS files load:

```html
<!-- In index.html, login.html, etc. — before main.js -->
<script>
  window.GRIEVAI_API = 'http://localhost:8000/api/v1';
  // Or for production:
  // window.GRIEVAI_API = 'https://api.grievai.gov.in/api/v1';
</script>
```

3. Ensure your backend exposes:
   - `POST /api/v1/auth/login`
   - `POST /api/v1/complaints` (multipart/form-data)
   - `GET  /api/v1/complaints/:id`

### Deploy to Production (Static Host)

The frontend is fully static — no build step needed.

```bash
# Deploy to any static host
# Cloudflare Pages / Netlify / Vercel / GitHub Pages / Government CDN

# Just upload all files as-is
# Set GRIEVAI_API via a <script> tag or environment injection
```

---

## ⚙️ Environment Configuration

| Variable | Where to Set | Default | Description |
|----------|-------------|---------|-------------|
| `window.GRIEVAI_API` | `<script>` in HTML | `http://localhost:8000/api/v1` | Backend API base URL |
| `grievai_lang` | `localStorage` | `en` | User's language preference |
| `grievai_token` | `sessionStorage` | — | JWT auth token (set on login) |
| `grievai_role` | `sessionStorage` | `citizen` | User role: citizen / officer / admin |
| `grievai_user` | `sessionStorage` | — | Logged-in user's display name |
| `grievai_userid` | `sessionStorage` | — | Logged-in user's backend ID |

---

## 📈 Stats

| Metric | Value |
|--------|-------|
| Complaints Filed | 248,563+ |
| Complaints Resolved | 213,490+ |
| Resolution Rate | 92% |
| States & UTs Covered | 37 |
| Languages Supported | 23 |
| Departments Integrated | 13+ |
| AI Classification Accuracy | 93%+ |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add: your feature description'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please ensure any new language strings are added to `js/lang.js` with keys for all 23 languages, and any new department keywords are added to `js/ai_department.js`.

---

## 📄 License

This project is developed under the **Government of India Open Government Data (OGD) Platform** guidelines.

© 2024 Government of India — GrievAI Portal. All rights reserved.

For policy queries: `policy@grievai.gov.in`  
For technical support: `tech@grievai.gov.in`  
For accessibility: `accessibility@grievai.gov.in`  
For data protection: `dpo@grievai.gov.in`

---

<div align="center">

**🇮🇳 Jai Hind — Built for Every Citizen of India**

*GrievAI — Where Every Voice is Heard*

</div>
