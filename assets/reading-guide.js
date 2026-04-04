// Reading Guide - translucent horizontal bar that follows the mouse
(function() {
  'use strict';

  const STORAGE_KEY = 'sf-reading-guide';
  let guide = null;
  let enabled = false;

  function createGuide() {
    guide = document.createElement('div');
    guide.id = 'sf-reading-guide';
    guide.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      top: -50px;
      height: 36px;
      background: rgba(124, 152, 133, 0.15);
      border-top: 2px solid rgba(124, 152, 133, 0.4);
      border-bottom: 2px solid rgba(124, 152, 133, 0.4);
      pointer-events: none;
      z-index: 99980;
      display: none;
    `;
    document.body.appendChild(guide);
  }

  function onMouseMove(e) {
    if (!enabled || !guide) return;
    guide.style.top = (e.clientY - 18) + 'px';
  }

  function toggle() {
    enabled = !enabled;
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    if (guide) {
      guide.style.display = enabled ? 'block' : 'none';
    }
  }

  function init() {
    const path = window.location.pathname.toLowerCase();
    const page = path.split('/').pop().replace('.html', '') || 'index';
    if (page.startsWith('admin') || page === 'signup' || page === 'reset-password') return;

    createGuide();

    // Restore saved state
    if (localStorage.getItem(STORAGE_KEY) === 'on') {
      enabled = true;
      guide.style.display = 'block';
    }

    document.addEventListener('mousemove', onMouseMove);

    // Expose toggle globally
    window.toggleReadingGuide = toggle;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
