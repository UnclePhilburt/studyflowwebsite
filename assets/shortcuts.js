// StudyFlow Keyboard Shortcuts System
(function() {
  'use strict';

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? 'Cmd' : 'Ctrl';

  // Chord state: tracks first key of a two-key combo (e.g. G then D)
  let chordKey = null;
  let chordTimer = null;
  const CHORD_TIMEOUT = 800; // ms to press second key

  // ========== SHORTCUT DEFINITIONS ==========
  // Global shortcuts available on every page
  const GLOBAL_SHORTCUTS = [
    { keys: [modKey, 'K'], label: 'Search', fn: () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: isMac, ctrlKey: !isMac })); } },
    { keys: ['/'], label: 'Show keyboard shortcuts', fn: () => toggleShortcutsPanel() },
    { keys: ['L'], label: 'Toggle reading guide', fn: () => { if (window.toggleReadingGuide) window.toggleReadingGuide(); } },
    { keys: ['Esc'], label: 'Close panel / modal', fn: null },
  ];

  const NAV_SHORTCUTS = [
    { keys: ['G', 'D'], label: 'Go to Dashboard', fn: () => { window.location.href = 'dashboard.html'; } },
    { keys: ['G', 'N'], label: 'Go to Notes', fn: () => { window.location.href = 'notes.html'; } },
    { keys: ['G', 'C'], label: 'Go to Chat', fn: () => { window.location.href = 'chat.html'; } },
    { keys: ['G', 'B'], label: 'Go to Browse', fn: () => { window.location.href = 'browse.html'; } },
    { keys: ['G', 'F'], label: 'Go to Flashcards', fn: () => { window.location.href = 'flashcards.html'; } },
    { keys: ['G', 'L'], label: 'Go to Leaderboard', fn: () => { window.location.href = 'leaderboard.html'; } },
    { keys: ['G', 'K'], label: 'Go to Calendar', fn: () => { window.location.href = 'calendar.html'; } },
    { keys: ['G', 'S'], label: 'Go to Study Groups', fn: () => { window.location.href = 'study-groups.html'; } },
    { keys: ['G', 'A'], label: 'Go to Account', fn: () => { window.location.href = 'account.html'; } },
    { keys: ['G', 'O'], label: 'Go to Office', fn: () => { window.location.href = 'office.html'; } },
  ];

  // Page-specific shortcuts
  const PAGE_SHORTCUTS = {
    'dashboard': {
      title: 'Dashboard',
      shortcuts: [
        { keys: ['S'], label: 'Open settings panel', fn: () => { if (window.toggleSettingsPanel) window.toggleSettingsPanel(); } },
        { keys: ['W'], label: 'Add a widget', fn: () => { document.getElementById('widgetPicker')?.classList.add('active'); } },
        { keys: ['R'], label: 'Reset canvas view', fn: () => { if (window.resetCanvasView) window.resetCanvasView(); } },
        { keys: ['+'], label: 'Zoom in', fn: () => { if (window.zoomCanvas) window.zoomCanvas(1.2); } },
        { keys: ['-'], label: 'Zoom out', fn: () => { if (window.zoomCanvas) window.zoomCanvas(0.8); } },
      ]
    },
    'notes': {
      title: 'Notes',
      shortcuts: [
        { keys: ['U'], label: 'Upload notes', fn: () => { if (window.showUploadModal) window.showUploadModal(); } },
        { keys: ['N'], label: 'New note', fn: () => { if (window.createNewNote) window.createNewNote(); } },
        { keys: ['F'], label: 'New folder', fn: () => { if (window.showNewFolderModal) window.showNewFolderModal(); } },
        { keys: ['G'], label: 'Toggle grid / free mode', fn: () => { if (window.toggleGridMode) window.toggleGridMode(); } },
        { keys: ['1'], label: 'Show favorites', fn: () => { if (window.toggleFavoritesFilter) window.toggleFavoritesFilter(); } },
        { keys: ['2'], label: 'Show shared', fn: () => { if (window.toggleSharedFilter) window.toggleSharedFilter(); } },
        { keys: ['Backspace'], label: 'Go to root folder', fn: () => { if (window.navigateToRoot) window.navigateToRoot(); } },
      ]
    },
    'chat': {
      title: 'Chat',
      shortcuts: [
        { keys: ['N'], label: 'New conversation', fn: () => { if (window.startNewChat) window.startNewChat(); } },
        { keys: ['H'], label: 'Go home', fn: () => { if (window.navigateHome) window.navigateHome(); } },
        { keys: ['F'], label: 'Fit all to screen', fn: () => { if (window.fitAll) window.fitAll(); } },
      ]
    },
    'browse': {
      title: 'Browse',
      shortcuts: [
        { keys: ['S'], label: 'Focus search', fn: () => { const s = document.querySelector('input[type="search"], input[type="text"]'); if (s) s.focus(); } },
        { keys: ['A'], label: 'Advanced filters', fn: () => { if (window.toggleAdvFilters) window.toggleAdvFilters(); } },
        { keys: ['X'], label: 'Clear filters', fn: () => { if (window.clearAdvFilters) window.clearAdvFilters(); } },
      ]
    },
    'flashcards': {
      title: 'Flashcards',
      shortcuts: [
        { keys: ['T'], label: 'Focus topic input', fn: () => { const i = document.getElementById('topicInput'); if (i) i.focus(); } },
        { keys: ['R'], label: 'Race a friend', fn: () => { if (window.generateCode) window.generateCode(); } },
        { keys: ['Enter'], label: 'Start quiz / Submit answer', fn: null },
      ]
    },
    'calendar': {
      title: 'Calendar',
      shortcuts: [
        { keys: ['ArrowLeft'], label: 'Previous month', fn: () => { if (window.previousMonth) window.previousMonth(); } },
        { keys: ['ArrowRight'], label: 'Next month', fn: () => { if (window.nextMonth) window.nextMonth(); } },
        { keys: ['I'], label: 'Import events', fn: () => { if (window.openCanvasImportModal) window.openCanvasImportModal(); } },
      ]
    },
    'leaderboard': {
      title: 'Leaderboard',
      shortcuts: [
        { keys: ['T'], label: 'Toggle sidebar', fn: () => { if (window.toggleSidebar) window.toggleSidebar(); } },
      ]
    },
    'study-groups': {
      title: 'Study Groups',
      shortcuts: [
        { keys: ['N'], label: 'Create new group', fn: () => { if (window.createGroup) window.createGroup(); } },
        { keys: ['I'], label: 'Invite user', fn: () => { if (window.inviteUser) window.inviteUser(); } },
        { keys: ['Escape'], label: 'Close group', fn: () => { if (window.closeGroup) window.closeGroup(); } },
      ]
    },
    'account': {
      title: 'Account',
      shortcuts: [
        { keys: ['E'], label: 'Verify .edu email', fn: () => { if (window.showEduEmailModal) window.showEduEmailModal(); } },
      ]
    },
    'note-viewer': {
      title: 'Note Viewer',
      shortcuts: [
        { keys: ['D'], label: 'Download note', fn: () => { if (window.downloadNote) window.downloadNote(); } },
        { keys: ['A'], label: 'Annotate note', fn: () => { if (window.openAnnotationEditor) window.openAnnotationEditor(); } },
      ]
    },
    'office': {
      title: 'Office',
      shortcuts: [
        { keys: [modKey, 'S'], label: 'Save document', fn: null },
        { keys: ['N'], label: 'New document', fn: () => { if (window.createDocument) window.createDocument('docx'); } },
      ]
    },
    'index': {
      title: 'Home',
      shortcuts: []
    }
  };

  // ========== DETECT PAGE ==========
  function detectPage() {
    const path = window.location.pathname.toLowerCase();
    const filename = path.split('/').pop().replace('.html', '') || 'index';
    if (filename === 'index' || filename === '' || filename === '/') return 'index';
    return filename;
  }

  // ========== BUILD PANEL ==========
  function buildPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'shortcuts-overlay';
    overlay.id = 'shortcutsOverlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeShortcutsPanel();
    });

    const page = detectPage();
    const pageConfig = PAGE_SHORTCUTS[page];

    let sectionsHtml = '';

    // Page-specific shortcuts first
    if (pageConfig && pageConfig.shortcuts.length > 0) {
      sectionsHtml += buildSection(pageConfig.title, pageConfig.shortcuts);
    }

    // Navigation shortcuts
    sectionsHtml += buildSection('Navigation (G then ...)', NAV_SHORTCUTS);

    // Global shortcuts
    sectionsHtml += buildSection('Global', GLOBAL_SHORTCUTS);

    overlay.innerHTML = `
      <div class="shortcuts-panel">
        <div class="shortcuts-header">
          <div>
            <span class="shortcuts-title">Keyboard Shortcuts</span>
            <span class="shortcuts-subtitle">${pageConfig ? pageConfig.title : 'General'}</span>
          </div>
          <button class="shortcuts-close" onclick="document.getElementById('shortcutsOverlay').classList.remove('visible')">&times;</button>
        </div>
        <div class="shortcuts-body">
          ${sectionsHtml}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function buildSection(title, shortcuts) {
    if (!shortcuts || shortcuts.length === 0) return '';
    const rows = shortcuts.map(s => {
      // Use "then" for chord shortcuts (like G then D), "+" for modifier combos (like Cmd+K)
      const isChord = s.keys.length === 2 && s.keys[0].length === 1 && s.keys[1].length === 1;
      const separator = isChord
        ? '<span class="shortcut-plus" style="font-size:10px;color:#aaa;">then</span>'
        : '<span class="shortcut-plus">+</span>';
      const keysHtml = s.keys.map(k => {
        const display = formatKey(k);
        return `<span class="shortcut-key">${display}</span>`;
      }).join(separator);

      return `<div class="shortcut-row">
        <span class="shortcut-label">${s.label}</span>
        <span class="shortcut-keys">${keysHtml}</span>
      </div>`;
    }).join('');

    return `<div class="shortcuts-section">
      <div class="shortcuts-section-title">${title}</div>
      <div class="shortcuts-list">${rows}</div>
    </div>`;
  }

  function formatKey(key) {
    const map = {
      'Cmd': isMac ? '&#8984;' : 'Ctrl',
      'Ctrl': 'Ctrl',
      'Shift': isMac ? '&#8679;' : 'Shift',
      'Alt': isMac ? '&#8997;' : 'Alt',
      'Enter': '&#9166;',
      'Esc': 'Esc',
      'Escape': 'Esc',
      'Backspace': '&#9003;',
      'ArrowLeft': '&#8592;',
      'ArrowRight': '&#8594;',
      'ArrowUp': '&#8593;',
      'ArrowDown': '&#8595;',
    };
    return map[key] || key;
  }

  // ========== TOGGLE ==========
  function toggleShortcutsPanel() {
    const overlay = document.getElementById('shortcutsOverlay');
    if (!overlay) return;
    if (overlay.classList.contains('visible')) {
      closeShortcutsPanel();
    } else {
      overlay.classList.add('visible');
    }
  }

  // Expose globally so buttons can call it
  window.toggleShortcutsPanel = toggleShortcutsPanel;

  function closeShortcutsPanel() {
    const overlay = document.getElementById('shortcutsOverlay');
    if (overlay) overlay.classList.remove('visible');
  }

  // ========== KEYBOARD HANDLER ==========
  function handleKeyDown(e) {
    // Don't fire shortcuts when typing in inputs
    const tag = e.target.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

    // ? or / opens shortcuts (unless in input)
    if ((e.key === '?' || e.key === '/') && !isInput) {
      e.preventDefault();
      toggleShortcutsPanel();
      return;
    }

    // Escape closes the panel
    if (e.key === 'Escape') {
      const overlay = document.getElementById('shortcutsOverlay');
      if (overlay && overlay.classList.contains('visible')) {
        e.preventDefault();
        e.stopPropagation();
        closeShortcutsPanel();
        return;
      }
    }

    // Don't fire other shortcuts when in input, or when modifier keys are held
    if (isInput || e.ctrlKey || e.metaKey || e.altKey) return;

    // Panel must be closed for shortcuts to work
    const overlay = document.getElementById('shortcutsOverlay');
    if (overlay && overlay.classList.contains('visible')) return;

    const pressedKey = e.key.toUpperCase();

    // Check if this is the second key of a chord (e.g. G then D)
    if (chordKey) {
      const firstKey = chordKey;
      chordKey = null;
      if (chordTimer) { clearTimeout(chordTimer); chordTimer = null; }

      for (const shortcut of NAV_SHORTCUTS) {
        if (!shortcut.fn || shortcut.keys.length !== 2) continue;
        if (shortcut.keys[0].toUpperCase() === firstKey && shortcut.keys[1].toUpperCase() === pressedKey) {
          e.preventDefault();
          shortcut.fn();
          return;
        }
      }
      // No match for chord, fall through to single-key shortcuts
    }

    // Start a chord if G is pressed
    if (pressedKey === 'G') {
      chordKey = 'G';
      if (chordTimer) clearTimeout(chordTimer);
      chordTimer = setTimeout(() => { chordKey = null; }, CHORD_TIMEOUT);
      // Don't prevent default yet -- if no second key comes, G might be a page shortcut
      return;
    }

    // Find matching page shortcut (single key)
    const page = detectPage();
    const pageConfig = PAGE_SHORTCUTS[page];
    if (!pageConfig) return;

    for (const shortcut of pageConfig.shortcuts) {
      if (!shortcut.fn || shortcut.keys.length !== 1) continue;
      const key = shortcut.keys[0];
      if (e.key === key || e.key.toUpperCase() === key.toUpperCase()) {
        e.preventDefault();
        shortcut.fn();
        return;
      }
    }
  }

  // ========== INIT ==========
  function init() {
    const page = detectPage();
    // Skip on admin, legal, shared, demo pages
    if (page.startsWith('admin') || page === 'signup' || page === 'shared') return;
    if (page.startsWith('demo') || page.startsWith('sequential') || page.startsWith('tutorial')) return;
    if (['terms', 'privacy', 'dmca', 'compliance', 'guidelines', 'academic-integrity', 'ai-transparency', 'age-safety', 'reset-password', 'verify-age', 'verify-edu'].includes(page)) return;

    buildPanel();
    document.addEventListener('keydown', handleKeyDown);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
