// Pomodoro Focus Timer - overlay that persists across pages
(function() {
  'use strict';

  const STORAGE_KEY = 'sf-pomodoro';
  const DEFAULT_WORK = 25;
  const DEFAULT_BREAK = 5;
  const DEFAULT_LONG_BREAK = 15;
  const DEFAULT_ROUNDS = 4;

  let state = null; // { running, paused, mode, timeLeft, rounds, currentRound, workMin, breakMin, longBreakMin, totalRounds, startedAt }
  let timerInterval = null;
  let overlay = null;

  // ========== AUDIO ==========
  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Gentle two-note chime
      [523.25, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.3 + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.3);
        osc.stop(ctx.currentTime + i * 0.3 + 1.5);
      });
    } catch (e) {}
  }

  function playDing() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 587.33;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1);
    } catch (e) {}
  }

  // ========== STATE ==========
  function saveState() {
    if (state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.running) {
        // Calculate elapsed time since page change
        if (!saved.paused && saved.lastTick) {
          const elapsed = Math.floor((Date.now() - saved.lastTick) / 1000);
          saved.timeLeft = Math.max(0, saved.timeLeft - elapsed);
        }
        state = saved;
        return true;
      }
    } catch (e) {}
    return false;
  }

  // ========== TIMER LOGIC ==========
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    state.paused = false;
    state.lastTick = Date.now();
    saveState();
    timerInterval = setInterval(tick, 1000);
    renderOverlay();
  }

  function pauseTimer() {
    state.paused = true;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    saveState();
    renderOverlay();
  }

  function tick() {
    if (!state || state.paused) return;
    state.timeLeft--;
    state.lastTick = Date.now();

    if (state.timeLeft <= 0) {
      onTimerComplete();
    }

    saveState();
    renderOverlay();
  }

  function onTimerComplete() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    if (state.mode === 'work') {
      state.currentRound++;
      playChime();

      // Save to backend
      savePomodoroToBackend(state.workMin);

      // Dispatch event for Flo
      window.dispatchEvent(new CustomEvent('sf:pomodoro-complete', {
        detail: { round: state.currentRound, total: state.totalRounds }
      }));

      if (state.currentRound >= state.totalRounds) {
        // All rounds done
        state.mode = 'done';
        state.timeLeft = 0;
        saveState();
        renderOverlay();
        return;
      }

      // Switch to break
      const isLongBreak = state.currentRound % state.totalRounds === 0;
      state.mode = isLongBreak ? 'longbreak' : 'break';
      state.timeLeft = (isLongBreak ? state.longBreakMin : state.breakMin) * 60;
      startTimer();
    } else {
      // Break complete
      playDing();
      window.dispatchEvent(new CustomEvent('sf:break-complete'));
      state.mode = 'work';
      state.timeLeft = state.workMin * 60;
      startTimer();
    }
  }

  function stopSession() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    state = null;
    saveState();
    if (overlay) overlay.style.display = 'none';
  }

  // ========== OVERLAY ==========
  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'sf-pomodoro-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 100px;
      z-index: 99989;
      font-family: 'Inter', -apple-system, sans-serif;
      display: none;
    `;
    document.body.appendChild(overlay);
  }

  function renderOverlay() {
    if (!overlay || !state) return;
    overlay.style.display = 'block';

    const mins = Math.floor(state.timeLeft / 60);
    const secs = state.timeLeft % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const pct = state.mode === 'done' ? 100 : (() => {
      const total = state.mode === 'work' ? state.workMin * 60
                  : state.mode === 'longbreak' ? state.longBreakMin * 60
                  : state.breakMin * 60;
      return Math.round(((total - state.timeLeft) / total) * 100);
    })();

    const modeLabel = state.mode === 'work' ? 'Focus'
                    : state.mode === 'break' ? 'Break'
                    : state.mode === 'longbreak' ? 'Long Break'
                    : 'Session Complete';

    const modeColor = state.mode === 'work' ? '#7c9885'
                    : state.mode === 'done' ? '#7c9885'
                    : '#e8a85f';

    const isDark = ['dark','midnight','ember','neon'].includes(
      document.body.getAttribute('data-theme') || ''
    );
    const bg = isDark ? 'rgba(40,40,40,0.95)' : 'rgba(255,255,255,0.95)';
    const text = isDark ? '#eee' : '#2d2d2d';
    const muted = isDark ? '#999' : '#888';

    if (state.mode === 'done') {
      overlay.innerHTML = `
        <div style="background:${bg};backdrop-filter:blur(20px);border-radius:14px;padding:14px 18px;
          box-shadow:0 4px 20px rgba(0,0,0,0.12);display:flex;align-items:center;gap:12px;">
          <div style="font-size:20px;">&#x1F389;</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:${text};">${state.currentRound} pomodoros complete!</div>
            <div style="font-size:11px;color:${muted};">${state.currentRound * state.workMin} minutes of focus</div>
          </div>
          <button onclick="window._pomodoroStop()" style="background:none;border:none;color:${muted};font-size:18px;cursor:pointer;padding:0 0 0 8px;" aria-label="Close">&#xd7;</button>
        </div>
      `;
      return;
    }

    overlay.innerHTML = `
      <div style="background:${bg};backdrop-filter:blur(20px);border-radius:14px;padding:12px 16px;
        box-shadow:0 4px 20px rgba(0,0,0,0.12);display:flex;align-items:center;gap:12px;min-width:200px;">
        <div style="position:relative;width:44px;height:44px;flex-shrink:0;">
          <svg width="44" height="44" viewBox="0 0 44 44" style="transform:rotate(-90deg);">
            <circle cx="22" cy="22" r="18" fill="none" stroke="${isDark ? '#444' : '#eee'}" stroke-width="3"/>
            <circle cx="22" cy="22" r="18" fill="none" stroke="${modeColor}" stroke-width="3"
              stroke-dasharray="${2 * Math.PI * 18}" stroke-dashoffset="${2 * Math.PI * 18 * (1 - pct / 100)}"
              stroke-linecap="round" style="transition:stroke-dashoffset 1s linear;"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
            font-size:10px;font-weight:700;color:${text};">${timeStr}</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:700;color:${modeColor};">${modeLabel}</div>
          <div style="font-size:10px;color:${muted};">Round ${state.currentRound + (state.mode === 'work' ? 1 : 0)}/${state.totalRounds}</div>
        </div>
        <div style="display:flex;gap:4px;">
          ${state.paused
            ? `<button onclick="window._pomodoroResume()" style="width:30px;height:30px;border-radius:8px;border:none;background:${modeColor};color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;" aria-label="Resume">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21"/></svg>
              </button>`
            : `<button onclick="window._pomodoropause()" style="width:30px;height:30px;border-radius:8px;border:none;background:${isDark ? '#555' : '#eee'};color:${text};cursor:pointer;display:flex;align-items:center;justify-content:center;" aria-label="Pause">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              </button>`
          }
          <button onclick="window._pomodoroStop()" style="width:30px;height:30px;border-radius:8px;border:none;background:${isDark ? '#555' : '#eee'};color:#e74c3c;cursor:pointer;display:flex;align-items:center;justify-content:center;" aria-label="Stop">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // ========== BACKEND SYNC ==========
  function savePomodoroToBackend(workMinutes) {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch('https://studyflowsuite.onrender.com/api/pomodoro/complete', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ work_minutes: workMinutes })
    }).catch(() => {});
  }

  // ========== PUBLIC API ==========
  window._pomodoroResume = function() { if (state) startTimer(); };
  window._pomodoropause = function() { if (state) pauseTimer(); };
  window._pomodoroStop = function() { stopSession(); };

  window.startPomodoro = function(options = {}) {
    const workMin = options.work || DEFAULT_WORK;
    const breakMin = options.break || DEFAULT_BREAK;
    const longBreakMin = options.longBreak || DEFAULT_LONG_BREAK;
    const totalRounds = options.rounds || DEFAULT_ROUNDS;

    state = {
      running: true,
      paused: false,
      mode: 'work',
      timeLeft: workMin * 60,
      currentRound: 0,
      workMin,
      breakMin,
      longBreakMin,
      totalRounds,
      startedAt: Date.now(),
      lastTick: Date.now()
    };

    saveState();
    startTimer();
  };

  // ========== INIT ==========
  function init() {
    const page = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    if (page.startsWith('admin') || page === 'signup' || page === 'shared') return;

    createOverlay();

    // Resume timer if one was running
    if (loadState()) {
      if (state.mode === 'done') {
        renderOverlay();
      } else if (state.paused) {
        renderOverlay();
      } else {
        startTimer();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }
})();
