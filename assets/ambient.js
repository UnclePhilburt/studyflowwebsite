// Ambient Sound Generator v2 - improved Web Audio API synthesis
(function() {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let activeNodes = [];
  let activeTimers = [];
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
    activeTimers.forEach(t => clearTimeout(t));
    activeNodes = [];
    activeTimers = [];
    currentSound = null;
  }

  function addTimer(fn, ms) {
    const t = setTimeout(fn, ms);
    activeTimers.push(t);
    return t;
  }

  // ========== NOISE BUFFERS ==========
  // Longer buffers (8s) with stereo decorrelation for less obvious looping

  function createNoiseBuffer(seconds, type) {
    const c = getContext();
    const sr = c.sampleRate;
    const len = sr * seconds;
    const buffer = c.createBuffer(2, len, sr);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      let lastBrown = 0;

      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;

        if (type === 'brown') {
          lastBrown = (lastBrown + (0.02 * white)) / 1.02;
          data[i] = lastBrown * 3.5;
        } else if (type === 'pink') {
          // Voss-McCartney pink noise (more accurate)
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
          b6 = white * 0.115926;
        } else {
          data[i] = white;
        }
      }

      // Crossfade loop point (last 0.1s fades into first 0.1s) to prevent click
      const fade = Math.floor(sr * 0.1);
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        data[len - fade + i] = data[len - fade + i] * (1 - t) + data[i] * t;
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

  // ========== UTILITY ==========

  function makeFilter(type, freq, q) {
    const c = getContext();
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q !== undefined) f.Q.value = q;
    return f;
  }

  function makeLFO(freq, amount, target) {
    const c = getContext();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = amount;
    osc.connect(gain);
    gain.connect(target);
    osc.start();
    activeNodes.push(osc, gain);
  }

  function makeGain(val) {
    const c = getContext();
    const g = c.createGain();
    g.gain.value = val;
    return g;
  }

  // ========== SOUND GENERATORS ==========

  function generateWhite() {
    const c = getContext();
    const buffer = createNoiseBuffer(8, 'white');
    const source = loopBuffer(buffer);
    const gain = makeGain(0.08);

    // Gentle highshelf rolloff so it's not harsh
    const shelf = makeFilter('highshelf', 6000);
    shelf.gain.value = -6;

    source.connect(shelf);
    shelf.connect(gain);
    gain.connect(masterGain);
    source.start();
    activeNodes.push(source, shelf, gain);
  }

  function generateBrown() {
    const c = getContext();
    // Two decorrelated brown noise sources panned slightly for width
    for (let i = 0; i < 2; i++) {
      const buffer = createNoiseBuffer(8, 'brown');
      const source = loopBuffer(buffer);
      const gain = makeGain(0.35);

      const lp = makeFilter('lowpass', 600);
      const pan = c.createStereoPanner();
      pan.pan.value = i === 0 ? -0.3 : 0.3;

      source.connect(lp);
      lp.connect(gain);
      gain.connect(pan);
      pan.connect(masterGain);
      source.start();
      activeNodes.push(source, lp, gain, pan);
    }

    // Subtle slow variation
    const modBuffer = createNoiseBuffer(8, 'brown');
    const modSource = loopBuffer(modBuffer);
    const modGain = makeGain(0.05);
    modSource.connect(modGain);
    modGain.connect(masterGain);
    modSource.start();
    activeNodes.push(modSource, modGain);
  }

  function generateRain() {
    const c = getContext();

    // Layer 1: Steady rain - wide-band noise shaped to sound like rain on a surface
    const steadyBuf = createNoiseBuffer(8, 'white');
    const steady = loopBuffer(steadyBuf);
    const steadyGain = makeGain(0.07);

    const bp1 = makeFilter('bandpass', 2500, 0.4);
    const bp2 = makeFilter('bandpass', 5000, 0.6);
    const hp = makeFilter('highpass', 300);

    // Split into two frequency bands for richness
    steady.connect(bp1);
    steady.connect(bp2);
    bp1.connect(hp);
    bp2.connect(steadyGain);
    hp.connect(steadyGain);
    steadyGain.connect(masterGain);
    steady.start();
    activeNodes.push(steady, bp1, bp2, hp, steadyGain);

    // Layer 2: Low rumble (rain on roof / distant)
    const rumbleBuf = createNoiseBuffer(8, 'brown');
    const rumble = loopBuffer(rumbleBuf);
    const rumbleGain = makeGain(0.06);
    const rumbleLp = makeFilter('lowpass', 400);
    rumble.connect(rumbleLp);
    rumbleLp.connect(rumbleGain);
    rumbleGain.connect(masterGain);
    rumble.start();
    activeNodes.push(rumble, rumbleLp, rumbleGain);

    // Slow modulation on the rumble (gusts of heavier rain)
    makeLFO(0.05, 0.03, rumbleGain.gain);

    // Layer 3: Mid-frequency patter
    const midBuf = createNoiseBuffer(8, 'pink');
    const mid = loopBuffer(midBuf);
    const midGain = makeGain(0.05);
    const midBp = makeFilter('bandpass', 1200, 0.3);
    mid.connect(midBp);
    midBp.connect(midGain);
    midGain.connect(masterGain);
    mid.start();
    activeNodes.push(mid, midBp, midGain);

    // Layer 4: Individual droplets (granular synthesis approach)
    function droplet() {
      if (currentSound !== 'rain') return;
      const now = c.currentTime;

      // Randomize: some are soft taps, some are splashier
      const isSplash = Math.random() > 0.7;
      const freq = isSplash ? (1000 + Math.random() * 2000) : (3000 + Math.random() * 5000);
      const dur = isSplash ? (0.04 + Math.random() * 0.06) : (0.01 + Math.random() * 0.03);
      const vol = isSplash ? (0.015 + Math.random() * 0.02) : (0.005 + Math.random() * 0.012);

      const osc = c.createOscillator();
      const g = c.createGain();
      const f = makeFilter('bandpass', freq, 2);
      const pan = c.createStereoPanner();
      pan.pan.value = (Math.random() - 0.5) * 1.6; // wide stereo

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + dur);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(f);
      f.connect(g);
      g.connect(pan);
      pan.connect(masterGain);
      osc.start(now);
      osc.stop(now + dur + 0.01);

      // Schedule next droplet (variable density)
      const next = 20 + Math.random() * 120;
      addTimer(droplet, next);
    }
    addTimer(droplet, 50);

    // Layer 5: Occasional heavier splash clusters
    function splashCluster() {
      if (currentSound !== 'rain') return;
      const count = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        addTimer(() => {
          if (currentSound !== 'rain') return;
          const now = c.currentTime;
          const osc = c.createOscillator();
          const g = c.createGain();
          const pan = c.createStereoPanner();
          pan.pan.value = (Math.random() - 0.5) * 1.2;
          osc.type = 'triangle';
          osc.frequency.value = 800 + Math.random() * 1500;
          g.gain.setValueAtTime(0.02, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
          osc.connect(g);
          g.connect(pan);
          pan.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.1);
        }, i * (10 + Math.random() * 30));
      }
      addTimer(splashCluster, 2000 + Math.random() * 5000);
    }
    addTimer(splashCluster, 1000);
  }

  function generateOcean() {
    const c = getContext();

    // Layer 1: Deep base - slowly modulated brown noise
    const deepBuf = createNoiseBuffer(8, 'brown');
    const deep = loopBuffer(deepBuf);
    const deepGain = makeGain(0.25);
    const deepLp = makeFilter('lowpass', 500);
    deep.connect(deepLp);
    deepLp.connect(deepGain);
    deepGain.connect(masterGain);
    deep.start();
    activeNodes.push(deep, deepLp, deepGain);

    // Primary wave cycle - slow amplitude modulation
    makeLFO(0.06, 0.12, deepGain.gain);
    // Secondary slower cycle for variation
    makeLFO(0.023, 0.06, deepGain.gain);

    // Layer 2: Mid-range body with filter sweep
    const midBuf = createNoiseBuffer(8, 'brown');
    const mid = loopBuffer(midBuf);
    const midGain = makeGain(0.15);
    const midBp = makeFilter('bandpass', 600, 0.4);
    mid.connect(midBp);
    midBp.connect(midGain);
    midGain.connect(masterGain);
    mid.start();
    activeNodes.push(mid, midBp, midGain);

    // Sweep the filter frequency to simulate waves rolling
    makeLFO(0.07, 200, midBp.frequency);
    makeLFO(0.12, 0.08, midGain.gain);

    // Layer 3: Foam and hiss (waves crashing)
    const foamBuf = createNoiseBuffer(8, 'white');
    const foam = loopBuffer(foamBuf);
    const foamGain = makeGain(0.02);
    const foamHp = makeFilter('highpass', 2500);
    const foamBp = makeFilter('bandpass', 4000, 0.5);
    foam.connect(foamHp);
    foamHp.connect(foamBp);
    foamBp.connect(foamGain);
    foamGain.connect(masterGain);
    foam.start();
    activeNodes.push(foam, foamHp, foamBp, foamGain);

    // Foam swells with the waves but slightly offset
    makeLFO(0.07, 0.018, foamGain.gain);
    makeLFO(0.13, 0.01, foamGain.gain);

    // Layer 4: Stereo width - slightly different noise in each ear
    const widthBuf = createNoiseBuffer(8, 'pink');
    const width = loopBuffer(widthBuf);
    const widthGain = makeGain(0.03);
    const widthPan = c.createStereoPanner();
    widthPan.pan.value = 0;
    const widthLp = makeFilter('lowpass', 1000);
    width.connect(widthLp);
    widthLp.connect(widthGain);
    widthGain.connect(widthPan);
    widthPan.connect(masterGain);
    width.start();
    activeNodes.push(width, widthLp, widthGain, widthPan);

    // Pan slowly side to side
    makeLFO(0.03, 0.6, widthPan.pan);

    // Layer 5: Occasional wave crash emphasis
    function waveCrash() {
      if (currentSound !== 'ocean') return;
      const now = c.currentTime;
      const dur = 2 + Math.random() * 3;

      const buf = createNoiseBuffer(1, 'white');
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      const bp = makeFilter('bandpass', 1500 + Math.random() * 2000, 0.3);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.03 + Math.random() * 0.02, now + dur * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      src.connect(bp);
      bp.connect(g);
      g.connect(masterGain);
      src.start(now);
      src.stop(now + dur);

      addTimer(waveCrash, 4000 + Math.random() * 8000);
    }
    addTimer(waveCrash, 3000);
  }

  function generateFire() {
    const c = getContext();

    // Layer 1: Warm base hum
    const baseBuf = createNoiseBuffer(8, 'brown');
    const base = loopBuffer(baseBuf);
    const baseGain = makeGain(0.12);
    const baseLp = makeFilter('lowpass', 250);
    base.connect(baseLp);
    baseLp.connect(baseGain);
    baseGain.connect(masterGain);
    base.start();
    activeNodes.push(base, baseLp, baseGain);

    // Gentle breathing modulation
    makeLFO(0.15, 0.03, baseGain.gain);

    // Layer 2: Mid crackle bed (pink noise filtered)
    const crackleBuf = createNoiseBuffer(8, 'pink');
    const crackle = loopBuffer(crackleBuf);
    const crackleGain = makeGain(0.08);
    const crackleBp = makeFilter('bandpass', 2000, 0.6);
    const crackleHp = makeFilter('highpass', 800);
    crackle.connect(crackleBp);
    crackleBp.connect(crackleHp);
    crackleHp.connect(crackleGain);
    crackleGain.connect(masterGain);
    crackle.start();
    activeNodes.push(crackle, crackleBp, crackleHp, crackleGain);

    // Layer 3: Random individual pops and crackles
    function crackPop() {
      if (currentSound !== 'fire') return;
      const now = c.currentTime;

      // Vary between small tick, medium pop, and louder snap
      const type = Math.random();
      let freq, dur, vol, waveform;

      if (type < 0.5) {
        // Small tick
        freq = 2000 + Math.random() * 4000;
        dur = 0.005 + Math.random() * 0.01;
        vol = 0.01 + Math.random() * 0.02;
        waveform = 'sine';
      } else if (type < 0.85) {
        // Medium pop
        freq = 500 + Math.random() * 1500;
        dur = 0.01 + Math.random() * 0.03;
        vol = 0.02 + Math.random() * 0.04;
        waveform = 'triangle';
      } else {
        // Loud snap
        freq = 200 + Math.random() * 800;
        dur = 0.02 + Math.random() * 0.05;
        vol = 0.04 + Math.random() * 0.06;
        waveform = 'square';
      }

      const osc = c.createOscillator();
      const g = c.createGain();
      const pan = c.createStereoPanner();
      pan.pan.value = (Math.random() - 0.5) * 0.8;

      osc.type = waveform;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.3, 50), now + dur);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(g);
      g.connect(pan);
      pan.connect(masterGain);
      osc.start(now);
      osc.stop(now + dur + 0.01);

      // Variable timing - sometimes rapid bursts, sometimes sparse
      const next = 30 + Math.random() * 250;
      addTimer(crackPop, next);
    }
    addTimer(crackPop, 100);

    // Layer 4: Occasional burst of rapid crackles (log shifting)
    function crackBurst() {
      if (currentSound !== 'fire') return;
      const burstCount = 5 + Math.floor(Math.random() * 10);
      for (let i = 0; i < burstCount; i++) {
        addTimer(() => {
          if (currentSound !== 'fire') return;
          const now = c.currentTime;
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = 'square';
          osc.frequency.value = 300 + Math.random() * 2000;
          g.gain.setValueAtTime(0.015, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.015);
        }, i * (5 + Math.random() * 15));
      }
      addTimer(crackBurst, 3000 + Math.random() * 8000);
    }
    addTimer(crackBurst, 2000);

    // Layer 5: Very low woosh (air drawn into fire)
    const wooshBuf = createNoiseBuffer(8, 'brown');
    const woosh = loopBuffer(wooshBuf);
    const wooshGain = makeGain(0.04);
    const wooshLp = makeFilter('lowpass', 150);
    woosh.connect(wooshLp);
    wooshLp.connect(wooshGain);
    wooshGain.connect(masterGain);
    woosh.start();
    activeNodes.push(woosh, wooshLp, wooshGain);
    makeLFO(0.2, 0.02, wooshGain.gain);
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

  // Restore saved volume
  const savedVol = localStorage.getItem('sf-ambient-vol');
  if (savedVol) volume = parseFloat(savedVol);
})();
