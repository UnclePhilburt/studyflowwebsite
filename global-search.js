// ============ GLOBAL SEARCH (Cmd+K) ============
// Include this script on any page to enable global search.
// Requires: authToken variable, BACKEND_URL variable

(function() {
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    .gs-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(6px);
      z-index: 10000;
      display: none;
      align-items: flex-start;
      justify-content: center;
      padding-top: min(20vh, 160px);
    }
    .gs-overlay.visible { display: flex; }

    .gs-modal {
      background: var(--bg-tertiary, rgba(255,255,255,0.98));
      border: 1px solid var(--border-color, rgba(139,157,131,0.2));
      border-radius: 16px;
      width: 90%;
      max-width: 560px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      overflow: hidden;
      animation: gsSlideIn 0.15s ease;
    }

    @keyframes gsSlideIn {
      from { opacity: 0; transform: translateY(-10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .gs-input-wrap {
      display: flex;
      align-items: center;
      padding: 14px 18px;
      gap: 12px;
      border-bottom: 1px solid var(--border-color, rgba(139,157,131,0.15));
    }

    .gs-input-wrap svg {
      width: 20px; height: 20px;
      stroke: var(--text-muted, #9B8B7E);
      fill: none; stroke-width: 2;
      stroke-linecap: round; stroke-linejoin: round;
      flex-shrink: 0;
    }

    .gs-input {
      flex: 1;
      border: none;
      background: none;
      font-size: 16px;
      font-family: inherit;
      color: var(--text-primary, #2C2C2C);
      outline: none;
    }

    .gs-input::placeholder {
      color: var(--text-muted, #9B8B7E);
    }

    .gs-kbd {
      font-size: 11px;
      color: var(--text-muted, #9B8B7E);
      background: var(--hover-bg, rgba(139,157,131,0.08));
      border: 1px solid var(--border-color, rgba(139,157,131,0.2));
      border-radius: 5px;
      padding: 2px 6px;
      font-family: inherit;
      flex-shrink: 0;
    }

    .gs-results {
      max-height: 400px;
      overflow-y: auto;
      padding: 8px;
    }

    .gs-results::-webkit-scrollbar { width: 4px; }
    .gs-results::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }

    .gs-group-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-muted, #9B8B7E);
      padding: 8px 12px 4px;
    }

    .gs-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
      text-decoration: none;
      color: var(--text-primary, #2C2C2C);
      transition: background 0.1s;
    }

    .gs-item:hover, .gs-item.gs-active {
      background: var(--hover-bg, rgba(139,157,131,0.08));
    }

    .gs-item-icon {
      width: 36px; height: 36px;
      border-radius: 10px;
      background: var(--hover-bg, rgba(139,157,131,0.08));
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .gs-item-icon svg {
      width: 16px; height: 16px;
      stroke: var(--accent-primary, #8B9D83);
      fill: none; stroke-width: 1.5;
      stroke-linecap: round; stroke-linejoin: round;
    }

    .gs-item-info { flex: 1; min-width: 0; }

    .gs-item-title {
      font-size: 13px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .gs-item-sub {
      font-size: 11px;
      color: var(--text-muted, #9B8B7E);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .gs-item-arrow {
      color: var(--text-muted, #9B8B7E);
      flex-shrink: 0;
      opacity: 0;
      transition: opacity 0.1s;
    }

    .gs-item:hover .gs-item-arrow { opacity: 1; }

    .gs-empty {
      text-align: center;
      padding: 24px;
      color: var(--text-muted, #9B8B7E);
      font-size: 13px;
    }

    .gs-footer {
      padding: 8px 16px;
      border-top: 1px solid var(--border-color, rgba(139,157,131,0.15));
      display: flex;
      gap: 16px;
      font-size: 10px;
      color: var(--text-muted, #9B8B7E);
    }

    .gs-footer span { display: flex; align-items: center; gap: 4px; }
    .gs-footer kbd {
      font-size: 10px;
      background: var(--hover-bg, rgba(139,157,131,0.08));
      border: 1px solid var(--border-color);
      border-radius: 3px;
      padding: 1px 4px;
      font-family: inherit;
    }

    @media (max-width: 768px) {
      .gs-overlay { padding-top: 20px; }
      .gs-modal { width: 95%; max-width: none; border-radius: 14px; }
      .gs-kbd { display: none; }
      .gs-footer { display: none; }
    }
  `;
  document.head.appendChild(style);

  // Inject HTML
  const overlay = document.createElement('div');
  overlay.className = 'gs-overlay';
  overlay.id = 'gsOverlay';
  overlay.innerHTML = `
    <div class="gs-modal" id="gsModal">
      <div class="gs-input-wrap">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input class="gs-input" id="gsInput" placeholder="Search notes, chats, groups..." autocomplete="off" autofocus>
        <span class="gs-kbd">ESC</span>
      </div>
      <div class="gs-results" id="gsResults">
        <div class="gs-empty">Type to search across StudyFlow</div>
      </div>
      <div class="gs-footer">
        <span><kbd>↑↓</kbd> Navigate</span>
        <span><kbd>Enter</kbd> Open</span>
        <span><kbd>Esc</kbd> Close</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeSearch();
  });

  // Prevent modal click from closing
  document.getElementById('gsModal').addEventListener('click', function(e) {
    e.stopPropagation();
  });

  const ICONS = {
    note: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    group: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    event: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    nexus: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>'
  };

  const LABELS = {
    notes: 'My Notes',
    chats: 'Conversations',
    groups: 'Study Groups',
    events: 'Calendar',
    nexus: 'Nexus'
  };

  let searchTimeout = null;
  let activeIndex = -1;
  let allItems = [];

  function openSearch() {
    overlay.classList.add('visible');
    const input = document.getElementById('gsInput');
    input.value = '';
    input.focus();
    document.getElementById('gsResults').innerHTML = '<div class="gs-empty">Type to search across StudyFlow</div>';
    activeIndex = -1;
    allItems = [];
  }

  function closeSearch() {
    overlay.classList.remove('visible');
  }

  // Keyboard shortcut: Cmd+K or Ctrl+K
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (overlay.classList.contains('visible')) {
        closeSearch();
      } else {
        openSearch();
      }
    }
    if (e.key === 'Escape' && overlay.classList.contains('visible')) {
      closeSearch();
    }
  });

  // Search input handler
  document.getElementById('gsInput').addEventListener('input', function(e) {
    const q = e.target.value.trim();
    if (searchTimeout) clearTimeout(searchTimeout);

    if (q.length < 2) {
      document.getElementById('gsResults').innerHTML = '<div class="gs-empty">Type to search across StudyFlow</div>';
      return;
    }

    document.getElementById('gsResults').innerHTML = '<div class="gs-empty">Searching...</div>';

    searchTimeout = setTimeout(function() {
      doSearch(q);
    }, 200);
  });

  // Keyboard navigation
  document.getElementById('gsInput').addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, allItems.length - 1);
      highlightItem();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      highlightItem();
    } else if (e.key === 'Enter' && activeIndex >= 0 && allItems[activeIndex]) {
      e.preventDefault();
      window.location.href = allItems[activeIndex].url;
    }
  });

  function highlightItem() {
    document.querySelectorAll('.gs-item').forEach(function(el, i) {
      el.classList.toggle('gs-active', i === activeIndex);
      if (i === activeIndex) el.scrollIntoView({ block: 'nearest' });
    });
  }

  async function doSearch(q) {
    try {
      // Get auth token from page
      var token = window.authToken;
      if (!token) {
        // Try to get from Supabase session
        if (window.supabaseClient) {
          var sess = await window.supabaseClient.auth.getSession();
          if (sess.data && sess.data.session) token = sess.data.session.access_token;
        }
      }

      var backendUrl = window.BACKEND_URL || 'https://studyflowsuite.onrender.com';

      var res = await fetch(backendUrl + '/api/search?q=' + encodeURIComponent(q), {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (!res.ok) throw new Error('Search failed');

      var data = await res.json();
      var results = data.results || {};

      renderResults(results, q);

    } catch(e) {
      document.getElementById('gsResults').innerHTML = '<div class="gs-empty">Search unavailable</div>';
    }
  }

  function renderResults(results, query) {
    var container = document.getElementById('gsResults');
    var html = '';
    allItems = [];
    activeIndex = -1;

    var categories = ['notes', 'chats', 'groups', 'events', 'nexus'];
    var hasResults = false;

    categories.forEach(function(cat) {
      var items = results[cat];
      if (!items || items.length === 0) return;
      hasResults = true;

      html += '<div class="gs-group-label">' + (LABELS[cat] || cat) + '</div>';

      items.forEach(function(item) {
        var icon = ICONS[item.type] || ICONS.note;
        var title = (item.title || '').replace(/</g, '&lt;');
        var sub = (item.subtitle || '').replace(/</g, '&lt;');

        // Highlight matching text
        var re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        title = title.replace(re, '<strong style="color:var(--accent-primary);">$1</strong>');

        html += '<a class="gs-item" href="' + item.url + '">' +
          '<div class="gs-item-icon">' + icon + '</div>' +
          '<div class="gs-item-info">' +
            '<div class="gs-item-title">' + title + '</div>' +
            (sub ? '<div class="gs-item-sub">' + sub + '</div>' : '') +
          '</div>' +
          '<div class="gs-item-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' +
        '</a>';

        allItems.push(item);
      });
    });

    if (!hasResults) {
      html = '<div class="gs-empty">No results for "' + query.replace(/</g, '&lt;') + '"</div>';
    }

    container.innerHTML = html;
  }

  // Expose open/close for other scripts
  window.openGlobalSearch = openSearch;
  window.closeGlobalSearch = closeSearch;
})();
