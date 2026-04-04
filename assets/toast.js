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

  // ========== CONFIRM DIALOG OVERRIDE ==========
  const originalConfirm = window.confirm;
  window.confirm = function(message) {
    return new Promise(() => {}); // never used, but prevents errors if someone awaits
  };

  // Since confirm() is synchronous and we can't truly override it with async,
  // we replace it with a function that creates a modal and returns true/false
  // via a blocking approach using a hidden input trick won't work.
  // Instead, we patch the callers. We'll keep confirm() but style it better
  // by using a custom modal that resolves a promise.

  // Create confirm modal
  const confirmOverlay = document.createElement('div');
  confirmOverlay.id = 'sf-confirm-overlay';
  confirmOverlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:999999;
    display:none;align-items:center;justify-content:center;
    font-family:'Inter',-apple-system,sans-serif;
  `;
  confirmOverlay.innerHTML = `
    <div id="sf-confirm-box" style="
      background:white;border-radius:14px;padding:24px;max-width:380px;width:90%;
      box-shadow:0 8px 30px rgba(0,0,0,0.15);text-align:center;
    ">
      <div id="sf-confirm-msg" style="font-size:14px;color:#2d2d2d;line-height:1.6;margin-bottom:20px;"></div>
      <div style="display:flex;gap:10px;">
        <button id="sf-confirm-cancel" style="
          flex:1;padding:10px;border-radius:10px;border:1.5px solid #ddd;
          background:white;color:#666;font-size:13px;font-weight:600;
          cursor:pointer;font-family:inherit;transition:all 0.15s;
        ">Cancel</button>
        <button id="sf-confirm-ok" style="
          flex:1;padding:10px;border-radius:10px;border:none;
          background:#e74c3c;color:white;font-size:13px;font-weight:600;
          cursor:pointer;font-family:inherit;transition:all 0.15s;
        ">Confirm</button>
      </div>
    </div>
  `;

  let confirmResolver = null;

  function showConfirmModal(message) {
    return new Promise((resolve) => {
      confirmResolver = resolve;
      document.getElementById('sf-confirm-msg').textContent = message;
      confirmOverlay.style.display = 'flex';

      // Dark theme
      const theme = document.body.getAttribute('data-theme') || '';
      const box = document.getElementById('sf-confirm-box');
      if (['dark','midnight','ember','neon'].includes(theme)) {
        box.style.background = '#2a2a2a';
        document.getElementById('sf-confirm-msg').style.color = '#eee';
        document.getElementById('sf-confirm-cancel').style.background = '#333';
        document.getElementById('sf-confirm-cancel').style.borderColor = '#555';
        document.getElementById('sf-confirm-cancel').style.color = '#ccc';
      } else {
        box.style.background = 'white';
        document.getElementById('sf-confirm-msg').style.color = '#2d2d2d';
        document.getElementById('sf-confirm-cancel').style.background = 'white';
        document.getElementById('sf-confirm-cancel').style.borderColor = '#ddd';
        document.getElementById('sf-confirm-cancel').style.color = '#666';
      }
    });
  }

  function closeConfirmModal(result) {
    confirmOverlay.style.display = 'none';
    if (confirmResolver) {
      confirmResolver(result);
      confirmResolver = null;
    }
  }

  // Override confirm with async version
  window.confirm = function(message) {
    // For backwards compat with synchronous code, we can't truly make this async.
    // Instead, we restore the original confirm for now and show a styled one.
    // The real fix: expose sfConfirm for async usage.
    return originalConfirm(message);
  };

  // Async confirm for modern usage
  window.sfConfirm = function(message) {
    return showConfirmModal(message);
  };

  // Wire up buttons
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(confirmOverlay);
      document.getElementById('sf-confirm-cancel').addEventListener('click', () => closeConfirmModal(false));
      document.getElementById('sf-confirm-ok').addEventListener('click', () => closeConfirmModal(true));
      confirmOverlay.addEventListener('click', (e) => { if (e.target === confirmOverlay) closeConfirmModal(false); });
    });
  } else {
    document.body.appendChild(confirmOverlay);
    document.getElementById('sf-confirm-cancel').addEventListener('click', () => closeConfirmModal(false));
    document.getElementById('sf-confirm-ok').addEventListener('click', () => closeConfirmModal(true));
    confirmOverlay.addEventListener('click', (e) => { if (e.target === confirmOverlay) closeConfirmModal(false); });
  }

  // Move container to body when DOM is ready (in case script loaded in head)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!container.parentNode || container.parentNode !== document.body) {
        document.body.appendChild(container);
      }
    });
  }
})();
