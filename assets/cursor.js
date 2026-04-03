// StudyFlow Custom Cursor System
(function() {
  'use strict';

  // Check if custom cursor is enabled
  function initCursor() {
    const cursorSetting = localStorage.getItem('sf-cursor') || 'default';

    if (cursorSetting === 'custom') {
      document.body.classList.add('custom-cursor');
      startParticleTrail();
    } else {
      document.body.classList.remove('custom-cursor');
    }
  }

  // Get theme accent color
  function getAccentColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#7c9885';
  }

  // Particle trail
  function startParticleTrail() {
    let lastX = 0;
    let lastY = 0;

    document.addEventListener('mousemove', (e) => {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only spawn particles if mouse moved enough
      if (dist > 20 && Math.random() > 0.5) {
        spawnParticle(e.clientX, e.clientY);
      }

      lastX = e.clientX;
      lastY = e.clientY;
    });
  }

  function spawnParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'sf-cursor-particle';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.background = getAccentColor();
    document.body.appendChild(particle);

    setTimeout(() => particle.classList.add('active'), 10);
    setTimeout(() => particle.remove(), 800);
  }

  // Add loading class when fetching
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    document.body.classList.add('loading');
    return originalFetch.apply(this, args).finally(() => {
      setTimeout(() => document.body.classList.remove('loading'), 300);
    });
  };

  // Initialize on load
  initCursor();

  // Listen for cursor setting changes
  window.addEventListener('storage', (e) => {
    if (e.key === 'sf-cursor') {
      initCursor();
    }
  });

  // Expose global function for settings to call
  window.updateCustomCursor = initCursor;

  console.log('StudyFlow Custom Cursor System loaded');
})();
