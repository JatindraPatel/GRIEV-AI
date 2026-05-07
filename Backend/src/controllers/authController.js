// ─────────────────────────────────────────────────────
// GrievAI — Auth Controller
// POST /api/v1/auth/register
// POST /api/v1/auth/login
// GET  /api/v1/auth/me
// ─────────────────────────────────────────────────────
const User     = require('../models/User');
const { signToken } = require('../middleware/auth');
const { cacheSet, cacheDel } = require('../config/redis');

// ── Register ──────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, mobile, password, role, employeeId, department } = req.body;

    // Block direct admin creation through API
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts can only be created by an existing admin.',
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({
      name, email, mobile, password, role,
      employeeId: role === 'officer' ? employeeId : null,
      department: role === 'officer' ? department : null,
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, mobile, password } = req.body;

    // Find by email or mobile
    const query = email ? { email: email.toLowerCase() } : { mobile };
    const user  = await User.findOne(query).select('+password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or account deactivated.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);

    // Cache user role for quick middleware checks (5 min TTL)
    await cacheSet(`user:role:${user._id}`, { role: user.role }, 300);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id:         user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        department: user.department,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Get current user ──────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (err) {
    next(err);
  }
};

// ── Admin: create officer/admin accounts ──────────────
const createUserByAdmin = async (req, res, next) => {
  try {
    const { name, email, mobile, password, role, employeeId, department } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ name, email, mobile, password, role, employeeId, department });

    res.status(201).json({
      success: true,
      message: `${role} account created.`,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, createUserByAdmin };
