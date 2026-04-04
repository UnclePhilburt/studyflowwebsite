// Ambient Sound Generator - Web Audio API, zero file downloads
(function() {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let activeNodes = [];
  let currentSound = null;
  let volume = 0.3;

  const SOUNDS = {
    rain: { name: 'Rain', generate: generateRain },
    ocean: { name: 'Ocean', generate: generateOcean },
    brown: { name: 'Brown Noise', generate: generateBrown },
    white: { name: 'White Noise', generate: generateWhite },
    fire: { name: 'Fireplace', generate: generateFire },
  };

  function getContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function stopAll() {
    activeNodes.forEach(node => {
      try { node.stop ? node.stop() : node.disconnect(); } catch {}
    });
    activeNodes = [];
    currentSound = null;
  }

  // ========== SOUND GENERATORS ==========

  function createNoiseBuffer(seconds, type) {
    const c = getContext();
    const sampleRate = c.sampleRate;
    const length = sampleRate * seconds;
    const buffer = c.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lastOut = 0;

      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;

        if (type === 'brown') {
          lastOut = (lastOut + (0.02 * white)) / 1.02;
          data[i] = lastOut * 3.5;
        } else if (type === 'pink') {
          // Simple pink noise approximation
          lastOut = 0.99886 * lastOut + white * 0.0555179;
          data[i] = lastOut + white * 0.5362;
          data[i] *= 0.11;
        } else {
          data[i] = white;
        }
      }
    }
    return buffer;
  }

  function loopBuffer(buffer) {
    const c = getContext();
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  function generateWhite() {
    const c = getContext();
    const buffer = createNoiseBuffer(2, 'white');
    const source = loopBuffer(buffer);
    const gain = c.createGain();
    gain.gain.value = 0.15;
    source.connect(gain);
    gain.connect(masterGain);
    source.start();
    activeNodes.push(source, gain);
  }

  function generateBrown() {
    const c = getContext();
    const buffer = createNoiseBuffer(2, 'brown');
    const source = loopBuffer(buffer);
    const gain = c.createGain();
    gain.gain.value = 0.5;
    source.connect(gain);
    gain.connect(masterGain);
    source.start();
    activeNodes.push(source, gain);
  }

  function generateRain() {
    const c = getContext();

    // Base: filtered white noise for steady rain
    const noiseBuffer = createNoiseBuffer(4, 'white');
    const noise = loopBuffer(noiseBuffer);
    const noiseGain = c.createGain();
    noiseGain.gain.value = 0.12;

    // Bandpass filter to shape it like rain
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;

    // Highpass to remove rumble
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 400;

    noise.connect(filter);
    filter.connect(hp);
    hp.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();
    activeNodes.push(noise, filter, hp, noiseGain);

    // Layer: low rumble for distant thunder/heavy rain
    const brownBuffer = createNoiseBuffer(3, 'brown');
    const brown = loopBuffer(brownBuffer);
    const brownGain = c.createGain();
    brownGain.gain.value = 0.08;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    brown.connect(lp);
    lp.connect(brownGain);
    brownGain.connect(masterGain);
    brown.start();
    activeNodes.push(brown, lp, brownGain);

    // Droplet pops
    function drip() {
      if (currentSound !== 'rain') return;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = 2000 + Math.random() * 4000;
      g.gain.setValueAtTime(0.02 + Math.random() * 0.03, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(c.currentTime + 0.06);
      setTimeout(drip, 50 + Math.random() * 200);
    }
    setTimeout(drip, 100);
  }

  function generateOcean() {
    const c = getContext();

    // Brown noise base
    const buffer = createNoiseBuffer(4, 'brown');
    const source = loopBuffer(buffer);
    const gain = c.createGain();
    gain.gain.value = 0.35;

    // Slow LFO to modulate volume (waves)
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08; // slow wave cycle
    lfoGain.gain.value = 0.15;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    // Lowpass for muffled ocean sound
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;

    source.connect(lp);
    lp.connect(gain);
    gain.connect(masterGain);
    source.start();
    activeNodes.push(source, lp, gain, lfo, lfoGain);

    // Higher layer for foam/hiss
    const whiteBuffer = createNoiseBuffer(3, 'white');
    const white = loopBuffer(whiteBuffer);
    const whiteGain = c.createGain();
    whiteGain.gain.value = 0.04;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;

    const lfo2 = c.createOscillator();
    const lfo2Gain = c.createGain();
    lfo2.type = 'sine';
    lfo2.frequency.value = 0.1;
    lfo2Gain.gain.value = 0.03;
    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(whiteGain.gain);
    lfo2.start();

    white.connect(hp);
    hp.connect(whiteGain);
    whiteGain.connect(masterGain);
    white.start();
    activeNodes.push(white, hp, whiteGain, lfo2, lfo2Gain);
  }

  function generateFire() {
    const c = getContext();

    // Base crackle: filtered noise
    const buffer = createNoiseBuffer(3, 'pink');
    const source = loopBuffer(buffer);
    const gain = c.createGain();
    gain.gain.value = 0.2;

    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 0.8;

    source.connect(bp);
    bp.connect(gain);
    gain.connect(masterGain);
    source.start();
    activeNodes.push(source, bp, gain);

    // Low warmth
    const brownBuffer = createNoiseBuffer(2, 'brown');
    const brown = loopBuffer(brownBuffer);
    const brownGain = c.createGain();
    brownGain.gain.value = 0.1;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    brown.connect(lp);
    lp.connect(brownGain);
    brownGain.connect(masterGain);
    brown.start();
    activeNodes.push(brown, lp, brownGain);

    // Random pops/crackles
    function pop() {
      if (currentSound !== 'fire') return;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'square';
      osc.frequency.value = 100 + Math.random() * 500;
      g.gain.setValueAtTime(0.04 + Math.random() * 0.06, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.02 + Math.random() * 0.03);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(c.currentTime + 0.05);
      setTimeout(pop, 100 + Math.random() * 400);
    }
    setTimeout(pop, 200);
  }

  // ========== PUBLIC API ==========

  window.ambientSounds = {
    list: () => Object.entries(SOUNDS).map(([id, s]) => ({ id, name: s.name })),

    play: (soundId) => {
      stopAll();
      if (!SOUNDS[soundId]) return;
      currentSound = soundId;
      SOUNDS[soundId].generate();
      localStorage.setItem('sf-ambient', soundId);
    },

    stop: () => {
      stopAll();
      localStorage.removeItem('sf-ambient');
    },

    toggle: (soundId) => {
      if (currentSound === soundId) {
        window.ambientSounds.stop();
      } else {
        window.ambientSounds.play(soundId);
      }
    },

    setVolume: (v) => {
      volume = Math.max(0, Math.min(1, v));
      if (masterGain) masterGain.gain.value = volume;
      localStorage.setItem('sf-ambient-vol', String(volume));
    },

    getCurrent: () => currentSound,
    getVolume: () => volume,
    isPlaying: () => currentSound !== null,
  };

  // Restore saved state
  const savedVol = localStorage.getItem('sf-ambient-vol');
  if (savedVol) volume = parseFloat(savedVol);

  // Don't auto-resume sound (requires user gesture for AudioContext)
  // Instead, show the last-used sound as selected in the UI
})();
