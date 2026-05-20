/**
 * GrievAI — Auth Guard & Role Access Control (No-Backend Edition)
 * ================================================================
 * Rules:
 *  - index.html         → PUBLIC — anyone can file complaint WITHOUT login
 *  - login.html         → PUBLIC
 *  - track.html         → PUBLIC
 *  - status.html        → PUBLIC
 *  - feedback.html      → PUBLIC
 *  - about, faq, help, contact, departments, accuracy, security, sitemap → PUBLIC
 *  - dashboard.html     → REQUIRES login as officer OR admin only
 *  - Citizens redirected from dashboard to index.html
 */
(function () {
  'use strict';
  var PAGE = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  var PUBLIC_PAGES = [
    'index.html','','track.html','status.html','login.html',
    'about.html','faq.html','help.html','contact.html',
    'departments.html','accuracy.html','security.html','sitemap.html','feedback.html'
  ];
  var ADMIN_OFFICER_ONLY = ['dashboard.html'];

  function getAuth() {
    var role = sessionStorage.getItem('grievai_role') || '';
    return { role: role, loggedIn: !!role };
  }

  function redirectTo(page, msg) {
    if (msg) sessionStorage.setItem('grievai_redirect_msg', msg);
    window.location.replace(page);
  }

  function showBannerOnLoad() {
    window.addEventListener('DOMContentLoaded', function () {
      var msg = sessionStorage.getItem('grievai_redirect_msg');
      if (!msg) return;
      sessionStorage.removeItem('grievai_redirect_msg');
      if (typeof showNotification === 'function') { showNotification(msg, 'warning'); return; }
      var b = document.createElement('div');
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#e17a00;color:#fff;padding:12px 20px;text-align:center;font-size:0.9rem;font-weight:600;';
      b.textContent = '⚠️ ' + msg;
      document.body.prepend(b);
      setTimeout(function(){ b.remove(); }, 4000);
    });
  }

  var auth = getAuth();

  if (PAGE === 'login.html') {
    if (auth.loggedIn) {
      redirectTo(auth.role === 'admin' || auth.role === 'officer' ? 'dashboard.html' : 'index.html');
    }
    return;
  }

  if (PUBLIC_PAGES.indexOf(PAGE) !== -1) { showBannerOnLoad(); return; }

  if (ADMIN_OFFICER_ONLY.indexOf(PAGE) !== -1) {
    if (!auth.loggedIn) { redirectTo('login.html', 'Please login as Officer or Administrator to access the dashboard.'); return; }
    if (auth.role !== 'admin' && auth.role !== 'officer') { redirectTo('index.html', 'Dashboard access is restricted to Officers and Administrators.'); return; }
    showBannerOnLoad();
    return;
  }

  showBannerOnLoad();
})();
