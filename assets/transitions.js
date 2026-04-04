// Page transition animations - smooth fade between pages
(function() {
  'use strict';

  const DURATION = 150; // ms

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'sf-page-transition';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: var(--bg-primary, #f5f4f0);
    z-index: 999999;
    opacity: 1;
    transition: opacity ${DURATION}ms ease;
    pointer-events: none;
  `;
  document.documentElement.appendChild(overlay);

  // Fade in on page load
  function fadeIn() {
    requestAnimationFrame(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, DURATION);
    });
  }

  // Fade out then navigate
  function fadeOutAndNavigate(url) {
    overlay.style.display = 'block';
    overlay.style.opacity = '0';
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      setTimeout(() => {
        window.location.href = url;
      }, DURATION);
    });
  }

  // Intercept link clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Skip external links, anchors, javascript:, mailto:, etc.
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    // Skip links with target="_blank"
    if (link.target === '_blank') return;

    // Skip if modifier keys held (user wants new tab)
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;

    // Skip non-HTML links
    if (href.match(/\.(pdf|png|jpg|jpeg|gif|svg|zip|mp3|mp4)$/i)) return;

    e.preventDefault();
    fadeOutAndNavigate(href);
  });

  // Expose for programmatic navigation
  window.sfNavigate = fadeOutAndNavigate;

  // Fade in when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fadeIn);
  } else {
    fadeIn();
  }

  // Also fade in on back/forward navigation
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      overlay.style.display = 'block';
      overlay.style.opacity = '1';
      fadeIn();
    }
  });
})();
