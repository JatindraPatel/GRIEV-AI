/**
 * GrievAI — Auth Guard & Role Access Control (ENHANCED)
 * ============================================
 * Rules:
 *  - index.html, track.html, status.html, login.html, register.html → PUBLIC
 *  - BUT: Filing a complaint on index.html REQUIRES login (enforced by complaintLoginGuard)
 *  - dashboard.html → REQUIRES login; BLOCKS citizens
 *  - about, faq, help, contact, departments, accuracy, security, sitemap, feedback
 *               → REQUIRES login
 *  - Citizens only see: home (read only), track, status, login, register
 *  - Admin/Officer see: all pages including dashboard
 */

(function () {
  'use strict';

  var PAGE = (function () {
    var p = window.location.pathname.split('/').pop() || 'index.html';
    return p.toLowerCase();
  })();

  // Pages that never require login
  var PUBLIC_PAGES = ['index.html', '', 'track.html', 'status.html', 'login.html', 'register.html'];

  // Pages citizens are explicitly ALLOWED after login
  var CITIZEN_ALLOWED = [
    'index.html', '', 'track.html', 'status.html', 'login.html', 'register.html',
    'about.html', 'faq.html', 'help.html', 'contact.html',
    'departments.html', 'accuracy.html', 'security.html', 'sitemap.html',
    'feedback.html'
  ];

  // Pages that require officer or admin only
  var ADMIN_OFFICER_ONLY = ['dashboard.html'];

  function getAuth() {
    var role  = sessionStorage.getItem('grievai_role')  || '';
    var user  = sessionStorage.getItem('grievai_user')  || '';
    var token = sessionStorage.getItem('grievai_token') || localStorage.getItem('grievai_token') || '';
    return {
      role    : role,
      user    : user,
      token   : token,
      loggedIn: !!(role && user)
    };
  }

  function redirectTo(page, msg) {
    if (msg) sessionStorage.setItem('grievai_redirect_msg', msg);
    window.location.replace(page);
  }

  var auth = getAuth();

  // ── 1. login.html / register.html: if already logged in, send to right place ──
  if (PAGE === 'login.html' || PAGE === 'register.html') {
    if (auth.loggedIn) {
      if (auth.role === 'admin' || auth.role === 'officer') {
        redirectTo('dashboard.html');
      } else {
        redirectTo('index.html');
      }
    }
    return;
  }

  // ── 2. PUBLIC pages — always allowed ──────────────────────────────────
  if (PUBLIC_PAGES.indexOf(PAGE) !== -1) {
    // On index.html: complaint form needs login — enforce via DOM manipulation
    window.addEventListener('DOMContentLoaded', function () {
      _applyComplaintLoginGuard(auth);
    });
    return;
  }

  // ── 3. All other pages require login ──────────────────────────────────
  if (!auth.loggedIn) {
    redirectTo('login.html', 'Please login to access this page.');
    return;
  }

  // ── 4. dashboard.html → citizens are blocked ──────────────────────────
  if (ADMIN_OFFICER_ONLY.indexOf(PAGE) !== -1) {
    if (auth.role !== 'admin' && auth.role !== 'officer') {
      redirectTo('index.html', 'Dashboard access is restricted to Officers and Administrators.');
      return;
    }
  }

  // ── 5. Citizens: block pages not in allowed list ──────────────────────
  if (auth.role === 'citizen' && CITIZEN_ALLOWED.indexOf(PAGE) === -1) {
    redirectTo('index.html', 'You do not have permission to view this page.');
    return;
  }

  // ── 6. Show redirect message if any ───────────────────────────────────
  window.addEventListener('DOMContentLoaded', function () {
    var msg = sessionStorage.getItem('grievai_redirect_msg');
    if (msg) {
      sessionStorage.removeItem('grievai_redirect_msg');
      if (typeof showNotification === 'function') {
        showNotification(msg, 'warning');
      } else {
        var banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#e17a00;color:#fff;padding:12px 20px;text-align:center;font-size:0.9rem;font-weight:600;';
        banner.textContent = '⚠️ ' + msg;
        document.body.prepend(banner);
        setTimeout(function () { banner.remove(); }, 4000);
      }
    }
  });

  // ── Complaint Login Guard ─────────────────────────────────────────────
  function _applyComplaintLoginGuard(auth) {
    var form = document.getElementById('complaintForm');
    if (!form) return;

    if (!auth.loggedIn) {
      // Replace the form with a login prompt overlay
      var formSection = form.closest('.complaint-form-section') || form.parentElement;
      var overlay = document.createElement('div');
      overlay.id = 'complaintLoginOverlay';
      overlay.style.cssText = [
        'background:linear-gradient(135deg,#003366 0%,#00509e 100%)',
        'border-radius:12px',
        'padding:48px 32px',
        'text-align:center',
        'color:#fff',
        'margin:24px 0',
        'box-shadow:0 8px 32px rgba(0,51,102,0.25)'
      ].join(';');
      overlay.innerHTML = [
        '<div style="font-size:3rem;margin-bottom:16px;">🔐</div>',
        '<h3 style="font-size:1.5rem;font-weight:700;margin-bottom:10px;font-family:var(--font-serif,serif);">Login Required to File Complaint</h3>',
        '<p style="font-size:0.95rem;opacity:0.88;margin-bottom:28px;max-width:420px;margin-left:auto;margin-right:auto;">',
        'To lodge a complaint, you must be logged in. This ensures your complaint is linked to your profile and you receive status updates.',
        '</p>',
        '<div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">',
        '<a href="login.html" style="background:#FF6600;color:#fff;padding:13px 32px;border-radius:6px;font-weight:700;text-decoration:none;font-size:0.95rem;">🔓 Login Now</a>',
        '<a href="register.html" style="background:rgba(255,255,255,0.15);color:#fff;padding:13px 32px;border-radius:6px;font-weight:700;text-decoration:none;font-size:0.95rem;border:2px solid rgba(255,255,255,0.4);">📝 Register</a>',
        '</div>',
        '<p style="margin-top:22px;font-size:0.8rem;opacity:0.7;">Track existing complaints below without logging in.</p>'
      ].join('');
      // Hide the form, show overlay before it
      form.style.display = 'none';
      var info = form.previousElementSibling;
      if (info) info.style.display = 'none';
      formSection.insertBefore(overlay, form);
    }
  }

})();
