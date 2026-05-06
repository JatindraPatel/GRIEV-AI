// ====================================================
// GrievAI – Performance & UX Patch JS v1.0
// Fixes:
//   1. Chatbot fixed position enforcement on all pages
//   2. Lang bar below header: remove from DOM entirely
//   3. Mobile language selector: sync with nav dropdown
//   4. Scroll perf: throttle + RAF + IntersectionObserver
//   5. Multilingual chatbot: auto-detect lang from site
//   6. Voice: correct lang code per selected language
// ====================================================

(function () {
  'use strict';

  // ── UTIL: Throttle (scroll events) ───────────────
  function throttle(fn, limit) {
    var lastCall = 0;
    return function () {
      var now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        fn.apply(this, arguments);
      }
    };
  }

  // ── UTIL: RAF debounce (visual updates) ──────────
  function rafDebounce(fn) {
    var rafId = null;
    return function () {
      var args = arguments;
      var ctx  = this;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(function () {
        fn.apply(ctx, args);
        rafId = null;
      });
    };
  }

  // ────────────────────────────────────────────────
  // FIX 1: LANG BAR — Remove from DOM on every page
  // ────────────────────────────────────────────────
  function killLangBar() {
    // Selectors that match the lang strip below the breadcrumb
    var selectors = [
      '.lang-bar',
      '#langBar',
      '.page-lang-bar',
      '.lang-strip',
      '[data-role="lang-bar"]'
    ];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.parentNode && el.parentNode.removeChild(el);
      });
    });

    // Also remove mobile duplicate bar
    var mobileBar = document.getElementById('mobileLangBar');
    if (mobileBar) mobileBar.parentNode && mobileBar.parentNode.removeChild(mobileBar);

    // Run again after components.js finishes injecting (100ms window)
    setTimeout(function () {
      selectors.forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (el) {
          el.parentNode && el.parentNode.removeChild(el);
        });
      });
      var mb = document.getElementById('mobileLangBar');
      if (mb) mb.parentNode && mb.parentNode.removeChild(mb);
    }, 300);
  }

  // ────────────────────────────────────────────────
  // FIX 2: CHATBOT — Ensure fixed position on ALL pages
  // ────────────────────────────────────────────────
  function enforceChatbotPosition() {
    // Wait for chatbot.js to inject the widget
    var attempts = 0;
    var interval = setInterval(function () {
      var widget = document.getElementById('cbWidget');
      if (widget) {
        // Force fixed positioning regardless of page context
        widget.style.cssText = [
          'position: fixed',
          'bottom: 28px',
          'right: 28px',
          'z-index: 99999',
          'font-family: inherit'
        ].join(' !important; ') + ' !important;';

        // Ensure panel stays inside the fixed widget
        var panel = document.getElementById('cbPanel');
        if (panel) {
          panel.style.position = 'absolute';
          panel.style.bottom   = '70px';
          panel.style.right    = '0';
        }

        clearInterval(interval);
      }
      if (++attempts > 40) clearInterval(interval); // give up after 4s
    }, 100);
  }

  // ────────────────────────────────────────────────
  // FIX 3: MOBILE LANG SELECTOR
  // Make nav dropdown work + stay visible on mobile
  // ────────────────────────────────────────────────
  function fixMobileLangSelector() {
    // Wait for components.js to inject the header
    var attempts = 0;
    var interval = setInterval(function () {
      var dropBtn = document.getElementById('cpgramsDropBtn');
      var dropList = document.getElementById('cpgramsDropList');
      if (!dropBtn || !dropList) {
        if (++attempts > 40) clearInterval(interval);
        return;
      }
      clearInterval(interval);

      // On mobile: when hamburger is open, ensure lang dropdown is accessible
      var hamburger = document.getElementById('navHamburger');
      var navRightGroup = document.querySelector('.nav-right-group');

      if (hamburger && navRightGroup) {
        hamburger.addEventListener('click', function () {
          // Always keep nav-right-group visible when hamburger is toggled
          navRightGroup.style.display = 'flex';
        });
      }

      // Fix: on very small screens, move dropdown list position on open
      dropBtn.addEventListener('click', function () {
        var isSmall = window.innerWidth < 480;
        if (isSmall && dropList.classList.contains('open')) {
          dropList.style.right  = '-8px';
          dropList.style.left   = 'auto';
          dropList.style.width  = Math.min(window.innerWidth - 20, 320) + 'px';
          dropList.style.maxHeight = '55vh';
          dropList.style.overflowY = 'auto';
        }
      });

      // Sync lang selection from nav dropdown → chatbot lang
      dropList.addEventListener('click', function (e) {
        var item = e.target.closest('.cpgrams-lang-item');
        if (!item) return;
        var code = item.dataset.code;
        syncChatbotLang(code);
      });

    }, 100);
  }

  // Sync chatbot lang when site language changes
  function syncChatbotLang(code) {
    // Map site lang codes → chatbot lang codes
    var langMap = {
      'hi':  'hi',
      'mr':  'hi',  // Marathi → use Hindi responses (fallback)
      'gu':  'hi',
      'bn':  'hi',
      'te':  'hi',
      'ta':  'hi',
      'kn':  'hi',
      'ml':  'hi',
      'pa':  'hi',
      'or':  'hi',
      'as':  'hi',
      'ur':  'hi',
      'en':  'en'
    };
    var chatLang = langMap[code] || 'en';

    // If chatbot session exists and is in "chatting" state, update its lang
    // We do this safely via a custom event
    document.dispatchEvent(new CustomEvent('grievai:langchange', {
      detail: { siteCode: code, chatLang: chatLang }
    }));

    // Also update voice recognition lang immediately
    updateVoiceLang(code);
  }

  // Update voice recognition language
  function updateVoiceLang(code) {
    var voiceMap = {
      'hi':  'hi-IN', 'mr':  'mr-IN', 'gu':  'gu-IN',
      'bn':  'bn-IN', 'te':  'te-IN', 'ta':  'ta-IN',
      'kn':  'kn-IN', 'ml':  'ml-IN', 'pa':  'pa-IN',
      'or':  'or-IN', 'as':  'as-IN', 'ur':  'ur-PK',
      'en':  'en-IN'
    };
    window._grievai_voice_lang = voiceMap[code] || 'en-IN';
  }

  // ────────────────────────────────────────────────
  // FIX 4: SCROLL PERFORMANCE
  // ────────────────────────────────────────────────

  // 4a. Replace any direct scroll listeners with throttled versions
  function optimizeScrollHandlers() {
    // Sticky header: use throttled + RAF scroll handler
    var header = document.querySelector('.site-header');
    if (header) {
      var lastScrollY = 0;
      var ticking = false;

      function updateHeader() {
        if (window.scrollY > 60) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
        ticking = false;
      }

      window.addEventListener('scroll', throttle(function () {
        var currentScrollY = window.scrollY;
        if (Math.abs(currentScrollY - lastScrollY) < 3) return; // skip micro-scrolls
        lastScrollY = currentScrollY;
        if (!ticking) {
          requestAnimationFrame(updateHeader);
          ticking = true;
        }
      }, 16), { passive: true }); // passive: true = no preventDefault = no scroll block
    }
  }

  // 4b. Replace scroll-based animations with IntersectionObserver
  function setupIntersectionAnimations() {
    // Targets that should animate when they enter viewport
    var animatables = document.querySelectorAll(
      '.feature-card, .quick-action-card, .process-step, .hero-stat, ' +
      '.kpi-card, .dept-card, .timeline-item, .faq-item'
    );

    if (!animatables.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('grievai-visible');
          observer.unobserve(entry.target); // observe only once
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.08
    });

    animatables.forEach(function (el) {
      // Only add animation class if element has no explicit animation
      if (!el.classList.contains('grievai-visible')) {
        observer.observe(el);
      }
    });
  }

  // 4c. Lazy-load images below fold
  function lazyLoadImages() {
    var imgs = document.querySelectorAll('img[data-src], img[loading="lazy"]');
    if (!imgs.length) return;

    if ('IntersectionObserver' in window) {
      var imgObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            imgObserver.unobserve(img);
          }
        });
      }, { rootMargin: '200px' });

      imgs.forEach(function (img) { imgObserver.observe(img); });
    } else {
      // Fallback: load all images immediately
      imgs.forEach(function (img) {
        if (img.dataset.src) { img.src = img.dataset.src; }
      });
    }
  }

  // 4d. Prevent expensive reflows from ticker/marquee
  function optimizeTicker() {
    var marquees = document.querySelectorAll('marquee');
    marquees.forEach(function (m) {
      // Replace marquee with CSS animation (marquee causes forced reflows)
      var text = m.innerHTML;
      var parent = m.parentNode;
      var ticker = document.createElement('div');
      ticker.className = 'grievai-ticker-text';
      ticker.innerHTML = text + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + text; // duplicate for seamless loop
      parent.replaceChild(ticker, m);
    });
  }

  // ────────────────────────────────────────────────
  // FIX 5: MULTILINGUAL CHATBOT — Language detection
  // ────────────────────────────────────────────────
  function enhanceChatbotMultilingual() {
    // Extended language detection keywords beyond English/Hindi
    var LANG_PATTERNS = {
      mr: ['माझ्या','माझी','नाही','आहे','पाणी','वीज','तक्रार','करायची','मला','आपण','हे'],
      bn: ['আমার','নেই','পানি','বিদ্যুৎ','অভিযোগ','করতে','চাই','থানা','সাহায্য'],
      te: ['నా','లేదు','నీరు','విద్యుత్','ఫిర్యాదు','చేయాలి','పోలీస్','సహాయం'],
      ta: ['என்','இல்லை','தண்ணீர்','மின்சாரம்','புகார்','செய்ய','பொலீஸ்','உதவி'],
      gu: ['મારી','નથી','પાણી','વીજળી','ફરિયાદ','કરવી','પોલીસ','મદદ'],
      kn: ['ನನ್ನ','ಇಲ್ಲ','ನೀರು','ವಿದ್ಯುತ್','ದೂರು','ಸಲ್ಲಿಸ','ಪೊಲೀಸ್','ಸಹಾಯ'],
      ml: ['എന്റെ','ഇല്ല','വെള്ളം','വൈദ്യുതി','പരാതി','ചെയ്യാൻ','പൊലീസ്','സഹായം'],
      pa: ['ਮੇਰੀ','ਨਹੀਂ','ਪਾਣੀ','ਬਿਜਲੀ','ਸ਼ਿਕਾਇਤ','ਕਰਨੀ','ਪੁਲਿਸ','ਮਦਦ'],
      hi: ['मेरी','नहीं','पानी','बिजली','शिकायत','करनी','पुलिस','मदद','है','हूँ','नहीं']
    };

    // Detect script/language from input text
    function detectInputLang(text) {
      // Check Unicode ranges
      if (/[\u0900-\u097F]/.test(text)) {
        // Devanagari — could be Hindi, Marathi, Sanskrit
        // Check Marathi-specific words
        var isMr = LANG_PATTERNS.mr.some(function(w){ return text.indexOf(w) !== -1; });
        return isMr ? 'mr' : 'hi';
      }
      if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
      if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
      if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
      if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
      if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
      if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
      if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi (Gurmukhi)
      if (/[\u0600-\u06FF]/.test(text)) return 'ur'; // Urdu (Arabic script)
      return 'en'; // Default
    }

    // Multilingual response messages for non-Hindi/English langs
    // (translated to local lang for greeting + fallback)
    var REGIONAL_RESPONSES = {
      mr: {
        greeting: '🙏 नमस्कार! मी GrievBot आहे. मी मराठीत मदत करू शकतो.\n\n• 📝 तक्रार दाखल करा\n• 🔍 तक्रार ट्रॅक करा\n• 🏛️ विभाग शोधा\n\nआपल्याला कशी मदद हवी आहे?',
        file:     '📝 तक्रार दाखल करण्यासाठी होम पेजवर "तक्रार दाखल करा" बटणावर क्लिक करा.',
        track:    '🔍 तुमची तक्रार ट्रॅक करण्यासाठी ट्रॅक पेजवर जा आणि Complaint ID टाका.',
        fallback: '🤔 मला नक्की समजले नाही. "तक्रार", "ट्रॅक", किंवा "मदत" असे लिहा.',
        water:    '💧 पाण्याची समस्या: जल आपूर्ती विभागाकडे तक्रार दाखल करा.',
        power:    '⚡ वीज समस्या: वीज विभागाकडे तक्रार दाखल करा.',
        emergency:'🚨 आपातकाल: 100 (पोलीस), 101 (अग्निशमन), 108 (रुग्णवाहिका), 112 (सामान्य)'
      },
      bn: {
        greeting: '🙏 নমস্কার! আমি GrievBot। আমি বাংলায় সাহায্য করতে পারি।\n\n• 📝 অভিযোগ দাখিল\n• 🔍 অভিযোগ ট্র্যাক\n• 🏛️ বিভাগ খুঁজুন',
        file:     '📝 অভিযোগ দাখিল করতে হোম পেজে "অভিযোগ দাখিল করুন" বোতামে ক্লিক করুন।',
        track:    '🔍 অভিযোগ ট্র্যাক করতে ট্র্যাক পেজে যান এবং Complaint ID দিন।',
        fallback: '🤔 আমি বুঝতে পারিনি। "অভিযোগ", "ট্র্যাক" বা "সাহায্য" লিখুন।',
        water:    '💧 জলের সমস্যা: জল সরবরাহ বিভাগে অভিযোগ দাখিল করুন।',
        power:    '⚡ বিদ্যুৎ সমস্যা: বিদ্যুৎ বিভাগে অভিযোগ দাখিল করুন।',
        emergency:'🚨 জরুরি: 100 (পুলিশ), 101 (দমকল), 108 (অ্যাম্বুলেন্স), 112'
      },
      te: {
        greeting: '🙏 నమస్కారం! నేను GrievBot. తెలుగులో సహాయం చేయగలను.\n\n• 📝 ఫిర్యాదు నమోదు\n• 🔍 ఫిర్యాదు ట్రాక్\n• 🏛️ విభాగం వెతకండి',
        file:     '📝 ఫిర్యాదు నమోదు చేయడానికి హోమ్ పేజ్‌లో "ఫిర్యాదు నమోదు" పై క్లిక్ చేయండి.',
        track:    '🔍 ఫిర్యాదు ట్రాక్ చేయడానికి ట్రాక్ పేజ్‌కు వెళ్ళి Complaint ID నమోదు చేయండి.',
        fallback: '🤔 అర్థం కాలేదు. "ఫిర్యాదు", "ట్రాక్" లేదా "సహాయం" అని టైప్ చేయండి.',
        water:    '💧 నీటి సమస్య: జలసరఫరా విభాగంలో ఫిర్యాదు నమోదు చేయండి.',
        power:    '⚡ విద్యుత్ సమస్య: విద్యుత్ విభాగంలో ఫిర్యాదు నమోదు చేయండి.',
        emergency:'🚨 అత్యవసరం: 100 (పోలీస్), 101 (అగ్నిమాపక), 108 (అంబులెన్స్), 112'
      },
      ta: {
        greeting: '🙏 வணக்கம்! நான் GrievBot. தமிழில் உதவ முடியும்.\n\n• 📝 புகார் பதிவு\n• 🔍 புகார் கண்காணிப்பு\n• 🏛️ துறை தேடல்',
        file:     '📝 புகார் பதிவு செய்ய முகப்புப் பக்கத்தில் "புகார் பதிவு" பொத்தானை அழுத்தவும்.',
        track:    '🔍 புகாரை கண்காணிக்க கண்காணிப்பு பக்கத்திற்கு செல்லுங்கள்.',
        fallback: '🤔 புரியவில்லை. "புகார்", "கண்காணிப்பு" அல்லது "உதவி" என்று தட்டச்சு செய்யவும்.',
        water:    '💧 நீர் பிரச்சனை: நீர் வழங்கல் துறையில் புகார் அளிக்கவும்.',
        power:    '⚡ மின்சார பிரச்சனை: மின்சார துறையில் புகார் அளிக்கவும்.',
        emergency:'🚨 அவசரநிலை: 100 (காவல்), 101 (தீயணைப்பு), 108 (ஆம்புலன்ஸ்), 112'
      },
      gu: {
        greeting: '🙏 નમસ્તે! હું GrievBot છું. ગુજરાતીમાં મદદ કરી શકું છું.\n\n• 📝 ફરિયાદ નોંધો\n• 🔍 ફરિયાદ ટ્રૅક\n• 🏛️ વિભાગ શોધો',
        file:     '📝 ફરિયાદ નોંધવા હોમ પેજ પર "ફરિયાદ નોંધો" બટન ક્લિક કરો.',
        track:    '🔍 ફરિયાદ ટ્રૅક કરવા ટ્રૅક પેજ પર જઈ Complaint ID નાખો.',
        fallback: '🤔 સમજ ન આવ્યું. "ફરિયાદ", "ટ્રૅક" અથવા "મદદ" ટાઇપ કરો.',
        water:    '💧 પાણી સમસ્યા: જળ પુરવઠા વિભાગમાં ફરિયાદ નોંધો.',
        power:    '⚡ વીજળી સમસ્યા: વીજળી વિભાગમાં ફરિયાદ નોંધો.',
        emergency:'🚨 ઈમર્જન્સી: 100 (પોલીસ), 101 (ફાયર), 108 (એમ્બ્યુલન્સ), 112'
      }
    };

    // Default for other regional langs
    var DEFAULT_REGIONAL = {
      greeting: '🙏 Welcome! I\'m GrievBot. I detected your regional language.\n\nI\'ll respond in English for now, but you can type in your language.\n\n• 📝 File a complaint\n• 🔍 Track complaint\n• 🏛️ Find department',
      file:     '📝 To file a complaint, click "Lodge Complaint" on the Home page.',
      track:    '🔍 To track your complaint, go to the Track page and enter your Complaint ID.',
      fallback: '🤔 I didn\'t understand. Type "complaint", "track", or "help".',
      water:    '💧 Water issue: File complaint with Water Supply & Sanitation department.',
      power:    '⚡ Electricity issue: File complaint with Electricity Department.',
      emergency:'🚨 Emergency: Call 100 (Police), 101 (Fire), 108 (Ambulance), 112'
    };

    // Store reference to regional lang state
    window._grievai_regional_lang   = null;
    window._grievai_regional_resp   = null;

    // Hook into chatbot input to detect regional language
    var patchInterval = setInterval(function () {
      var cbInput = document.getElementById('cbInput');
      var cbSend  = document.getElementById('cbSend');
      if (!cbInput || !cbSend) return;
      clearInterval(patchInterval);

      // Intercept send to detect regional lang
      var origSend = window._grievai_send_patched;
      if (!origSend) {
        cbInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            var text = cbInput.value.trim();
            if (text) detectAndHandleRegional(text);
          }
        });

        cbSend.addEventListener('click', function () {
          var text = cbInput.value.trim();
          if (text) detectAndHandleRegional(text);
        });

        window._grievai_send_patched = true;
      }
    }, 200);

    function detectAndHandleRegional(text) {
      // Only detect if chatbot is in 'chatting' state
      var detectedLang = detectInputLang(text);

      // If user is typing in a regional language (not en/hi)
      if (detectedLang !== 'en' && detectedLang !== 'hi') {
        window._grievai_regional_lang = detectedLang;
        window._grievai_regional_resp = REGIONAL_RESPONSES[detectedLang] || DEFAULT_REGIONAL;

        // Update voice recognition lang
        var voiceMap = {
          'mr':'mr-IN','bn':'bn-BD','te':'te-IN','ta':'ta-IN',
          'gu':'gu-IN','kn':'kn-IN','ml':'ml-IN','pa':'pa-IN'
        };
        window._grievai_voice_lang = voiceMap[detectedLang] || 'en-IN';
      }
    }

    // Listen for site-level language change
    document.addEventListener('grievai:langchange', function (e) {
      var siteCode = e.detail && e.detail.siteCode;
      var chatLang = e.detail && e.detail.chatLang;

      // Update chatbot placeholder language
      var inp = document.getElementById('cbInput');
      if (inp && !inp.disabled) {
        var placeholders = {
          hi:  'अपना प्रश्न टाइप करें…',
          mr:  'आपला प्रश्न येथे टाइप करा…',
          bn:  'আপনার প্রশ্ন টাইপ করুন…',
          te:  'మీ ప్రశ్నను టైప్ చేయండి…',
          ta:  'உங்கள் கேள்வியை தட்டச்சு செய்யவும்…',
          gu:  'તમારો પ્રश्न ટાઇप કરો…',
          kn:  'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ…',
          ml:  'നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യൂ…',
          pa:  'ਆਪਣਾ ਸਵਾਲ ਟਾਈਪ ਕਰੋ…',
          en:  'Type your question…'
        };
        inp.placeholder = placeholders[siteCode] || placeholders.en;
      }

      // If voice button exists, update its recognition lang
      updateVoiceLang(siteCode);
    });
  }

  // ────────────────────────────────────────────────
  // FIX 6: CSS ANIMATION — Inject IntersectionObserver CSS
  // ────────────────────────────────────────────────
  function injectAnimationStyles() {
    var style = document.createElement('style');
    style.id = 'grievai-patch-animations';
    style.textContent = [
      /* Ticker replacement — no forced reflow */
      '.grievai-ticker-text {',
      '  white-space: nowrap;',
      '  display: inline-block;',
      '  animation: grievaiTicker 28s linear infinite;',
      '  font-size: 0.82rem;',
      '  color: inherit;',
      '}',
      '@keyframes grievaiTicker {',
      '  0%   { transform: translateX(0); }',
      '  100% { transform: translateX(-50%); }',
      '}',
      /* IntersectionObserver animations */
      '.feature-card, .quick-action-card, .process-step,',
      '.hero-stat, .kpi-card, .dept-card, .timeline-item, .faq-item {',
      '  opacity: 0.96;',          /* keep mostly visible — subtle effect only */
      '}',
      '.grievai-visible {',
      '  opacity: 1 !important;',
      '}',
      /* Scrolled header state */
      '.site-header.scrolled {',
      '  box-shadow: 0 2px 8px rgba(0,0,0,0.13);',
      '}',
      /* Remove display:none from nav-right-group on ALL screens */
      '.nav-right-group { display: flex !important; align-items: center; gap: 8px; }',
      /* Patch: lang-desktop class was hiding dropdown on mobile */
      '.lang-desktop { display: flex !important; }',
      /* Mobile: compact the signin btn */
      '@media (max-width: 900px) {',
      '  .nav-right-group { flex-wrap: nowrap; }',
      '  .nav-lang-wrap { position: relative; }',
      '  .nav-lang-list.open {',
      '    position: fixed !important;',
      '    top: auto !important;',
      '    right: 10px !important;',
      '    left: auto !important;',
      '    z-index: 99998;',
      '    max-height: 60vh;',
      '    overflow-y: auto;',
      '    width: auto;',
      '    min-width: 220px;',
      '  }',
      '}',
      /* Hide duplicate mobile lang bar entirely */
      '.lang-mobile-bar, #mobileLangBar, .lang-mobile { display: none !important; }',
      '.lang-bar, #langBar, .page-lang-bar { display: none !important; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ────────────────────────────────────────────────
  // INIT
  // ────────────────────────────────────────────────
  function init() {
    injectAnimationStyles();
    killLangBar();
    enforceChatbotPosition();
    fixMobileLangSelector();
    optimizeScrollHandlers();
    enhanceChatbotMultilingual();

    // Wait for DOM paint then run IntersectionObserver + image lazy load
    requestAnimationFrame(function () {
      setupIntersectionAnimations();
      lazyLoadImages();
      optimizeTicker();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
