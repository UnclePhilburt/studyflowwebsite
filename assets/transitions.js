// Page transition animations - smooth fade between pages
// The overlay div and its initial CSS are inlined in each page's <head> for instant paint.
// This script handles fade-in on load and fade-out on navigation.
(function() {
  'use strict';

  const DURATION = 150;
  const overlay = document.getElementById('sf-page-transition');
  if (!overlay) return;

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
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      setTimeout(() => { window.location.href = url; }, DURATION);
    });
  }

  // Intercept link clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (link.target === '_blank') return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (href.match(/\.(pdf|png|jpg|jpeg|gif|svg|zip|mp3|mp4)$/i)) return;
    e.preventDefault();
    fadeOutAndNavigate(href);
  });

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
