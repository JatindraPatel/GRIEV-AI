const express  = require('express');
const router   = express.Router();
const { register, login, getMe, createUserByAdmin } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// POST /api/v1/auth/register
router.post('/register', validate(schemas.register), register);

// POST /api/v1/auth/login
router.post('/login', validate(schemas.login), login);

// GET  /api/v1/auth/me  (protected)
router.get('/me', authenticate, getMe);

// POST /api/v1/auth/create-user  (admin only — create officer/admin accounts)
router.post(
  '/create-user',
  authenticate,
  authorize('admin'),
  validate(schemas.register),
  createUserByAdmin
);

module.exports = router;
