// ─────────────────────────────────────────────────────
// GrievAI — Joi Validation Middleware + Schemas
// ─────────────────────────────────────────────────────
const Joi = require('joi');

// ── Generic validator factory ─────────────────────────
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,       // collect ALL errors, not just the first
      stripUnknown: true,      // remove unknown fields silently
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages,
      });
    }

    req[target] = value;       // replace with sanitized value
    next();
  };
};

// ── Auth Schemas ──────────────────────────────────────
const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(100).required(),
  email:    Joi.string().email().required(),
  mobile:   Joi.string().pattern(/^[6-9]\d{9}$/).optional().allow('', null),
  password: Joi.string().min(6).max(100).required(),
  role:     Joi.string().valid('citizen', 'officer', 'admin').default('citizen'),
  // Officer-only
  employeeId: Joi.string().optional().allow('', null),
  department: Joi.string().optional().allow('', null),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().optional(),
  mobile:   Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
  password: Joi.string().required(),
  role:     Joi.string().valid('citizen', 'officer', 'admin').optional(),
}).or('email', 'mobile');   // at least one of email OR mobile required

// ── Complaint Schemas ─────────────────────────────────
const createComplaintSchema = Joi.object({
  citizenName:    Joi.string().min(2).max(100).required(),
  citizenMobile:  Joi.string().pattern(/^[6-9]\d{9}$/).optional().allow('', null),
  citizenState:   Joi.string().max(100).optional().allow('', null),
  citizenDistrict:Joi.string().max(100).optional().allow('', null),
  title:          Joi.string().min(5).max(500).required(),
  description:    Joi.string().min(10).max(5000).required(),
  language:       Joi.string().max(10).default('en'),
  // Optional: allow frontend to send AI-detected values
  department:     Joi.string().max(200).optional().allow('', null),
  priority:       Joi.string().valid('low','medium','high','critical').optional(),
  latitude:       Joi.number().min(-90).max(90).optional().allow(null),
  longitude:      Joi.number().min(-180).max(180).optional().allow(null),
  locationText:   Joi.string().max(300).optional().allow('', null),
});

const updateComplaintSchema = Joi.object({
  status:         Joi.string().valid('pending','under_review','in_progress','resolved','rejected','escalated').optional(),
  department:     Joi.string().max(200).optional(),
  priority:       Joi.string().valid('low','medium','high','critical').optional(),
  assignedTo:     Joi.string().hex().length(24).optional().allow(null),
  resolutionNote: Joi.string().max(1000).optional().allow('', null),
  escalationNote: Joi.string().max(1000).optional().allow('', null),
  note:           Joi.string().max(500).optional().allow('', null),
});

const trackSchema = Joi.object({
  complaintId: Joi.string().pattern(/^GRIEVA\/\d{4}\/\d{6}$/)
    .required()
    .messages({ 'string.pattern.base': 'Invalid Complaint ID format. Expected: GRIEVA/YYYY/XXXXXX' }),
});

module.exports = {
  validate,
  schemas: {
    register:        registerSchema,
    login:           loginSchema,
    createComplaint: createComplaintSchema,
    updateComplaint: updateComplaintSchema,
    track:           trackSchema,
  },
};
