// Global Notifications - social + study notifications on every page
(function() {
  'use strict';

  const BACKEND_URL = 'https://studyflowsuite.onrender.com';
  const CHECK_INTERVAL = 60000; // Check every 60s

  // Skip pages that don't need it
  const page = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
  if (page.startsWith('admin') || page === 'signup' || page === 'shared' || page === 'index' ||
      page === 'reset-password' || page === 'verify-age' || page === 'verify-edu') return;
  // Dashboard has its own notification system
  if (page === 'dashboard') return;

  let authToken = null;
  let bellEl = null;
  let badgeEl = null;
  let dropdownEl = null;

  function getToken() {
    if (authToken) return authToken;
    authToken = localStorage.getItem('auth_token');
    return authToken;
  }

  function buildUI() {
    // Create bell icon (fixed top-right)
    const wrap = document.createElement('div');
    wrap.id = 'sf-notif-wrap';
    wrap.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9990;font-family:Inter,-apple-system,sans-serif;';

    wrap.innerHTML = `
      <button id="sf-notif-bell" style="
        width:40px;height:40px;border-radius:10px;border:none;
        background:var(--widget-bg,rgba(255,255,255,0.8));backdrop-filter:blur(20px);
        box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer;
        display:flex;align-items:center;justify-content:center;position:relative;
        transition:all 0.15s;
      " aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-primary,#2d2d2d);">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <div id="sf-notif-badge" style="
          position:absolute;top:-2px;right:-2px;min-width:16px;height:16px;
          background:#ef4444;color:white;border-radius:8px;font-size:10px;
          font-weight:700;display:none;align-items:center;justify-content:center;
          padding:0 4px;border:2px solid var(--bg-primary,white);
        "></div>
      </button>
      <div id="sf-notif-dropdown" style="
        display:none;position:absolute;top:48px;right:0;width:340px;max-height:420px;
        background:var(--card-bg,white);border:1px solid var(--border-color,#eee);
        border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.12);overflow:hidden;
      ">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border-color,#eee);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:14px;font-weight:700;color:var(--text-primary,#2d2d2d);">Notifications</span>
          <a href="social.html" style="font-size:11px;color:var(--accent-primary,#7c9885);text-decoration:none;font-weight:600;">View Social</a>
        </div>
        <div id="sf-notif-list" style="overflow-y:auto;max-height:360px;"></div>
      </div>
    `;

    document.body.appendChild(wrap);

    bellEl = document.getElementById('sf-notif-bell');
    badgeEl = document.getElementById('sf-notif-badge');
    dropdownEl = document.getElementById('sf-notif-dropdown');

    bellEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const showing = dropdownEl.style.display === 'block';
      dropdownEl.style.display = showing ? 'none' : 'block';
      if (!showing) loadNotifications();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#sf-notif-wrap')) {
        dropdownEl.style.display = 'none';
      }
    });
  }

  async function loadNotifications() {
    const token = getToken();
    if (!token) return;

    const list = document.getElementById('sf-notif-list');
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-size:13px;">Loading...</div>';

    let items = [];

    // Fetch study notifications
    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        (data.notifications || data || []).forEach(n => {
          items.push({
            type: 'study',
            title: n.title || 'Notification',
            message: n.message || '',
            read: n.read,
            created_at: n.created_at
          });
        });
      }
    } catch {}

    // Fetch social activity
    try {
      const res = await fetch(`${BACKEND_URL}/api/social/activity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        (data.activities || []).forEach(a => {
          let title, message;
          if (a.type === 'vote') {
            title = `${a.username} liked your post`;
            message = '';
          } else if (a.type === 'comment') {
            title = `${a.username} commented`;
            message = a.detail || '';
          } else if (a.type === 'follow') {
            title = `${a.username} followed you`;
            message = '';
          } else {
            title = `${a.username} interacted`;
            message = '';
          }
          items.push({
            type: 'social',
            title,
            message,
            read: false,
            created_at: a.created_at
          });
        });
      }
    } catch {}

    // Sort by time
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    items = items.slice(0, 20);

    if (items.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-size:13px;">No notifications yet</div>';
      return;
    }

    list.innerHTML = items.map(item => {
      const icon = item.type === 'social' ? '&#x1F4AC;' : '&#x1F4CB;';
      const time = getRelativeTime(item.created_at);
      const unread = !item.read ? 'background:rgba(124,152,133,0.06);' : '';

      return `<div style="padding:10px 16px;border-bottom:1px solid var(--border-color,#eee);${unread}display:flex;gap:10px;align-items:flex-start;">
        <span style="font-size:16px;flex-shrink:0;margin-top:2px;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:var(--text-primary,#2d2d2d);font-weight:${item.read ? '400' : '600'};line-height:1.4;">${item.title}</div>
          ${item.message ? `<div style="font-size:12px;color:var(--text-muted,#999);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.message}</div>` : ''}
          <div style="font-size:10px;color:var(--text-muted,#999);margin-top:3px;">${time}</div>
        </div>
      </div>`;
    }).join('');
  }

  async function checkUnread() {
    const token = getToken();
    if (!token) return;

    let count = 0;

    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const notifs = data.notifications || data || [];
        count += notifs.filter(n => !n.read).length;
      }
    } catch {}

    // Social activity count (approximate -- count recent items)
    try {
      const res = await fetch(`${BACKEND_URL}/api/social/activity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Count activities from last 24 hours
        const dayAgo = Date.now() - 86400000;
        count += (data.activities || []).filter(a => new Date(a.created_at) > dayAgo).length;
      }
    } catch {}

    if (badgeEl) {
      if (count > 0) {
        badgeEl.textContent = count > 99 ? '99+' : count;
        badgeEl.style.display = 'flex';
      } else {
        badgeEl.style.display = 'none';
      }
    }
  }

  function getRelativeTime(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return then.toLocaleDateString();
  }

  function init() {
    buildUI();
    // Initial check
    setTimeout(checkUnread, 2000);
    // Periodic check
    setInterval(checkUnread, CHECK_INTERVAL);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }
})();
