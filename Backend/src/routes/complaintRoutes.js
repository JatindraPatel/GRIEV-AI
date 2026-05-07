const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/complaintController');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const upload     = require('../middleware/upload');

// ── Public: track complaint by ID ─────────────────────
// GET /api/v1/complaints/track/GRIEVA/2025/847291
router.get('/track/:year/:number',  (req, res, next) => {
  req.params.complaintId = `GRIEVA/${req.params.year}/${req.params.number}`;
  ctrl.trackComplaint(req, res, next);
});
// Also support encoded form: /track/GRIEVA%2F2025%2F847291
router.get('/track/:complaintId',   ctrl.trackComplaint);

// ── Public/Optional: create complaint (citizen may or may not be logged in) ──
router.post(
  '/',
  optionalAuth,
  upload.array('attachments', 5),
  validate(schemas.createComplaint),
  ctrl.createComplaint
);

// ── Stats (admin/officer) ─────────────────────────────
router.get('/stats',
  authenticate,
  authorize('admin', 'officer'),
  ctrl.getStats
);

// ── Citizen: my complaints ────────────────────────────
router.get('/my', authenticate, authorize('citizen'), ctrl.getMyComplaints);

// ── Admin/Officer: all complaints ─────────────────────
router.get(
  '/',
  authenticate,
  authorize('admin', 'officer'),
  ctrl.getAllComplaints
);

// ── Admin/Officer: single complaint detail ────────────
router.get(
  '/:id',
  authenticate,
  ctrl.getComplaintById
);

// ── Admin/Officer: update complaint ───────────────────
router.patch(
  '/:id',
  authenticate,
  authorize('admin', 'officer'),
  validate(schemas.updateComplaint),
  ctrl.updateComplaint
);

module.exports = router;
