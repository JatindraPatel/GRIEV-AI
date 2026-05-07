// ─────────────────────────────────────────────────────
// GrievAI — Express Server (Main Entry Point)
// ─────────────────────────────────────────────────────
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const path         = require('path');
const rateLimit    = require('express-rate-limit');

const { connectDB }     = require('./config/db');
const { connectRedis }  = require('./config/redis');
const { seedAdmin }     = require('./utils/seed');
const errorHandler      = require('./middleware/errorHandler');

const authRoutes      = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');

const app  = express();
const PORT = process.env.PORT || 8000;

// ── Security headers ──────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },  // allow image serving
}));

// ── CORS ──────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5500',    // VS Code Live Server
  'http://127.0.0.1:5500',
  'http://localhost:5173',    // Vite
  'http://127.0.0.1:8000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, mobile apps)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    // In development, allow all
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsers ──────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Static files: serve uploaded attachments ──────────
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// ── Serve frontend from /public (optional — if you copy frontend here) ──
const frontendPath = path.join(__dirname, '..', 'public');
app.use(express.static(frontendPath));

// ── Rate limiting ─────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 300,                   // 300 requests per window
  standardHeaders: true,
  legacyHeaders:  false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                    // strict: 20 auth attempts per 15 min
  message: { success: false, message: 'Too many auth attempts, try again in 15 minutes.' },
});

app.use('/api/', globalLimiter);
app.use('/api/v1/auth/', authLimiter);

// ── Routes ────────────────────────────────────────────
app.use('/api/v1/auth',       authRoutes);
app.use('/api/v1/complaints', complaintRoutes);

// ── Health check ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'GrievAI Backend API',
    version: '1.0.0',
    time:    new Date().toISOString(),
    env:     process.env.NODE_ENV,
  });
});

// ── API info ──────────────────────────────────────────
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    name:    'GrievAI REST API',
    version: 'v1',
    endpoints: {
      auth:       '/api/v1/auth',
      complaints: '/api/v1/complaints',
      health:     '/health',
    },
  });
});

// ── Catch-all: serve frontend for SPA (if any) ────────
app.get('*', (req, res) => {
  // If request is for API, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: `Route ${req.path} not found.` });
  }
  // Otherwise try to serve index.html from public/
  const indexPath = path.join(frontendPath, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).json({ success: false, message: 'Not found.' });
});

// ── Global error handler (MUST be last middleware) ────
app.use(errorHandler);

// ── Startup ───────────────────────────────────────────
async function startServer() {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Seed admin account (once)
    await seedAdmin();

    // 3. Connect Redis (non-fatal)
    try {
      await connectRedis();
    } catch {
      console.warn('⚠️  Starting without Redis (caching disabled)');
    }

    // 4. Start HTTP server
    app.listen(PORT, () => {
      console.log('');
      console.log('════════════════════════════════════════════');
      console.log(`🚀 GrievAI API running on port ${PORT}`);
      console.log(`📡 Base URL: http://localhost:${PORT}/api/v1`);
      console.log(`🔐 Auth:     http://localhost:${PORT}/api/v1/auth`);
      console.log(`📋 Complaints: http://localhost:${PORT}/api/v1/complaints`);
      console.log(`❤️  Health:  http://localhost:${PORT}/health`);
      console.log(`🌍 Env:      ${process.env.NODE_ENV}`);
      console.log('════════════════════════════════════════════');
    });

  } catch (err) {
    console.error('❌ Server failed to start:', err.message);
    process.exit(1);
  }
}

startServer();

// ── Graceful shutdown ─────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully…');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

module.exports = app;
