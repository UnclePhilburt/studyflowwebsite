// Toast notification system - replaces alert() with smooth slide-in toasts
(function() {
  'use strict';

  // Create container
  const container = document.createElement('div');
  container.id = 'sf-toast-container';
  document.body.appendChild(container);

  const ICONS = {
    success: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    warning: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration - Auto-dismiss in ms (0 = manual dismiss only)
   */
  function showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `sf-toast ${type}`;

    // Clean up newlines for display
    const cleanMsg = message.replace(/\n/g, '<br>');

    toast.innerHTML = `
      <div class="sf-toast-icon">${ICONS[type] || ICONS.info}</div>
      <div class="sf-toast-body">
        <div class="sf-toast-msg">${cleanMsg}</div>
      </div>
      <button class="sf-toast-close" aria-label="Dismiss">&times;</button>
    `;

    // Close button
    toast.querySelector('.sf-toast-close').addEventListener('click', () => removeToast(toast));

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('visible');
      });
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => removeToast(toast), duration);
    }

    // Limit to 5 visible toasts
    const toasts = container.querySelectorAll('.sf-toast');
    if (toasts.length > 5) {
      removeToast(toasts[0]);
    }

    return toast;
  }

  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('visible');
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }

  // Override native alert()
  const originalAlert = window.alert;
  window.alert = function(message) {
    if (!message) return;
    const msg = String(message);

    // Detect type from message content
    let type = 'info';
    const lower = msg.toLowerCase();
    if (lower.includes('fail') || lower.includes('error') || lower.includes('could not') || lower.includes('unable')) {
      type = 'error';
    } else if (lower.includes('success') || lower.includes('imported') || lower.includes('sent') || lower.includes('copied') || lower.includes('created')) {
      type = 'success';
    } else if (lower.includes('required') || lower.includes('limit') || lower.includes('warning') || lower.includes('must')) {
      type = 'warning';
    }

    // Longer duration for longer messages
    const duration = msg.length > 100 ? 6000 : 4000;

    showToast(msg, type, duration);
  };

  // Also expose for direct use
  window.sfToast = showToast;

  // Move container to body when DOM is ready (in case script loaded in head)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!container.parentNode || container.parentNode !== document.body) {
        document.body.appendChild(container);
      }
    });
  }
})();
