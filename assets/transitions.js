// Page transition animations + link preloading
(function() {
  'use strict';

  const DURATION = 150;
  let overlay = document.getElementById('sf-page-transition');

  // If overlay isn't inlined, create one
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sf-page-transition';
    overlay.style.cssText = 'position:fixed;inset:0;background:#1a1a2e;z-index:99999;opacity:0;pointer-events:none;transition:opacity ' + DURATION + 'ms ease;display:none;';
    document.body && document.body.appendChild(overlay);
  }

  function fadeIn() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, DURATION);
      });
    });
  }

  function fadeOutAndNavigate(url) {
    overlay.style.display = 'block';
    overlay.style.pointerEvents = 'auto';
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      setTimeout(() => { window.location.href = url; }, DURATION);
    });
  }

  function isInternalNav(href) {
    if (!href) return false;
    if (href.startsWith('http://') || href.startsWith('https://')) {
      // Allow same-origin
      try {
        const u = new URL(href);
        if (u.origin !== window.location.origin) return false;
      } catch { return false; }
    }
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    if (href.match(/\.(pdf|png|jpg|jpeg|gif|svg|zip|mp3|mp4)$/i)) return false;
    return true;
  }

  // Intercept link clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!isInternalNav(href)) return;
    if (link.target === '_blank') return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    fadeOutAndNavigate(href);
  });

  // Link preloading on hover (desktop only)
  const preloaded = new Set();
  function preload(url) {
    if (preloaded.has(url)) return;
    preloaded.add(url);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }

  if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (isInternalNav(href) && !href.startsWith('http')) {
        preload(href);
      }
    });
  }

  // Override window.location for fade transitions on programmatic nav
  // Wrap setters via assigning to window.sfNavigate
  window.sfNavigate = fadeOutAndNavigate;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fadeIn);
  } else {
    fadeIn();
  }

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      overlay.style.display = 'block';
      overlay.style.opacity = '1';
      fadeIn();
    }
  });
})();
