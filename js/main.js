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
  const isResolved = mock.status === 'Resolved';
  const feedbackHtml = isResolved ? buildFeedbackHTML(id) : '';
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
        ${feedbackHtml}
      </div>
      <div class="card-footer" style="display:flex;gap:10px;flex-wrap:wrap;">
        <a href="status.html" class="btn btn-navy btn-sm">View Full Status</a>
        <button onclick="printStatus()" class="btn btn-outline-navy btn-sm">🖨 Print</button>
      </div>
    </div>`;
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (isResolved) initFeedbackWidget(id);
}

function renderStatusResult(id) {
  const area = document.getElementById('statusResultArea');
  if (!area) return;
  const mock = getMockStatus(id);
  const isResolved = mock.badgeClass === 'success';
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
        ${isResolved ? buildFeedbackHTML(id) : ''}
      </div>
      <div class="card-footer" style="display:flex;gap:10px;flex-wrap:wrap;">
        <button onclick="window.print()" class="btn btn-navy btn-sm">🖨 Print Report</button>
        <a href="index.html" class="btn btn-outline-navy btn-sm">← Back to Home</a>
      </div>
    </div>`;
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (isResolved) initFeedbackWidget(id);
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
  // Force demo IDs to always show Resolved so feedback widget is visible during demo
  const RESOLVED_DEMOS = ['GRIEVA/2024/783421', 'GRIEVA/2026/465268'];
  const s = RESOLVED_DEMOS.includes(id.toUpperCase()) ? { label: 'Resolved', cls: 'success' } : statuses[hash % statuses.length];
  const d = new Date();
  d.setDate(d.getDate() - (hash % 30));
  const etaDate = new Date();
  etaDate.setDate(etaDate.getDate() + 3);

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

  // FIX 4: Live dashboard — add LIVE badge and simulate real-time ticking
  const dashDate = document.getElementById('dashDate');
  if (dashDate) {
    dashDate.innerHTML = new Date().toLocaleDateString('en-IN',{dateStyle:'full'}) +
      ' <span class="kpi-live-badge">🟢 LIVE</span>';
  }

  // Simulate live complaint counter ticking every 8-12 seconds
  const bigCounters = document.querySelectorAll('.kpi-card .kpi-value[data-count]');
  bigCounters.forEach(function(el) {
    var base = parseInt(el.dataset.count) || 0;
    if (base < 100) return; // only animate big numbers
    var suffix = el.dataset.suffix || '';
    setInterval(function() {
      var bump = Math.floor(Math.random() * 3) + 1;
      base += bump;
      el.textContent = base.toLocaleString('en-IN') + suffix;
      el.style.transition = 'color 0.3s';
      el.style.color = '#2ea855';
      setTimeout(function() { el.style.color = ''; }, 600);
    }, Math.floor(Math.random() * 8000) + 7000);
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

// ── FIX 3: Rich success card with ID, AI summary, timeline ──
window.showComplaintSuccess = function(id, apiData) {
  var result = document.getElementById('complaintResult');
  if (!result) return;

  // Pull AI detection data from live panel
  var detectedDept   = document.getElementById('liveAIDept')   ? document.getElementById('liveAIDept').textContent   : 'Auto-assigned';
  var detectedIcon   = document.getElementById('liveAIIcon')   ? document.getElementById('liveAIIcon').textContent   : '🏛️';
  var detectedUrgency = document.getElementById('liveUrgencyLabel') ? document.getElementById('liveUrgencyLabel').textContent : 'MEDIUM';
  var hiddenDept     = document.getElementById('fDeptHidden')  ? document.getElementById('fDeptHidden').value        : '';
  var deptFinal      = (apiData && apiData.department) || hiddenDept || detectedDept;
  var priorityFinal  = (apiData && apiData.priority)   || detectedUrgency;
  var now            = new Date();
  var eta            = new Date(now.getTime() + 3 * 86400000);
  var fmtDate        = function(d) { return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }); };

  // Geo info
  var geoHtml = '';
  if (window.GrievCamera && window.GrievCamera.getLatitude && window.GrievCamera.getLatitude()) {
    geoHtml = '<div style="background:#f0fff4;border:1px solid #b7e4c7;border-radius:6px;padding:8px 12px;font-size:0.78rem;color:#1a7a3f;display:flex;align-items:center;gap:6px;">' +
      '📍 <strong>Geo-verified location embedded</strong> — Coordinates attached to complaint record.</div>';
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
          '<div class="success-meta-item" style="background:#f0f8ff;">' +
            '<small>🤖 AI-Detected Department</small>' +
            '<strong>' + detectedIcon + ' ' + deptFinal + '</strong>' +
          '</div>' +
          '<div class="success-meta-item" style="background:#fff8f0;">' +
            '<small>⚡ Priority Level</small>' +
            '<strong>' + priorityFinal + '</strong>' +
          '</div>' +
          '<div class="success-meta-item" style="background:#f0fff4;">' +
            '<small>📅 Filed On</small>' +
            '<strong>' + fmtDate(now) + '</strong>' +
          '</div>' +
          '<div class="success-meta-item" style="background:#faf0ff;">' +
            '<small>📋 Expected Resolution</small>' +
            '<strong>' + fmtDate(eta) + '</strong>' +
          '</div>' +
        '</div>' +
        geoHtml +
        '<div class="success-mini-timeline" style="margin-top:14px;">' +
          '<h5>📍 Processing Timeline</h5>' +
          '<div class="smt-item">' +
            '<div class="smt-dot done">✅</div>' +
            '<div class="smt-text"><h6>Complaint Registered</h6><p>Assigned ID: ' + id + ' — ' + fmtDate(now) + '</p></div>' +
          '</div>' +
          '<div class="smt-item">' +
            '<div class="smt-dot done">🤖</div>' +
            '<div class="smt-text"><h6>AI Classification Complete</h6><p>Routed to ' + deptFinal + '</p></div>' +
          '</div>' +
          '<div class="smt-item">' +
            '<div class="smt-dot active">🔵</div>' +
            '<div class="smt-text"><h6>Under Officer Review</h6><p>A nodal officer has been assigned</p></div>' +
          '</div>' +
          '<div class="smt-item">' +
            '<div class="smt-dot wait">⭕</div>' +
            '<div class="smt-text"><h6>Resolution &amp; Feedback</h6><p>Expected by ' + fmtDate(eta) + '</p></div>' +
          '</div>' +
        '</div>' +
        '<p style="font-size:0.75rem;color:#718096;margin:10px 0 14px;">📱 You will receive SMS &amp; Email updates at every stage. Save your Complaint ID.</p>' +
        '<div class="success-card-actions">' +
          '<a href="track.html" class="btn btn-navy btn-sm">🔍 Track Complaint</a>' +
          '<button onclick="copyToClipboard(\'' + id + '\')" class="btn btn-outline-navy btn-sm">📋 Copy ID</button>' +
          '<button onclick="window.print()" class="btn btn-outline-navy btn-sm">🖨 Print Receipt</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// ====================================================
// FIX 1 — FEEDBACK WIDGET BUILDER
// Shows 5-star rating + comment for Resolved complaints
// buildFeedbackHTML = alias used in track.html + status.html
// initFeedbackWidget = no-op (widget rendered inline via innerHTML)
// ====================================================
function buildFeedbackHTML(complaintId) {
  return buildFeedbackWidget(complaintId);
}
function initFeedbackWidget(complaintId) {
  // Widget already embedded in innerHTML — no extra init needed
}
function buildFeedbackWidget(complaintId) {
  var stored = sessionStorage.getItem('feedback_' + complaintId);
  if (stored) {
    return '<div class="feedback-widget"><div class="feedback-widget-header">⭐ Your Feedback</div>' +
           '<div class="feedback-success">✅ Thank you! Your feedback has been submitted.<br><small style="color:#4a5568;font-weight:400;">Rating: ' + stored + ' — This helps improve governance.</small></div></div>';
  }
  return '<div class="feedback-widget" id="fw_' + complaintId + '">' +
    '<div class="feedback-widget-header">' +
      '<span>⭐</span>' +
      '<span>Rate Your Experience — Complaint ' + complaintId + '</span>' +
    '</div>' +
    '<div class="feedback-widget-body">' +
      '<p style="font-size:0.8rem;color:#4a5568;margin-bottom:10px;">Your complaint has been <strong style="color:#1a7a3f;">Resolved</strong>. Please rate the resolution quality to help improve governance.</p>' +
      '<div class="star-row">' +
        '<button class="star-btn" onclick="setRating(\'' + complaintId + '\',1)" id="star_' + complaintId + '_1" title="Very Poor">★</button>' +
        '<button class="star-btn" onclick="setRating(\'' + complaintId + '\',2)" id="star_' + complaintId + '_2" title="Poor">★</button>' +
        '<button class="star-btn" onclick="setRating(\'' + complaintId + '\',3)" id="star_' + complaintId + '_3" title="Average">★</button>' +
        '<button class="star-btn" onclick="setRating(\'' + complaintId + '\',4)" id="star_' + complaintId + '_4" title="Good">★</button>' +
        '<button class="star-btn" onclick="setRating(\'' + complaintId + '\',5)" id="star_' + complaintId + '_5" title="Excellent">★</button>' +
        '<span class="star-label" id="starlabel_' + complaintId + '">Click to rate</span>' +
      '</div>' +
      '<textarea class="feedback-textarea" id="fbtxt_' + complaintId + '" placeholder="Optional: Tell us about your experience — what went well, what could be improved…"></textarea>' +
      '<div class="feedback-submit-row">' +
        '<button class="feedback-submit-btn" id="fbsubmit_' + complaintId + '" onclick="submitFeedback(\'' + complaintId + '\')" disabled>📤 Submit Feedback</button>' +
        '<span class="feedback-note">Your rating helps officers get evaluated fairly.</span>' +
      '</div>' +
    '</div>' +
  '</div>';
}

window._selectedRating = {};
function setRating(id, val) {
  window._selectedRating[id] = val;
  var labels = ['', 'Very Poor 😞', 'Poor 🙁', 'Average 😐', 'Good 😊', 'Excellent 😄'];
  var lbl = document.getElementById('starlabel_' + id);
  if (lbl) lbl.textContent = labels[val] || val + ' stars';
  for (var i = 1; i <= 5; i++) {
    var s = document.getElementById('star_' + id + '_' + i);
    if (s) s.classList.toggle('active', i <= val);
  }
  var btn = document.getElementById('fbsubmit_' + id);
  if (btn) btn.disabled = false;
}

function submitFeedback(id) {
  var rating   = window._selectedRating[id];
  var txtEl    = document.getElementById('fbtxt_' + id);
  var comment  = txtEl ? txtEl.value.trim() : '';
  var btn      = document.getElementById('fbsubmit_' + id);
  if (!rating) { showNotification('Please select a star rating first.', 'error'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
  var labels = ['', 'Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];
  setTimeout(function() {
    sessionStorage.setItem('feedback_' + id, labels[rating] + ' (' + rating + '/5)');
    var fw = document.getElementById('fw_' + id);
    if (fw) {
      fw.querySelector('.feedback-widget-body').innerHTML =
        '<div class="feedback-success">' +
          '✅ <strong>Thank you for your feedback!</strong><br>' +
          '<span style="color:#4a5568;font-weight:400;font-size:0.82rem;">Rating: ' + '★'.repeat(rating) + '☆'.repeat(5-rating) + ' — ' + labels[rating] + '</span><br>' +
          (comment ? '<span style="color:#718096;font-size:0.75rem;margin-top:4px;display:block;">Your comment: "' + comment + '"</span>' : '') +
          '<span style="color:#718096;font-size:0.72rem;margin-top:6px;display:block;">Your feedback has been recorded and will be used to evaluate officer performance.</span>' +
        '</div>';
    }
    showNotification('Feedback submitted! ⭐ ' + rating + '/5 — Thank you.', 'success');
  }, 900);
}

// ====================================================
// FIX 3 — ESCALATION PANEL (injected into Dashboard)
// ====================================================
(function() {
  var ESC_DATA = [
    { id:'GRIEVA/2026/112843', dept:'Municipal Corporation', days:4, level:'critical', icon:'🚨', reason:'No water supply — 4 days overdue' },
    { id:'GRIEVA/2026/108921', dept:'Electricity Department', days:2, level:'high',     icon:'🔴', reason:'Power outage — 2 days without action' },
    { id:'GRIEVA/2026/103477', dept:'Transport Authority',   days:1, level:'medium',   icon:'🟡', reason:'Road pothole — approaching deadline' },
  ];

  function buildEscalationPanel() {
    var items = ESC_DATA.map(function(e) {
      return '<li class="escalation-item">' +
        '<div class="esc-icon ' + e.level + '">' + e.icon + '</div>' +
        '<div class="esc-info">' +
          '<div class="esc-id">' + e.id + '</div>' +
          '<div class="esc-dept">' + e.dept + ' — ' + e.reason + '</div>' +
        '</div>' +
        '<span class="esc-days ' + e.level + '">' + e.days + 'd overdue</span>' +
        '<div class="esc-action">' +
          '<button class="esc-escalate-btn" onclick="escalateComplaint(this,\'' + e.id + '\')">⬆ Escalate</button>' +
        '</div>' +
      '</li>';
    }).join('');

    return '<div class="escalation-panel" id="escalationPanel">' +
      '<div class="escalation-panel-header">' +
        '<h4>⚠️ Escalation Alerts — Action Required</h4>' +
        '<span class="escalation-badge">' + ESC_DATA.length + ' Overdue</span>' +
      '</div>' +
      '<ul class="escalation-list">' + items + '</ul>' +
      '<div class="escalation-footer">' +
        '<span>Auto-escalation triggers if no action within SLA window</span>' +
        '<a href="track.html" style="color:#e07b00;font-weight:600;font-size:0.75rem;">View All →</a>' +
      '</div>' +
    '</div>';
  }

  window.escalateComplaint = function(btn, id) {
    btn.textContent = '✅ Escalated';
    btn.classList.add('done');
    btn.disabled = true;
    showNotification('Complaint ' + id + ' escalated to senior officer.', 'success');
    var badge = document.querySelector('.escalation-badge');
    if (badge) {
      var n = parseInt(badge.textContent) - 1;
      badge.textContent = Math.max(0, n) + ' Overdue';
    }
  };

  // Inject after KPI grid on dashboard page
  document.addEventListener('DOMContentLoaded', function() {
    var page = window.location.pathname.split('/').pop();
    if (page !== 'dashboard.html') return;
    // Wait for dashboard to init
    setTimeout(function() {
      var kpiGrid = document.querySelector('.kpi-grid');
      if (!kpiGrid) return;
      var panel = document.createElement('div');
      panel.innerHTML = buildEscalationPanel();
      kpiGrid.parentNode.insertBefore(panel.firstChild, kpiGrid.nextSibling);
    }, 300);
  });
})();
