// PWA - Service worker registration and install prompt
(function() {
  'use strict';

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        console.log('SW registered:', reg.scope);
      }).catch((err) => {
        console.log('SW registration failed:', err);
      });
    });
  }

  // Capture install prompt
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  function showInstallBanner() {
    // Don't show if already installed or dismissed recently
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('sf-install-dismissed') === 'true') {
      const dismissed = parseInt(localStorage.getItem('sf-install-dismissed-at') || '0');
      if (Date.now() - dismissed < 7 * 24 * 60 * 60 * 1000) return; // 7 days
    }

    const banner = document.createElement('div');
    banner.id = 'sf-install-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 90px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      z-index: 99990;
      background: white;
      border-radius: 14px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      font-family: 'Inter', -apple-system, sans-serif;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
      max-width: 420px;
    `;

    // Dark theme
    const theme = localStorage.getItem('dashboard-theme') || '';
    if (['dark','midnight','ember','neon'].includes(theme)) {
      banner.style.background = '#2a2a2a';
      banner.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
    }

    const textColor = ['dark','midnight','ember','neon'].includes(theme) ? '#eee' : '#2d2d2d';
    const mutedColor = ['dark','midnight','ember','neon'].includes(theme) ? '#aaa' : '#888';

    banner.innerHTML = `
      <img src="icon128.png" width="40" height="40" style="border-radius:10px;" alt="StudyFlow">
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:600;color:${textColor};">Install StudyFlow</div>
        <div style="font-size:12px;color:${mutedColor};">Get the full app experience</div>
      </div>
      <button id="sf-install-btn" style="
        padding:8px 16px;border-radius:8px;border:none;
        background:#7c9885;color:white;font-size:13px;font-weight:600;
        cursor:pointer;font-family:inherit;white-space:nowrap;
      ">Install</button>
      <button id="sf-install-dismiss" style="
        background:none;border:none;color:${mutedColor};font-size:18px;
        cursor:pointer;padding:0 0 0 4px;line-height:1;
      ">&times;</button>
    `;

    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        banner.style.opacity = '1';
        banner.style.transform = 'translateX(-50%) translateY(0)';
      });
    });

    document.getElementById('sf-install-btn').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        banner.remove();
      }
      deferredPrompt = null;
    });

    document.getElementById('sf-install-dismiss').addEventListener('click', () => {
      localStorage.setItem('sf-install-dismissed', 'true');
      localStorage.setItem('sf-install-dismissed-at', String(Date.now()));
      banner.style.opacity = '0';
      banner.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => banner.remove(), 300);
    });
  }

  // Detect if running as installed PWA
  if (window.matchMedia('(display-mode: standalone)').matches) {
    document.documentElement.classList.add('pwa-standalone');
  }
})();
