/**
 * GrievAI — Dashboard Live Data Manager (ENHANCED)
 * ===================================================
 * - Fetches real complaints from backend
 * - Falls back to localStorage demo data
 * - Fixes Invalid Date issues
 * - Live updates every 30 seconds
 * - Shows complaints with proper date/time
 * - Calculates expected resolution date
 */
(function () {
  'use strict';

  var API_BASE = window.GRIEVAI_API || 'http://localhost:8000/api/v1';
  var token = sessionStorage.getItem('grievai_token') || localStorage.getItem('grievai_token') || '';
  var role  = sessionStorage.getItem('grievai_role') || 'citizen';

  // ── Date Formatter (fixes Invalid Date) ──────────
  function formatDate(val) {
    if (!val) return '—';
    var d;
    // Handle ISO strings and timestamps
    if (typeof val === 'string') {
      // Handle "GRIEVA/2025/123456" — not a date
      if (/^GRIEVA/.test(val)) return val;
      d = new Date(val);
    } else if (typeof val === 'number') {
      d = new Date(val);
    } else if (val instanceof Date) {
      d = val;
    } else {
      return '—';
    }
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  function formatDateTime(val) {
    if (!val) return '—';
    var d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  // Expected resolution: filed date + 30 days (or by priority)
  function getExpectedResolutionDate(filedDate, priority) {
    var d = new Date(filedDate);
    if (isNaN(d.getTime())) return '—';
    var days = { critical: 7, high: 15, medium: 30, low: 45 };
    d.setDate(d.getDate() + (days[priority] || 30));
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Status Badge ──────────────────────────────────
  function statusBadge(status) {
    var map = {
      pending:      'badge-navy',
      under_review: 'badge-warning',
      in_progress:  'badge-info',
      resolved:     'badge-success',
      rejected:     'badge-error',
      escalated:    'badge-error'
    };
    var labels = {
      pending: 'Pending', under_review: 'Under Review', in_progress: 'In Progress',
      resolved: 'Resolved', rejected: 'Rejected', escalated: 'Escalated'
    };
    var cls = map[status] || 'badge-navy';
    return '<span class="badge ' + cls + '">' + (labels[status] || status) + '</span>';
  }

  function priorityBadge(p) {
    var map = { critical: 'badge-error', high: 'badge-warning', medium: 'badge-info', low: 'badge-navy' };
    return '<span class="badge ' + (map[p] || 'badge-navy') + '">' + (p || 'Medium') + '</span>';
  }

  // ── Load complaints from backend + localStorage ───
  function loadComplaints(callback) {
    var headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    var endpoint = (role === 'admin' || role === 'officer')
      ? API_BASE + '/complaints?limit=50'
      : API_BASE + '/complaints/my?limit=20';

    fetch(endpoint, { headers: headers })
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(data) {
        var complaints = data.complaints || data.data || [];
        // Merge with any localStorage demo complaints
        var local = _getLocalComplaints();
        var merged = local.concat(complaints);
        callback(null, merged);
      })
      .catch(function(err) {
        // Offline: use localStorage only
        callback(null, _getLocalComplaints());
      });
  }

  function _getLocalComplaints() {
    try {
      var keys = Object.keys(localStorage).filter(function(k) { return k.startsWith('grievai_complaint_'); });
      return keys.map(function(k) {
        try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; }
      }).filter(Boolean);
    } catch(e) { return []; }
  }

  // ── KPI Counts ────────────────────────────────────
  function computeKPIs(complaints) {
    var total    = complaints.length;
    var resolved = complaints.filter(function(c){ return c.status === 'resolved'; }).length;
    var progress = complaints.filter(function(c){ return c.status === 'in_progress' || c.status === 'under_review'; }).length;
    var pending  = complaints.filter(function(c){ return c.status === 'pending'; }).length;
    return { total: total, resolved: resolved, progress: progress, pending: pending };
  }

  function _setKPIText(id, val) {
    var el = document.getElementById(id);
    if (el) { el.textContent = val; el.setAttribute('data-count', val); }
  }

  // ── Render Recent Complaints Table ────────────────
  function renderComplaintsTable(complaints) {
    var tbody = document.getElementById('liveComplaintsBody');
    if (!tbody) return;

    if (!complaints || complaints.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No complaints found. <a href="index.html#lodge">File your first complaint →</a></td></tr>';
      return;
    }

    // Sort by date desc
    complaints.sort(function(a, b) {
      return new Date(b.createdAt || b.filedAt || 0) - new Date(a.createdAt || a.filedAt || 0);
    });

    tbody.innerHTML = complaints.slice(0, 10).map(function(c) {
      var cid      = c.complaintId || c.complaint_id || c.id || '—';
      var subject  = c.title || c.subject || c.description || 'Complaint';
      if (subject.length > 40) subject = subject.slice(0, 37) + '…';
      var dept     = c.department || 'General';
      var filed    = formatDateTime(c.createdAt || c.filedAt || c.filed_at);
      var status   = statusBadge(c.status || 'pending');
      var priority = priorityBadge(c.priority);
      var expDate  = c.status === 'resolved'
                      ? '<span style="color:#1a7a3f;font-weight:600;">✅ ' + formatDate(c.resolvedAt) + '</span>'
                      : getExpectedResolutionDate(c.createdAt || c.filedAt, c.priority);

      return '<tr>' +
        '<td><strong style="font-size:0.78rem;word-break:break-all;">' + cid + '</strong></td>' +
        '<td>' + subject + '</td>' +
        '<td style="font-size:0.82rem;">' + dept + '</td>' +
        '<td style="font-size:0.8rem;white-space:nowrap;">' + filed + '</td>' +
        '<td style="font-size:0.8rem;white-space:nowrap;">' + expDate + '</td>' +
        '<td>' + status + '</td>' +
        '<td>' + priority + '</td>' +
      '</tr>';
    }).join('');
  }

  // ── Render Admin All-Complaints Table ─────────────
  function renderAdminTable(complaints) {
    var tbody = document.getElementById('adminComplaintsBody');
    if (!tbody) return;

    if (!complaints || complaints.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">No complaints in system yet.</td></tr>';
      return;
    }

    complaints.sort(function(a, b) {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    tbody.innerHTML = complaints.slice(0, 15).map(function(c) {
      var cid     = c.complaintId || c.id || '—';
      var citizen = c.citizenName || c.citizen || 'Citizen';
      var issue   = (c.title || c.subject || '').slice(0, 35) + '…';
      var dept    = c.department || 'General';
      var filed   = formatDateTime(c.createdAt || c.filedAt);
      var status  = statusBadge(c.status || 'pending');
      var prio    = priorityBadge(c.priority);
      var expDate = c.status === 'resolved'
                    ? '<span style="color:#1a7a3f;">✅ ' + formatDate(c.resolvedAt) + '</span>'
                    : getExpectedResolutionDate(c.createdAt, c.priority);

      return '<tr>' +
        '<td><strong style="font-size:0.75rem;">' + cid + '</strong></td>' +
        '<td style="font-size:0.82rem;">' + citizen + '</td>' +
        '<td style="font-size:0.82rem;">' + issue + '</td>' +
        '<td style="font-size:0.78rem;">' + dept + '</td>' +
        '<td style="font-size:0.78rem;white-space:nowrap;">' + filed + '</td>' +
        '<td style="font-size:0.78rem;white-space:nowrap;">' + expDate + '</td>' +
        '<td>' + status + '</td>' +
        '<td>' + prio + '</td>' +
      '</tr>';
    }).join('');
  }

  // ── Inject Dashboard HTML Enhancements ───────────
  function injectLiveTables() {
    var mainContent = document.querySelector('.dash-main');
    if (!mainContent) return;

    // Citizen/Officer recent table
    var recentCard = document.createElement('div');
    recentCard.className = 'card';
    recentCard.style.marginBottom = '24px';
    recentCard.innerHTML = [
      '<div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">',
        '<h3>📋 Live Complaints Feed <span id="liveCount" style="font-size:0.75rem;font-weight:400;color:var(--text-muted);">Loading…</span></h3>',
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">',
          '<span id="lastUpdated" style="font-size:0.75rem;color:var(--text-muted);align-self:center;"></span>',
          '<button onclick="refreshDashboard()" style="font-size:0.78rem;padding:5px 12px;" class="btn btn-outline-navy btn-sm">🔄 Refresh</button>',
        '</div>',
      '</div>',
      '<div style="overflow-x:auto;">',
        '<table class="data-table" id="liveComplaintsTable">',
          '<thead><tr>',
            '<th>Complaint ID</th><th>Subject</th><th>Department</th>',
            '<th>Filed Date & Time</th><th>Expected Resolution</th><th>Status</th><th>Priority</th>',
          '</tr></thead>',
          '<tbody id="liveComplaintsBody">',
            '<tr><td colspan="7" style="text-align:center;padding:32px;">⏳ Loading complaints…</td></tr>',
          '</tbody>',
        '</table>',
      '</div>'
    ].join('');

    // Admin full table
    var adminCard = document.createElement('div');
    adminCard.className = 'card';
    adminCard.setAttribute('data-role', 'officer,admin');
    adminCard.style.cssText = 'margin-bottom:24px;display:none;';
    adminCard.innerHTML = [
      '<div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">',
        '<h3>📂 All Complaints — Admin Overview</h3>',
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">',
          '<select id="filterStatus" onchange="filterComplaints()" style="font-size:0.8rem;padding:5px 10px;border:1.5px solid #e2e8f0;border-radius:6px;">',
            '<option value="">All Status</option>',
            '<option value="pending">Pending</option>',
            '<option value="under_review">Under Review</option>',
            '<option value="in_progress">In Progress</option>',
            '<option value="resolved">Resolved</option>',
            '<option value="escalated">Escalated</option>',
          '</select>',
          '<select id="filterPriority" onchange="filterComplaints()" style="font-size:0.8rem;padding:5px 10px;border:1.5px solid #e2e8f0;border-radius:6px;">',
            '<option value="">All Priority</option>',
            '<option value="critical">Critical</option>',
            '<option value="high">High</option>',
            '<option value="medium">Medium</option>',
            '<option value="low">Low</option>',
          '</select>',
        '</div>',
      '</div>',
      '<div style="overflow-x:auto;">',
        '<table class="data-table" id="adminComplaintsTable">',
          '<thead><tr>',
            '<th>Complaint ID</th><th>Citizen</th><th>Issue</th><th>Department</th>',
            '<th>Filed Date</th><th>Expected Resolution</th><th>Status</th><th>Priority</th>',
          '</tr></thead>',
          '<tbody id="adminComplaintsBody">',
            '<tr><td colspan="8" style="text-align:center;padding:24px;">⏳ Loading…</td></tr>',
          '</tbody>',
        '</table>',
      '</div>'
    ].join('');

    // Insert before quick actions (last element)
    var quickActions = mainContent.querySelector('.grid-3:last-child');
    if (quickActions) {
      mainContent.insertBefore(recentCard, quickActions);
      mainContent.insertBefore(adminCard, quickActions);
    } else {
      mainContent.appendChild(recentCard);
      mainContent.appendChild(adminCard);
    }

    // Show admin table for officer/admin
    if (role === 'admin' || role === 'officer') {
      adminCard.style.display = '';
    }
  }

  // Global refresh
  var _allComplaints = [];
  window.refreshDashboard = function() {
    var lastEl = document.getElementById('lastUpdated');
    if (lastEl) lastEl.textContent = '⏳ Updating…';
    loadComplaints(function(err, complaints) {
      _allComplaints = complaints || [];
      var kpi = computeKPIs(_allComplaints);
      _setKPIText('liveKpiTotal', kpi.total);
      _setKPIText('liveKpiResolved', kpi.resolved);
      _setKPIText('liveKpiProgress', kpi.progress);
      _setKPIText('liveKpiPending', kpi.pending);

      var countEl = document.getElementById('liveCount');
      if (countEl) countEl.textContent = '(' + _allComplaints.length + ' total)';

      renderComplaintsTable(_allComplaints);
      renderAdminTable(_allComplaints);
      if (lastEl) lastEl.textContent = 'Updated: ' + new Date().toLocaleTimeString('en-IN');
    });
  };

  window.filterComplaints = function() {
    var statusF   = (document.getElementById('filterStatus')   || {}).value || '';
    var priorityF = (document.getElementById('filterPriority') || {}).value || '';
    var filtered  = _allComplaints.filter(function(c) {
      return (!statusF || c.status === statusF) && (!priorityF || c.priority === priorityF);
    });
    renderAdminTable(filtered);
  };

  // ── Init ──────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', function () {
    injectLiveTables();
    window.refreshDashboard();
    // Auto-refresh every 30 seconds
    setInterval(window.refreshDashboard, 30000);
  });

})();
