// ─────────────────────────────────────────────────────
// GrievAI — Complaint Model
// ─────────────────────────────────────────────────────
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ── Sub-schema: status history (audit trail) ─────────
const statusHistorySchema = new mongoose.Schema(
  {
    status:    { type: String, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note:      { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Sub-schema: attachment ───────────────────────────
const attachmentSchema = new mongoose.Schema(
  {
    filename:     { type: String, required: true },
    originalname: { type: String, required: true },
    mimetype:     { type: String, required: true },
    size:         { type: Number, required: true },    // bytes
    path:         { type: String, required: true },    // disk path / S3 key
    uploadedAt:   { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Main complaint schema ────────────────────────────
const complaintSchema = new mongoose.Schema(
  {
    // Auto-generated human-readable ID (e.g. GRIEVA/2025/847291)
    complaintId: {
      type: String,
      unique: true,
      default: () => {
        const year = new Date().getFullYear();
        const num  = Math.floor(100000 + Math.random() * 900000);
        return `GRIEVA/${year}/${num}`;
      },
    },

    // Submitter info (citizen may be anonymous)
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    citizenName:   { type: String, required: [true, 'Citizen name required'], trim: true },
    citizenMobile: { type: String, trim: true, default: null },
    citizenState:  { type: String, trim: true, default: null },
    citizenDistrict:{ type: String, trim: true, default: null },

    // Complaint content
    title: {
      type: String,
      required: [true, 'Complaint subject/title is required'],
      trim: true,
      maxlength: [500, 'Title too long'],
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      maxlength: [5000, 'Description too long'],
    },

    // AI-detected fields (filled by FastAPI microservice)
    language:     { type: String, default: 'en' },    // ISO code: en, hi, mr…
    department:   { type: String, default: null },    // e.g. "Water Supply & Sanitation"
    departmentCode:{ type: String, default: null },   // e.g. "water"
    priority:     {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    priorityScore: { type: Number, default: 0.5 },   // 0.0 – 1.0 from AI

    // AI processing state
    aiProcessed:   { type: Boolean, default: false },
    aiRawResponse: { type: mongoose.Schema.Types.Mixed, default: null },

    // Status lifecycle
    status: {
      type: String,
      enum: ['pending', 'under_review', 'in_progress', 'resolved', 'rejected', 'escalated'],
      default: 'pending',
    },
    statusHistory: [statusHistorySchema],   // full audit trail

    // Assignment (admin sets this)
    assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedAt:   { type: Date, default: null },

    // Escalation
    isEscalated:  { type: Boolean, default: false },
    escalatedAt:  { type: Date,    default: null },
    escalationNote:{ type: String, default: null },

    // Location / GPS
    latitude:     { type: Number, default: null },
    longitude:    { type: Number, default: null },
    locationText: { type: String, default: null },

    // Attachments (images, audio, video)
    attachments:  [attachmentSchema],

    // Resolution
    resolvedAt:   { type: Date, default: null },
    resolutionNote:{ type: String, default: null },

    // Demo flag (auto-generated complaints)
    isDemo:       { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes for fast queries ──────────────────────────
complaintSchema.index({ userId: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ department: 1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ citizenMobile: 1 });
complaintSchema.index({ isDemo: 1 });

// ── Virtual: days since filed ─────────────────────────
complaintSchema.virtual('daysPending').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Complaint', complaintSchema);
