// ====================================================
// GrievAI – Main JS (main.js)
// Government Grievance Portal
// ====================================================

document.addEventListener('DOMContentLoaded', function () {

  // ── Navigation Active State ──────────────────────
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ── Hamburger Menu handled in components.js ──────
  // (Removed from here to prevent double-binding)

  // ── AI Auto Department Detection ──────────────────
  var descField    = document.getElementById('fdesc');
  var subjectField = document.getElementById('fsubject');
  function runAIDeptDetection() {
    if (!window.GrievAI_Dept) return;
    var text = ((subjectField ? subjectField.value : '') + ' ' + (descField ? descField.value : '')).trim();
    if (text.length < 5) {
      window.GrievAI_Dept.clearDetectionUI();
      return;
    }
    var result = window.GrievAI_Dept.classify(text);
    window.GrievAI_Dept.updateDetectionUI(result);
  }

  if (descField) {
    descField.addEventListener('input', runAIDeptDetection);
    descField.addEventListener('blur', runAIDeptDetection);
  }
  if (subjectField) {
    subjectField.addEventListener('input', runAIDeptDetection);
  }

  // ── FAQ Accordion ────────────────────────────────
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', function () {
      const answer = this.nextElementSibling;
      const isOpen = this.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-question.open').forEach(q => {
        q.classList.remove('open');
        q.nextElementSibling.classList.remove('open');
      });
      // Toggle current
      if (!isOpen) {
        this.classList.add('open');
        answer.classList.add('open');
      }
    });
  });

  // ── Complaint Form Submission ─────────────────────
  const complaintForm = document.getElementById('complaintForm');
  if (complaintForm) {
    complaintForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateComplaintForm()) return;

      // ── Camera validation (if camera section exists) ──
      var cameraSection = document.querySelector('.camera-section');
      if (cameraSection && window.GrievCamera) {
        var camErrors = window.GrievCamera.validate();
        if (camErrors.length > 0) {
          showCameraValidationErrors(camErrors);
          return;
        }
      }

      const submitBtn = complaintForm.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Filing Complaint…';

      // ── Build FormData (multipart for backend) ──
      var formData = new FormData(complaintForm);

      // Add camera data if available
      if (window.GrievCamera && window.GrievCamera.hasPhoto()) {
        window.GrievCamera.appendToFormData(formData);
      }

      // Add language
      var lang = localStorage.getItem('grievai_lang') || 'en';
      formData.append('language', lang);

      // ── Try backend API, fallback to demo mode ──
      var API_BASE = window.GRIEVAI_API || 'http://localhost:8000/api/v1';

      fetch(API_BASE + '/complaints', {
        method: 'POST',
        body: formData
        // No Content-Type header — browser sets multipart boundary automatically
      })
      .then(function(res) {
        if (!res.ok) throw new Error('API error ' + res.status);
        return res.json();
      })
      .then(function(data) {
        var complaintId = data.complaint_id || data.id || generateComplaintId();
        showComplaintSuccess(complaintId, data);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Complaint';
        complaintForm.reset();
        if (window.GrievCamera) window.GrievCamera.reset();
        resetCameraUI();
      })
      .catch(function(err) {
        // ── Demo/offline mode ──
        console.warn('[GrievAI] Backend unavailable, demo mode:', err.message);
        setTimeout(function() {
          var complaintId = generateComplaintId();
          showComplaintSuccess(complaintId, null);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Complaint';
          complaintForm.reset();
          if (window.GrievCamera) window.GrievCamera.reset();
          resetCameraUI();
        }, 1200);
      });
    });
  }

  // ── Track Complaint Form ──────────────────────────
  const trackForms = document.querySelectorAll('.track-form');
  trackForms.forEach(form => {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const input = form.querySelector('input[name="complaintId"]') || form.querySelector('.track-id-input');
      if (!input || !input.value.trim()) {
        showNotification('Please enter a Complaint ID', 'error');
        return;
      }
      const id = input.value.trim().toUpperCase();
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Searching…';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Track Complaint';
        showTrackResult(id);
      }, 1000);
    });
  });

  // ── Contact Form ──────────────────────────────────
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const btn = contactForm.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Sending…';
      setTimeout(() => {
        showNotification('Your message has been sent. We will respond within 2 working days.', 'success');
        contactForm.reset();
        btn.disabled = false;
        btn.textContent = 'Send Message';
      }, 1200);
    });
  }

  // ── Status Page – Auto Track ──────────────────────
  const statusForm = document.getElementById('statusForm');
  if (statusForm) {
    statusForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const idInput = statusForm.querySelector('#statusId');
      if (!idInput || !idInput.value.trim()) {
        showNotification('Please enter a valid Complaint ID', 'error');
        return;
      }
      const id = idInput.value.trim().toUpperCase();
      const btn = statusForm.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Fetching…';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Check Status';
        renderStatusResult(id);
      }, 1000);
    });
  }

  // ── Captcha Refresh ───────────────────────────────
  const captchaRefresh = document.getElementById('captchaRefresh');
  if (captchaRefresh) {
    captchaRefresh.addEventListener('click', generateCaptcha);
    generateCaptcha();
  }

  // ── Login Tab Switching ───────────────────────────
  document.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.login-form-panel').forEach(p => p.style.display = 'none');
      this.classList.add('active');
      const target = document.getElementById('panel-' + this.dataset.role);
      if (target) target.style.display = 'block';
    });
  });

  // ── Login Form Submissions ────────────────────────
  document.querySelectorAll('.login-form-panel form').forEach(form => {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const role = form.dataset.role;
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Authenticating…';
      setTimeout(() => {
        sessionStorage.setItem('grievai_role', role);
        sessionStorage.setItem('grievai_user', getDemoUser(role));
        window.location.href = 'dashboard.html';
      }, 1200);
    });
  });

  // ── Dashboard Init ────────────────────────────────
  if (currentPage === 'dashboard.html') {
    initDashboard();
  }

  // ── Notification Auto Dismiss ─────────────────────
  document.querySelectorAll('.alert').forEach(alert => {
    if (alert.dataset.autoDismiss) {
      setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 400);
      }, parseInt(alert.dataset.autoDismiss));
    }
  });

  // ── Smooth Scroll ─────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Ticker ────────────────────────────────────────
  // Already handled via <marquee> in HTML

  // ── Stat Counters (Home) ──────────────────────────
  animateCounters();

});

// ── Helpers ──────────────────────────────────────────

function generateComplaintId() {
  const prefix = 'GRIEVA';
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}/${year}/${random}`;
}

function validateComplaintForm() {
  const required = document.querySelectorAll('#complaintForm [required]');
  let valid = true;
  required.forEach(field => {
    field.style.borderColor = '';
    if (!field.value.trim()) {
      field.style.borderColor = '#c0392b';
      valid = false;
    }
  });

  // AI Department: run detection if not done; block if still empty
  if (window.GrievAI_Dept) {
    var descEl    = document.getElementById('fdesc');
    var hiddenDept = document.getElementById('fDeptHidden');
    var text = (descEl ? descEl.value : '').trim();
    if (text.length >= 5) {
      var result = window.GrievAI_Dept.classify(text);
      window.GrievAI_Dept.updateDetectionUI(result);
      if (hiddenDept) hiddenDept.value = result.dept;
    }
    if (hiddenDept && !hiddenDept.value.trim()) {
      showNotification('Please describe your complaint so AI can detect the department.', 'error');
      valid = false;
    }
  }

  if (!valid) {
    showNotification('Please fill in all required fields.', 'error');
  }
  return valid;
}

function showComplaintSuccess(id) {
  const result = document.getElementById('complaintResult');
  if (result) {
    result.innerHTML = `
      <div class="alert alert-success" style="flex-direction:column;gap:6px;">
        <strong>✅ Complaint Filed Successfully!</strong>
        <span>Your Complaint ID: <strong style="font-size:1.05rem;letter-spacing:1px;">${id}</strong></span>
        <span style="font-size:0.82rem;">Please save this ID to track your complaint. You will receive updates via SMS/Email.</span>
        <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">
          <a href="track.html" class="btn btn-navy btn-sm">Track Complaint</a>
          <button onclick="copyToClipboard('${id}')" class="btn btn-outline-navy btn-sm">Copy ID</button>
        </div>
      </div>`;
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function showTrackResult(id) {
  const result = document.getElementById('trackResult');
  if (!result) return;
  const mock = getMockStatus(id);
  result.innerHTML = `
    <div class="card mt-6">
      <div class="card-header">
        <div>
          <h3>Complaint: ${id}</h3>
          <span style="font-size:0.78rem;color:var(--text-muted);">Filed on: ${mock.date}</span>
        </div>
        <span class="badge badge-${mock.badgeClass}">${mock.status}</span>
      </div>
      <div class="card-body">
        <div class="grid-2" style="margin-bottom:18px;">
          <div><strong style="font-size:0.8rem;color:var(--text-muted);">Department</strong><p>${mock.dept}</p></div>
          <div><strong style="font-size:0.8rem;color:var(--text-muted);">Assigned Officer</strong><p>${mock.officer}</p></div>
          <div><strong style="font-size:0.8rem;color:var(--text-muted);">Priority</strong><p><span class="badge badge-warning">${mock.priority}</span></p></div>
          <div><strong style="font-size:0.8rem;color:var(--text-muted);">Expected Resolution</strong><p>${mock.eta}</p></div>
        </div>
        <div class="status-timeline">
          ${mock.timeline.map(t => `
            <div class="timeline-item">
              <div class="timeline-dot ${t.status}">
                <span>${t.icon}</span>
              </div>
              <div class="timeline-content">
                <h4>${t.title}</h4>
                <span class="timeline-meta">${t.date}</span>
                <p>${t.desc}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card-footer" style="display:flex;gap:10px;flex-wrap:wrap;">
        <a href="status.html" class="btn btn-navy btn-sm">View Full Status</a>
        <button onclick="printStatus()" class="btn btn-outline-navy btn-sm">🖨 Print</button>
      </div>
    </div>`;
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderStatusResult(id) {
  const area = document.getElementById('statusResultArea');
  if (!area) return;
  const mock = getMockStatus(id);
  area.style.display = 'block';
  area.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3>Status Report – ${id}</h3>
          <span style="font-size:0.78rem;color:var(--text-muted);">Last Updated: ${new Date().toLocaleDateString('en-IN', {dateStyle:'long'})}</span>
        </div>
        <span class="badge badge-${mock.badgeClass}">${mock.status}</span>
      </div>
      <div class="card-body">
        <table class="data-table" style="margin-bottom:22px;">
          <tr><td style="width:180px;"><strong>Complaint ID</strong></td><td>${id}</td></tr>
          <tr><td><strong>Department</strong></td><td>${mock.dept}</td></tr>
          <tr><td><strong>Filed On</strong></td><td>${mock.date}</td></tr>
          <tr><td><strong>Assigned To</strong></td><td>${mock.officer}</td></tr>
          <tr><td><strong>Priority Level</strong></td><td><span class="badge badge-warning">${mock.priority}</span></td></tr>
          <tr><td><strong>Expected Resolution</strong></td><td>${mock.eta}</td></tr>
          <tr><td><strong>Current Status</strong></td><td><span class="badge badge-${mock.badgeClass}">${mock.status}</span></td></tr>
        </table>
        <h4 style="margin-bottom:16px;color:var(--navy);font-family:var(--font-serif);">Activity Timeline</h4>
        <div class="status-timeline">
          ${mock.timeline.map(t => `
            <div class="timeline-item">
              <div class="timeline-dot ${t.status}"><span>${t.icon}</span></div>
              <div class="timeline-content">
                <h4>${t.title}</h4>
                <span class="timeline-meta">${t.date}</span>
                <p>${t.desc}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card-footer" style="display:flex;gap:10px;flex-wrap:wrap;">
        <button onclick="window.print()" class="btn btn-navy btn-sm">🖨 Print Report</button>
        <a href="index.html" class="btn btn-outline-navy btn-sm">← Back to Home</a>
      </div>
    </div>`;
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getMockStatus(id) {
  const depts = ['Ministry of Health', 'Dept. of Education', 'Municipal Corporation', 'Transport Authority', 'Police Department'];
  const officers = ['Sh. Ramesh Kumar (IAS)', 'Dr. Priya Sharma', 'Sh. Anil Gupta', 'Ms. Kavita Singh'];
  const statuses = [
    { label: 'Under Review', cls: 'info' },
    { label: 'In Progress', cls: 'warning' },
    { label: 'Resolved', cls: 'success' },
    { label: 'Pending', cls: 'navy' }
  ];
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const s = statuses[hash % statuses.length];
  const d = new Date();
  d.setDate(d.getDate() - (hash % 30));
  const etaDate = new Date();
  etaDate.setDate(etaDate.getDate() + 7);

  return {
    status: s.label,
    badgeClass: s.cls,
    dept: depts[hash % depts.length],
    officer: officers[hash % officers.length],
    date: d.toLocaleDateString('en-IN', { dateStyle: 'long' }),
    priority: hash % 2 === 0 ? 'High' : 'Medium',
    eta: etaDate.toLocaleDateString('en-IN', { dateStyle: 'long' }),
    timeline: [
      { icon: '✅', status: 'completed', title: 'Complaint Received', date: d.toLocaleDateString('en-IN'), desc: 'Your complaint has been registered in the system.' },
      { icon: '✅', status: 'completed', title: 'Verified & Assigned', date: new Date(d.getTime() + 86400000).toLocaleDateString('en-IN'), desc: 'Complaint verified and assigned to the concerned officer.' },
      { icon: '🔵', status: 'active', title: s.label, date: new Date(d.getTime() + 2 * 86400000).toLocaleDateString('en-IN'), desc: 'The assigned officer is working on your complaint.' },
      { icon: '⭕', status: 'pending', title: 'Resolution & Feedback', date: etaDate.toLocaleDateString('en-IN'), desc: 'Awaiting resolution. You will be notified upon closure.' }
    ]
  };
}

function generateCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const el = document.getElementById('captchaCode');
  if (el) el.textContent = code;
  window._captchaCode = code;
}

function getDemoUser(role) {
  const users = { citizen: 'Ramesh Kumar', officer: 'Officer Priya Sharma', admin: 'Administrator' };
  return users[role] || 'User';
}

function initDashboard() {
  const role = sessionStorage.getItem('grievai_role') || 'citizen';
  const user = sessionStorage.getItem('grievai_user') || 'Citizen';

  // Set role heading
  const roleHeadings = {
    citizen: 'Citizen Dashboard',
    officer: 'Officer Panel',
    admin: 'Admin Panel'
  };
  const dashTitle = document.getElementById('dashTitle');
  if (dashTitle) dashTitle.textContent = roleHeadings[role] || 'Dashboard';

  const userNameEl = document.getElementById('dashUserName');
  if (userNameEl) userNameEl.textContent = user;

  const userRoleEl = document.getElementById('dashUserRole');
  if (userRoleEl) userRoleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);

  // Role-specific sections
  document.querySelectorAll('[data-role]').forEach(el => {
    const roles = el.dataset.role.split(',');
    el.style.display = roles.includes(role) ? '' : 'none';
  });
}

function showNotification(message, type = 'info') {
  const note = document.createElement('div');
  note.className = `alert alert-${type}`;
  note.style.cssText = 'position:fixed;top:100px;right:24px;z-index:99999;min-width:280px;max-width:380px;box-shadow:0 4px 20px rgba(0,0,0,0.18);';
  note.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(note);
  setTimeout(() => {
    note.style.transition = 'opacity 0.4s';
    note.style.opacity = '0';
    setTimeout(() => note.remove(), 400);
  }, 3500);
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showNotification('Complaint ID copied to clipboard!', 'success'));
  } else {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();
    showNotification('Copied!', 'success');
  }
}

function printStatus() { window.print(); }

function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        let current = 0;
        const increment = Math.ceil(target / 60);
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.textContent = current.toLocaleString('en-IN') + (el.dataset.suffix || '');
        }, 20);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

// Logout
function logout() {
  sessionStorage.clear();
  window.location.href = 'login.html';
}

// ── Language-aware dashboard update ──────────────────
document.addEventListener('DOMContentLoaded', function() {
  var role = sessionStorage.getItem('grievai_role') || 'citizen';
  if (window.location.pathname.split('/').pop() === 'dashboard.html') {
    var keyMap = { citizen:'dash.citizen', officer:'dash.officer', admin:'dash.admin' };
    var dashTitle = document.getElementById('dashTitle');
    if (dashTitle && window.GrievLang) {
      // Update whenever language changes
      var origSetLang = window.GrievLang.setLang;
      window.GrievLang.setLang = function(code) {
        origSetLang(code);
        if (dashTitle) dashTitle.innerHTML = window.GrievLang.t(keyMap[role] || 'dash.citizen');
      };
    }
  }
});

// ── Fix: Remove duplicate hamburger binding from main.js ──
// Hamburger is now handled exclusively in components.js
// This stub prevents double-binding errors
(function() {
  var _hamburger = null; // intentional no-op
})();

// ====================================================
// GrievAI – Camera + Geo Integration Functions
// Called from index.html inline onclick handlers
// ====================================================

// ── Start camera ─────────────────────────────────
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

  if (window.GrievCamera) {
    window.GrievCamera.initCamera('cameraVideo', 'cameraStatus');
  }
}

// ── Get GPS location ──────────────────────────────
function getComplaintLocation() {
  if (window.GrievCamera) {
    window.GrievCamera.fetchLocation('locationStatus', 'cameraCoords');
  }
}

// ── Capture photo ─────────────────────────────────
function captureComplaintPhoto() {
  if (!window.GrievCamera) return;

  window.GrievCamera.capturePhoto(
    'cameraVideo',
    'capturedPreview',
    'cameraStatus',
    function(blob) {
      if (!blob) return;

      // Show preview section
      var previewWrap = document.getElementById('previewWrap');
      if (previewWrap) previewWrap.classList.add('visible');

      var previewImg = document.getElementById('capturedPreview');
      if (previewImg) previewImg.style.display = 'block';

      // Hide video, show retake
      var wrap = document.getElementById('cameraVideoWrap');
      if (wrap) wrap.style.display = 'none';

      var captureBtn = document.getElementById('btnCapture');
      if (captureBtn) captureBtn.disabled = true;

      var retakeBtn = document.getElementById('btnRetake');
      if (retakeBtn) retakeBtn.style.display = 'flex';

      // Clear validation errors
      hideCameraValidationErrors();
    }
  );
}

// ── Retake photo ──────────────────────────────────
function retakePhoto() {
  if (window.GrievCamera) {
    window.GrievCamera.stopCamera();
  }

  // Reset UI
  var previewWrap = document.getElementById('previewWrap');
  if (previewWrap) previewWrap.classList.remove('visible');

  var previewImg = document.getElementById('capturedPreview');
  if (previewImg) {
    previewImg.style.display = 'none';
    previewImg.src = '';
  }

  var cameraStatus = document.getElementById('cameraStatus');
  if (cameraStatus) cameraStatus.style.display = 'none';

  hideCameraValidationErrors();

  // Restart
  startComplaintCamera();
}

// ── Show validation errors ────────────────────────
function showCameraValidationErrors(errors) {
  var errBox  = document.getElementById('cameraValidationError');
  var errList = document.getElementById('cameraValidationList');
  if (!errBox || !errList) return;

  errList.innerHTML = errors.map(function(e) {
    return '<li>' + e + '</li>';
  }).join('');

  errBox.style.display = 'block';
  errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Hide validation errors ────────────────────────
function hideCameraValidationErrors() {
  var errBox = document.getElementById('cameraValidationError');
  if (errBox) errBox.style.display = 'none';
}

// ── Override complaint form submit with camera validation ──
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('complaintForm');
  if (!form) return;

  // Store original submit handler reference
  var originalSubmit = form.onsubmit;

  form.addEventListener('submit', function(e) {
    // Only validate camera if camera section is present on this page
    var cameraSection = document.querySelector('.camera-section');
    if (!cameraSection) return; // no camera on this page — skip

    // Validate camera & location
    if (window.GrievCamera) {
      var errors = window.GrievCamera.validate();
      if (errors.length > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showCameraValidationErrors(errors);
        return false;
      }
    }
  }, true); // capture phase — runs before other handlers
});

// ── Reset camera UI after submit ──────────────────
function resetCameraUI() {
  // Hide video wrap
  var wrap = document.getElementById('cameraVideoWrap');
  if (wrap) wrap.style.display = 'none';

  // Hide preview
  var previewWrap = document.getElementById('previewWrap');
  if (previewWrap) previewWrap.classList.remove('visible');

  var previewImg = document.getElementById('capturedPreview');
  if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }

  // Reset buttons
  var captureBtn = document.getElementById('btnCapture');
  if (captureBtn) captureBtn.disabled = true;

  var retakeBtn = document.getElementById('btnRetake');
  if (retakeBtn) retakeBtn.style.display = 'none';

  // Hide statuses
  ['cameraStatus','locationStatus','cameraCoords','cameraValidationError'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

// ── Override showComplaintSuccess to show AI classification ──
var _origShowComplaintSuccess = window.showComplaintSuccess;
window.showComplaintSuccess = function(id, apiData) {
  var result = document.getElementById('complaintResult');
  if (!result) return;

  // Build extra info from API response if available
  var extraInfo = '';
  if (apiData) {
    extraInfo = '\
      <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">\
        <div style="background:#f0f8ff;border:1px solid #bee3f8;border-radius:4px;padding:8px;">\
          <small style="color:#718096;font-size:0.72rem;display:block;">🤖 AI Category</small>\
          <strong style="color:#003366;">' + (apiData.category || 'Classified') + '</strong>\
        </div>\
        <div style="background:#f0fff4;border:1px solid #b7e4c7;border-radius:4px;padding:8px;">\
          <small style="color:#718096;font-size:0.72rem;display:block;">⚡ Priority</small>\
          <strong style="color:#1a7a3f;">' + (apiData.priority || 'Medium') + '</strong>\
        </div>\
        <div style="background:#fff5f0;border:1px solid #ffd0a0;border-radius:4px;padding:8px;">\
          <small style="color:#718096;font-size:0.72rem;display:block;">🏛️ Department</small>\
          <strong style="color:#cc4400;">' + (apiData.department || 'Auto-assigned') + '</strong>\
        </div>\
        <div style="background:#f8f0ff;border:1px solid #d6b4f0;border-radius:4px;padding:8px;">\
          <small style="color:#718096;font-size:0.72rem;display:block;">📊 Status</small>\
          <strong style="color:#6b21a8;">' + (apiData.status || 'Pending') + '</strong>\
        </div>\
      </div>';
    if (apiData.latitude || apiData.longitude) {
      extraInfo += '<div style="margin-top:8px;background:#f0f8f0;border:1px solid #b7e4c7;border-radius:4px;padding:8px;font-size:0.8rem;color:#1a7a3f;">\
        📍 Geo-verified: Lat ' + (apiData.latitude || window.GrievCamera && window.GrievCamera.getLatitude()) +
        ' | Lng ' + (apiData.longitude || window.GrievCamera && window.GrievCamera.getLongitude()) + '</div>';
    }
  }

  result.innerHTML = '\
    <div class="alert alert-success" style="flex-direction:column;gap:8px;">\
      <strong>✅ Complaint Filed Successfully!</strong>\
      <span>Your Complaint ID: <strong style="font-size:1.05rem;letter-spacing:1px;">' + id + '</strong></span>\
      <span style="font-size:0.82rem;">Save this ID to track your complaint. SMS/Email updates will be sent.</span>\
      ' + extraInfo + '\
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">\
        <a href="track.html" class="btn btn-navy btn-sm">Track Complaint</a>\
        <button onclick="copyToClipboard(\'' + id + '\')" class="btn btn-outline-navy btn-sm">Copy ID</button>\
      </div>\
    </div>';
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};
