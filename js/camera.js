// GrievAI – Camera + GPS Module v3
// Fast (2-3s) + Accurate + Readable Address
window.GrievCamera = (function () {

  var _stream           = null;
  var _capturedBlob     = null;
  var _latitude         = null;
  var _longitude        = null;
  var _locationError    = null;
  var _geoWatcher       = null;
  var _captureTimestamp = null;
  var _reverseAddress   = null;  // "Church Rd, Patel Nagar, New Delhi"
  var _accuracy         = null;
  var _watchStarted     = false;
  var _gpsBuffer        = [];

  var CONFIG = {
    videoConstraints: {
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    },
    watermark: {
      fontFamily: 'Arial, sans-serif', fontSize: 15,
      color: '#FFFFFF', shadowColor: '#000000', padding: 10, bgAlpha: 0.50
    }
  };

  // ── Background watcher — starts silently on page load ──
  // So by the time user clicks "Get Location", we already have a fix
  function _startBackgroundWatch() {
    if (_watchStarted || !navigator.geolocation) return;
    _watchStarted = true;
    _geoWatcher = navigator.geolocation.watchPosition(
      function(pos) {
        _gpsBuffer.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, ts: Date.now() });
        if (_gpsBuffer.length > 6) _gpsBuffer.shift();
        // Pre-fetch address silently if good accuracy
        if (pos.coords.accuracy <= 60 && !_reverseAddress) {
          _fetchAddress(pos.coords.latitude, pos.coords.longitude, null, null, true);
        }
      },
      function() {},
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _startBackgroundWatch);
  } else {
    _startBackgroundWatch();
  }

  // ── Camera init ────────────────────────────────
  function initCamera(videoElId, statusElId) {
    var videoEl  = document.getElementById(videoElId);
    var statusEl = document.getElementById(statusElId);
    if (!videoEl) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      _setStatus(statusEl, 'error', '❌ Camera not supported. Use Chrome or Firefox.');
      return;
    }
    _setStatus(statusEl, 'loading', '📷 Starting camera…');
    navigator.mediaDevices.getUserMedia(CONFIG.videoConstraints)
      .then(function(stream) {
        _stream = stream;
        videoEl.srcObject = stream;
        videoEl.play();
        _setStatus(statusEl, 'success', '✅ Camera ready. Capture the issue area.');
      })
      .catch(function(err) {
        var msg = '❌ Camera access denied.';
        if (err.name === 'NotFoundError')    msg = '❌ No camera found.';
        if (err.name === 'NotAllowedError')  msg = '❌ Camera permission denied.';
        if (err.name === 'NotReadableError') msg = '❌ Camera in use by another app.';
        _setStatus(statusEl, 'error', msg);
      });
  }

  // ── Fetch Location — fast 2-3 sec ──────────────
  function fetchLocation(statusElId, coordsElId) {
    var statusEl = document.getElementById(statusElId);
    var coordsEl = document.getElementById(coordsElId);

    if (!navigator.geolocation) {
      _setStatus(statusEl, 'error', '❌ Geolocation not supported.');
      return;
    }

    // If background watcher already got a good fix — use instantly
    var bestBuffered = _bestFromBuffer();
    if (bestBuffered && bestBuffered.acc <= 80) {
      _latitude  = bestBuffered.lat.toFixed(6);
      _longitude = bestBuffered.lng.toFixed(6);
      _accuracy  = Math.round(bestBuffered.acc);
      _locationError = null;
      _setStatus(statusEl, 'loading', '📍 Got GPS fix — fetching address…');
      _fetchAddress(_latitude, _longitude, statusEl, coordsEl, false);
      return;
    }

    _setStatus(statusEl, 'loading', '📍 Locating you…');

    // Fast single call with high accuracy
    // maximumAge:5000 — use cached GPS if it's < 5s old (very fast on phones)
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        _latitude      = pos.coords.latitude.toFixed(6);
        _longitude     = pos.coords.longitude.toFixed(6);
        _accuracy      = Math.round(pos.coords.accuracy);
        _locationError = null;
        _gpsBuffer.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, ts: Date.now() });

        _setStatus(statusEl, 'loading', '📍 GPS locked — fetching your address…');
        _fetchAddress(_latitude, _longitude, statusEl, coordsEl, false);
      },
      function(err) {
        _locationError = 'Location unavailable';
        var msg = '❌ ';
        if (err.code === 1) msg += 'Location permission denied. Please enable it.';
        if (err.code === 2) msg += 'Position unavailable. Try outdoors.';
        if (err.code === 3) msg += 'Location timeout. Try again.';
        _setStatus(statusEl, 'error', msg);
      },
      {
        enableHighAccuracy: true,
        timeout:            6000,    // max 6s wait
        maximumAge:         4000     // use cached if < 4s old — instant on phones
      }
    );
  }

  // ── Best reading from buffer ───────────────────
  function _bestFromBuffer() {
    if (_gpsBuffer.length === 0) return null;
    return _gpsBuffer.slice().sort(function(a, b) { return a.acc - b.acc; })[0];
  }

  // ── Fetch readable address from coordinates ────
  // Uses Nominatim — returns "Church Rd, Patel Nagar, New Delhi 110008"
  function _fetchAddress(lat, lng, statusEl, coordsEl, silent) {
    // If already pre-fetched silently, use it
    if (silent && _reverseAddress) return;

    var url = 'https://nominatim.openstreetmap.org/reverse' +
              '?format=json&lat=' + lat + '&lon=' + lng +
              '&zoom=18&addressdetails=1';

    fetch(url, {
      headers: { 'Accept-Language': 'en-IN', 'User-Agent': 'GrievAI/1.0' }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.address) return;

      var a = data.address;

      // Build short readable address: "Church Rd, Patel Nagar, New Delhi 110008"
      var parts = [];
      if (a.road || a.pedestrian || a.footway)       parts.push(a.road || a.pedestrian || a.footway);
      if (a.neighbourhood || a.suburb || a.village)  parts.push(a.neighbourhood || a.suburb || a.village);
      if (a.city || a.town || a.county)              parts.push(a.city || a.town || a.county);
      if (a.state)                                    parts.push(a.state);
      if (a.postcode)                                 parts.push(a.postcode);

      _reverseAddress = parts.join(', ') || data.display_name.substring(0, 80);

      if (silent) return; // just pre-cache, don't update UI

      var acc = _accuracy || '?';
      var tier = acc <= 15 ? '🟢 ±' + acc + 'm' :
                 acc <= 40 ? '🟢 ±' + acc + 'm' :
                 acc <= 80 ? '🟡 ±' + acc + 'm' : '🟠 ±' + acc + 'm';

      _setStatus(statusEl, 'success', '✅ Location detected — ' + tier);

      if (coordsEl) {
        coordsEl.innerHTML =
          '<strong style="color:var(--navy);font-size:0.9rem;">📌 ' + _reverseAddress + '</strong>' +
          '<br><small style="color:var(--text-muted);font-size:0.72rem;">' +
          'Lat: ' + _latitude + ' | Lng: ' + _longitude + ' | Accuracy: ' + tier +
          '</small>';
        coordsEl.style.display = 'block';
      }
    })
    .catch(function() {
      if (silent) return;
      // Address fetch failed — still show coords
      var acc = _accuracy || '?';
      _setStatus(statusEl, 'success', '✅ GPS locked ±' + acc + 'm — address unavailable');
      if (coordsEl) {
        coordsEl.innerHTML =
          'Lat: ' + _latitude + ' | Lng: ' + _longitude +
          '<br><small style="color:var(--text-muted);">Address lookup failed — coordinates saved.</small>';
        coordsEl.style.display = 'block';
      }
    });
  }

  // ── Capture photo ──────────────────────────────
  function capturePhoto(videoElId, previewElId, statusElId, callback) {
    var videoEl   = document.getElementById(videoElId);
    var previewEl = document.getElementById(previewElId);
    var statusEl  = document.getElementById(statusElId);

    if (!videoEl || !_stream) {
      _setStatus(statusEl, 'error', '❌ Camera not started. Allow camera access first.');
      if (callback) callback(null);
      return;
    }

    if (_latitude && _longitude) {
      _captureTimestamp = new Date().toISOString();
      _doCapture(videoEl, previewEl, statusEl, callback);
    } else if (navigator.geolocation) {
      _setStatus(statusEl, 'loading', '📍 Getting GPS for capture…');
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          _latitude  = pos.coords.latitude.toFixed(6);
          _longitude = pos.coords.longitude.toFixed(6);
          _accuracy  = Math.round(pos.coords.accuracy);
          _captureTimestamp = new Date().toISOString();
          _doCapture(videoEl, previewEl, statusEl, callback);
        },
        function() {
          _setStatus(statusEl, 'error', '❌ GPS unavailable. Enable location and retry.');
          if (callback) callback(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 3000 }
      );
    } else {
      _setStatus(statusEl, 'error', '❌ Location not available.');
      if (callback) callback(null);
    }
  }

  function _doCapture(videoEl, previewEl, statusEl, callback) {
    var canvas = document.createElement('canvas');
    canvas.width  = videoEl.videoWidth  || 1280;
    canvas.height = videoEl.videoHeight || 720;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    _applyWatermark(ctx, canvas.width, canvas.height);
    canvas.toBlob(function(blob) {
      _capturedBlob = blob;
      if (previewEl) { previewEl.src = URL.createObjectURL(blob); previewEl.style.display = 'block'; }
      _setStatus(statusEl, 'success', '📸 Photo captured with location watermark!');
      if (callback) callback(blob);
    }, 'image/jpeg', 0.92);
  }

  // ── Watermark — shows readable address ─────────
  function _applyWatermark(ctx, width, height) {
    var now     = new Date();
    var dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    var timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    var lines = ['📍 GrievAI — Geo-Verified Complaint Photo'];

    // Show readable address prominently if available
    if (_reverseAddress) {
      lines.push('📌 ' + _reverseAddress.substring(0, 60) + (_reverseAddress.length > 60 ? '…' : ''));
    }
    lines.push('Lat: ' + _latitude + '  Lng: ' + _longitude + (_accuracy ? '  ±' + _accuracy + 'm' : ''));
    lines.push('Captured: ' + dateStr + ' at ' + timeStr);

    var cfg = CONFIG.watermark, fs = cfg.fontSize, pad = cfg.padding;
    ctx.font = 'bold ' + fs + 'px ' + cfg.fontFamily;
    ctx.textAlign = 'left';

    var stripH = (fs + 6) * lines.length + pad * 2;
    ctx.fillStyle = 'rgba(0,0,0,' + cfg.bgAlpha + ')';
    ctx.fillRect(0, height - stripH, width, stripH);

    lines.forEach(function(line, i) {
      var y = height - stripH + pad + (i + 1) * (fs + 4);
      ctx.fillStyle = cfg.shadowColor; ctx.shadowColor = cfg.shadowColor; ctx.shadowBlur = 4;
      ctx.fillText(line, pad + 1, y + 1);
      ctx.fillStyle = cfg.color; ctx.shadowBlur = 0;
      ctx.fillText(line, pad, y);
    });

    // Top-right badge
    var badge  = '🇮🇳 GrievAI Verified';
    var badgeW = ctx.measureText(badge).width + pad * 2;
    ctx.fillStyle = 'rgba(0,51,102,0.80)';
    ctx.fillRect(width - badgeW - 4, 4, badgeW, fs + 10);
    ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
    ctx.fillText(badge, width - badgeW, fs + 8);
  }

  function stopCamera() {
    if (_stream) { _stream.getTracks().forEach(function(t) { t.stop(); }); _stream = null; }
    if (_geoWatcher !== null) { navigator.geolocation.clearWatch(_geoWatcher); _geoWatcher = null; _watchStarted = false; }
  }

  function validate() {
    var errors = [];
    if (!_capturedBlob) errors.push('📸 Please capture a live photo of the issue.');
    if (!_latitude || !_longitude) errors.push('📍 Location is required. Please enable GPS.');
    return errors;
  }

  function appendToFormData(fd) {
    if (_capturedBlob) fd.append('image', _capturedBlob, 'complaint_' + Date.now() + '.jpg');
    if (_latitude)     fd.append('latitude',  _latitude);
    if (_longitude)    fd.append('longitude', _longitude);
    if (_reverseAddress) fd.append('address', _reverseAddress);
    if (_accuracy)     fd.append('gps_accuracy_metres', _accuracy);
    return fd;
  }

  function reset() {
    stopCamera();
    _capturedBlob = null; _latitude = null; _longitude = null;
    _locationError = null; _captureTimestamp = null;
    _reverseAddress = null; _accuracy = null; _gpsBuffer = [];
  }

  function _setStatus(el, type, msg) {
    if (!el) return;
    el.textContent = msg; el.className = 'camera-status camera-status--' + type; el.style.display = 'block';
  }

  return {
    initCamera: initCamera, fetchLocation: fetchLocation,
    capturePhoto: capturePhoto, stopCamera: stopCamera,
    validate: validate, appendToFormData: appendToFormData,
    getLatitude:  function() { return _latitude; },
    getLongitude: function() { return _longitude; },
    getAccuracy:  function() { return _accuracy; },
    getAddress:   function() { return _reverseAddress; },
    getCapturedBlob: function() { return _capturedBlob; },
    hasPhoto:    function() { return !!_capturedBlob; },
    hasLocation: function() { return !!(_latitude && _longitude); },
    reset: reset
  };
})();
