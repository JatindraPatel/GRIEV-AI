/**
 * GrievAI — Auth Guard & Role Access Control
 * ============================================
 * Rules:
 *  - index.html  → PUBLIC (no redirect, no login required)
 *  - login.html  → PUBLIC (redirect to dashboard if already logged in)
 *  - track.html, status.html → PUBLIC (anyone can use)
 *  - dashboard.html → REQUIRES login; BLOCKS citizens (redirect to home)
 *  - about, faq, help, contact, departments, accuracy, security, sitemap
 *                → REQUIRES login; citizens CAN access
 *  - Citizens only see: home, track, status + info pages
 *  - Admin/Officer see: all pages including dashboard
 */

(function () {
  'use strict';

  var PAGE = (function () {
    var p = window.location.pathname.split('/').pop() || 'index.html';
    return p.toLowerCase();
  })();

  // Pages that never require login
  var PUBLIC_PAGES = ['index.html', '', 'track.html', 'status.html', 'login.html'];

  // Pages citizens are explicitly ALLOWED after login
  var CITIZEN_ALLOWED = [
    'index.html', '', 'track.html', 'status.html', 'login.html',
    'about.html', 'faq.html', 'help.html', 'contact.html',
    'departments.html', 'accuracy.html', 'security.html', 'sitemap.html',
    'feedback.html'
  ];

  // Pages that require officer or admin
  var ADMIN_OFFICER_ONLY = ['dashboard.html'];

  function getAuth() {
    var role  = sessionStorage.getItem('grievai_role')  || '';
    var user  = sessionStorage.getItem('grievai_user')  || '';
    var token = sessionStorage.getItem('grievai_token') || '';
    return {
      role    : role,
      user    : user,
      token   : token,
      loggedIn: !!(role && token)   // MUST have a real token
    };
  }

  function redirectTo(page, msg) {
    if (msg) sessionStorage.setItem('grievai_redirect_msg', msg);
    window.location.replace(page);
  }

  var auth = getAuth();

  // ── 1. login.html: if already logged in, send to right place ──────────
  if (PAGE === 'login.html') {
    if (auth.loggedIn) {
      if (auth.role === 'admin' || auth.role === 'officer') {
        redirectTo('dashboard.html');
      } else {
        redirectTo('index.html');
      }
    }
    return; // nothing else to check on login page
  }

  // ── 2. PUBLIC pages — always allowed ──────────────────────────────────
  if (PUBLIC_PAGES.indexOf(PAGE) !== -1) {
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
        // Fallback: inject a banner at top of body
        var banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#e17a00;color:#fff;padding:12px 20px;text-align:center;font-size:0.9rem;font-weight:600;';
        banner.textContent = '⚠️ ' + msg;
        document.body.prepend(banner);
        setTimeout(function () { banner.remove(); }, 4000);
      }
    }
  });

})();
