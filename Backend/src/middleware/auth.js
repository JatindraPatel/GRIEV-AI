// ─────────────────────────────────────────────────────
// GrievAI — Auth Middleware
// JWT verification + role-based access control
// ─────────────────────────────────────────────────────
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Verify JWT ────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError'
        ? 'Token expired. Please login again.'
        : 'Invalid token.';
      return res.status(401).json({ success: false, message: msg });
    }

    // Fetch fresh user (catch deactivated accounts)
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or deactivated.',
      });
    }

    req.user = user;   // attach to request
    next();
  } catch (err) {
    next(err);
  }
};

// ── Optional auth (allows unauthenticated, sets req.user if token present) ──
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-password');
    } catch {
      req.user = null;
    }
    next();
  } catch (err) {
    next(err);
  }
};

// ── Role gate: pass array of allowed roles ────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden. Required role(s): ${roles.join(', ')}.`,
      });
    }
    next();
  };
};

// ── Generate JWT ──────────────────────────────────────
const signToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = { authenticate, optionalAuth, authorize, signToken };
