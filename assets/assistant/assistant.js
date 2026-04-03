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
  let leftLid, rightLid;
  let mouseX = 0, mouseY = 0;
  let bobTime = 0;
  let blinkTimer = 0;
  let expression = 'idle'; // idle, happy, sleepy, surprised, thinking
  let expressionTimer = 0;
  let bubbleVisible = false;
  let idleTimer = null;
  let hasNotification = false;
  let currentPage = '';

  // ========== PAGE ACTION DEFINITIONS ==========
  const PAGE_ACTIONS = {
    'dashboard': {
      welcome: "Welcome to your dashboard! Here's what you can do:",
      idle: "Need anything?",
      welcomeActions: [
        { label: 'Take a tour', fn: () => { if (window.startOnboarding) window.startOnboarding(); }, primary: true },
        { label: 'Add a widget', fn: () => { document.getElementById('widgetPicker')?.classList.add('active'); } },
        { label: 'Change theme', fn: () => { clickThemePicker(); } }
      ],
      actions: [
        { label: "What's my day look like?", fn: () => { loadDigest(); }, primary: true },
        { label: 'Add a widget', fn: () => { document.getElementById('widgetPicker')?.classList.add('active'); } },
        { label: 'Change theme', fn: () => { clickThemePicker(); } }
      ],
      proactive: getTimeGreeting
    },
    'notes': {
      welcome: "This is your note library! Upload, organize, and share your study notes.",
      idle: "Working on your notes?",
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
      welcome: "Chat with AI about any topic! Your conversations are saved as a knowledge graph.",
      idle: "Want to chat?",
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
      welcome: "Browse the Nexus! Find notes shared by students across universities.",
      idle: "Looking for something?",
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
      welcome: "Test your knowledge! Generate quizzes on any topic or race your friends.",
      idle: "Ready to study?",
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
        { label: "What's on today?", fn: () => { loadDigest(); }, primary: true },
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
    if (hour < 6) return { msg: "Burning the midnight oil? Don't forget to rest!", actions: [
      { label: 'Start focus timer', fn: () => {} },
      { label: "I'm just browsing", fn: () => dismissBubble() }
    ]};
    if (hour < 12) return { msg: "Good morning! Ready to study?", actions: [
      { label: 'Add a widget', fn: () => { document.getElementById('widgetPicker')?.classList.add('active'); } },
      { label: "Let's go", fn: () => dismissBubble() }
    ]};
    if (hour < 17) return { msg: "Afternoon study session! You've got this.", actions: [
      { label: 'Add a widget', fn: () => { document.getElementById('widgetPicker')?.classList.add('active'); } },
      { label: 'Thanks!', fn: () => { setExpression('happy'); dismissBubble(); } }
    ]};
    if (hour < 22) return { msg: "Evening session! Nice dedication.", actions: [
      { label: 'Add a widget', fn: () => { document.getElementById('widgetPicker')?.classList.add('active'); } },
      { label: 'Thanks!', fn: () => { setExpression('happy'); dismissBubble(); } }
    ]};
    return { msg: "Late night studying? Make sure to get some sleep!", actions: [
      { label: "I'll wrap up soon", fn: () => { setExpression('happy'); dismissBubble(); } }
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

  function showDigestBubble(data) {
    const actions = [];
    if (data.events_today && data.events_today.length > 0) {
      actions.push({ label: `View ${data.events_today.length} event${data.events_today.length > 1 ? 's' : ''} today`, fn: () => { window.location.href = 'calendar.html'; } });
    }
    if (data.unread_notifications > 0) {
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

  // ========== BUILD DOM ==========
  function buildDOM() {
    const wrap = document.createElement('div');
    wrap.id = 'sf-assistant-wrap';
    if (localStorage.getItem(MINIMIZED_KEY) === 'true') wrap.classList.add('minimized');

    wrap.innerHTML = `
      <div id="sf-assistant-bubble">
        <button id="sf-assistant-dismiss" title="Close">&times;</button>
        <div id="sf-assistant-msg"></div>
        <div id="sf-assistant-buttons"></div>
      </div>
      <div id="sf-assistant-character" title="Click to chat with ${ASSISTANT_NAME}">
        <div id="sf-assistant-dot"></div>
      </div>
    `;

    document.body.appendChild(wrap);

    // Events
    document.getElementById('sf-assistant-character').addEventListener('click', onCharacterClick);
    document.getElementById('sf-assistant-dismiss').addEventListener('click', (e) => {
      e.stopPropagation();
      dismissBubble();
    });

    // Double-click to minimize/restore
    document.getElementById('sf-assistant-character').addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const wrap = document.getElementById('sf-assistant-wrap');
      const isMin = wrap.classList.toggle('minimized');
      localStorage.setItem(MINIMIZED_KEY, isMin);
      if (isMin) dismissBubble();
    });

    // Track mouse for eye movement
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
  }

  // ========== THREE.JS CHARACTER ==========
  function initCharacter() {
    const container = document.getElementById('sf-assistant-character');
    const size = 140; // render at 2x for sharpness

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.2, 4.5);
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

    // Body - soft rounded sphere
    const bodyGeo = new THREE.SphereGeometry(1, 32, 32);
    // Slightly squash vertically for a friendlier look
    bodyGeo.scale(1, 0.92, 0.95);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x7c9885,
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
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x6a8573, roughness: 0.6 });

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

    // Small mouth
    const mouthCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.15, -0.18, 0.95),
      new THREE.Vector3(0, -0.25, 0.98),
      new THREE.Vector3(0.15, -0.18, 0.95)
    );
    const mouthGeo = new THREE.BufferGeometry().setFromPoints(mouthCurve.getPoints(12));
    const mouthMat = new THREE.LineBasicMaterial({ color: 0x4a6b52, linewidth: 2 });
    const mouth = new THREE.Line(mouthGeo, mouthMat);
    bodyMesh.add(mouth);

    // Start animation
    animate();
  }

  function animate() {
    requestAnimationFrame(animate);

    const dt = 0.016;
    bobTime += dt;
    blinkTimer += dt;
    if (expressionTimer > 0) expressionTimer -= dt;
    if (expressionTimer <= 0 && expression !== 'idle' && expression !== 'sleepy') {
      expression = 'idle';
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

    // Blink
    let lidTarget = -Math.PI * 0.5; // open
    if (blinkTimer > 3 + Math.random() * 2) {
      // Blink cycle
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
    if (expression === 'happy') {
      // Squint eyes slightly (happy)
      lidTarget = -Math.PI * 0.35;
    } else if (expression === 'sleepy') {
      lidTarget = -Math.PI * 0.2; // half closed
    } else if (expression === 'surprised') {
      lidTarget = -Math.PI * 0.55; // extra wide
      leftEye.scale.setScalar(1.15);
      rightEye.scale.setScalar(1.15);
    } else {
      leftEye.scale.setScalar(1);
      rightEye.scale.setScalar(1);
    }

    leftLid.rotation.x += (lidTarget - leftLid.rotation.x) * 0.15;
    rightLid.rotation.x += (lidTarget - rightLid.rotation.x) * 0.15;

    renderer.render(scene, camera);
  }

  function setExpression(expr, duration = 2) {
    expression = expr;
    expressionTimer = duration;
  }

  // ========== BUBBLE SYSTEM ==========
  function showBubble(msg, actions = []) {
    const bubble = document.getElementById('sf-assistant-bubble');
    const msgEl = document.getElementById('sf-assistant-msg');
    const btnsEl = document.getElementById('sf-assistant-buttons');

    msgEl.textContent = msg;
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
  function onCharacterClick() {
    const wrap = document.getElementById('sf-assistant-wrap');
    if (wrap.classList.contains('minimized')) {
      wrap.classList.remove('minimized');
      localStorage.setItem(MINIMIZED_KEY, false);
      setExpression('happy');
      return;
    }

    if (bubbleVisible) {
      dismissBubble();
      return;
    }

    // Show page actions
    const config = PAGE_ACTIONS[currentPage];
    if (config) {
      showBubble(config.idle, config.actions);
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
  }

  function onIdle() {
    if (bubbleVisible) return;
    if (document.getElementById('sf-assistant-wrap')?.classList.contains('minimized')) return;

    // On dashboard, try to preload digest
    if (currentPage === 'dashboard' && getAuthToken()) {
      showNotificationDot();
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
    // Listen for uploads on notes page
    window.addEventListener('sf-note-uploaded', () => {
      setExpression('happy', 3);
      showBubble("Nice upload!", [
        { label: 'Make it public', fn: () => { dismissBubble(); } },
        { label: 'Share with a friend', fn: () => { dismissBubble(); } }
      ]);
    });

    // Listen for errors
    window.addEventListener('error', () => {
      setExpression('surprised', 2);
    });

    // Reset idle on any interaction
    ['click', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, resetIdleTimer, { passive: true });
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
