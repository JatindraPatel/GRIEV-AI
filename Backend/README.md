# GrievAI Backend — Complete Setup Guide

```
Node.js (Express) ← Main API  
FastAPI (Python)  ← AI Microservice  
MongoDB           ← Database  
Redis             ← Queue + Cache  
```

---

## STEP 1 — Install Prerequisites

Install these tools if not already installed:

| Tool | Download |
|------|----------|
| Node.js v18+ | https://nodejs.org |
| Python 3.11+ | https://python.org |
| MongoDB Community | https://www.mongodb.com/try/download/community |
| Redis | https://redis.io/download (Windows: https://github.com/microsoftarchive/redis/releases) |

---

## STEP 2 — MongoDB Setup (LOCAL)

### 2a. Start MongoDB
After installing MongoDB, start it:

**Windows:**
```
net start MongoDB
```
or open **MongoDB Compass** (GUI) which starts it automatically.

**Mac/Linux:**
```bash
brew services start mongodb-community
# OR
sudo systemctl start mongod
```

### 2b. Create the Database + Collections

Open **MongoDB Compass** → click "New Connection" → connect to:
```
mongodb://127.0.0.1:27017
```

Then click **"Create Database"** and enter:
- Database name: `grievai`
- Collection name: `users`

Click Create.

Then inside the `grievai` database, create these collections one by one:
- `users`
- `complaints`

**That's it!** Mongoose will create indexes automatically when the server starts.

### 2b-alt. Using MongoDB Atlas (Cloud — Recommended for deployment)

1. Go to https://cloud.mongodb.com → Sign up free
2. Create a new cluster (M0 Free tier)
3. Click **"Connect"** → **"Connect your application"**
4. Copy the connection string (looks like):
   ```
   mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/grievai
   ```
5. Put this in your `.env` as `MONGO_URI`

---

## STEP 3 — Redis Setup (LOCAL)

**Windows:**
1. Download from: https://github.com/microsoftarchive/redis/releases
2. Run `redis-server.exe`
3. Test: `redis-cli ping` → should return `PONG`

**Mac:**
```bash
brew install redis
brew services start redis
redis-cli ping  # → PONG
```

**Linux:**
```bash
sudo apt install redis-server
sudo systemctl start redis
redis-cli ping  # → PONG
```

> **Note:** Redis is OPTIONAL. The backend works without it (just no caching/queue).

---

## STEP 4 — Install Node.js dependencies

```bash
cd grievai-backend
npm install
```

---

## STEP 5 — Set up .env file

```bash
cp .env.example .env
```

Open `.env` and set:

```env
PORT=8000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/grievai
JWT_SECRET=change_this_to_any_long_random_string_min_32_chars
JWT_EXPIRES_IN=7d
REDIS_URL=redis://127.0.0.1:6379
AI_SERVICE_URL=http://localhost:8001
FRONTEND_URL=http://localhost:5500
DEMO_MODE=false
ADMIN_EMAIL=admin@grievai.gov.in
ADMIN_PASSWORD=Admin@GrievAI2025
```

---

## STEP 6 — Start the Node.js Backend

```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

You should see:
```
✅ MongoDB connected: 127.0.0.1
🌱 Admin account seeded: admin@grievai.gov.in
✅ Redis connected: redis://127.0.0.1:6379
════════════════════════════════════════════
🚀 GrievAI API running on port 8000
📡 Base URL: http://localhost:8000/api/v1
════════════════════════════════════════════
```

---

## STEP 7 — Start the FastAPI AI Service

```bash
cd ai-service
pip install -r requirements.txt
python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
```

Test it:
```bash
curl http://localhost:8001/health
```

---

## STEP 8 — Start the Background Worker (optional but recommended)

Open a NEW terminal:
```bash
cd grievai-backend
node src/workers/complaintWorker.js
```

This worker reads from the Redis queue and runs AI classification in the background.

---

## STEP 9 — Connect Frontend

In your frontend folder, open `js/main.js` and check this line is correct:
```javascript
var API_BASE = window.GRIEVAI_API || 'http://localhost:8000/api/v1';
```

That's all — the frontend already points to the backend.

---

## DEMO MODE (for hackathon presentation)

Set in `.env`:
```env
DEMO_MODE=true
```

Then run the worker:
```bash
node src/workers/complaintWorker.js
```

This will auto-generate a new complaint every 3 seconds. The live dashboard will show them updating in real-time.

---

## Default Accounts (seeded automatically)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@grievai.gov.in | Admin@GrievAI2025 |
| Officer | officer@grievai.gov.in | Officer@123 |
| Citizen | citizen@grievai.gov.in | Citizen@123 |

---

## API Endpoints Reference

### Auth
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | /api/v1/auth/register | None | Register citizen |
| POST | /api/v1/auth/login | None | Login (any role) |
| GET | /api/v1/auth/me | Bearer token | Get current user |
| POST | /api/v1/auth/create-user | Admin token | Create officer/admin |

### Complaints
| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | /api/v1/complaints | Optional | File complaint |
| GET | /api/v1/complaints/track/:id | None | Track by complaint ID |
| GET | /api/v1/complaints/my | Citizen token | My complaints |
| GET | /api/v1/complaints | Admin/Officer token | All complaints |
| GET | /api/v1/complaints/stats | Admin/Officer token | Dashboard stats |
| GET | /api/v1/complaints/:id | Token | Complaint detail |
| PATCH | /api/v1/complaints/:id | Admin/Officer token | Update complaint |

### AI Service (port 8001)
| Method | URL | Description |
|--------|-----|-------------|
| POST | /analyze | Classify complaint text |
| GET | /health | Health check |
| GET | /departments | List all departments |

---

## Postman Testing Examples

### 1. Register a citizen
```http
POST http://localhost:8000/api/v1/auth/register
Content-Type: application/json

{
  "name": "Ramesh Kumar",
  "email": "ramesh@example.com",
  "mobile": "9876543210",
  "password": "citizen123",
  "role": "citizen"
}
```

### 2. Login
```http
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@grievai.gov.in",
  "password": "Admin@GrievAI2025"
}
```
→ Copy the `token` from the response.

### 3. File a complaint (no login required)
```http
POST http://localhost:8000/api/v1/complaints
Content-Type: multipart/form-data

citizenName: Ramesh Kumar
citizenMobile: 9876543210
citizenState: Madhya Pradesh
title: Bijli 3 din se nahi aayi
description: Hamare area mein bijli transformer kharab hai. 3 din se andhera hai. Urgent action chahiye.
language: hi
```

Response:
```json
{
  "success": true,
  "message": "Complaint filed successfully.",
  "complaint_id": "GRIEVA/2025/847291",
  "department": "Electricity Department",
  "priority": "high"
}
```

### 4. Track complaint
```http
GET http://localhost:8000/api/v1/complaints/track/GRIEVA%2F2025%2F847291
```
or
```http
GET http://localhost:8000/api/v1/complaints/track/2025/847291
```

### 5. Admin: get all complaints
```http
GET http://localhost:8000/api/v1/complaints
Authorization: Bearer <admin_token>
```

### 6. Admin: update complaint status
```http
PATCH http://localhost:8000/api/v1/complaints/<complaint_mongo_id>
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "in_progress",
  "note": "Officer has been assigned",
  "assignedTo": "<officer_mongo_id>"
}
```

### 7. AI Service: classify text
```http
POST http://localhost:8001/analyze
Content-Type: application/json

{
  "text": "Meri bijli 5 din se nahi aayi. Transformer kharab hai. Please help urgently."
}
```

Response:
```json
{
  "language": "hi",
  "department": "Electricity Department",
  "department_code": "electricity",
  "priority": "high",
  "priority_score": 0.78,
  "confidence": 0.6,
  "source": "mock",
  "processing_ms": 1
}
```

---

## MongoDB Collections — Structure Summary

### `users` collection
```json
{
  "_id": "ObjectId",
  "name": "Ramesh Kumar",
  "email": "ramesh@example.com",
  "mobile": "9876543210",
  "password": "<bcrypt hash>",
  "role": "citizen",
  "employeeId": null,
  "department": null,
  "isActive": true,
  "lastLoginAt": "2025-05-01T10:00:00Z",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-05-01T10:00:00Z"
}
```

### `complaints` collection
```json
{
  "_id": "ObjectId",
  "complaintId": "GRIEVA/2025/847291",
  "userId": null,
  "citizenName": "Ramesh Kumar",
  "citizenMobile": "9876543210",
  "citizenState": "Madhya Pradesh",
  "title": "Bijli 3 din se nahi aayi",
  "description": "...",
  "language": "hi",
  "department": "Electricity Department",
  "departmentCode": "electricity",
  "priority": "high",
  "priorityScore": 0.78,
  "status": "pending",
  "statusHistory": [
    { "status": "pending", "note": "Complaint registered", "timestamp": "..." }
  ],
  "assignedTo": null,
  "isEscalated": false,
  "attachments": [],
  "aiProcessed": true,
  "latitude": null,
  "longitude": null,
  "isDemo": false,
  "createdAt": "2025-05-01T10:00:00Z"
}
```

---

## Deployment (Render / Railway)

### Render
1. Push code to GitHub
2. New Web Service → connect repo
3. Root directory: `grievai-backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables from `.env`

### Railway
1. Railway.app → New Project → Deploy from GitHub
2. Add MongoDB plugin (or use Atlas URI)
3. Add Redis plugin (or use Upstash)
4. Set env vars

---

## File Structure

```
grievai-backend/
├── src/
│   ├── server.js                ← Main Express server
│   ├── config/
│   │   ├── db.js                ← MongoDB connection
│   │   └── redis.js             ← Redis client + helpers
│   ├── models/
│   │   ├── User.js              ← User schema
│   │   └── Complaint.js         ← Complaint schema
│   ├── controllers/
│   │   ├── authController.js    ← Register/Login/Me
│   │   └── complaintController.js ← CRUD + AI + Track
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── complaintRoutes.js
│   ├── middleware/
│   │   ├── auth.js              ← JWT + role guard
│   │   ├── validate.js          ← Joi schemas
│   │   ├── upload.js            ← Multer file upload
│   │   └── errorHandler.js      ← Global error handler
│   ├── workers/
│   │   └── complaintWorker.js   ← Redis queue consumer
│   └── utils/
│       ├── aiService.js         ← FastAPI client + mock fallback
│       └── seed.js              ← DB seeder
├── ai-service/
│   ├── main.py                  ← FastAPI AI microservice
│   └── requirements.txt
├── uploads/                     ← Uploaded attachments
├── .env.example                 ← Copy to .env
├── package.json
└── README.md
```
