// ─────────────────────────────────────────────────────
// GrievAI — Complaint Controller
// POST   /api/v1/complaints            → create
// GET    /api/v1/complaints            → list (admin/officer)
// GET    /api/v1/complaints/track/:id  → public track by complaintId
// GET    /api/v1/complaints/:id        → detail (owner/admin/officer)
// PATCH  /api/v1/complaints/:id        → update status/dept (admin/officer)
// GET    /api/v1/complaints/my         → citizen's own complaints
// ─────────────────────────────────────────────────────
const Complaint = require('../models/Complaint');
const { analyzeComplaint } = require('../utils/aiService');
const { queuePush, cacheGet, cacheSet, cacheDel } = require('../config/redis');

// ── helpers ───────────────────────────────────────────
function buildAttachments(files) {
  if (!files || !files.length) return [];
  return files.map((f) => ({
    filename:     f.filename,
    originalname: f.originalname,
    mimetype:     f.mimetype,
    size:         f.size,
    path:         f.path,
  }));
}

// ── POST /api/v1/complaints ───────────────────────────
const createComplaint = async (req, res, next) => {
  try {
    const {
      citizenName, citizenMobile, citizenState, citizenDistrict,
      title, description, language,
      department, priority,
      latitude, longitude, locationText,
    } = req.body;

    // 1. Create complaint with initial data (status=pending)
    const complaint = await Complaint.create({
      userId:         req.user ? req.user._id : null,
      citizenName,
      citizenMobile:  citizenMobile  || null,
      citizenState:   citizenState   || null,
      citizenDistrict:citizenDistrict|| null,
      title,
      description,
      language:       language || 'en',
      department:     department || null,      // may be overwritten by AI
      priority:       priority   || 'medium',  // may be overwritten by AI
      latitude:       latitude   || null,
      longitude:      longitude  || null,
      locationText:   locationText || null,
      attachments:    buildAttachments(req.files),
      statusHistory: [{
        status:    'pending',
        updatedBy: null,
        note:      'Complaint registered',
      }],
    });

    // 2. Push to Redis queue for async AI processing
    const queued = await queuePush('grievai:ai_queue', {
      complaintDbId: complaint._id.toString(),
      text: `${title} ${description}`,
    });

    // 3. If queue failed (Redis offline), run AI synchronously right now
    if (!queued) {
      try {
        const ai = await analyzeComplaint(`${title} ${description}`);
        complaint.language       = ai.language      || language || 'en';
        complaint.department     = ai.department     || complaint.department;
        complaint.departmentCode = ai.department_code;
        complaint.priority       = ai.priority       || complaint.priority;
        complaint.priorityScore  = ai.priority_score || 0.5;
        complaint.aiProcessed    = true;
        complaint.aiRawResponse  = ai;
        await complaint.save();
      } catch (aiErr) {
        console.warn('[GrievAI] Inline AI failed:', aiErr.message);
        // Non-fatal: complaint still saved without AI data
      }
    }

    // 4. Invalidate any cached lists
    await cacheDel('complaints:admin:list');

    res.status(201).json({
      success: true,
      message: 'Complaint filed successfully.',
      complaint_id: complaint.complaintId,
      id:           complaint._id,
      status:       complaint.status,
      department:   complaint.department,
      priority:     complaint.priority,
      ai_processed: complaint.aiProcessed,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/complaints/my (citizen) ──────────────
const getMyComplaints = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Login required.' });
    }

    const page  = parseInt(req.query.page  || '1',  10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip  = (page - 1) * limit;

    const filter = { userId: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-aiRawResponse -__v'),
      Complaint.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      complaints,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/complaints/track/:complaintId (public) ──
const trackComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;

    // Try cache first
    const cached = await cacheGet(`complaint:track:${complaintId}`);
    if (cached) {
      return res.status(200).json({ success: true, complaint: JSON.parse(cached), cached: true });
    }

    const complaint = await Complaint.findOne({ complaintId })
      .select('complaintId title department priority status statusHistory citizenName citizenState createdAt resolvedAt resolutionNote isEscalated')
      .lean();

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: `No complaint found with ID: ${complaintId}`,
      });
    }

    // Cache public tracking data for 60 seconds
    await cacheSet(`complaint:track:${complaintId}`, complaint, 60);

    res.status(200).json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/complaints (admin/officer) ────────────
const getAllComplaints = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page   || '1',  10);
    const limit  = parseInt(req.query.limit  || '20', 10);
    const skip   = (page - 1) * limit;

    const filter = { isDemo: false };
    if (req.query.status)     filter.status     = req.query.status;
    if (req.query.department) filter.department  = new RegExp(req.query.department, 'i');
    if (req.query.priority)   filter.priority    = req.query.priority;
    if (req.query.demo === 'true') filter.isDemo = true;

    // Officers only see their department
    if (req.user.role === 'officer' && req.user.department) {
      filter.department = new RegExp(req.user.department, 'i');
    }

    const [complaints, total, stats] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'name email department')
        .select('-aiRawResponse -__v')
        .lean(),
      Complaint.countDocuments(filter),
      // Summary stats for dashboard
      Complaint.aggregate([
        { $match: { isDemo: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusSummary = stats.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      statusSummary,
      complaints,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/complaints/:id ────────────────────────
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('assignedTo', 'name email department role')
      .populate('userId', 'name email mobile')
      .lean();

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Citizens can only see their own
    if (req.user.role === 'citizen' &&
        complaint.userId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access forbidden.' });
    }

    res.status(200).json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/v1/complaints/:id (admin/officer) ──────
const updateComplaint = async (req, res, next) => {
  try {
    const { status, department, priority, assignedTo, resolutionNote, escalationNote, note } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Track status change in history
    if (status && status !== complaint.status) {
      complaint.statusHistory.push({
        status,
        updatedBy: req.user._id,
        note:      note || `Status changed to ${status}`,
        timestamp: new Date(),
      });
      complaint.status = status;

      if (status === 'resolved') {
        complaint.resolvedAt     = new Date();
        complaint.resolutionNote = resolutionNote || null;
      }
      if (status === 'escalated') {
        complaint.isEscalated    = true;
        complaint.escalatedAt    = new Date();
        complaint.escalationNote = escalationNote || null;
      }
    }

    if (department)     complaint.department = department;
    if (priority)       complaint.priority   = priority;
    if (assignedTo !== undefined) {
      complaint.assignedTo  = assignedTo || null;
      complaint.assignedAt  = assignedTo ? new Date() : null;
    }

    await complaint.save();

    // Invalidate track cache
    await cacheDel(`complaint:track:${complaint.complaintId}`);

    res.status(200).json({
      success:  true,
      message:  'Complaint updated.',
      complaint: complaint.toObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/complaints/stats (admin dashboard) ────
const getStats = async (req, res, next) => {
  try {
    // Try cache (30s TTL — dashboard refreshes often)
    const cached = await cacheGet('complaints:stats');
    if (cached) {
      return res.status(200).json({ success: true, stats: JSON.parse(cached), cached: true });
    }

    const [
      totalComplaints,
      byStatus,
      byDept,
      byPriority,
      recent7Days,
    ] = await Promise.all([
      Complaint.countDocuments({ isDemo: false }),
      Complaint.aggregate([
        { $match: { isDemo: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: { isDemo: false, department: { $ne: null } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Complaint.aggregate([
        { $match: { isDemo: false } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Complaint.countDocuments({
        isDemo:    false,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const stats = {
      totalComplaints,
      recent7Days,
      byStatus:   byStatus.reduce((a, s) => { a[s._id] = s.count; return a; }, {}),
      byDept:     byDept.map((d) => ({ department: d._id, count: d.count })),
      byPriority: byPriority.reduce((a, s) => { a[s._id] = s.count; return a; }, {}),
    };

    await cacheSet('complaints:stats', stats, 30);

    res.status(200).json({ success: true, stats });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  trackComplaint,
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  getStats,
};
