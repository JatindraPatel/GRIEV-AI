// ─────────────────────────────────────────────────────
// GrievAI — User Model
// Fields: name, email, mobile, password, role
// Roles: citizen | officer | admin
// ─────────────────────────────────────────────────────
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name too long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    mobile: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
      default: null,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,     // never returned in queries by default
    },
    role: {
      type: String,
      enum: ['citizen', 'officer', 'admin'],
      default: 'citizen',
    },
    // Officer-specific
    employeeId:  { type: String, default: null },
    department:  { type: String, default: null },
    // Account state
    isActive:    { type: Boolean, default: true },
    lastLoginAt: { type: Date,    default: null },
  },
  {
    timestamps: true,       // adds createdAt, updatedAt automatically
    versionKey: false,
  }
);

// ── Hash password before save ────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare password ────────────────
userSchema.methods.comparePassword = async function (plaintext) {
  return bcrypt.compare(plaintext, this.password);
};

// ── Hide sensitive fields in JSON output ─────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// ── Index for fast lookups ────────────────────────────
userSchema.index({ mobile: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
