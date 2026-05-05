// ====================================================
// GrievAI – Shared Components (components.js)
// CHANGE: Language + Login moved into main nav RIGHT side
// Everything else is original — untouched
// ====================================================
(function () {

  var NAV_LINKS = [
    { href:'index.html',       key:'nav.home',        label:'Home'        },
    { href:'about.html',       key:'nav.about',       label:'About'       },
    { href:'departments.html', key:'nav.departments', label:'Departments' },
    { href:'faq.html',         key:'nav.faq',         label:'FAQ'         },
    { href:'help.html',        key:'nav.help',        label:'Help'        },
    { href:'contact.html',     key:'nav.contact',     label:'Contact'     },
    { href:'sitemap.html',     key:'nav.sitemap',     label:'Sitemap'     },
    { href:'security.html',    key:'nav.security',    label:'Security'    }
  ];

  // All 22 Indian languages exactly like CPGRAMS
  var CPGRAMS_LANGUAGES = [
    { code:'en',  label:'English'                  },
    { code:'hi',  label:'हिंदी (Hindi)'             },
    { code:'gu',  label:'ગુજરાતી (Gujarati)'        },
    { code:'mr',  label:'मराठी (Marathi)'           },
    { code:'bn',  label:'বাংলা (Bangla)'            },
    { code:'te',  label:'తెలుగు (Telugu)'           },
    { code:'as',  label:'অসমীয়া (Assamese)'        },
    { code:'or',  label:'ଓଡ଼ିଆ (Odia)'              },
    { code:'ta',  label:'தமிழ் (Tamil)'             },
    { code:'ml',  label:'മലയാളം (Malayalam)'        },
    { code:'ur',  label:'اردو (Urdu)'              },
    { code:'pa',  label:'ਪੰਜਾਬੀ (Punjabi)'          },
    { code:'kn',  label:'ಕನ್ನಡ (Kannada)'           },
    { code:'sd',  label:'Sindhi'                   },
    { code:'bo',  label:'बोडो (Bodo)'              },
    { code:'kok', label:'कोंकणी (Konkani)'          },
    { code:'ne',  label:'नेपाली (Nepali)'           },
    { code:'mni', label:'Manipuri'                 },
    { code:'doi', label:'डोगरी (Dogri)'             },
    { code:'mai', label:'मैथिली (Maithili)'         },
    { code:'sa',  label:'संस्कृतम् (Sanskrit)'      },
    { code:'sat', label:'ᱥᱟᱱᱛᱟᱲᱤ (Santali)'       }
  ];

  function getSavedLang() {
    return localStorage.getItem('grievai_lang') || 'en';
  }

  function getLangLabel(code) {
    var found = CPGRAMS_LANGUAGES.find(function(l){ return l.code === code; });
    return found ? found.label : 'English';
  }

  // ── Build nav-right: Language dropdown + Login btn ──
  function buildNavRight() {
    var currentLang  = getSavedLang();
    var currentLabel = getLangLabel(currentLang);

    var langItems = CPGRAMS_LANGUAGES.map(function(l) {
      return '<li class="cpgrams-lang-item' + (l.code === currentLang ? ' active' : '') +
             '" data-code="' + l.code + '">' + l.label + '</li>';
    }).join('');

    return (
      '<div class="nav-right-group">' +
        // Language dropdown
        '<div class="nav-lang-wrap lang-desktop" id="cpgramsDropdown">' +
          '<button class="nav-lang-btn" id="cpgramsDropBtn" aria-haspopup="listbox" aria-expanded="false">' +
            '<span>🌐</span>' +
            '<span id="cpgramsSelectedText">' + currentLabel + '</span>' +
            '<span class="nav-lang-arrow">▾</span>' +
          '</button>' +
          '<ul class="nav-lang-list" id="cpgramsDropList" role="listbox">' +
            langItems +
          '</ul>' +
        '</div>' +
        // Divider
        '<span class="nav-right-divider"></span>' +
        // Login button
        '<a class="nav-signin-btn" href="login.html" id="cpgramsSignIn">' +
          '<span>➜</span> Login / Sign In' +
        '</a>' +
      '</div>'
    );
  }

  // ── Build full header (original structure, nav extended) ──
  function buildHeader() {
    var current = window.location.pathname.split('/').pop() || 'index.html';
    var navItems = NAV_LINKS.map(function(l) {
      return '<li><a href="' + l.href + '" data-i18n="' + l.key + '"' +
             (l.href === current ? ' class="active"' : '') + '>' + l.label + '</a></li>';
    }).join('');

    return '\
    <div class="gov-top-bar">\
      <div class="top-bar-inner">\
        <div class="top-links">\
          <a href="#">Skip to Content</a>\
          <a href="#">Screen Reader</a>\
          <a href="sitemap.html">Sitemap</a>\
        </div>\
        <div class="accessibility-links">\
          <button onclick="document.documentElement.style.fontSize=\'13px\'">A-</button>\
          <button onclick="document.documentElement.style.fontSize=\'16px\'">A</button>\
          <button onclick="document.documentElement.style.fontSize=\'19px\'">A+</button>\
        </div>\
      </div>\
    </div>\
    <header class="site-header">\
      <div class="header-main">\
        <div class="header-logo">\
          <div class="emblem-placeholder"><span style="font-size:1.8rem;">🏛️</span></div>\
          <div class="header-title">\
            <span class="ministry-hi">भारत सरकार | लोक शिकायत एवं पेंशन मंत्रालय</span>\
            <span class="ministry-en-main">GrievAI – Citizen Grievance Portal</span>\
            <span class="ministry-en-sub">Ministry of Personnel, Public Grievances &amp; Pensions | Government of India</span>\
          </div>\
        </div>\
        <div class="header-right">\
          <div class="swachh-badge">🇮🇳 Swachh Bharat Mission</div>\
          <div class="portal-name-tag">CPGRAMS • GrievAI</div>\
        </div>\
      </div>\
    </header>\
    <div class="ticker-bar">\
      <div class="ticker-inner">\
        <span class="ticker-label">🔔 NOTICE</span>\
        <div class="ticker-text">\
          <marquee behavior="scroll" direction="left" scrollamount="4" onmouseover="this.stop()" onmouseout="this.start()">\
            New: AI-based auto-classification of complaints now active &nbsp;|&nbsp; Grievance Day every 1st &amp; 3rd Monday &nbsp;|&nbsp; Toll-Free Helpline: 1800-11-7781 &nbsp;|&nbsp; Mobile App on Play Store &amp; App Store\
          </marquee>\
        </div>\
      </div>\
    </div>\
    <nav class="main-nav" role="navigation" aria-label="Main Navigation">\
      <div class="nav-inner">\
        <ul class="nav-menu" id="navMenu">' + navItems + '</ul>\
        ' + buildNavRight() + '\
        <button class="nav-hamburger" id="navHamburger" aria-label="Toggle Navigation" aria-expanded="false" aria-controls="navMenu">\
          <span></span><span></span><span></span>\
        </button>\
      </div>\
    </nav>\
    <!-- ── Mobile Language Bar (below nav, visible on mobile only) ── -->\
    <div class="lang-mobile-bar lang-mobile" id="mobileLangBar" role="navigation" aria-label="Language Selection">\
      <span class="lang-mobile-bar-label">🌐 Language:</span>\
      <div class="lang-mobile-scroll">' +
        CPGRAMS_LANGUAGES.map(function(l){
          var cur = getSavedLang();
          return '<button class="lang-mobile-item' + (l.code === cur ? ' active' : '') + '" data-code="' + l.code + '" aria-pressed="' + (l.code === cur ? 'true' : 'false') + '">' + l.label + '</button>';
        }).join('') +
      '</div>\
    </div>';
  }

  // ── ORIGINAL footer (untouched) ─────────────────
  function buildFooter() {
    return '\
    <footer class="site-footer">\
      <div class="footer-main">\
        <div class="footer-brand">\
          <div class="footer-logo">\
            <span style="font-size:2rem;">🏛️</span>\
            <h3>GrievAI Portal<br><span style="font-size:0.82rem;font-weight:400;color:rgba(255,255,255,0.6);">Government of India</span></h3>\
          </div>\
          <p>An AI-powered Citizen Grievance Redressal System for all 29 States and 8 Union Territories of India.</p>\
        </div>\
        <div class="footer-col">\
          <h4 data-i18n="footer.quicklinks">Quick Links</h4>\
          <ul>\
            <li><a href="index.html" data-i18n="nav.home">Home</a></li>\
            <li><a href="about.html" data-i18n="nav.about">About</a></li>\
            <li><a href="departments.html" data-i18n="nav.departments">Departments</a></li>\
            <li><a href="faq.html" data-i18n="nav.faq">FAQ</a></li>\
            <li><a href="contact.html" data-i18n="nav.contact">Contact</a></li>\
          </ul>\
        </div>\
        <div class="footer-col">\
          <h4 data-i18n="footer.services">Services</h4>\
          <ul>\
            <li><a href="index.html#lodge" data-i18n="btn.lodge">Lodge Complaint</a></li>\
            <li><a href="track.html" data-i18n="btn.track">Track Complaint</a></li>\
            <li><a href="status.html" data-i18n="btn.status">View Status</a></li>\
            <li><a href="dashboard.html">Dashboard</a></li>\
            <li><a href="login.html" data-i18n="nav.login">Login</a></li>\
          </ul>\
        </div>\
        <div class="footer-col">\
          <h4 data-i18n="footer.legal">Legal</h4>\
          <ul>\
            <li><a href="security.html" data-i18n="nav.security">Security</a></li>\
            <li><a href="help.html" data-i18n="nav.help">Help</a></li>\
            <li><a href="sitemap.html" data-i18n="nav.sitemap">Sitemap</a></li>\
            <li><a href="#">RTI Act</a></li>\
          </ul>\
        </div>\
      </div>\
      <div class="footer-bottom">\
        <div class="footer-bottom-inner">\
          <span data-i18n="footer.copy">© 2024 Government of India. All Rights Reserved.</span>\
          <span><a href="security.html">Privacy</a><a href="sitemap.html">Sitemap</a><a href="contact.html">Contact</a></span>\
        </div>\
      </div>\
    </footer>';
  }

  // ── Language Dropdown Logic (original, adapted for nav) ──
  function initCpgramsDropdown() {
    var btn    = document.getElementById('cpgramsDropBtn');
    var list   = document.getElementById('cpgramsDropList');
    var selTxt = document.getElementById('cpgramsSelectedText');
    var drop   = document.getElementById('cpgramsDropdown');

    if (!btn || !list) return;

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = list.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(isOpen));
      var active = list.querySelector('.active');
      if (active && isOpen) {
        setTimeout(function(){ active.scrollIntoView({ block:'nearest' }); }, 50);
      }
    });

    list.addEventListener('click', function(e) {
      var item = e.target.closest('.cpgrams-lang-item');
      if (!item) return;

      var code  = item.dataset.code;
      var label = item.textContent.trim();

      selTxt.textContent = label;
      list.querySelectorAll('.cpgrams-lang-item').forEach(function(el){
        el.classList.remove('active');
      });
      item.classList.add('active');

      list.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');

      localStorage.setItem('grievai_lang', code);
      if (window.GrievLang) window.GrievLang.setLang(code);
    });

    document.addEventListener('click', function(e) {
      if (!drop.contains(e.target)) {
        list.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        list.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });

    list.querySelectorAll('.cpgrams-lang-item').forEach(function(item) {
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'option');
    });
  }

  // ── Hamburger (original) ────────────────────────
  function initHamburger() {
    var hamburger = document.getElementById('navHamburger');
    var navMenu   = document.getElementById('navMenu');
    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = navMenu.classList.toggle('open');
      hamburger.classList.toggle('is-open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', function(e) {
      if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('open');
        hamburger.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    navMenu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        navMenu.classList.remove('open');
        hamburger.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function setActiveNav() {
    var current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-menu a').forEach(function(link) {
      link.classList.toggle('active', link.getAttribute('href') === current);
    });
  }

  // ── Main Init (original) ────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    var headerEl = document.getElementById('site-header-placeholder') || document.getElementById('siteHeader');
    if (headerEl) headerEl.innerHTML = buildHeader();

    var footerEl = document.getElementById('site-footer-placeholder') || document.getElementById('siteFooter');
    if (footerEl) footerEl.innerHTML = buildFooter();

    initHamburger();
    setActiveNav();
    initCpgramsDropdown();

    if (window.GrievLang) window.GrievLang.init();
  });

})();
