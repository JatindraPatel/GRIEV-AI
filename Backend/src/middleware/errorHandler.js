// ─────────────────────────────────────────────────────
// GrievAI — Global Error Handler
// Always catches unhandled errors and returns JSON
// ─────────────────────────────────────────────────────

const errorHandler = (err, req, res, next) => {  // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || err.status || 500;
  let message    = err.message || 'Internal server error';

  // ── Mongoose validation error ─────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join('; ');
  }

  // ── Mongoose duplicate key ─────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists.`;
  }

  // ── Mongoose cast error (invalid ObjectId) ────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field: ${err.path}`;
  }

  // ── JWT errors (already handled in middleware, but safety net) ──
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired. Please login again.';
  }

  // ── Multer file size error ─────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10}MB.`;
  }

  // ── Log server errors ─────────────────────────────
  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] 🔴 SERVER ERROR:`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
