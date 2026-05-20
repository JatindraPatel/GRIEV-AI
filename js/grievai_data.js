/**
 * GrievAI — No-Backend Data Layer
 * =================================
 * Replaces all API/backend calls with localStorage-based storage.
 * Provides realistic live demo data for dashboard.
 * All functions mirror original API behavior exactly.
 */

(function(window) {
  'use strict';

  // ── ID Generator ──────────────────────────────────────────────────────
  function generateComplaintId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    var prefix = 'GRV';
    var year = new Date().getFullYear();
    var suffix = '';
    for (var i = 0; i < 8; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    return prefix + year + suffix;
  }

  // ── Storage Helpers ───────────────────────────────────────────────────
  function saveComplaint(id, data) {
    try {
      localStorage.setItem('grievai_complaint_' + id.toUpperCase(), JSON.stringify(data));
      // Also push to complaint list
      var list = getComplaintList();
      if (list.indexOf(id.toUpperCase()) === -1) {
        list.unshift(id.toUpperCase());
        localStorage.setItem('grievai_complaint_list', JSON.stringify(list.slice(0, 200)));
      }
    } catch(e) { console.warn('GrievAI: storage error', e); }
  }

  function loadComplaint(id) {
    try {
      var raw = localStorage.getItem('grievai_complaint_' + id.toUpperCase());
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function getComplaintList() {
    try {
      var raw = localStorage.getItem('grievai_complaint_list');
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  // ── Submit Complaint (no backend) ─────────────────────────────────────
  function submitComplaint(formEl, cameraModule) {
    return new Promise(function(resolve) {
      var id = generateComplaintId();
      var now = new Date().toISOString();

      // Extract form values
      var get = function(sel) {
        var el = formEl.querySelector(sel);
        return el ? el.value.trim() : '';
      };

      var name     = get('#fname') || get('[name="name"]') || 'Anonymous';
      var email    = get('#femail') || get('[name="email"]') || '';
      var mobile   = get('#fmobile') || get('[name="mobile"]') || '';
      var subject  = get('#fsubject') || get('[name="subject"]') || 'Grievance';
      var desc     = get('#fdesc') || get('[name="description"]') || '';
      var dept     = get('#fDeptHidden') || get('[name="department"]') || get('#fDept') || 'Under Review';
      var priority = get('[name="priority"]') || _autoPriority(desc, subject);
      var location = get('#cameraCoords') || get('[name="location"]') || '';
      var lang     = localStorage.getItem('grievai_lang') || 'en';

      // Camera data
      var photoData = null;
      if (cameraModule && cameraModule.hasPhoto()) {
        try { photoData = cameraModule.getCapturedDataURL ? cameraModule.getCapturedDataURL() : null; } catch(e) {}
      }

      var complaint = {
        complaint_id : id,
        id           : id,
        name         : name,
        email        : email,
        mobile       : mobile,
        subject      : subject,
        description  : desc,
        department   : dept || _guessDept(subject + ' ' + desc),
        priority     : priority,
        status       : 'Submitted',
        location     : location,
        language     : lang,
        filed_on     : now,
        created_at   : now,
        has_photo    : !!photoData,
        timeline     : [
          { date: now, status: 'Submitted', note: 'Complaint received and logged by GrievAI system.' }
        ],
        eta          : _calcEta(priority),
        assigned_officer: null,
        fromBackend  : false
      };

      saveComplaint(id, complaint);

      // Add to public feed for dashboard
      _addToPublicFeed(complaint);

      setTimeout(function() { resolve(complaint); }, 400); // slight delay for UX
    });
  }

  function _autoPriority(desc, subject) {
    var text = (desc + ' ' + subject).toLowerCase();
    if (/urgent|emergency|critical|life|death|fire|flood|serious|immediate/.test(text)) return 'CRITICAL';
    if (/important|asap|soon|hospital|police|danger|illegal/.test(text)) return 'HIGH';
    if (/delay|slow|poor|broken|damaged|not working/.test(text)) return 'MEDIUM';
    return 'LOW';
  }

  function _guessDept(text) {
    text = text.toLowerCase();
    if (/road|pothole|traffic|signal/.test(text)) return 'Transport Authority';
    if (/water|sanitation|drain|sewer|garbage|waste/.test(text)) return 'Municipal Corporation';
    if (/school|education|teacher|college|university/.test(text)) return 'Department of Education';
    if (/hospital|health|doctor|medicine|clinic/.test(text)) return 'Ministry of Health & Family Welfare';
    if (/police|crime|theft|law|fir/.test(text)) return 'Police Department';
    if (/electric|power|light|voltage/.test(text)) return 'Power Department';
    return 'Municipal Corporation';
  }

  function _calcEta(priority) {
    var days = { CRITICAL: 3, HIGH: 7, MEDIUM: 15, LOW: 30 };
    var d = new Date();
    d.setDate(d.getDate() + (days[priority] || 15));
    return d.toISOString().slice(0, 10);
  }

  // ── Track Complaint (localStorage only) ───────────────────────────────
  function fetchComplaint(id) {
    return new Promise(function(resolve) {
      var data = loadComplaint(id);
      if (data) {
        resolve({
          dept       : data.department || 'Under Review',
          officer    : data.assigned_officer || 'Being Assigned',
          priority   : data.priority || 'MEDIUM',
          status     : data.status || 'Submitted',
          statusCls  : _statusToCls(data.status),
          badgeClass : _statusToCls(data.status),
          date       : data.filed_on || data.created_at,
          filedOn    : data.filed_on || data.created_at,
          eta        : data.eta || null,
          timeline   : data.timeline || null,
          subject    : data.subject || '',
          name       : data.name || '',
          fromBackend: false
        });
      } else {
        resolve(null);
      }
    });
  }

  function _statusToCls(status) {
    if (!status) return 'info';
    var s = status.toLowerCase();
    if (s === 'resolved' || s === 'closed')        return 'success';
    if (s === 'in progress' || s === 'inprogress') return 'warning';
    if (s === 'pending')                           return 'navy';
    return 'info';
  }

  // ── Public Feed (for dashboard live ticker) ───────────────────────────
  function _addToPublicFeed(complaint) {
    try {
      var feed = JSON.parse(localStorage.getItem('grievai_public_feed') || '[]');
      feed.unshift({
        id        : complaint.id,
        subject   : complaint.subject,
        department: complaint.department,
        priority  : complaint.priority,
        filed_on  : complaint.filed_on,
        location  : complaint.location || 'India'
      });
      localStorage.setItem('grievai_public_feed', JSON.stringify(feed.slice(0, 50)));
    } catch(e) {}
  }

  function getPublicFeed() {
    try {
      return JSON.parse(localStorage.getItem('grievai_public_feed') || '[]');
    } catch(e) { return []; }
  }

  // ── Demo Data: seed realistic complaints if none exist ────────────────
  var DEMO_COMPLAINTS = [
    { id:'GRV2025DEMO001', subject:'Road pothole causing accidents near bus stop', department:'Transport Authority', priority:'HIGH', status:'In Progress', location:'Connaught Place, New Delhi', filed_on: _daysAgo(2) },
    { id:'GRV2025DEMO002', subject:'No water supply for 3 days in our area', department:'Municipal Corporation', priority:'CRITICAL', status:'Submitted', location:'Andheri West, Mumbai', filed_on: _daysAgo(1) },
    { id:'GRV2025DEMO003', subject:'Street lights not working in residential colony', department:'Power Department', priority:'MEDIUM', status:'Resolved', location:'Koramangala, Bengaluru', filed_on: _daysAgo(5) },
    { id:'GRV2025DEMO004', subject:'Garbage not collected for 2 weeks', department:'Municipal Corporation', priority:'HIGH', status:'In Progress', location:'Salt Lake, Kolkata', filed_on: _daysAgo(3) },
    { id:'GRV2025DEMO005', subject:'Hospital medicines out of stock at PHC', department:'Ministry of Health & Family Welfare', priority:'CRITICAL', status:'In Progress', location:'Sector 12, Chandigarh', filed_on: _daysAgo(1) },
    { id:'GRV2025DEMO006', subject:'School teacher absent for a month', department:'Department of Education', priority:'HIGH', status:'Submitted', location:'Bhopal, MP', filed_on: _daysAgo(4) },
    { id:'GRV2025DEMO007', subject:'Illegal construction blocking road access', department:'Municipal Corporation', priority:'HIGH', status:'Pending', location:'Vijayawada, AP', filed_on: _daysAgo(6) },
    { id:'GRV2025DEMO008', subject:'Water logging issue during rains not resolved', department:'Municipal Corporation', priority:'MEDIUM', status:'Resolved', location:'Pune, MH', filed_on: _daysAgo(10) },
    { id:'GRV2025DEMO009', subject:'Traffic signal malfunction at main junction', department:'Transport Authority', priority:'HIGH', status:'In Progress', location:'Anna Nagar, Chennai', filed_on: _daysAgo(2) },
    { id:'GRV2025DEMO010', subject:'Pension not received for 3 months', department:'Department of Finance', priority:'HIGH', status:'Submitted', location:'Lucknow, UP', filed_on: _daysAgo(1) },
    { id:'GRV2025DEMO011', subject:'Public toilet facility not maintained', department:'Municipal Corporation', priority:'MEDIUM', status:'In Progress', location:'Jaipur, RJ', filed_on: _daysAgo(7) },
    { id:'GRV2025DEMO012', subject:'Police not registering FIR for theft', department:'Police Department', priority:'CRITICAL', status:'Under Review', location:'Hyderabad, TS', filed_on: _daysAgo(1) },
  ];

  function _daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  function seedDemoData() {
    if (localStorage.getItem('grievai_demo_seeded_v2')) return;
    DEMO_COMPLAINTS.forEach(function(c) {
      var full = Object.assign({}, c, {
        name        : _demoName(),
        email       : '',
        mobile      : '98' + Math.floor(10000000 + Math.random() * 89999999),
        description : c.subject + '. This requires urgent attention from the concerned department.',
        created_at  : c.filed_on,
        eta         : _calcEta(c.priority),
        timeline    : [{ date: c.filed_on, status: c.status, note: 'Complaint received and logged.' }],
        has_photo   : Math.random() > 0.5,
        fromBackend : false
      });
      saveComplaint(c.id, full);
      _addToPublicFeed(full);
    });
    localStorage.setItem('grievai_demo_seeded_v2', '1');
    console.log('[GrievAI] Demo data seeded — ' + DEMO_COMPLAINTS.length + ' complaints loaded.');
  }

  var NAMES = ['Ramesh Kumar','Priya Sharma','Amit Singh','Sunita Devi','Rajan Patel','Kavitha Nair','Suresh Reddy','Meera Joshi','Arun Gupta','Deepa Pillai'];
  function _demoName() { return NAMES[Math.floor(Math.random() * NAMES.length)]; }

  // ── Dashboard Stats (from localStorage) ───────────────────────────────
  function getDashboardStats() {
    var list = getComplaintList();
    var total = list.length;
    var byStatus = { Submitted: 0, 'In Progress': 0, Resolved: 0, Pending: 0, 'Under Review': 0 };
    var byDept   = {};
    var byPriority = { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0 };
    var today = new Date().toDateString();
    var todayCount = 0;

    list.forEach(function(id) {
      var c = loadComplaint(id);
      if (!c) return;
      var s = c.status || 'Submitted';
      byStatus[s] = (byStatus[s] || 0) + 1;
      var d = c.department || 'Other';
      byDept[d] = (byDept[d] || 0) + 1;
      var p = c.priority || 'MEDIUM';
      byPriority[p] = (byPriority[p] || 0) + 1;
      if (c.filed_on && new Date(c.filed_on).toDateString() === today) todayCount++;
    });

    var resolved   = byStatus['Resolved'] || 0;
    var inProgress = byStatus['In Progress'] || 0;

    return {
      total      : total,
      today      : todayCount,
      resolved   : resolved,
      inProgress : inProgress,
      pending    : byStatus['Submitted'] + byStatus['Pending'] + byStatus['Under Review'],
      accuracy   : total > 0 ? Math.min(97, 91 + Math.floor(resolved / total * 10)) : 94,
      byStatus   : byStatus,
      byDept     : byDept,
      byPriority : byPriority,
      feed       : getPublicFeed().slice(0, 20)
    };
  }

  // ── Login (no backend — credential check only) ────────────────────────
  var DEMO_USERS = {
    citizen : { mobile: '9876543210', password: 'citizen123', name: 'Ramesh Kumar' },
    officer : { id: 'IAS-2024-MH-001', password: 'officer123', name: 'Officer Priya Sharma', dept: 'Municipal Corporation' },
    admin   : { username: 'admin', password: 'admin123', name: 'Administrator' }
  };

  function loginUser(role, credentials) {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        var demo = DEMO_USERS[role];
        var ok = false;
        var name = '';

        if (role === 'citizen') {
          // Check locally registered users first
          var localUsers = [];
          try { localUsers = JSON.parse(localStorage.getItem('grievai_registered_users') || '[]'); } catch(e){}
          var found = localUsers.find(function(u) {
            return (u.mobile === credentials.mobile || u.email === credentials.mobile) && u.password === credentials.password;
          });
          if (found) { ok = true; name = found.name; }
          else if (demo && credentials.mobile === demo.mobile && credentials.password === demo.password) {
            ok = true; name = demo.name;
          }
        } else if (role === 'officer') {
          if (demo && credentials.id === demo.id && credentials.password === demo.password) {
            ok = true; name = demo.name;
          }
        } else if (role === 'admin') {
          if (demo && credentials.username === demo.username && credentials.password === demo.password) {
            ok = true; name = demo.name;
          }
        }

        if (ok) {
          sessionStorage.setItem('grievai_role', role);
          sessionStorage.setItem('grievai_user', name);
          // Store a simple session token (no backend needed)
          sessionStorage.setItem('grievai_token', 'local_' + role + '_' + Date.now());
          resolve({ role: role, name: name });
        } else {
          reject(new Error('Invalid credentials. Please check and try again.'));
        }
      }, 600);
    });
  }

  function logoutUser() {
    sessionStorage.removeItem('grievai_role');
    sessionStorage.removeItem('grievai_user');
    sessionStorage.removeItem('grievai_token');
    window.location.href = 'index.html';
  }

  // ── Feedback Storage ──────────────────────────────────────────────────
  function saveFeedback(data) {
    return new Promise(function(resolve) {
      try {
        var feed = JSON.parse(localStorage.getItem('grievai_feedback') || '[]');
        var entry = Object.assign({}, data, { id: 'FB' + Date.now(), submitted_at: new Date().toISOString() });
        feed.unshift(entry);
        localStorage.setItem('grievai_feedback', JSON.stringify(feed.slice(0, 100)));
      } catch(e) {}
      setTimeout(function() { resolve({ success: true }); }, 400);
    });
  }

  // ── Expose API ────────────────────────────────────────────────────────
  window.GrievData = {
    generateComplaintId : generateComplaintId,
    submitComplaint     : submitComplaint,
    fetchComplaint      : fetchComplaint,
    getDashboardStats   : getDashboardStats,
    getPublicFeed       : getPublicFeed,
    loginUser           : loginUser,
    logoutUser          : logoutUser,
    saveFeedback        : saveFeedback,
    seedDemoData        : seedDemoData,
    saveComplaint       : saveComplaint,
    loadComplaint       : loadComplaint
  };

  // Auto-seed demo data on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', seedDemoData);
  } else {
    seedDemoData();
  }

})(window);
