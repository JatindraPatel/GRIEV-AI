// ====================================================
// GrievAI – Main JS (No-Backend Edition)
// All data stored in localStorage via GrievData
// ====================================================

document.addEventListener('DOMContentLoaded', function () {

  // ── Navigation Active State ───────────────────────
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-menu a').forEach(function(link) {
    var href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ── AI Auto Department Detection ───────────────────
  var descField    = document.getElementById('fdesc');
  var subjectField = document.getElementById('fsubject');
  function runAIDeptDetection() {
    if (!window.GrievAI_Dept) return;
    var text = ((subjectField ? subjectField.value : '') + ' ' + (descField ? descField.value : '')).trim();
    if (text.length < 5) { window.GrievAI_Dept.clearDetectionUI && window.GrievAI_Dept.clearDetectionUI(); return; }
    var result = window.GrievAI_Dept.classify(text);
    window.GrievAI_Dept.updateDetectionUI(result);
  }
  if (descField)    { descField.addEventListener('input', runAIDeptDetection); descField.addEventListener('blur', runAIDeptDetection); }
  if (subjectField) { subjectField.addEventListener('input', runAIDeptDetection); }

  // ── FAQ Accordion ─────────────────────────────────
  document.querySelectorAll('.faq-question').forEach(function(btn) {
    btn.addEventListener('click', function () {
      var answer = this.nextElementSibling;
      var isOpen = this.classList.contains('open');
      document.querySelectorAll('.faq-question.open').forEach(function(q) {
        q.classList.remove('open');
        if (q.nextElementSibling) q.nextElementSibling.classList.remove('open');
      });
      if (!isOpen) { this.classList.add('open'); if (answer) answer.classList.add('open'); }
    });
  });

  // ── Complaint Form Gate (PUBLIC — anyone can file) ─
  (function initComplaintGate() {
    var formWrap    = document.getElementById('complaintFormWrap');
    var loginGate   = document.getElementById('complaintLoginGate');
    var officerGate = document.getElementById('complaintOfficerGate');
    if (!formWrap && !loginGate && !officerGate) return;

    var role = sessionStorage.getItem('grievai_role') || '';

    if (role === 'officer' || role === 'admin') {
      // Officers/Admins see gate, not form
      if (officerGate) officerGate.style.display = 'block';
      if (loginGate)   loginGate.style.display   = 'none';
      if (formWrap)    formWrap.style.display     = 'none';
    } else {
      // Everyone else (citizen logged in OR guest/not logged in) — show form directly
      if (formWrap)    formWrap.style.display     = 'block';
      if (loginGate)   loginGate.style.display    = 'none';
      if (officerGate) officerGate.style.display  = 'none';
    }
  })();

  // ── Complaint Form Submission (localStorage only) ──
  var complaintForm = document.getElementById('complaintForm');
  if (complaintForm) {
    complaintForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var role = sessionStorage.getItem('grievai_role') || '';
      if (role === 'officer' || role === 'admin') {
        showNotification('Officers/Admins cannot file complaints. Citizens only.', 'error');
        return;
      }

      if (!validateComplaintForm()) return;

      // Camera validation (non-blocking)
      var cameraSection = document.querySelector('.camera-section');
      if (cameraSection && window.GrievCamera) {
        var camErrors = window.GrievCamera.validate();
        if (camErrors.length > 0) {
          var videoEl = document.getElementById('cameraVideo');
          var cameraStarted = videoEl && videoEl.srcObject;
          if (cameraStarted) {
            showCameraValidationErrors(camErrors);
            return;
          }
          hideCameraValidationErrors();
        }
      }

      var submitBtn = complaintForm.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Filing Complaint…';

      // ── Build data object from form ──
      var get = function(sel) {
        var el = complaintForm.querySelector(sel);
        return el ? (el.value || '').trim() : '';
      };

      var complaintData = {
        name       : get('#fname') || get('[name="name"]') || 'Anonymous',
        email      : get('#femail') || get('[name="email"]') || '',
        mobile     : get('#fmobile') || get('[name="mobile"]') || '',
        subject    : get('#fsubject') || get('[name="subject"]') || 'Grievance',
        description: get('#fdesc') || get('[name="description"]') || '',
        department : get('#fDeptHidden') || get('#fDept') || '',
        location   : get('#cameraCoords') || '',
        language   : localStorage.getItem('grievai_lang') || 'en',
        has_photo  : !!(window.GrievCamera && window.GrievCamera.hasPhoto && window.GrievCamera.hasPhoto())
      };

      // ── Save to localStorage via GrievData ──
      var id          = window.GrievData ? window.GrievData.generateComplaintId() : _generateId();
      var now         = new Date().toISOString();
      var deptFinal   = complaintData.department || _guessDept(complaintData.subject + ' ' + complaintData.description);
      var priObj      = _autoPriority(complaintData.description + ' ' + complaintData.subject);
      var etaDate     = _calcEta(priObj);

      var record = {
        complaint_id    : id,
        id              : id,
        name            : complaintData.name,
        email           : complaintData.email,
        mobile          : complaintData.mobile,
        subject         : complaintData.subject,
        description     : complaintData.description,
        department      : deptFinal,
        priority        : priObj,
        status          : 'Submitted',
        location        : complaintData.location,
        language        : complaintData.language,
        has_photo       : complaintData.has_photo,
        filed_on        : now,
        created_at      : now,
        eta             : etaDate,
        assigned_officer: null,
        timeline        : [{ date: now, status: 'Submitted', icon: '✅', title: 'Complaint Received', desc: 'Your complaint has been registered and logged by GrievAI.', note: 'Received' }],
        fromBackend     : false
      };

      // Save via GrievData
      if (window.GrievData) {
        window.GrievData.saveComplaint(id, record);
      } else {
        try { localStorage.setItem('grievai_complaint_' + id, JSON.stringify(record)); } catch(ex) {}
      }

      // Push to public feed for dashboard
      try {
        var feed = JSON.parse(localStorage.getItem('grievai_public_feed') || '[]');
        feed.unshift({ id: id, subject: record.subject, department: record.department, priority: record.priority, filed_on: now, location: record.location });
        localStorage.setItem('grievai_public_feed', JSON.stringify(feed.slice(0, 50)));
      } catch(ex) {}

      // Push to complaint list
      try {
        var list = JSON.parse(localStorage.getItem('grievai_complaint_list') || '[]');
        if (list.indexOf(id) === -1) { list.unshift(id); localStorage.setItem('grievai_complaint_list', JSON.stringify(list.slice(0, 200))); }
      } catch(ex) {}

      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Complaint';

      window.showComplaintSuccess(id, record);

      complaintForm.reset();
      if (window.GrievCamera) { try { window.GrievCamera.reset(); } catch(ex) {} }
      resetCameraUI();
    });
  }

  // ── Track Complaint Form ──────────────────────────
  document.querySelectorAll('.track-form').forEach(function(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[name="complaintId"]') || form.querySelector('.track-id-input');
      if (!input || !input.value.trim()) { showNotification('Please enter a Complaint ID', 'error'); return; }
      var id  = input.value.trim().toUpperCase();
      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Searching…';
      fetchComplaintLocal(id).then(function(data) {
        btn.disabled = false;
        btn.textContent = 'Track Complaint';
        showTrackResult(id, data);
      });
    });
  });

  // ── Contact Form ──────────────────────────────────
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = contactForm.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = 'Sending…';
      setTimeout(function() {
        showNotification('Your message has been sent. We will respond within 2 working days.', 'success');
        contactForm.reset();
        btn.disabled = false; btn.textContent = 'Send Message';
      }, 1200);
    });
  }

  // ── Status Page ───────────────────────────────────
  var statusForm = document.getElementById('statusForm');
  if (statusForm) {
    statusForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var idInput = statusForm.querySelector('#statusId');
      if (!idInput || !idInput.value.trim()) { showNotification('Please enter a valid Complaint ID', 'error'); return; }
      var id  = idInput.value.trim().toUpperCase();
      var btn = statusForm.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = 'Fetching…';
      fetchComplaintLocal(id).then(function(data) {
        btn.disabled = false; btn.textContent = 'Check Status';
        renderStatusResult(id, data);
      });
    });
  }

  // ── Captcha ───────────────────────────────────────
  var captchaRefresh = document.getElementById('captchaRefresh');
  if (captchaRefresh) { captchaRefresh.addEventListener('click', generateCaptcha); generateCaptcha(); }

  // ── Login Tab Switching ───────────────────────────
  document.querySelectorAll('.login-tab').forEach(function(tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.login-tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.login-form-panel').forEach(function(p) { p.style.display = 'none'; });
      this.classList.add('active');
      var target = document.getElementById('panel-' + this.dataset.role);
      if (target) target.style.display = 'block';
    });
  });

  // ── Login Form (NO backend — localStorage only) ───
  document.querySelectorAll('.login-form-panel form').forEach(function(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var role = form.dataset.role;
      var btn  = form.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = 'Authenticating…';

      var credentials = {};
      if (role === 'citizen') {
        credentials.mobile   = ((form.querySelector('#cMobile') || {}).value || '').trim();
        credentials.password = ((form.querySelector('#cOtp') || form.querySelector('[name="password"]') || {}).value || '').trim();
      } else if (role === 'officer') {
        credentials.id       = ((form.querySelector('#oEmpId') || {}).value || '').trim();
        credentials.password = ((form.querySelector('#oPassword') || {}).value || '').trim();
      } else {
        credentials.username = ((form.querySelector('#aUsername') || form.querySelector('#aUser') || {}).value || '').trim();
        credentials.password = ((form.querySelector('#aPassword') || {}).value || '').trim();
      }

      // Demo users
      var DEMO = {
        citizen : { mobile: '9876543210', password: 'citizen123', name: 'Ramesh Kumar' },
        officer : { id: 'IAS-2024-MH-001', password: 'officer123', name: 'Officer Priya Sharma' },
        admin   : { username: 'admin', password: 'admin123', name: 'Administrator' }
      };

      setTimeout(function() {
        var demo = DEMO[role];
        var ok = false; var name = '';

        if (role === 'citizen') {
          // Check registered users first
          try {
            var localUsers = JSON.parse(localStorage.getItem('grievai_registered_users') || '[]');
            var found = localUsers.find(function(u) {
              return (u.mobile === credentials.mobile || u.email === credentials.mobile) && u.password === credentials.password;
            });
            if (found) { ok = true; name = found.name; }
          } catch(ex) {}
          if (!ok && demo && credentials.mobile === demo.mobile && credentials.password === demo.password) {
            ok = true; name = demo.name;
          }
        } else if (role === 'officer') {
          if (demo && credentials.id === demo.id && credentials.password === demo.password) { ok = true; name = demo.name; }
        } else {
          if (demo && credentials.username === demo.username && credentials.password === demo.password) { ok = true; name = demo.name; }
        }

        if (ok) {
          sessionStorage.setItem('grievai_role',  role);
          sessionStorage.setItem('grievai_user',  name);
          sessionStorage.setItem('grievai_token', 'local_' + role + '_' + Date.now());
          showNotification('✅ Login successful! Redirecting…', 'success');
          setTimeout(function() {
            window.location.href = (role === 'citizen') ? 'index.html' : 'dashboard.html';
          }, 800);
        } else {
          btn.disabled = false; btn.textContent = 'Login';
          showNotification('❌ Invalid credentials. Use the demo credentials shown above.', 'error');
        }
      }, 600);
    });
  });

  // ── Dashboard Init ────────────────────────────────
  if (currentPage === 'dashboard.html') { initDashboard(); }

  // ── Smooth Scroll ─────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  // ── Stat Counters ─────────────────────────────────
  animateCounters();

}); // end DOMContentLoaded

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function _generateId() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  var s = 'GRV' + new Date().getFullYear();
  for (var i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function _guessDept(text) {
  text = (text || '').toLowerCase();
  if (/road|pothole|traffic|signal|transport/.test(text)) return 'Transport Authority';
  if (/water|drain|sewer|garbage|waste|sanit/.test(text)) return 'Municipal Corporation';
  if (/school|education|teacher|college/.test(text))      return 'Department of Education';
  if (/hospital|health|doctor|medicine|clinic/.test(text))return 'Ministry of Health & Family Welfare';
  if (/police|crime|theft|law|fir/.test(text))            return 'Police Department';
  if (/electric|power|light|voltage/.test(text))          return 'Power Department';
  return 'Municipal Corporation';
}

function _autoPriority(text) {
  text = (text || '').toLowerCase();
  if (/urgent|emergency|critical|life|death|fire|flood|serious|immediate/.test(text)) return 'CRITICAL';
  if (/important|asap|hospital|police|danger|illegal/.test(text))                      return 'HIGH';
  if (/delay|slow|poor|broken|damaged|not working/.test(text))                         return 'MEDIUM';
  return 'LOW';
}

function _calcEta(priority) {
  var days = { CRITICAL: 3, HIGH: 7, MEDIUM: 15, LOW: 30 };
  var d = new Date();
  d.setDate(d.getDate() + (days[priority] || 15));
  return d.toISOString().slice(0, 10);
}

function _statusToCls(status) {
  if (!status) return 'info';
  var s = status.toLowerCase();
  if (s === 'resolved' || s === 'closed')         return 'success';
  if (s === 'in progress' || s === 'inprogress')  return 'warning';
  if (s === 'pending' || s === 'submitted')        return 'navy';
  return 'info';
}

function generateComplaintId() { return _generateId(); }

function validateComplaintForm() {
  var required = document.querySelectorAll('#complaintForm [required]');
  var valid = true;
  required.forEach(function(field) {
    field.style.borderColor = '';
    if (!field.value.trim()) { field.style.borderColor = '#c0392b'; valid = false; }
  });
  if (window.GrievAI_Dept) {
    var descEl    = document.getElementById('fdesc');
    var hiddenEl  = document.getElementById('fDeptHidden');
    var text = descEl ? descEl.value.trim() : '';
    if (text.length >= 5) {
      var result = window.GrievAI_Dept.classify(text);
      window.GrievAI_Dept.updateDetectionUI(result);
      if (hiddenEl) hiddenEl.value = result.dept || '';
    }
    // Don't block if AI dept not detected — just auto-assign
  }
  if (!valid) showNotification('Please fill in all required fields.', 'error');
  return valid;
}

// ── Fetch complaint from localStorage (no backend) ──
function fetchComplaintLocal(id) {
  return new Promise(function(resolve) {
    // Try GrievData first
    if (window.GrievData && window.GrievData.fetchComplaint) {
      window.GrievData.fetchComplaint(id).then(resolve).catch(function() { resolve(null); });
      return;
    }
    // Fallback: raw localStorage
    try {
      var raw = localStorage.getItem('grievai_complaint_' + id.toUpperCase());
      if (!raw) raw = localStorage.getItem('grievai_complaint_' + id);
      if (raw) {
        var d = JSON.parse(raw);
        resolve({
          dept: d.department || d.dept || 'Unknown Department',
          officer: d.assigned_officer || 'Being Assigned',
          priority: d.priority || 'MEDIUM',
          status: d.status || 'Submitted',
          statusCls: _statusToCls(d.status),
          badgeClass: _statusToCls(d.status),
          date: d.filed_on || d.created_at,
          filedOn: d.filed_on || d.created_at,
          eta: d.eta || null,
          timeline: d.timeline || null,
          subject: d.subject || '',
          fromBackend: false
        });
      } else { resolve(null); }
    } catch(ex) { resolve(null); }
  });
}

// Keep old name as alias so any remaining calls don't break
function fetchComplaintFromBackend(id) { return fetchComplaintLocal(id); }

function getMockStatus(id) {
  var officers = ['Sh. Ramesh Kumar (IAS)', 'Dr. Priya Sharma', 'Sh. Anil Gupta', 'Ms. Kavita Singh'];
  var statuses = [
    { label: 'Under Review', cls: 'info' },
    { label: 'In Progress',  cls: 'warning' },
    { label: 'Resolved',     cls: 'success' },
    { label: 'Pending',      cls: 'navy' }
  ];
  var hash = (id || '').split('').reduce(function(a, c) { return a + c.charCodeAt(0); }, 0);
  var s = statuses[hash % statuses.length];
  var d = new Date();
  d.setDate(d.getDate() - (hash % 30));
  var eta = new Date(d.getTime());
  eta.setDate(eta.getDate() + 3);
  var fmt = function(dt) { try { return new Date(dt).toLocaleDateString('en-IN', { dateStyle: 'long' }); } catch(e) { return String(dt); } };
  return {
    status: s.label, badgeClass: s.cls, statusCls: s.cls,
    dept: 'Unknown (untracked ID)',
    officer: officers[hash % officers.length],
    date: fmt(d), priority: hash % 2 === 0 ? 'HIGH' : 'MEDIUM',
    eta: fmt(eta),
    timeline: [
      { icon: '✅', status: 'completed', title: 'Complaint Received',    date: fmt(d),                         desc: 'Registered in the system.' },
      { icon: '✅', status: 'completed', title: 'Verified & Assigned',   date: fmt(new Date(d.getTime() + 86400000)),   desc: 'Assigned to concerned officer.' },
      { icon: '🔵', status: 'active',   title: s.label,                 date: fmt(new Date(d.getTime() + 2*86400000)), desc: 'Officer is working on your complaint.' },
      { icon: '⭕', status: 'pending',  title: 'Resolution & Feedback',  date: fmt(eta),                       desc: 'Awaiting resolution.' }
    ]
  };
}

function showComplaintSuccess(id) {
  var result = document.getElementById('complaintResult');
  if (!result) return;
  var detectedDept    = document.getElementById('liveAIDept')     ? document.getElementById('liveAIDept').textContent     : '';
  var detectedIcon    = document.getElementById('liveAIIcon')     ? document.getElementById('liveAIIcon').textContent     : '🏛️';
  var detectedUrgency = document.getElementById('liveUrgencyLabel') ? document.getElementById('liveUrgencyLabel').textContent : 'MEDIUM';
  var hiddenDept      = document.getElementById('fDeptHidden')    ? document.getElementById('fDeptHidden').value          : '';
  var deptFinal    = hiddenDept || detectedDept || 'Auto-assigned';
  var priorityFinal = detectedUrgency || 'MEDIUM';
  var now   = new Date();
  var eta   = new Date(now.getTime() + 7 * 86400000);
  var fmt   = function(d) { return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
  var geoHtml = '';
  if (window.GrievCamera && window.GrievCamera.getLatitude && window.GrievCamera.getLatitude()) {
    geoHtml = '<div style="background:#f0fff4;border:1px solid #b7e4c7;border-radius:6px;padding:8px 12px;font-size:0.78rem;color:#1a7a3f;display:flex;align-items:center;gap:6px;">📍 <strong>Geo-verified location embedded</strong></div>';
  }
  result.innerHTML =
    '<div class="success-card">' +
      '<div class="success-card-header">' +
        '<div style="font-size:2rem;margin-bottom:6px;">✅</div>' +
        '<h3>Complaint Filed Successfully!</h3>' +
        '<p>Your grievance has been registered and routed by AI</p>' +
        '<div class="success-id-box">' + id + '</div>' +
      '</div>' +
      '<div class="success-card-body">' +
        '<div class="success-meta-grid">' +
          '<div class="success-meta-item" style="background:#f0f8ff;"><small>🤖 AI-Detected Department</small><strong>' + detectedIcon + ' ' + deptFinal + '</strong></div>' +
          '<div class="success-meta-item" style="background:#fff8f0;"><small>⚡ Priority Level</small><strong>' + priorityFinal + '</strong></div>' +
          '<div class="success-meta-item" style="background:#f0fff4;"><small>📅 Filed On</small><strong>' + fmt(now) + '</strong></div>' +
          '<div class="success-meta-item" style="background:#faf0ff;"><small>📋 Expected Resolution</small><strong>' + fmt(eta) + '</strong></div>' +
        '</div>' +
        geoHtml +
        '<div class="success-mini-timeline" style="margin-top:14px;">' +
          '<h5>📍 What Happens Next</h5>' +
          '<div style="font-size:0.8rem;color:#4a5568;line-height:1.8;">' +
            '<div>✅ Complaint registered in GrievAI system</div>' +
            '<div>🤖 AI classification complete — dept assigned</div>' +
            '<div>🏛️ Forwarded to ' + deptFinal + '</div>' +
            '<div>📧 You will receive updates at your registered contact</div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">' +
          '<a href="track.html" class="btn btn-navy btn-sm">🔍 Track Complaint</a>' +
          '<button onclick="copyToClipboard(\'' + id + '\')" class="btn btn-outline-navy btn-sm">📋 Copy ID</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Keep old window alias
window.showComplaintSuccess = showComplaintSuccess;

function showTrackResult(id, realData) {
  var result = document.getElementById('trackResult');
  if (!result) return;
  var d = realData || getMockStatus(id);
  _renderComplaintCard(result, id, d);
}

function renderStatusResult(id, realData) {
  var area = document.getElementById('statusResultArea');
  if (!area) return;
  area.style.display = 'block';
  var d = realData || getMockStatus(id);
  _renderStatusTable(area, id, d);
}

function _fmt(raw) {
  if (!raw) return '—';
  try { return new Date(raw).toLocaleDateString('en-IN', { dateStyle: 'long' }); } catch(e) { return raw; }
}

function _renderComplaintCard(container, id, d) {
  var dept     = d.dept || d.department || 'Unknown Department';
  var officer  = d.officer || d.assigned_officer || 'Being assigned';
  var priority = d.priority || 'Medium';
  var status   = d.status || 'Under Review';
  var badgeCls = d.statusCls || d.badgeClass || _statusToCls(status);
  var timeline = (d.timeline && d.timeline.length) ? d.timeline : getMockStatus(id).timeline;
  var isResolved = status.toLowerCase() === 'resolved' || status.toLowerCase() === 'closed';

  container.innerHTML =
    '<div class="card mt-6">' +
      '<div class="card-header">' +
        '<div><h3>Complaint: ' + id + '</h3>' +
          '<span style="font-size:0.78rem;color:var(--text-muted);">Filed on: ' + _fmt(d.date || d.filedOn || d.filed_on) + '</span></div>' +
        '<span class="badge badge-' + badgeCls + '">' + status + '</span>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="grid-2" style="margin-bottom:18px;">' +
          '<div><strong style="font-size:0.8rem;color:var(--text-muted);">Department</strong><p>' + dept + '</p></div>' +
          '<div><strong style="font-size:0.8rem;color:var(--text-muted);">Assigned Officer</strong><p>' + officer + '</p></div>' +
          '<div><strong style="font-size:0.8rem;color:var(--text-muted);">Priority</strong><p><span class="badge badge-warning">' + priority + '</span></p></div>' +
          '<div><strong style="font-size:0.8rem;color:var(--text-muted);">Expected Resolution</strong><p>' + _fmt(d.eta || d.expected_resolution) + '</p></div>' +
        '</div>' +
        '<div class="status-timeline">' +
          timeline.map(function(t) {
            return '<div class="timeline-item">' +
              '<div class="timeline-dot ' + (t.status || t.cls || 'pending') + '"><span>' + (t.icon || '—') + '</span></div>' +
              '<div class="timeline-content"><h4>' + (t.title || t.label || '') + '</h4>' +
              '<span class="timeline-meta">' + _fmt(t.date) + '</span>' +
              '<p>' + (t.desc || t.description || t.note || '') + '</p></div>' +
            '</div>';
          }).join('') +
        '</div>' +
        (isResolved ? buildFeedbackHTML(id) : '') +
      '</div>' +
      '<div class="card-footer" style="display:flex;gap:10px;flex-wrap:wrap;">' +
        '<a href="status.html" class="btn btn-navy btn-sm">View Full Status</a>' +
        '<button onclick="window.print()" class="btn btn-outline-navy btn-sm">Print</button>' +
      '</div>' +
    '</div>';
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (isResolved) { try { initFeedbackWidget(id); } catch(e) {} }
}

function _renderStatusTable(area, id, d) {
  var dept     = d.dept || d.department || 'Unknown Department';
  var officer  = d.officer || d.assigned_officer || 'Being assigned';
  var priority = d.priority || 'Medium';
  var status   = d.status || 'Under Review';
  var badgeCls = d.statusCls || d.badgeClass || _statusToCls(status);
  var timeline = (d.timeline && d.timeline.length) ? d.timeline : getMockStatus(id).timeline;
  var isResolved = status.toLowerCase() === 'resolved' || status.toLowerCase() === 'closed';

  area.innerHTML =
    '<div class="card">' +
      '<div class="card-header">' +
        '<div><h3>Status Report — ' + id + '</h3>' +
          '<span style="font-size:0.78rem;color:var(--text-muted);">Last Updated: ' + new Date().toLocaleDateString('en-IN', { dateStyle: 'long' }) + '</span></div>' +
        '<span class="badge badge-' + badgeCls + '">' + status + '</span>' +
      '</div>' +
      '<div class="card-body">' +
        '<table class="data-table" style="margin-bottom:22px;">' +
          '<tr><td style="width:180px;"><strong>Complaint ID</strong></td><td>' + id + '</td></tr>' +
          '<tr><td><strong>Department</strong></td><td>' + dept + '</td></tr>' +
          '<tr><td><strong>Filed On</strong></td><td>' + _fmt(d.date || d.filedOn || d.filed_on) + '</td></tr>' +
          '<tr><td><strong>Assigned To</strong></td><td>' + officer + '</td></tr>' +
          '<tr><td><strong>Priority Level</strong></td><td><span class="badge badge-warning">' + priority + '</span></td></tr>' +
          '<tr><td><strong>Expected Resolution</strong></td><td>' + _fmt(d.eta || d.expected_resolution) + '</td></tr>' +
          '<tr><td><strong>Current Status</strong></td><td><span class="badge badge-' + badgeCls + '">' + status + '</span></td></tr>' +
        '</table>' +
        '<h4 style="margin-bottom:16px;color:var(--navy);font-family:var(--font-serif);">Activity Timeline</h4>' +
        '<div class="status-timeline">' +
          timeline.map(function(t) {
            return '<div class="timeline-item">' +
              '<div class="timeline-dot ' + (t.status || t.cls || 'pending') + '"><span>' + (t.icon || '—') + '</span></div>' +
              '<div class="timeline-content"><h4>' + (t.title || t.label || '') + '</h4>' +
              '<span class="timeline-meta">' + _fmt(t.date) + '</span>' +
              '<p>' + (t.desc || t.description || t.note || '') + '</p></div>' +
            '</div>';
          }).join('') +
        '</div>' +
        (isResolved ? buildFeedbackHTML(id) : '') +
      '</div>' +
      '<div class="card-footer" style="display:flex;gap:10px;flex-wrap:wrap;">' +
        '<button onclick="window.print()" class="btn btn-navy btn-sm">Print Report</button>' +
        '<a href="index.html" class="btn btn-outline-navy btn-sm">Back to Home</a>' +
      '</div>' +
    '</div>';
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (isResolved) { try { initFeedbackWidget(id); } catch(e) {} }
}

function buildFeedbackHTML(id) {
  return '<div id="feedbackWidget_' + id + '" style="margin-top:20px;padding:16px;background:#f0fff4;border:1px solid #b7e4c7;border-radius:8px;">' +
    '<h4 style="color:#1a7a3f;margin-bottom:8px;">⭐ Rate this Resolution</h4>' +
    '<div class="star-rating" id="stars_' + id + '" style="font-size:1.5rem;margin-bottom:10px;">' +
      ['1','2','3','4','5'].map(function(n) {
        return '<span onclick="rateFeedback(\'' + id + '\',' + n + ')" style="cursor:pointer;padding:2px;">☆</span>';
      }).join('') +
    '</div>' +
    '<button onclick="submitFeedbackInline(\'' + id + '\')" class="btn btn-sm" style="background:#1a7a3f;color:#fff;border-color:#1a7a3f;">Submit Rating</button>' +
  '</div>';
}

var _feedbackRatings = {};
function rateFeedback(id, val) {
  _feedbackRatings[id] = val;
  var stars = document.querySelectorAll('#stars_' + id + ' span');
  stars.forEach(function(s, i) { s.textContent = i < val ? '⭐' : '☆'; });
}
window.rateFeedback = rateFeedback;

function submitFeedbackInline(id) {
  var rating = _feedbackRatings[id] || 0;
  if (!rating) { showNotification('Please select a rating first.', 'error'); return; }
  try { localStorage.setItem('cfb_' + id, JSON.stringify({ rating: rating, date: new Date().toISOString() })); } catch(e) {}
  var widget = document.getElementById('feedbackWidget_' + id);
  if (widget) widget.innerHTML = '<p style="color:#1a7a3f;font-weight:600;">✅ Thank you for your ' + rating + '/5 rating!</p>';
  showNotification('Feedback submitted! ⭐ ' + rating + '/5 — Thank you.', 'success');
}
window.submitFeedbackInline = submitFeedbackInline;

function initFeedbackWidget(id) { /* already injected via buildFeedbackHTML */ }

function generateCaptcha() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code  = '';
  for (var i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  var el = document.getElementById('captchaCode');
  if (el) el.textContent = code;
  window._captchaCode = code;
}

function initDashboard() {
  var role = sessionStorage.getItem('grievai_role') || 'officer';
  var user = sessionStorage.getItem('grievai_user') || 'User';
  var roleHeadings = { citizen: 'Citizen Dashboard', officer: 'Officer Panel', admin: 'Admin Panel' };
  var dashTitle = document.getElementById('dashTitle');
  if (dashTitle) dashTitle.textContent = roleHeadings[role] || 'Dashboard';
  var userNameEl = document.getElementById('dashUserName');
  if (userNameEl) userNameEl.textContent = user;
  var userRoleEl = document.getElementById('dashUserRole');
  if (userRoleEl) userRoleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  document.querySelectorAll('[data-role]').forEach(function(el) {
    var roles = el.dataset.role.split(',');
    el.style.display = roles.indexOf(role) !== -1 ? '' : 'none';
  });
  var dashDate = document.getElementById('dashDate');
  if (dashDate) {
    dashDate.innerHTML = new Date().toLocaleDateString('en-IN', { dateStyle: 'full' }) +
      ' <span class="kpi-live-badge">🟢 LIVE</span>';
  }
  // Update KPI counters from real data
  if (window.GrievData) {
    var stats = window.GrievData.getDashboardStats();
    _updateDashKPIs(stats);
  }
}

function _updateDashKPIs(stats) {
  var map = {
    'kpiTotal':      stats.total,
    'kpiResolved':   stats.resolved,
    'kpiPending':    stats.pending,
    'kpiProgress':   stats.inProgress,
    'kpiToday':      stats.today,
    'kpiAccuracy':   stats.accuracy
  };
  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = map[id] != null ? map[id].toLocaleString('en-IN') : '—';
  });
}

function showNotification(message, type) {
  type = type || 'info';
  var note = document.createElement('div');
  note.className = 'alert alert-' + type;
  note.style.cssText = 'position:fixed;top:100px;right:24px;z-index:99999;min-width:280px;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.18);animation:fadeIn 0.3s ease;';
  note.innerHTML = '<span>' + message + '</span>';
  document.body.appendChild(note);
  setTimeout(function() {
    note.style.transition = 'opacity 0.4s';
    note.style.opacity = '0';
    setTimeout(function() { if (note.parentNode) note.remove(); }, 400);
  }, 3500);
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() { showNotification('✅ Complaint ID copied!', 'success'); });
  } else {
    var el = document.createElement('textarea');
    el.value = text; document.body.appendChild(el); el.select();
    document.execCommand('copy'); el.remove();
    showNotification('Copied!', 'success');
  }
}
window.copyToClipboard = copyToClipboard;

function printStatus() { window.print(); }
window.printStatus = printStatus;

function animateCounters() {
  var counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var target = parseInt(el.dataset.count);
      var current = 0;
      var increment = Math.ceil(target / 60);
      var suffix = el.dataset.suffix || '';
      var timer = setInterval(function() {
        current += increment;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = current.toLocaleString('en-IN') + suffix;
      }, 20);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(function(el) { observer.observe(el); });
}

function logout() {
  sessionStorage.removeItem('grievai_role');
  sessionStorage.removeItem('grievai_user');
  sessionStorage.removeItem('grievai_token');
  localStorage.removeItem('grievai_token');
  window.location.href = 'index.html';
}
window.logout = logout;

// ── Camera Integration Functions ──────────────────────────────────────

function startComplaintCamera() {
  var wrap = document.getElementById('cameraVideoWrap');
  if (wrap) wrap.style.display = 'block';
  var captureBtn = document.getElementById('btnCapture');
  if (captureBtn) captureBtn.disabled = false;
  var retakeBtn = document.getElementById('btnRetake');
  if (retakeBtn) retakeBtn.style.display = 'none';
  var previewWrap = document.getElementById('previewWrap');
  if (previewWrap) previewWrap.classList.remove('visible');
  var previewImg = document.getElementById('capturedPreview');
  if (previewImg) previewImg.style.display = 'none';
  if (window.GrievCamera) window.GrievCamera.initCamera('cameraVideo', 'cameraStatus');
}
window.startComplaintCamera = startComplaintCamera;

function getComplaintLocation() {
  if (window.GrievCamera) window.GrievCamera.fetchLocation('locationStatus', 'cameraCoords');
}
window.getComplaintLocation = getComplaintLocation;

function captureComplaintPhoto() {
  if (!window.GrievCamera) return;
  window.GrievCamera.capturePhoto('cameraVideo', 'capturedPreview', 'cameraStatus', function(blob) {
    if (!blob) return;
    var previewWrap = document.getElementById('previewWrap');
    if (previewWrap) previewWrap.classList.add('visible');
    var previewImg = document.getElementById('capturedPreview');
    if (previewImg) previewImg.style.display = 'block';
    var wrap = document.getElementById('cameraVideoWrap');
    if (wrap) wrap.style.display = 'none';
    var captureBtn = document.getElementById('btnCapture');
    if (captureBtn) captureBtn.disabled = true;
    var retakeBtn = document.getElementById('btnRetake');
    if (retakeBtn) retakeBtn.style.display = 'flex';
    hideCameraValidationErrors();
  });
}
window.captureComplaintPhoto = captureComplaintPhoto;

function retakePhoto() {
  if (window.GrievCamera) { try { window.GrievCamera.stopCamera(); } catch(e) {} }
  var previewWrap = document.getElementById('previewWrap');
  if (previewWrap) previewWrap.classList.remove('visible');
  var previewImg = document.getElementById('capturedPreview');
  if (previewImg) { previewImg.style.display = 'none'; previewImg.src = ''; }
  var cameraStatus = document.getElementById('cameraStatus');
  if (cameraStatus) cameraStatus.style.display = 'none';
  hideCameraValidationErrors();
  startComplaintCamera();
}
window.retakePhoto = retakePhoto;

function showCameraValidationErrors(errors) {
  var errBox  = document.getElementById('cameraValidationError');
  var errList = document.getElementById('cameraValidationList');
  if (!errBox || !errList) return;
  errList.innerHTML = errors.map(function(e) { return '<li>' + e + '</li>'; }).join('');
  errBox.style.display = 'block';
  errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideCameraValidationErrors() {
  var errBox = document.getElementById('cameraValidationError');
  if (errBox) errBox.style.display = 'none';
}

function resetCameraUI() {
  var wrap = document.getElementById('cameraVideoWrap');
  if (wrap) wrap.style.display = 'none';
  var previewWrap = document.getElementById('previewWrap');
  if (previewWrap) previewWrap.classList.remove('visible');
  var previewImg = document.getElementById('capturedPreview');
  if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
  var captureBtn = document.getElementById('btnCapture');
  if (captureBtn) captureBtn.disabled = true;
  var retakeBtn = document.getElementById('btnRetake');
  if (retakeBtn) retakeBtn.style.display = 'none';
  ['cameraStatus','locationStatus','cameraCoords','cameraValidationError'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

// ── demoLogin (one-click from login page) ─────────────────────────────
function demoLogin(role, id, password) {
  sessionStorage.setItem('grievai_role', role);
  var names = { citizen: 'Ramesh Kumar', officer: 'Officer Priya Sharma', admin: 'Administrator' };
  sessionStorage.setItem('grievai_user', names[role] || role);
  sessionStorage.setItem('grievai_token', 'demo_' + role + '_' + Date.now());
  showNotification('✅ Logged in as ' + (names[role] || role) + '! Redirecting…', 'success');
  setTimeout(function() {
    window.location.href = (role === 'citizen') ? 'index.html' : 'dashboard.html';
  }, 700);
}
window.demoLogin = demoLogin;

// ── Language-aware dashboard title ────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.split('/').pop() === 'dashboard.html') {
    var role = sessionStorage.getItem('grievai_role') || 'officer';
    var keyMap = { citizen: 'dash.citizen', officer: 'dash.officer', admin: 'dash.admin' };
    var dashTitle = document.getElementById('dashTitle');
    if (dashTitle && window.GrievLang) {
      var origSetLang = window.GrievLang.setLang;
      if (typeof origSetLang === 'function') {
        window.GrievLang.setLang = function(code) {
          origSetLang.call(window.GrievLang, code);
          if (dashTitle) dashTitle.innerHTML = window.GrievLang.t ? window.GrievLang.t(keyMap[role] || 'dash.officer') : dashTitle.innerHTML;
        };
      }
    }
  }
});
