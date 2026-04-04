// Offline & server status indicator
(function() {
  'use strict';

  const BACKEND_URL = 'https://studyflowsuite.onrender.com';
  const CHECK_INTERVAL = 60000; // check every 60s
  const INITIAL_DELAY = 5000;   // first check after 5s

  let banner = null;
  let serverDown = false;
  let checkTimer = null;

  function createBanner() {
    banner = document.createElement('div');
    banner.id = 'sf-offline-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 999997;
      text-align: center;
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 16px;
      transform: translateY(-100%);
      transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
      pointer-events: auto;
    `;
    document.body.appendChild(banner);
  }

  function showBanner(message, bg, color, border) {
    if (!banner) createBanner();
    banner.textContent = message;
    banner.style.background = bg;
    banner.style.color = color;
    banner.style.borderBottom = '1px solid ' + border;
    banner.style.transform = 'translateY(0)';
  }

  function hideBanner(delay) {
    if (!banner) return;
    setTimeout(() => {
      if (banner) banner.style.transform = 'translateY(-100%)';
    }, delay || 0);
  }

  // Offline / online (browser-level)
  function showOffline() {
    showBanner("You're offline. Some features may be unavailable.", '#fff3cd', '#856404', '#ffc107');
  }

  function showOnline() {
    if (serverDown) return; // don't show "back online" if server is still down
    showBanner('Back online!', '#d4edda', '#155724', '#28a745');
    hideBanner(2000);
  }

  window.addEventListener('offline', showOffline);
  window.addEventListener('online', () => {
    showOnline();
    // Recheck server when we come back online
    checkServer();
  });

  // Server health check
  async function checkServer() {
    if (!navigator.onLine) return;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(BACKEND_URL + '/health', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeout);

      if (res.ok) {
        if (serverDown) {
          serverDown = false;
          showBanner('Server is back! All features restored.', '#d4edda', '#155724', '#28a745');
          hideBanner(3000);
        }
      } else {
        onServerDown();
      }
    } catch (e) {
      onServerDown();
    }
  }

  function onServerDown() {
    if (serverDown) return; // already showing
    serverDown = true;
    showBanner('Server is waking up or temporarily unavailable. Some features may not work.', '#fce4ec', '#c62828', '#ef5350');
  }

  // Initial check + periodic polling
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!navigator.onLine) showOffline();
      setTimeout(checkServer, INITIAL_DELAY);
    });
  } else {
    if (!navigator.onLine) showOffline();
    setTimeout(checkServer, INITIAL_DELAY);
  }

  checkTimer = setInterval(checkServer, CHECK_INTERVAL);

  // Expose for manual check
  window.sfCheckServer = checkServer;
})();
