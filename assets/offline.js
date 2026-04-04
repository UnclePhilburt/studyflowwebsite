// Offline indicator - shows banner when connection drops
(function() {
  'use strict';

  let banner = null;

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

  function showOffline() {
    if (!banner) createBanner();
    banner.textContent = "You're offline. Some features may be unavailable.";
    banner.style.background = '#fff3cd';
    banner.style.color = '#856404';
    banner.style.borderBottom = '1px solid #ffc107';
    banner.style.transform = 'translateY(0)';
  }

  function showOnline() {
    if (!banner) return;
    banner.textContent = 'Back online!';
    banner.style.background = '#d4edda';
    banner.style.color = '#155724';
    banner.style.borderBottom = '1px solid #28a745';
    banner.style.transform = 'translateY(0)';
    setTimeout(() => {
      if (banner) banner.style.transform = 'translateY(-100%)';
    }, 2000);
  }

  window.addEventListener('offline', showOffline);
  window.addEventListener('online', showOnline);

  // Check on load
  if (!navigator.onLine) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showOffline);
    } else {
      showOffline();
    }
  }
})();
