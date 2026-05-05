// ====================================================
// GrievAI – Live Camera + Geo-Tagging Module
// camera.js
// Features:
//   - Live camera via getUserMedia (NO gallery upload)
//   - GPS coordinates via Geolocation API
//   - Canvas watermark (Lat, Long, DateTime)
//   - Blocks submission if no image or no location
// ====================================================

window.GrievCamera = (function () {

  // ── State ─────────────────────────────────────
  var _stream          = null;   // MediaStream
  var _capturedBlob    = null;   // Final watermarked image blob
  var _latitude        = null;
  var _longitude       = null;
  var _locationError   = null;
  var _geoWatcher      = null;
  var _captureTimestamp = null;
  var _reverseAddress  = null;

  // ── Config ────────────────────────────────────
  var CONFIG = {
    videoConstraints: {
      video: {
        facingMode: { ideal: 'environment' }, // Rear camera on mobile
        width:  { ideal: 1280 },
        height: { ideal: 720  }
      },
      audio: false
    },
    watermark: {
      fontFamily: 'Arial, sans-serif',
      fontSize:   15,
      color:      '#FFFFFF',
      shadowColor:'#000000',
      padding:    10,
      bgAlpha:    0.45
    }
  };

  // ── Initialise Camera ──────────────────────────
  function initCamera(videoElId, statusElId) {
    var videoEl  = document.getElementById(videoElId);
    var statusEl = document.getElementById(statusElId);

    if (!videoEl) {
      console.error('[GrievCamera] Video element not found: #' + videoElId);
      return;
    }

    // Check getUserMedia support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      _setStatus(statusEl, 'error',
        '❌ Camera not supported in this browser. Please use Chrome or Firefox.');
      return;
    }

    _setStatus(statusEl, 'loading', '📷 Starting camera…');

    navigator.mediaDevices.getUserMedia(CONFIG.videoConstraints)
      .then(function (stream) {
        _stream        = stream;
        videoEl.srcObject = stream;
        videoEl.play();
        _setStatus(statusEl, 'success', '✅ Camera ready. Position your complaint area and capture.');
      })
      .catch(function (err) {
        console.error('[GrievCamera] Camera error:', err);
        var msg = '❌ Camera access denied.';
        if (err.name === 'NotFoundError')     msg = '❌ No camera found on this device.';
        if (err.name === 'NotAllowedError')   msg = '❌ Camera permission denied. Please allow camera access.';
        if (err.name === 'NotReadableError')  msg = '❌ Camera is in use by another app.';
        _setStatus(statusEl, 'error', msg);
      });
  }

  // ── Fetch GPS Location ─────────────────────────
  function fetchLocation(statusElId, coordsElId) {
    var statusEl = document.getElementById(statusElId);
    var coordsEl = document.getElementById(coordsElId);

    if (!navigator.geolocation) {
      _locationError = 'Geolocation not supported by this browser.';
      _setStatus(statusEl, 'error', '❌ ' + _locationError);
      return;
    }

    _setStatus(statusEl, 'loading', '📍 Fetching your location…');

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        _latitude      = pos.coords.latitude.toFixed(6);
        _longitude     = pos.coords.longitude.toFixed(6);
        _locationError = null;

        var accuracy = Math.round(pos.coords.accuracy);
        _setStatus(statusEl, 'success',
          '✅ GPS locked (±' + accuracy + 'm accuracy) — Ready to capture!');

        if (coordsEl) {
          coordsEl.textContent =
            'Lat: ' + _latitude + '  |  Lng: ' + _longitude + '  |  Fetching address…';
          coordsEl.style.display = 'block';
        }

        // Fetch human-readable address in background
        fetchReverseGeocode(_latitude, _longitude);
      },
      function (err) {
        _locationError = 'Location unavailable';
        var msg = '❌ Location error: ';
        if (err.code === 1) msg += 'Permission denied. Please enable location.';
        if (err.code === 2) msg += 'Position unavailable.';
        if (err.code === 3) msg += 'Timeout. Try again.';
        _setStatus(statusEl, 'error', msg);
        console.error('[GrievCamera] Geo error:', err);
      },
      {
        enableHighAccuracy: true,
        timeout:            15000,
        maximumAge:         0
      }
    );
  }

  // ── Reverse Geocoding (Nominatim – free, no key) ──
  function fetchReverseGeocode(lat, lng) {
    var url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&zoom=16&addressdetails=1';
    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (data && data.display_name) {
          _reverseAddress = data.display_name;
          var coordsEl = document.getElementById('cameraCoords');
          if (coordsEl) {
            coordsEl.innerHTML =
              'Lat: ' + _latitude + '  |  Lng: ' + _longitude +
              '<br><small style="color:var(--success);font-size:0.72rem;">📌 ' + _reverseAddress.substring(0,80) + '</small>';
          }
        }
      })
      .catch(function(){});
  }

  // ── Capture Frame from Video ───────────────────
  function capturePhoto(videoElId, previewElId, statusElId, callback) {
    var videoEl   = document.getElementById(videoElId);
    var previewEl = document.getElementById(previewElId);
    var statusEl  = document.getElementById(statusElId);

    if (!videoEl || !_stream) {
      _setStatus(statusEl, 'error', '❌ Camera not started. Please allow camera access first.');
      if (callback) callback(null);
      return;
    }

    // Auto-fetch fresh GPS at exact moment of capture
    if (navigator.geolocation) {
      _setStatus(statusEl, 'loading', '📍 Locking GPS location at capture moment…');
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          _latitude  = pos.coords.latitude.toFixed(6);
          _longitude = pos.coords.longitude.toFixed(6);
          _captureTimestamp = new Date().toISOString();
          _doCapture(videoEl, previewEl, statusEl, callback);
        },
        function() {
          // Use cached location if fresh fetch fails
          if (_latitude && _longitude) {
            _doCapture(videoEl, previewEl, statusEl, callback);
          } else {
            _setStatus(statusEl, 'error', '❌ GPS unavailable. Enable location and retry.');
            if (callback) callback(null);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      if (!_latitude || !_longitude) {
        _setStatus(statusEl, 'error', '❌ Location not available. Please enable GPS and try again.');
        if (callback) callback(null);
        return;
      }
      _doCapture(videoEl, previewEl, statusEl, callback);
    }
  }

  // ── Internal capture after location acquired ───
  function _doCapture(videoEl, previewEl, statusEl, callback) {

    var canvas = document.createElement('canvas');
    canvas.width  = videoEl.videoWidth  || 1280;
    canvas.height = videoEl.videoHeight || 720;
    _captureTimestamp = _captureTimestamp || new Date().toISOString();

    var ctx = canvas.getContext('2d');

    // Draw video frame
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    // Apply watermark
    _applyWatermark(ctx, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob(function (blob) {
      _capturedBlob = blob;

      // Show preview
      if (previewEl) {
        previewEl.src = URL.createObjectURL(blob);
        previewEl.style.display = 'block';
      }

      _setStatus(statusEl, 'success', '📸 Photo captured with location watermark!');
      if (callback) callback(blob);
    }, 'image/jpeg', 0.92);
  }


  // ── Apply Geo Watermark on Canvas ─────────────
  function _applyWatermark(ctx, width, height) {
    var now = new Date();
    var dateStr = now.toLocaleDateString('en-IN', {
      day:'2-digit', month:'short', year:'numeric'
    });
    var timeStr = now.toLocaleTimeString('en-IN', {
      hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: true
    });

    var lines = [
      '📍 GrievAI — Geo-Verified Complaint Photo',
      'Lat: ' + _latitude + '  |  Lng: ' + _longitude,
      'Captured: ' + dateStr + ' at ' + timeStr
    ];
    if (_reverseAddress) {
      lines.push('📌 ' + _reverseAddress.substring(0, 60) + ((_reverseAddress.length > 60) ? '…' : ''));
    }

    var cfg      = CONFIG.watermark;
    var fontSize = cfg.fontSize;
    var pad      = cfg.padding;

    ctx.font      = 'bold ' + fontSize + 'px ' + cfg.fontFamily;
    ctx.textAlign = 'left';

    // Background strip at bottom
    var stripH = (fontSize + 6) * lines.length + pad * 2;
    ctx.fillStyle = 'rgba(0,0,0,' + cfg.bgAlpha + ')';
    ctx.fillRect(0, height - stripH, width, stripH);

    // Watermark text lines
    lines.forEach(function (line, i) {
      var y = height - stripH + pad + (i + 1) * (fontSize + 4);

      // Shadow
      ctx.fillStyle   = cfg.shadowColor;
      ctx.shadowColor = cfg.shadowColor;
      ctx.shadowBlur  = 4;
      ctx.fillText(line, pad + 1, y + 1);

      // Text
      ctx.fillStyle   = cfg.color;
      ctx.shadowBlur  = 0;
      ctx.fillText(line, pad, y);
    });

    // Top-right badge
    var badge    = '🇮🇳 GrievAI';
    var badgeW   = ctx.measureText(badge).width + pad * 2;
    ctx.fillStyle = 'rgba(0,51,102,0.75)';
    ctx.fillRect(width - badgeW - 4, 4, badgeW, fontSize + 10);
    ctx.fillStyle = '#fff';
    ctx.fillText(badge, width - badgeW, fontSize + 8);
  }

  // ── Stop Camera Stream ─────────────────────────
  function stopCamera() {
    if (_stream) {
      _stream.getTracks().forEach(function (track) { track.stop(); });
      _stream = null;
    }
    if (_geoWatcher !== null) {
      navigator.geolocation.clearWatch(_geoWatcher);
      _geoWatcher = null;
    }
  }

  // ── Validate Before Submit ─────────────────────
  function validate() {
    var errors = [];
    if (!_capturedBlob) {
      errors.push('📸 Please capture a live photo of the issue.');
    }
    if (!_latitude || !_longitude) {
      errors.push('📍 Location is required. Please enable GPS.');
    }
    return errors;
  }

  // ── Append to FormData ─────────────────────────
  function appendToFormData(formData) {
    if (_capturedBlob) {
      var filename = 'complaint_' + Date.now() + '.jpg';
      formData.append('image',     _capturedBlob, filename);
    }
    if (_latitude)  formData.append('latitude',  _latitude);
    if (_longitude) formData.append('longitude', _longitude);
    return formData;
  }

  // ── Getters ────────────────────────────────────
  function getLatitude()     { return _latitude; }
  function getLongitude()    { return _longitude; }
  function getCapturedBlob() { return _capturedBlob; }
  function hasPhoto()        { return !!_capturedBlob; }
  function hasLocation()     { return !!(_latitude && _longitude); }

  // ── Helper: set status element ─────────────────
  function _setStatus(el, type, msg) {
    if (!el) return;
    el.textContent  = msg;
    el.className    = 'camera-status camera-status--' + type;
    el.style.display = 'block';
  }

  // ── Reset module state ─────────────────────────
  function reset() {
    stopCamera();
    _capturedBlob     = null;
    _latitude         = null;
    _longitude        = null;
    _locationError    = null;
    _captureTimestamp = null;
    _reverseAddress   = null;
  }

  // ── Public API ─────────────────────────────────
  return {
    initCamera:       initCamera,
    fetchLocation:    fetchLocation,
    capturePhoto:     capturePhoto,
    stopCamera:       stopCamera,
    validate:         validate,
    appendToFormData: appendToFormData,
    getLatitude:      getLatitude,
    getLongitude:     getLongitude,
    getCapturedBlob:  getCapturedBlob,
    hasPhoto:         hasPhoto,
    hasLocation:      hasLocation,
    reset:            reset
  };

})();
