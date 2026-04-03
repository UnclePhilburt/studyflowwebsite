// StudyFlow Assistant - 3D buddy with contextual action buttons
(function() {
  'use strict';

  // ========== CONFIG ==========
  const ASSISTANT_NAME = 'Flo';
  const BACKEND_URL = 'https://studyflowsuite.onrender.com';
  const IDLE_NUDGE_MS = 45000; // 45 seconds before proactive nudge
  const SEEN_KEY = 'sf-assistant-seen';
  const MINIMIZED_KEY = 'sf-assistant-minimized';
  const NAME_KEY = 'sf-assistant-name';
  const DIGEST_CACHE_KEY = 'sf-assistant-digest';
  const DIGEST_TTL = 10 * 60 * 1000; // 10 minutes

  // ========== STATE ==========
  let scene, camera, renderer, bodyMesh, leftEye, rightEye, leftPupil, rightPupil;
  let leftLid, rightLid, leftBrow, rightBrow, mouth;
  let mouseX = 0, mouseY = 0;
  let bobTime = 0;
  let blinkTimer = 0;
  let expression = 'idle'; // idle, happy, sleepy, surprised, thinking, excited, confused, celebrating, worried, winking, sleeping
  let expressionTimer = 0;
  let bubbleVisible = false;
  let idleTimer = null;
  let hasNotification = false;
  let currentPage = '';
  let clickCount = 0;
  let clickTimer = null;
  let idleStartTime = Date.now();
  let celebrateTimer = 0;
  let particles = [];
  let animationId = null;
  let manualEyelidPosition = null; // null = auto, 0-100 = manual control

  // ========== PAGE ACTION DEFINITIONS ==========
  const PAGE_ACTIONS = {
    'dashboard': {
      welcome: "Hey there! 👋 Let's make today awesome!",
      idle: "What's up? Need a hand? 🤔",
      welcomeActions: [
        { label: 'Take a tour', fn: () => { if (window.startOnboarding) window.startOnboarding(); }, primary: true },
        { label: 'Add a widget', fn: () => { openWidgetPicker(); } },
        { label: 'Change theme', fn: () => { if (window.toggleSettingsPanel) window.toggleSettingsPanel(); } }
      ],
      actions: [
        { label: "What's my day look like?", fn: () => { loadDigest(); }, primary: true },
        { label: 'Add a widget', fn: () => { openWidgetPicker(); } },
        { label: 'Change theme', fn: () => { if (window.toggleSettingsPanel) window.toggleSettingsPanel(); } }
      ],
      proactive: getTimeGreeting
    },
    'notes': {
      welcome: "Your personal study vault! 📚 Let's get some notes in here!",
      idle: "Studying hard? I can help! 💡",
      welcomeActions: [
        { label: 'Upload notes', fn: () => { if (window.showUploadModal) window.showUploadModal(); }, primary: true },
        { label: 'Create a new note', fn: () => { if (window.createNewNote) window.createNewNote(); } },
        { label: 'New folder', fn: () => { if (window.showNewFolderModal) window.showNewFolderModal(); } }
      ],
      actions: [
        { label: 'Upload notes', fn: () => { if (window.showUploadModal) window.showUploadModal(); }, primary: true },
        { label: 'Give me study tips', fn: () => { askAssistant('Give me quick study tips for organizing my notes effectively', 'tips'); } },
        { label: 'Show shared notes', fn: () => { if (window.toggleSharedFilter) window.toggleSharedFilter(); } }
      ]
    },
    'chat': {
      welcome: "Let's chat about anything! 💬 I've got your back with AI-powered answers!",
      idle: "Got questions? Let's talk! 🗨️",
      welcomeActions: [
        { label: 'Start new chat', fn: () => { if (window.startNewChat) window.startNewChat(); }, primary: true },
        { label: 'Add a sticky note', fn: () => { if (window.createStickyNote) window.createStickyNote(20100, 20100); } },
        { label: 'Fit all to screen', fn: () => { if (window.fitAll) window.fitAll(); } }
      ],
      actions: [
        { label: 'Start new chat', fn: () => { if (window.startNewChat) window.startNewChat(); }, primary: true },
        { label: 'Suggest a study topic', fn: () => { askAssistant('Suggest an interesting study topic I should explore', 'ask'); } },
        { label: 'Fit all to screen', fn: () => { if (window.fitAll) window.fitAll(); } }
      ]
    },
    'browse': {
      welcome: "Welcome to the Nexus! Thousands of study notes at your fingertips!",
      idle: "Looking for something cool?",
      welcomeActions: [
        { label: 'Open advanced filters', fn: () => { if (window.toggleAdvFilters) window.toggleAdvFilters(); }, primary: true },
        { label: 'Clear all filters', fn: () => { if (window.clearAdvFilters) window.clearAdvFilters(); } }
      ],
      actions: [
        { label: 'What should I study?', fn: () => { askAssistant('Based on popular notes, what are trending study topics right now?', 'ask'); }, primary: true },
        { label: 'Advanced filters', fn: () => { if (window.toggleAdvFilters) window.toggleAdvFilters(); } },
        { label: 'Clear filters', fn: () => { if (window.clearAdvFilters) window.clearAdvFilters(); } }
      ]
    },
    'flashcards': {
      welcome: "Quiz time! 📝 Let's see what you know! (Or quiz your friends for fun!)",
      idle: "Ready to test yourself? 🧠",
      welcomeActions: [
        { label: 'Start a quiz', fn: () => { focusQuizInput(); }, primary: true },
        { label: 'Create a race', fn: () => { if (window.generateCode) window.generateCode(); } }
      ],
      actions: [
        { label: 'Start a quiz', fn: () => { focusQuizInput(); }, primary: true },
        { label: 'Suggest a quiz topic', fn: () => { askAssistant('Suggest 3 good quiz topics for a college student to test themselves on', 'ask'); } },
        { label: 'Race a friend', fn: () => { if (window.generateCode) window.generateCode(); } }
      ]
    },
    'calendar': {
      welcome: "Your study calendar! Track deadlines and events.",
      idle: "Checking your schedule?",
      welcomeActions: [
        { label: 'Import events', fn: () => { if (window.openCanvasImportModal) window.openCanvasImportModal(); }, primary: true }
      ],
      actions: [
        { label: "What's on today?", fn: () => { loadDigest(); }, primary: true, requiresEvents: true },
        { label: 'Import events', fn: () => { if (window.openCanvasImportModal) window.openCanvasImportModal(); } },
        { label: 'Study planning tips', fn: () => { askAssistant('Give me tips for planning my study schedule effectively', 'tips'); } }
      ]
    },
    'leaderboard': {
      welcome: "The Nexus leaderboard! See top contributors to the knowledge base.",
      idle: "Checking the rankings?",
      welcomeActions: [
        { label: 'Toggle sidebar', fn: () => { if (window.toggleSidebar) window.toggleSidebar(); }, primary: true }
      ],
      actions: [
        { label: 'How do I rank up?', fn: () => { askAssistant('How can I improve my ranking on the StudyFlow Nexus leaderboard? What actions give the most points?', 'tips'); }, primary: true },
        { label: 'Toggle sidebar', fn: () => { if (window.toggleSidebar) window.toggleSidebar(); } }
      ]
    },
    'study-groups': {
      welcome: "Study groups! Collaborate with classmates in real-time.",
      idle: "Need help with groups?",
      welcomeActions: [
        { label: 'Group study tips', fn: () => { askAssistant('Give me tips for effective group study sessions', 'tips'); }, primary: true }
      ],
      actions: [
        { label: 'Group study tips', fn: () => { askAssistant('Give me tips for effective group study sessions', 'tips'); }, primary: true }
      ]
    },
    'note-viewer': {
      welcome: "Reading a note! I can help you understand it.",
      idle: "Need help with this note?",
      welcomeActions: [
        { label: 'Summarize this', fn: () => { summarizeCurrentNote(); }, primary: true },
        { label: 'Quiz me on this', fn: () => { quizCurrentNote(); } }
      ],
      actions: [
        { label: 'Summarize this', fn: () => { summarizeCurrentNote(); }, primary: true },
        { label: 'Quiz me on this', fn: () => { quizCurrentNote(); } },
        { label: 'Explain a concept', fn: () => { askAssistant('Explain the main concepts from this study material in simple terms', 'ask'); } }
      ]
    }
  };

  // ========== HELPERS ==========
  function detectPage() {
    const path = window.location.pathname.toLowerCase();
    const filename = path.split('/').pop().replace('.html', '') || 'index';
    if (filename === 'index' || filename === '' || filename === '/') return 'index';
    return filename;
  }

  function getSeenPages() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; }
  }

  function markPageSeen(page) {
    const seen = getSeenPages();
    seen[page] = Date.now();
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }

  function isFirstVisit(page) {
    return !getSeenPages()[page];
  }

  function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) {
      setExpression('sleepy', 3);
      return { msg: "Whoa! 😴 It's super late! You should get some sleep soon!", actions: [
        { label: 'Just 5 more minutes...', fn: () => { setExpression('worried'); dismissBubble(); } },
        { label: 'Yeah, you\'re right', fn: () => { setExpression('happy'); dismissBubble(); } }
      ]};
    }
    if (hour < 12) {
      setExpression('happy', 2);
      return { msg: "Morning! ☀️ Let's crush this day!", actions: [
        { label: 'Let\'s do it!', fn: () => { setExpression('excited'); dismissBubble(); } },
        { label: 'Show me around', fn: () => { if (window.startOnboarding) window.startOnboarding(); dismissBubble(); } }
      ]};
    }
    if (hour < 17) {
      setExpression('happy', 2);
      return { msg: "Afternoon grind! 💪 You're doing great!", actions: [
        { label: 'Thanks Flo!', fn: () => { setExpression('happy'); dismissBubble(); } },
        { label: 'Show me something cool', fn: () => { openWidgetPicker(); dismissBubble(); } }
      ]};
    }
    if (hour < 22) {
      setExpression('happy', 2);
      return { msg: "Evening study sesh! 🌙 Love the dedication!", actions: [
        { label: 'You know it!', fn: () => { setExpression('excited'); dismissBubble(); } },
        { label: 'Help me focus', fn: () => dismissBubble() }
      ]};
    }
    setExpression('sleepy', 2);
    return { msg: "It's getting late! 😴 Don't forget to sleep!", actions: [
      { label: 'Almost done!', fn: () => { setExpression('happy'); dismissBubble(); } },
      { label: 'Good point', fn: () => { setExpression('winking', 2); dismissBubble(); } }
    ]};
  }

  function clickThemePicker() {
    // Try to find and scroll to theme picker widget
    const tp = document.querySelector('[data-widget-type="themePicker"]');
    if (tp) {
      tp.scrollIntoView({ behavior: 'smooth', block: 'center' });
      tp.style.boxShadow = '0 0 0 3px #7c9885';
      setTimeout(() => { tp.style.boxShadow = ''; }, 2000);
    }
  }

  function focusQuizInput() {
    const input = document.querySelector('input[placeholder*="topic"], input[placeholder*="Topic"], #topicInput');
    if (input) { input.focus(); input.scrollIntoView({ behavior: 'smooth' }); }
  }

  function openWidgetPicker() {
    // Click the actual add widget button which triggers renderWidgetOptions()
    const widgetBtn = document.getElementById('addWidgetBtn');
    if (widgetBtn) {
      widgetBtn.click();
    } else {
      // Fallback: manually add class (won't work properly but better than nothing)
      document.getElementById('widgetPicker')?.classList.add('active');
    }
  }

  // ========== AI BACKEND ==========
  function getAuthToken() {
    return localStorage.getItem('auth_token');
  }

  async function askAssistant(message, action = 'ask') {
    const token = getAuthToken();
    if (!token) {
      showBubble("Sign in to use AI features!", [
        { label: 'Sign in', fn: () => { window.location.href = 'signup.html'; } },
        { label: 'Maybe later', fn: () => dismissBubble() }
      ]);
      return;
    }

    // Show loading state
    setExpression('thinking', 10);
    showBubbleLoading("Thinking...");

    try {
      const res = await fetch(`${BACKEND_URL}/api/assistant/ask`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, page: currentPage, action })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
      }

      const data = await res.json();
      setExpression('happy', 2);

      // Build follow-up buttons from AI response
      const followButtons = (data.followups || []).map(f => ({
        label: f.label,
        fn: () => { askAssistant(f.message, f.action); }
      }));
      followButtons.push({ label: 'Thanks!', fn: () => { setExpression('happy'); dismissBubble(); } });

      showBubbleAI(data.response, followButtons, data.sources);

    } catch (e) {
      console.error('Assistant ask error:', e);
      setExpression('surprised', 2);
      showBubble("Sorry, I couldn't get an answer right now. Try again in a moment.", [
        { label: 'Try again', fn: () => { askAssistant(message, action); } },
        { label: 'Dismiss', fn: () => dismissBubble() }
      ]);
    }
  }

  async function loadDigest() {
    const token = getAuthToken();
    if (!token) {
      showBubble("Sign in to see your daily digest!", [
        { label: 'Sign in', fn: () => { window.location.href = 'signup.html'; } }
      ]);
      return;
    }

    // Check cache
    try {
      const cached = JSON.parse(localStorage.getItem(DIGEST_CACHE_KEY) || '{}');
      if (cached.data && (Date.now() - cached.ts) < DIGEST_TTL) {
        showDigestBubble(cached.data);
        return;
      }
    } catch {}

    setExpression('thinking', 5);
    showBubbleLoading("Checking your day...");

    try {
      const res = await fetch(`${BACKEND_URL}/api/assistant/digest`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load digest');
      const data = await res.json();

      // Cache it
      localStorage.setItem(DIGEST_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));

      setExpression('happy', 2);
      showDigestBubble(data);
    } catch (e) {
      console.error('Digest error:', e);
      setExpression('idle');
      showBubble("Couldn't load your digest right now.", [
        { label: 'Try again', fn: () => loadDigest() },
        { label: 'Dismiss', fn: () => dismissBubble() }
      ]);
    }
  }

  async function hasUpcomingEvents() {
    const token = getAuthToken();
    if (!token) return false;

    try {
      // Check cache first
      const cached = JSON.parse(localStorage.getItem(DIGEST_CACHE_KEY) || '{}');
      if (cached.data && (Date.now() - cached.ts) < DIGEST_TTL) {
        return (cached.data.events_today && cached.data.events_today.length > 0) ||
               (cached.data.unread_notifications > 0);
      }

      // Fetch fresh data
      const res = await fetch(`${BACKEND_URL}/api/assistant/digest`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return false;
      const data = await res.json();

      // Cache it
      localStorage.setItem(DIGEST_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));

      return (data.events_today && data.events_today.length > 0) ||
             (data.unread_notifications > 0);
    } catch {
      return false;
    }
  }

  function showDigestBubble(data) {
    const hasEvents = data.events_today && data.events_today.length > 0;
    const hasNotifs = data.unread_notifications > 0;

    // If nothing scheduled, show different message
    if (!hasEvents && !hasNotifs) {
      const actions = [
        { label: 'Add an event', fn: () => { window.location.href = 'calendar.html'; }, primary: true },
        { label: 'Browse notes', fn: () => { window.location.href = 'browse.html'; } },
        { label: 'OK', fn: () => { setExpression('happy'); dismissBubble(); } }
      ];
      showBubble("Your schedule is clear today! Perfect time to get ahead on studying.", actions);
      return;
    }

    // Has events/notifications
    const actions = [];
    if (hasEvents) {
      actions.push({ label: `View ${data.events_today.length} event${data.events_today.length > 1 ? 's' : ''} today`, fn: () => { window.location.href = 'calendar.html'; } });
    }
    if (hasNotifs) {
      actions.push({ label: `${data.unread_notifications} unread notification${data.unread_notifications > 1 ? 's' : ''}`, fn: () => { /* open notif panel if available */ dismissBubble(); } });
    }
    actions.push({ label: 'Got it!', fn: () => { setExpression('happy'); dismissBubble(); } });

    showBubble(data.summary, actions);
  }

  function summarizeCurrentNote() {
    // Try to get the note title from the page
    const titleEl = document.getElementById('note-title') || document.getElementById('previewTitle');
    const title = titleEl ? titleEl.textContent : 'this note';
    askAssistant(`Summarize the key points of the note titled "${title}"`, 'summarize');
  }

  function quizCurrentNote() {
    const titleEl = document.getElementById('note-title') || document.getElementById('previewTitle');
    const title = titleEl ? titleEl.textContent : 'this note';
    askAssistant(`Create a short quiz about the note titled "${title}"`, 'quiz');
  }

  // ========== PARTICLE SYSTEM ==========
  function spawnParticle(type) {
    // Check if particles are disabled
    if (localStorage.getItem('sf-flo-particles') === 'off') return;

    const container = document.getElementById('sf-assistant-character');
    if (!container) return;

    const particle = document.createElement('div');
    particle.className = `sf-particle sf-particle-${type}`;

    // Position relative to Flo
    const startX = 35 + (Math.random() - 0.5) * 30;
    const startY = 35 + (Math.random() - 0.5) * 30;
    particle.style.left = startX + 'px';
    particle.style.top = startY + 'px';

    // Set particle content based on type
    const particleContent = {
      'heart': '❤️',
      'star': '⭐',
      'zzz': 'Z',
      'sweat': '💧',
      'question': '❓',
      'sparkle': '✨',
      'music': '🎵',
      'confetti': '🎊',
      'lightning': '⚡',
      'fire': '🔥'
    };
    particle.textContent = particleContent[type] || '✨';

    container.appendChild(particle);

    // Animate and remove
    setTimeout(() => particle.classList.add('active'), 10);
    setTimeout(() => {
      particle.remove();
    }, 2000);
  }

  function spawnParticleBurst(type, count = 5) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => spawnParticle(type), i * 100);
    }
  }

  // ========== BUILD DOM ==========
  function buildDOM() {
    const wrap = document.createElement('div');
    wrap.id = 'sf-assistant-wrap';

    // Apply minimize setting (check both old key and new setting)
    const oldMinimized = localStorage.getItem(MINIMIZED_KEY) === 'true';
    const startMinimized = localStorage.getItem('sf-flo-minimize') === 'on';
    if (oldMinimized || startMinimized) wrap.classList.add('minimized');

    wrap.innerHTML = `
      <div id="sf-assistant-bubble">
        <button id="sf-assistant-dismiss" title="Close">&times;</button>
        <div id="sf-assistant-msg"></div>
        <div id="sf-assistant-buttons"></div>
      </div>
      <div id="sf-assistant-character" title="Click to chat with ${ASSISTANT_NAME} | Right-click to minimize">
        <div id="sf-assistant-dot"></div>
      </div>
    `;

    document.body.appendChild(wrap);

    // Apply position setting
    const position = localStorage.getItem('sf-flo-position') || 'bottom-left';
    if (position === 'bottom-right') {
      wrap.style.left = 'auto';
      wrap.style.right = '20px';
    } else if (position === 'top-left') {
      wrap.style.bottom = 'auto';
      wrap.style.top = '20px';
    } else if (position === 'top-right') {
      wrap.style.left = 'auto';
      wrap.style.right = '20px';
      wrap.style.bottom = 'auto';
      wrap.style.top = '20px';
    }

    // Apply size setting
    const size = localStorage.getItem('sf-flo-size') || 'medium';
    const character = document.getElementById('sf-assistant-character');
    if (character) {
      let pixelSize;
      switch(size) {
        case 'small': pixelSize = 50; break;
        case 'medium': pixelSize = 70; break;
        case 'large': pixelSize = 100; break;
        case 'xlarge': pixelSize = 140; break;
        default: pixelSize = 70;
      }
      character.style.width = pixelSize + 'px';
      character.style.height = pixelSize + 'px';
    }

    // Apply eyelid setting
    const eyelidSetting = localStorage.getItem('sf-flo-eyelids');
    if (eyelidSetting !== null && eyelidSetting !== '0') {
      manualEyelidPosition = parseInt(eyelidSetting);
    }

    // Events
    document.getElementById('sf-assistant-character').addEventListener('click', onCharacterClick);
    document.getElementById('sf-assistant-dismiss').addEventListener('click', (e) => {
      e.stopPropagation();
      dismissBubble();
    });

    // Right-click to minimize/restore (changed from double-click to avoid easter egg conflict)
    document.getElementById('sf-assistant-character').addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrap = document.getElementById('sf-assistant-wrap');
      const isMin = wrap.classList.toggle('minimized');
      localStorage.setItem(MINIMIZED_KEY, isMin);
      if (isMin) {
        dismissBubble();
        setExpression('sleepy', 1);
      } else {
        setExpression('happy', 2);
      }
    });

    // Track mouse for eye movement
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
  }

  // ========== CHARACTER RECREATION ==========
  function recreateCharacter() {
    // Cancel existing animation loop
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // Clear the existing scene
    if (scene) {
      while(scene.children.length > 0) {
        scene.remove(scene.children[0]);
      }
    }

    // Reinitialize character
    const container = document.getElementById('sf-assistant-character');
    if (container && renderer) {
      // Remove old canvas
      const oldCanvas = container.querySelector('canvas');
      if (oldCanvas) oldCanvas.remove();
    }

    // Reset references
    bodyMesh = null;
    leftEye = null;
    rightEye = null;
    leftPupil = null;
    rightPupil = null;
    leftLid = null;
    rightLid = null;
    leftBrow = null;
    rightBrow = null;
    mouth = null;

    // Recreate
    initCharacter();
  }

  // ========== COLOR MAPPING ==========
  function getFloColor(colorId) {
    const colorMap = {
      'sage': 0x7c9885,
      'blue': 0x6b9bd1,
      'purple': 0x9b88d1,
      'pink': 0xd18bb0,
      'orange': 0xd1a56b,
      'mint': 0x6bd1a8,
      'coral': 0xd17b6b,
      'yellow': 0xd1c76b
    };
    return colorMap[colorId] || 0x7c9885; // Default to sage
  }

  function getFloLidColor(colorId) {
    const lidColorMap = {
      'sage': 0x6a8573,
      'blue': 0x5a85b8,
      'purple': 0x8676b8,
      'pink': 0xb87699,
      'orange': 0xb88f5a,
      'mint': 0x5ab88f,
      'coral': 0xb8675a,
      'yellow': 0xb8ad5a
    };
    return lidColorMap[colorId] || 0x6a8573; // Default to sage
  }

  // ========== HAT CREATION ==========
  function createHat(hatType) {
    if (hatType === 'none') return null;

    let hat;
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.1 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4, metalness: 0.2 });

    switch(hatType) {
      case 'tophat':
        // Cylinder on top with brim
        const topHatGroup = new THREE.Group();
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 32), hatMat);
        brim.position.y = 1.0;
        topHatGroup.add(brim);
        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.6, 32), hatMat);
        cylinder.position.y = 1.35;
        topHatGroup.add(cylinder);
        // Red band
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 32), accentMat);
        band.position.y = 1.1;
        topHatGroup.add(band);
        hat = topHatGroup;
        break;

      case 'wizard':
        // Tall cone with stars
        const wizardGroup = new THREE.Group();
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 32), new THREE.MeshStandardMaterial({ color: 0x2222aa, roughness: 0.5 }));
        cone.position.y = 1.5;
        wizardGroup.add(cone);
        // Star decals
        for (let i = 0; i < 3; i++) {
          const star = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.5 }));
          star.position.set(Math.cos(i * 2) * 0.3, 1.2 + i * 0.2, Math.sin(i * 2) * 0.3);
          wizardGroup.add(star);
        }
        // Brim
        const wizardBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 32), new THREE.MeshStandardMaterial({ color: 0x2222aa, roughness: 0.5 }));
        wizardBrim.position.y = 0.95;
        wizardGroup.add(wizardBrim);
        hat = wizardGroup;
        break;

      case 'party':
        // Simple cone
        hat = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 32), new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.4 }));
        hat.position.y = 1.4;
        break;

      case 'baseball':
        // Hemisphere with visor
        const capGroup = new THREE.Group();
        const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2244cc, roughness: 0.6 }));
        capTop.position.y = 1.0;
        capGroup.add(capTop);
        // Visor
        const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.05, 32, 1, false, 0, Math.PI), hatMat);
        visor.position.set(0, 0.95, 0.3);
        visor.rotation.x = Math.PI / 6;
        capGroup.add(visor);
        hat = capGroup;
        break;

      case 'crown':
        // Crown with points
        const crownGroup = new THREE.Group();
        const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.3, 32), new THREE.MeshStandardMaterial({ color: 0xffdd00, metalness: 0.8, roughness: 0.2 }));
        crownBase.position.y = 1.05;
        crownGroup.add(crownBase);
        // Points
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const point = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), new THREE.MeshStandardMaterial({ color: 0xffdd00, metalness: 0.8, roughness: 0.2 }));
          point.position.set(Math.cos(angle) * 0.45, 1.3, Math.sin(angle) * 0.45);
          crownGroup.add(point);
        }
        hat = crownGroup;
        break;

      case 'beanie':
        // Rounded top with folded brim
        const beanieGroup = new THREE.Group();
        const beanieTop = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.5), new THREE.MeshStandardMaterial({ color: 0x884422, roughness: 0.9 }));
        beanieTop.position.y = 1.1;
        beanieGroup.add(beanieTop);
        const beanieFold = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 16, 32), new THREE.MeshStandardMaterial({ color: 0x663311, roughness: 0.9 }));
        beanieFold.position.y = 0.95;
        beanieFold.rotation.x = Math.PI / 2;
        beanieGroup.add(beanieFold);
        hat = beanieGroup;
        break;

      case 'cowboy':
        // Wide brim with curved top
        const cowboyGroup = new THREE.Group();
        const cowboyBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 32), new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 }));
        cowboyBrim.position.y = 1.0;
        cowboyGroup.add(cowboyBrim);
        const cowboyTop = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 }));
        cowboyTop.position.y = 1.15;
        cowboyGroup.add(cowboyTop);
        hat = cowboyGroup;
        break;

      case 'chef':
        // Puffy chef hat
        const chefGroup = new THREE.Group();
        const chefBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.2, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }));
        chefBase.position.y = 1.0;
        chefGroup.add(chefBase);
        const chefPuff = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 1.5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }));
        chefPuff.position.y = 1.25;
        chefPuff.scale.set(1, 0.8, 1);
        chefGroup.add(chefPuff);
        hat = chefGroup;
        break;

      case 'santa':
        // Red cone with white trim and pom-pom
        const santaGroup = new THREE.Group();
        const santaCone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 32), accentMat);
        santaCone.position.y = 1.4;
        santaCone.rotation.z = 0.3;
        santaGroup.add(santaCone);
        const santaTrim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 16, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
        santaTrim.position.y = 0.95;
        santaTrim.rotation.x = Math.PI / 2;
        santaGroup.add(santaTrim);
        const pomPom = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
        pomPom.position.set(0.4, 1.7, 0.2);
        santaGroup.add(pomPom);
        hat = santaGroup;
        break;

      case 'propeller':
        // Beanie with spinning propeller
        const propGroup = new THREE.Group();
        const propBeanie = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.7 }));
        propBeanie.position.y = 1.0;
        propGroup.add(propBeanie);
        // Propeller blades
        const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.1), new THREE.MeshStandardMaterial({ color: 0xffff00, metalness: 0.5 }));
        blade1.position.y = 1.35;
        propGroup.add(blade1);
        const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.6), new THREE.MeshStandardMaterial({ color: 0xffff00, metalness: 0.5 }));
        blade2.position.y = 1.35;
        propGroup.add(blade2);
        // Store reference for spinning animation
        propGroup.userData.isPropeller = true;
        hat = propGroup;
        break;

      case 'halo':
        // Floating ring above head
        hat = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 16, 32), new THREE.MeshStandardMaterial({
          color: 0xffff00,
          emissive: 0xffff00,
          emissiveIntensity: 0.6,
          metalness: 0.8,
          roughness: 0.2
        }));
        hat.position.y = 1.5;
        hat.rotation.x = Math.PI / 2;
        break;

      default:
        return null;
    }

    return hat;
  }

  // ========== SHAPE CREATION ==========
  function createBodyGeometry(shape) {
    let bodyGeo;

    switch(shape) {
      case 'cube':
        bodyGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        break;
      case 'octahedron':
        bodyGeo = new THREE.OctahedronGeometry(1.1, 0);
        break;
      case 'dodecahedron':
        bodyGeo = new THREE.DodecahedronGeometry(1, 0);
        break;
      case 'icosahedron':
        bodyGeo = new THREE.IcosahedronGeometry(1.1, 0);
        break;
      case 'tetrahedron':
        bodyGeo = new THREE.TetrahedronGeometry(1.3, 0);
        break;
      case 'cylinder':
        bodyGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.8, 32);
        break;
      case 'cone':
        bodyGeo = new THREE.ConeGeometry(1, 2, 32);
        break;
      case 'torus':
        bodyGeo = new THREE.TorusGeometry(0.7, 0.4, 24, 32);
        break;
      case 'capsule':
        // Cylinder with spheres on top/bottom
        const capsuleGroup = new THREE.Group();
        const cylGeo = new THREE.CylinderGeometry(0.6, 0.6, 1, 32);
        const topSphere = new THREE.SphereGeometry(0.6, 32, 32);
        topSphere.translate(0, 0.5, 0);
        const bottomSphere = new THREE.SphereGeometry(0.6, 32, 32);
        bottomSphere.translate(0, -0.5, 0);
        bodyGeo = new THREE.BufferGeometry();
        bodyGeo = THREE.BufferGeometryUtils ?
          THREE.BufferGeometryUtils.mergeBufferGeometries([cylGeo, topSphere, bottomSphere]) :
          cylGeo; // Fallback if utils not available
        break;
      case 'diamond':
        // Two cones joined at base
        const topCone = new THREE.ConeGeometry(0.8, 1.2, 32);
        topCone.translate(0, 0.6, 0);
        const bottomCone = new THREE.ConeGeometry(0.8, 1.2, 32);
        bottomCone.rotateX(Math.PI);
        bottomCone.translate(0, -0.6, 0);
        bodyGeo = new THREE.BufferGeometry();
        bodyGeo = THREE.BufferGeometryUtils ?
          THREE.BufferGeometryUtils.mergeBufferGeometries([topCone, bottomCone]) :
          topCone; // Fallback
        break;
      case 'star':
        // 5-pointed star using extrusion
        const starShape = new THREE.Shape();
        const outerRadius = 1;
        const innerRadius = 0.4;
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = Math.cos(angle - Math.PI / 2) * radius;
          const y = Math.sin(angle - Math.PI / 2) * radius;
          if (i === 0) starShape.moveTo(x, y);
          else starShape.lineTo(x, y);
        }
        starShape.closePath();
        const extrudeSettings = { depth: 0.4, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3 };
        bodyGeo = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
        bodyGeo.rotateX(Math.PI / 2);
        bodyGeo.translate(0, 0, -0.2);
        break;
      case 'sphere':
      default:
        bodyGeo = new THREE.SphereGeometry(1, 32, 32);
        // Slightly squash vertically for a friendlier look
        bodyGeo.scale(1, 0.92, 0.95);
        break;
    }

    return bodyGeo;
  }

  // ========== THREE.JS CHARACTER ==========
  function initCharacter() {
    const container = document.getElementById('sf-assistant-character');
    const size = 140; // render at 2x for sharpness

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.4, 5.5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.insertBefore(renderer.domElement, container.firstChild);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x7c9885, 0.3);
    rimLight.position.set(-2, 1, -2);
    scene.add(rimLight);

    // Body - get shape and color from settings
    const shape = localStorage.getItem('sf-flo-shape') || 'sphere';
    const colorId = localStorage.getItem('sf-flo-color') || 'sage';
    const bodyGeo = createBodyGeometry(shape);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: getFloColor(colorId),
      roughness: 0.6,
      metalness: 0.05
    });
    bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    scene.add(bodyMesh);

    // Eye whites
    const eyeGeo = new THREE.SphereGeometry(0.22, 24, 24);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

    leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.28, 0.18, 0.88);
    bodyMesh.add(leftEye);

    rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.28, 0.18, 0.88);
    bodyMesh.add(rightEye);

    // Pupils
    const pupilGeo = new THREE.SphereGeometry(0.11, 16, 16);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 });

    leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(0, 0, 0.14);
    leftEye.add(leftPupil);

    rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0, 0, 0.14);
    rightEye.add(rightPupil);

    // Eyelids (for blink and expressions)
    const lidGeo = new THREE.SphereGeometry(0.24, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const lidMat = new THREE.MeshStandardMaterial({ color: getFloLidColor(colorId), roughness: 0.6 });

    leftLid = new THREE.Mesh(lidGeo, lidMat);
    leftLid.position.set(0, 0.06, 0.02);
    leftLid.rotation.x = -Math.PI * 0.5; // fully open = hidden
    leftLid.scale.set(1.05, 1, 1.05);
    leftEye.add(leftLid);

    rightLid = new THREE.Mesh(lidGeo, lidMat);
    rightLid.position.set(0, 0.06, 0.02);
    rightLid.rotation.x = -Math.PI * 0.5;
    rightLid.scale.set(1.05, 1, 1.05);
    rightEye.add(rightLid);

    // Eyebrows for expressions
    const browCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.1, 0, 0),
      new THREE.Vector3(0, 0.05, 0),
      new THREE.Vector3(0.1, 0, 0)
    );
    const browGeo = new THREE.BufferGeometry().setFromPoints(browCurve.getPoints(8));
    const browMat = new THREE.LineBasicMaterial({ color: 0x4a6b52, linewidth: 3 });

    leftBrow = new THREE.Line(browGeo, browMat);
    leftBrow.position.set(-0.28, 0.42, 0.88);
    bodyMesh.add(leftBrow);

    rightBrow = new THREE.Line(browGeo, browMat);
    rightBrow.position.set(0.28, 0.42, 0.88);
    bodyMesh.add(rightBrow);

    // Small blush circles for cuteness
    const blushGeo = new THREE.CircleGeometry(0.12, 16);
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf0a0a0, transparent: true, opacity: 0.3 });

    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-0.52, -0.05, 0.85);
    leftBlush.lookAt(camera.position);
    bodyMesh.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(0.52, -0.05, 0.85);
    rightBlush.lookAt(camera.position);
    bodyMesh.add(rightBlush);

    // Small mouth (will be updated dynamically for expressions)
    const mouthCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.15, -0.18, 0.95),
      new THREE.Vector3(0, -0.25, 0.98),
      new THREE.Vector3(0.15, -0.18, 0.95)
    );
    const mouthGeo = new THREE.BufferGeometry().setFromPoints(mouthCurve.getPoints(12));
    const mouthMat = new THREE.LineBasicMaterial({ color: 0x4a6b52, linewidth: 2 });
    mouth = new THREE.Line(mouthGeo, mouthMat);
    bodyMesh.add(mouth);

    // Add hat if selected
    const hatType = localStorage.getItem('sf-flo-hat') || 'none';
    const hat = createHat(hatType);
    if (hat) {
      bodyMesh.add(hat);
      // Store reference for animations (like propeller spinning)
      bodyMesh.userData.hat = hat;
    }

    // Start animation
    animate();
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    const dt = 0.016;
    bobTime += dt;
    blinkTimer += dt;
    if (expressionTimer > 0) expressionTimer -= dt;
    if (expressionTimer <= 0 && expression !== 'idle' && expression !== 'sleepy' && expression !== 'sleeping') {
      expression = 'idle';
    }

    // Easter egg: Fall asleep after 2 hours of inactivity
    const idleTime = (Date.now() - idleStartTime) / 1000 / 60; // minutes
    if (idleTime > 120 && expression === 'idle' && !bubbleVisible) {
      setExpression('sleeping', 999); // basically forever until interaction
    }

    // Spawn ZZZ particles when sleeping
    if (expression === 'sleeping' && Math.random() < 0.05) {
      spawnParticle('zzz');
    }

    // Idle bob
    const bobY = Math.sin(bobTime * 2) * 0.06;
    const bobTilt = Math.sin(bobTime * 1.3) * 0.03;
    bodyMesh.position.y = bobY;
    bodyMesh.rotation.z = bobTilt;

    // Eye tracking - follow cursor
    const container = document.getElementById('sf-assistant-character');
    if (container) {
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (mouseX - cx) / window.innerWidth;
      const dy = -(mouseY - cy) / window.innerHeight;
      const maxTrack = 0.06;

      leftPupil.position.x = THREE.MathUtils.clamp(dx * 0.5, -maxTrack, maxTrack);
      leftPupil.position.y = THREE.MathUtils.clamp(dy * 0.3, -maxTrack, maxTrack);
      rightPupil.position.x = THREE.MathUtils.clamp(dx * 0.5, -maxTrack, maxTrack);
      rightPupil.position.y = THREE.MathUtils.clamp(dy * 0.3, -maxTrack, maxTrack);

      // Slight body lean toward cursor
      bodyMesh.rotation.y = dx * 0.15;
    }

    // Animate propeller hat if equipped
    if (bodyMesh && bodyMesh.userData.hat && bodyMesh.userData.hat.userData.isPropeller) {
      bodyMesh.userData.hat.rotation.y += 0.2; // Spin the propeller
    }

    // Animate halo (gentle float)
    const hatType = localStorage.getItem('sf-flo-hat');
    if (hatType === 'halo' && bodyMesh && bodyMesh.userData.hat) {
      bodyMesh.userData.hat.position.y = 1.5 + Math.sin(bobTime * 3) * 0.08;
    }

    // Blink
    let lidTarget = -Math.PI * 0.5; // open

    // Manual eyelid control overrides automatic blinking
    if (manualEyelidPosition !== null) {
      // 0 = fully open (-PI * 0.5), 100 = fully closed (0)
      const closedAmount = manualEyelidPosition / 100;
      lidTarget = -Math.PI * 0.5 + Math.PI * 0.5 * closedAmount;
    } else if (blinkTimer > 3 + Math.random() * 2) {
      // Blink cycle (only if not manually controlled)
      const blinkPhase = (blinkTimer % 0.3) / 0.3;
      if (blinkPhase < 0.5) {
        lidTarget = -Math.PI * 0.5 + Math.PI * 0.5 * (blinkPhase * 2);
      } else {
        lidTarget = -Math.PI * 0.5 + Math.PI * 0.5 * (1 - (blinkPhase - 0.5) * 2);
      }
      if (blinkTimer > 3 + Math.random() * 2 + 0.3) {
        blinkTimer = 0;
      }
    }

    // Expression overrides
    let browTarget = 0; // neutral position
    let leftLidTarget = lidTarget;
    let rightLidTarget = lidTarget;

    if (expression === 'happy') {
      lidTarget = -Math.PI * 0.35; // squint
      browTarget = 0.05; // slightly raised
      leftEye.scale.setScalar(1);
      rightEye.scale.setScalar(1);
    } else if (expression === 'excited') {
      lidTarget = -Math.PI * 0.55; // wide eyes
      browTarget = 0.15; // raised brows
      leftEye.scale.setScalar(1.2);
      rightEye.scale.setScalar(1.2);
      // Bounce animation
      bodyMesh.position.y = bobY + Math.abs(Math.sin(bobTime * 6)) * 0.15;
    } else if (expression === 'sleepy') {
      lidTarget = -Math.PI * 0.2; // half closed
      browTarget = -0.1; // lowered
      leftEye.scale.setScalar(0.9);
      rightEye.scale.setScalar(0.9);
    } else if (expression === 'sleeping') {
      lidTarget = 0; // fully closed
      browTarget = -0.05;
      leftEye.scale.setScalar(1);
      rightEye.scale.setScalar(1);
    } else if (expression === 'surprised') {
      lidTarget = -Math.PI * 0.6; // extra wide
      browTarget = 0.2; // very raised
      leftEye.scale.setScalar(1.3);
      rightEye.scale.setScalar(1.3);
    } else if (expression === 'confused') {
      lidTarget = -Math.PI * 0.4;
      browTarget = 0.1;
      leftBrow.rotation.z = -0.2; // asymmetric brows
      rightBrow.rotation.z = 0.1;
      leftEye.scale.setScalar(1.05);
      rightEye.scale.setScalar(1.05);
      // Head tilt
      bodyMesh.rotation.z = bobTilt + 0.15;
    } else if (expression === 'worried') {
      lidTarget = -Math.PI * 0.3;
      browTarget = 0.15;
      leftBrow.rotation.z = 0.15; // worried brows
      rightBrow.rotation.z = -0.15;
      leftEye.scale.setScalar(0.95);
      rightEye.scale.setScalar(0.95);
    } else if (expression === 'winking') {
      leftLidTarget = 0; // left eye closed
      rightLidTarget = -Math.PI * 0.5; // right eye open
      browTarget = 0.1;
      leftEye.scale.setScalar(1);
      rightEye.scale.setScalar(1.1);
    } else if (expression === 'celebrating') {
      lidTarget = -Math.PI * 0.4; // happy squint
      browTarget = 0.1;
      leftEye.scale.setScalar(1.1);
      rightEye.scale.setScalar(1.1);
      // Spin animation
      celebrateTimer += dt * 3;
      bodyMesh.rotation.y = Math.sin(celebrateTimer) * 0.5;
      bodyMesh.position.y = bobY + Math.abs(Math.sin(celebrateTimer * 2)) * 0.2;
    } else {
      leftEye.scale.setScalar(1);
      rightEye.scale.setScalar(1);
      leftBrow.rotation.z = 0;
      rightBrow.rotation.z = 0;
    }

    // Apply eyelid positions (handle winking separately)
    if (expression === 'winking') {
      leftLid.rotation.x += (leftLidTarget - leftLid.rotation.x) * 0.15;
      rightLid.rotation.x += (rightLidTarget - rightLid.rotation.x) * 0.15;
    } else {
      leftLid.rotation.x += (lidTarget - leftLid.rotation.x) * 0.15;
      rightLid.rotation.x += (lidTarget - rightLid.rotation.x) * 0.15;
    }

    // Apply brow positions
    leftBrow.position.y += (0.42 + browTarget - leftBrow.position.y) * 0.1;
    rightBrow.position.y += (0.42 + browTarget - rightBrow.position.y) * 0.1;

    renderer.render(scene, camera);
  }

  function setExpression(expr, duration = 2) {
    const expressionStyle = localStorage.getItem('sf-flo-expressions') || 'full';

    // Reduce expression intensity based on setting
    if (expressionStyle === 'minimal') {
      // Minimal: only basic expressions, shorter duration
      if (['celebrating', 'excited', 'winking', 'sleeping'].includes(expr)) {
        expr = 'happy'; // Simplify to basic happy
      }
      duration = Math.min(duration, 1); // Cap at 1 second
    } else if (expressionStyle === 'subtle') {
      // Subtle: all expressions but shorter duration
      duration = duration * 0.5; // Half duration
    }

    expression = expr;
    expressionTimer = duration;

    // Trigger particles for certain expressions
    if (expr === 'happy') {
      spawnParticle('heart');
    } else if (expr === 'excited') {
      spawnParticleBurst('star', 3);
    } else if (expr === 'celebrating') {
      spawnParticleBurst('confetti', 8);
      spawnParticleBurst('star', 5);
    } else if (expr === 'sleeping') {
      // ZZZ particles will spawn continuously in animate loop
    } else if (expr === 'worried') {
      spawnParticle('sweat');
    } else if (expr === 'confused') {
      spawnParticleBurst('question', 2);
    } else if (expr === 'thinking') {
      spawnParticle('sparkle');
    }
  }

  // ========== BUBBLE SYSTEM ==========
  function showBubble(msg, actions = []) {
    const bubble = document.getElementById('sf-assistant-bubble');
    const msgEl = document.getElementById('sf-assistant-msg');
    const btnsEl = document.getElementById('sf-assistant-buttons');

    // Strip emojis if setting is off
    let displayMsg = msg;
    if (localStorage.getItem('sf-flo-emojis') === 'off') {
      displayMsg = msg.replace(/[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    }

    msgEl.textContent = displayMsg;
    btnsEl.innerHTML = '';

    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'sf-assistant-btn' + (action.primary ? ' primary' : '');
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        action.fn();
        if (!action.keepOpen) dismissBubble();
      });
      btnsEl.appendChild(btn);
    });

    bubble.classList.add('visible');
    bubbleVisible = true;
    hideNotificationDot();
    resetIdleTimer();
  }

  function dismissBubble() {
    const bubble = document.getElementById('sf-assistant-bubble');
    bubble.classList.remove('visible');
    bubbleVisible = false;
    resetIdleTimer();
  }

  function showBubbleLoading(msg) {
    const bubble = document.getElementById('sf-assistant-bubble');
    const msgEl = document.getElementById('sf-assistant-msg');
    const btnsEl = document.getElementById('sf-assistant-buttons');

    msgEl.innerHTML = `<span style="display:flex;align-items:center;gap:8px;"><span class="sf-loading-dots"></span> ${msg}</span>`;
    btnsEl.innerHTML = '';
    bubble.classList.add('visible');
    bubbleVisible = true;
  }

  function showBubbleAI(response, actions = [], sources = []) {
    const bubble = document.getElementById('sf-assistant-bubble');
    const msgEl = document.getElementById('sf-assistant-msg');
    const btnsEl = document.getElementById('sf-assistant-buttons');

    // Format AI response - convert markdown-ish to simple HTML
    let formatted = response
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    let html = `<div style="font-size:12.5px;line-height:1.6;color:inherit;">${formatted}</div>`;

    // Add sources if any
    if (sources && sources.length > 0) {
      html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(128,128,128,0.2);font-size:10px;color:#999;">`;
      html += sources.map(s => `From: ${s.filename}`).join('<br>');
      html += `</div>`;
    }

    msgEl.innerHTML = html;
    btnsEl.innerHTML = '';

    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'sf-assistant-btn' + (action.primary ? ' primary' : '');
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        action.fn();
        if (!action.keepOpen) dismissBubble();
      });
      btnsEl.appendChild(btn);
    });

    bubble.classList.add('visible');
    bubbleVisible = true;
    hideNotificationDot();
    resetIdleTimer();
  }

  function showNotificationDot() {
    const dot = document.getElementById('sf-assistant-dot');
    if (dot) { dot.classList.add('visible'); hasNotification = true; }
  }

  function hideNotificationDot() {
    const dot = document.getElementById('sf-assistant-dot');
    if (dot) { dot.classList.remove('visible'); hasNotification = false; }
  }

  // ========== INTERACTION ==========
  async function onCharacterClick() {
    const wrap = document.getElementById('sf-assistant-wrap');
    if (wrap.classList.contains('minimized')) {
      wrap.classList.remove('minimized');
      localStorage.setItem(MINIMIZED_KEY, false);
      setExpression('happy');
      return;
    }

    // Easter egg: Click spam detection
    clickCount++;
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 2000);

    if (clickCount === 10) {
      // Dizzy spin easter egg!
      setExpression('confused', 5);
      spawnParticleBurst('question', 8);
      spawnParticleBurst('sweat', 4);
      showBubble("Whoa! 😵 I'm getting dizzy! Stop clicking me so much!", [
        { label: 'Haha sorry!', fn: () => { setExpression('happy'); dismissBubble(); } },
        { label: 'Do a backflip!', fn: () => { setExpression('celebrating', 3); dismissBubble(); } }
      ]);
      clickCount = 0;
      return;
    }

    if (bubbleVisible) {
      dismissBubble();
      return;
    }

    // Show page actions
    const config = PAGE_ACTIONS[currentPage];
    if (config) {
      let actions = [...config.actions]; // Clone array

      // Check if there are events before showing digest-related buttons
      if (currentPage === 'dashboard' || currentPage === 'calendar') {
        const hasEvents = await hasUpcomingEvents();
        if (!hasEvents) {
          // Remove actions that require events
          actions = actions.filter(a => !a.requiresEvents && a.label !== "What's my day look like?");
        }
      }

      showBubble(config.idle, actions);
      setExpression('happy', 1.5);
    } else {
      showBubble("Hi! I'm " + ASSISTANT_NAME + ". Click me anytime for help.", [
        { label: 'Got it!', fn: () => dismissBubble() }
      ]);
    }
  }

  // ========== PROACTIVE SYSTEM ==========
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(onIdle, IDLE_NUDGE_MS);
    idleStartTime = Date.now(); // Reset idle sleep timer
    if (expression === 'sleeping') {
      setExpression('surprised', 2); // Wake up!
    }
  }

  async function onIdle() {
    if (bubbleVisible) return;
    if (document.getElementById('sf-assistant-wrap')?.classList.contains('minimized')) return;

    // On dashboard, only show notification dot if there are events
    if (currentPage === 'dashboard' && getAuthToken()) {
      const hasEvents = await hasUpcomingEvents();
      if (hasEvents) {
        showNotificationDot();
      }
      return;
    }

    const config = PAGE_ACTIONS[currentPage];
    if (config && config.proactive) {
      const proactive = config.proactive();
      if (proactive) {
        showNotificationDot();
      }
    }
  }

  function triggerWelcome() {
    const config = PAGE_ACTIONS[currentPage];
    if (!config) return;
    if (!isFirstVisit(currentPage)) return;
    if (document.getElementById('sf-assistant-wrap')?.classList.contains('minimized')) return;

    // Small delay so page loads first
    setTimeout(() => {
      setExpression('happy', 3);
      showBubble(config.welcome, [
        ...config.welcomeActions,
        { label: 'Got it!', fn: () => { dismissBubble(); setExpression('happy'); } }
      ]);
      markPageSeen(currentPage);
    }, 1500);
  }

  // ========== EVENT REACTIONS ==========
  function setupEventListeners() {
    // Reset idle on any interaction
    ['click', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    // Listen for Flo settings changes from dashboard
    window.addEventListener('flo-settings-changed', (e) => {
      // Settings are already saved to localStorage by dashboard
      console.log('Flo settings updated:', e.detail);

      // If shape, hat, or color changed, need to recreate the 3D character
      if (e.detail?.recreate && (e.detail?.shape || e.detail?.hat || e.detail?.color)) {
        recreateCharacter();
      }

      // If eyelids changed, update the manual position
      if (e.detail?.eyelids !== undefined) {
        const val = parseInt(e.detail.eyelids);
        manualEyelidPosition = val; // 0 = open, 100 = closed
      }
    });

    // ---- NOTES PAGE EVENTS ----
    window.addEventListener('sf:note-uploaded', (e) => {
      const count = e.detail?.count || 1;
      const totalNotes = e.detail?.totalNotes || 0;

      // Easter egg: 100th note milestone!
      if (totalNotes === 100) {
        setExpression('celebrating', 8);
        spawnParticleBurst('confetti', 15);
        spawnParticleBurst('star', 10);
        spawnParticleBurst('fire', 5);
        showBubble(`🎉🏆 WHOA! YOUR 100TH NOTE! YOU'RE A LEGEND! 🏆🎉`, [
          { label: 'YEAH BABY!', fn: () => { setExpression('excited', 5); dismissBubble(); } },
          { label: 'Share my collection!', fn: () => { if (window.toggleSharedFilter) window.toggleSharedFilter(); dismissBubble(); } },
          { label: 'Keep going!', fn: () => { if (window.showUploadModal) window.showUploadModal(); dismissBubble(); } }
        ]);
      } else if (totalNotes === 50) {
        setExpression('excited', 4);
        spawnParticleBurst('star', 6);
        spawnParticleBurst('fire', 3);
        showBubble(`50 notes! 🎯 Halfway to 100! You're crushing it! 🔥`, [
          { label: 'Let\'s go!', fn: () => { setExpression('happy'); dismissBubble(); } },
          { label: 'Upload more', fn: () => { if (window.showUploadModal) window.showUploadModal(); dismissBubble(); } }
        ]);
      } else {
        setExpression('happy', 3);
        showBubble(`${count > 1 ? count + ' notes' : 'Note'} uploaded! Nice!`, [
          { label: 'Share it', fn: () => { if (window.toggleSharedFilter) window.toggleSharedFilter(); dismissBubble(); } },
          { label: 'Upload more', fn: () => { if (window.showUploadModal) window.showUploadModal(); dismissBubble(); } },
          { label: 'Sweet!', fn: () => { setExpression('happy'); dismissBubble(); } }
        ]);
      }
    });

    window.addEventListener('sf:note-deleted', () => {
      setExpression('idle');
      // Brief acknowledgment, auto-dismiss
      showBubble("Note deleted.", [
        { label: 'OK', fn: () => dismissBubble() }
      ]);
      setTimeout(dismissBubble, 2500);
    });

    window.addEventListener('sf:folder-created', (e) => {
      setExpression('happy', 2);
      const name = e.detail?.name || 'folder';
      showBubble(`Folder "${name}" created!`, [
        { label: 'Open it', fn: () => { dismissBubble(); } },
        { label: 'Great', fn: () => { setExpression('happy'); dismissBubble(); } }
      ]);
    });

    window.addEventListener('sf:folder-deleted', () => {
      setExpression('idle');
      showBubble("Folder deleted.", [{ label: 'OK', fn: () => dismissBubble() }]);
      setTimeout(dismissBubble, 2500);
    });

    window.addEventListener('sf:folder-opened', (e) => {
      // Subtle - just reset idle, don't show bubble for navigation
      resetIdleTimer();
    });

    window.addEventListener('sf:note-shared', (e) => {
      setExpression('happy', 3);
      showBubble("Share link created! Anyone with the link can view your note.", [
        { label: 'Copy link', fn: () => { if (window.copyShareLink) window.copyShareLink(); } , keepOpen: true },
        { label: 'Awesome', fn: () => { setExpression('happy'); dismissBubble(); } }
      ]);
    });

    window.addEventListener('sf:share-revoked', () => {
      setExpression('idle');
      showBubble("Share link revoked. The link will stop working immediately.", [
        { label: 'OK', fn: () => dismissBubble() }
      ]);
    });

    window.addEventListener('sf:visibility-changed', (e) => {
      const isPublic = e.detail?.isPublic;
      setExpression('happy', 2);
      if (isPublic) {
        showBubble("Note is now public on the Nexus! Students can discover it.", [
          { label: 'Share the link too', fn: () => { dismissBubble(); } },
          { label: 'Cool', fn: () => dismissBubble() }
        ]);
      } else {
        showBubble("Note is now private. Only you can see it.", [
          { label: 'Got it', fn: () => dismissBubble() }
        ]);
      }
    });

    window.addEventListener('sf:note-preview', (e) => {
      const title = e.detail?.title || 'this note';
      // Only show after a short delay if they're still previewing
      setTimeout(() => {
        if (!bubbleVisible) {
          showNotificationDot();
        }
      }, 3000);
    });

    // ---- CHAT PAGE EVENTS ----
    window.addEventListener('sf:chat-started', () => {
      setExpression('excited', 2);
      showBubble("Ooh, new chat! What are we talking about today?", [
        { label: 'Surprise me!', fn: () => { askAssistant('Suggest an interesting study topic to explore based on popular subjects', 'ask'); } },
        { label: 'Let\'s chat!', fn: () => { setExpression('happy'); dismissBubble(); } }
      ]);
    });

    window.addEventListener('sf:chat-response', () => {
      // Subtle acknowledgment - just a happy expression, no bubble
      setExpression('happy', 1.5);
    });

    window.addEventListener('sf:chat-folder-created', () => {
      setExpression('happy', 2);
      showBubble("Chat folder created! Drag conversations into it to stay organized.", [
        { label: 'Got it', fn: () => dismissBubble() }
      ]);
    });

    window.addEventListener('sf:conversation-deleted', () => {
      setExpression('idle');
    });

    // ---- DASHBOARD EVENTS ----
    window.addEventListener('sf:widget-added', (e) => {
      const type = e.detail?.type || 'widget';
      setExpression('excited', 2);
      showBubble(`Sweet! ${type.replace(/([A-Z])/g, ' $1').trim()} widget added! Make it your own!`, [
        { label: 'Add more!', fn: () => { openWidgetPicker(); dismissBubble(); } },
        { label: 'Perfect!', fn: () => { setExpression('happy'); dismissBubble(); } }
      ]);
    });

    window.addEventListener('sf:theme-changed', (e) => {
      setExpression('excited', 2);
      showBubble("Ooh! Fresh look! I dig it!", [
        { label: 'Try a wallpaper too', fn: () => { clickThemePicker(); dismissBubble(); } },
        { label: 'Thanks Flo!', fn: () => { setExpression('happy'); dismissBubble(); } }
      ]);
    });

    window.addEventListener('sf:wallpaper-changed', (e) => {
      setExpression('happy', 2);
      showBubble("Nice wallpaper! Your dashboard is looking great.", [
        { label: 'Thanks!', fn: () => { setExpression('happy'); dismissBubble(); } }
      ]);
    });

    // ---- BROWSE PAGE EVENTS ----
    window.addEventListener('sf:search-performed', (e) => {
      const count = e.detail?.resultCount || 0;
      const query = e.detail?.query || '';
      if (count === 0 && query) {
        setExpression('thinking', 2);
        showBubble(`No results for "${query}". Try different keywords or check the filters.`, [
          { label: 'Clear filters', fn: () => { if (window.clearAdvFilters) window.clearAdvFilters(); dismissBubble(); } },
          { label: 'Ask me about it', fn: () => { askAssistant(`Tell me about: ${query}`, 'ask'); } },
          { label: 'OK', fn: () => dismissBubble() }
        ]);
      } else if (count > 0) {
        // Don't interrupt browsing, just a subtle reaction
        setExpression('happy', 1);
      }
    });

    // ---- FLASHCARDS EVENTS ----
    window.addEventListener('sf:quiz-started', (e) => {
      const topic = e.detail?.topic || 'a topic';
      setExpression('happy', 2);
      showBubble(`Quiz on "${topic}" starting! Good luck!`, [
        { label: 'Thanks!', fn: () => { setExpression('happy'); dismissBubble(); } }
      ]);
      setTimeout(dismissBubble, 3000);
    });

    window.addEventListener('sf:quiz-completed', (e) => {
      const correct = e.detail?.correct || 0;
      const total = e.detail?.total || 0;
      const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

      // Easter egg: Perfect score celebration!
      if (pct === 100) {
        setExpression('celebrating', 6);
        spawnParticleBurst('fire', 10);
        spawnParticleBurst('lightning', 5);
        showBubble(`PERFECT SCORE! 🏆 ${correct}/${total} CORRECT! YOU'RE A GENIUS! 🎉🎊✨`, [
          { label: 'YEAH!', fn: () => { setExpression('excited', 3); dismissBubble(); } },
          { label: 'Do it again!', fn: () => { focusQuizInput(); dismissBubble(); } },
          { label: 'Tell everyone!', fn: () => { dismissBubble(); } }
        ]);
      } else if (pct >= 80) {
        setExpression('excited', 4);
        spawnParticleBurst('star', 5);
        showBubble(`BOOM! 💥 ${correct}/${total} correct (${pct}%)! You crushed it! 🎯`, [
          { label: 'Let\'s go!', fn: () => { focusQuizInput(); dismissBubble(); } },
          { label: 'Race a friend', fn: () => { if (window.generateCode) window.generateCode(); dismissBubble(); } }
        ]);
      } else if (pct >= 50) {
        setExpression('happy', 3);
        showBubble(`Nice effort! ${correct}/${total} correct (${pct}%). Keep studying and you'll ace it!`, [
          { label: 'Retry missed questions', fn: () => { if (window.retryMissed) window.retryMissed(); dismissBubble(); } },
          { label: 'Study tips', fn: () => { askAssistant(`I scored ${pct}% on a quiz. Give me tips to improve my study technique`, 'tips'); } }
        ]);
      } else {
        setExpression('thinking', 3);
        showBubble(`${correct}/${total} correct (${pct}%). Don't worry -- let's review and try again!`, [
          { label: 'Retry missed', fn: () => { if (window.retryMissed) window.retryMissed(); dismissBubble(); } },
          { label: 'Help me study this', fn: () => { askAssistant(`I scored poorly on a quiz. Help me understand the material better and give study strategies`, 'tips'); } }
        ]);
      }
    });

    window.addEventListener('sf:race-completed', (e) => {
      setExpression('happy', 3);
      showBubble("Race finished! That was intense!", [
        { label: 'Rematch', fn: () => { if (window.rematch) window.rematch(); dismissBubble(); } },
        { label: 'New quiz', fn: () => { focusQuizInput(); dismissBubble(); } }
      ]);
    });

    // ---- CALENDAR EVENTS ----
    window.addEventListener('sf:events-imported', (e) => {
      const count = e.detail?.count || 0;
      setExpression('happy', 3);
      showBubble(`${count} event${count !== 1 ? 's' : ''} imported from Canvas! Your calendar is up to date.`, [
        { label: 'View today', fn: () => { dismissBubble(); } },
        { label: 'Great', fn: () => { setExpression('happy'); dismissBubble(); } }
      ]);
    });

    window.addEventListener('sf:event-completed', () => {
      setExpression('happy', 2);
      showBubble("Event marked complete! Keep up the good work.", [
        { label: 'Thanks!', fn: () => dismissBubble() }
      ]);
      setTimeout(dismissBubble, 2500);
    });

    // ---- GLOBAL ERROR HANDLER ----
    window.addEventListener('sf:error', (e) => {
      const msg = e.detail?.message || 'Something went wrong';
      setExpression('worried', 3);
      showBubble(`Uh oh! ${msg}. Don't worry, it happens! Try again?`, [
        { label: 'Let\'s retry', fn: () => { setExpression('happy'); dismissBubble(); } },
        { label: 'It\'s okay', fn: () => dismissBubble() }
      ]);
    });

    // Catch unhandled JS errors
    window.addEventListener('error', (e) => {
      setExpression('surprised', 1.5);
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', () => {
      setExpression('surprised', 1);
    });
  }

  // ========== INIT ==========
  function init() {
    // Don't load on admin pages or login/signup
    const page = detectPage();
    if (page.startsWith('admin') || page === 'signup' || page === 'reset-password' || page === 'verify-age' || page === 'verify-edu') return;
    // Don't load on shared viewer, demo, or legal pages
    if (page === 'shared' || page.startsWith('demo') || page.startsWith('sequential') || page.startsWith('tutorial')) return;
    if (['terms', 'privacy', 'dmca', 'compliance', 'guidelines', 'academic-integrity', 'ai-transparency', 'age-safety'].includes(page)) return;

    currentPage = page;

    // Load Three.js dynamically
    if (typeof THREE === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => {
        buildDOM();
        initCharacter();
        setupEventListeners();
        triggerWelcome();
        resetIdleTimer();
      };
      document.head.appendChild(script);
    } else {
      buildDOM();
      initCharacter();
      setupEventListeners();
      triggerWelcome();
      resetIdleTimer();
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to let page scripts initialize
    setTimeout(init, 500);
  }
})();
