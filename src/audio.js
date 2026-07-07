// Synthesized SFX via WebAudio — no external assets needed.
let ctx = null;
let master = null;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(dur) {
  const c = ac();
  const buf = c.createBuffer(1, Math.max(1, (dur * c.sampleRate) | 0), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function envGain(t0, peak, dur) {
  const g = ac().createGain();
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  g.connect(master);
  return g;
}

function burst({ dur = 0.1, peak = 0.8, type = 'lowpass', freq = 800, q = 1, delay = 0 } = {}) {
  const c = ac();
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(dur + 0.05);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  src.connect(f).connect(envGain(t0, peak, dur));
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

function tone({ dur = 0.15, peak = 0.5, type = 'sine', f0 = 200, f1 = null, delay = 0 } = {}) {
  const c = ac();
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1 !== null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  o.connect(envGain(t0, peak, dur));
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const Sound = {
  unlock() { ac(); },

  // v: 0..1 hit intensity
  thud(v = 0.5) {
    burst({ dur: 0.09 + v * 0.1, peak: 0.7 + v * 0.5, freq: 500 + v * 400 });
    tone({ dur: 0.12 + v * 0.12, peak: 0.55 + v * 0.4, f0: 160 + v * 90, f1: 40, type: 'sine' });
    if (v > 0.55) tone({ dur: 0.2, peak: 0.3, f0: 70, f1: 30, type: 'triangle', delay: 0.01 });
  },
  block() {
    burst({ dur: 0.06, peak: 0.45, type: 'highpass', freq: 1200 });
    tone({ dur: 0.08, peak: 0.3, f0: 320, f1: 180, type: 'square' });
  },
  whoosh() {
    burst({ dur: 0.12, peak: 0.18, type: 'bandpass', freq: 900, q: 2 });
  },
  fireball() {
    burst({ dur: 0.3, peak: 0.35, type: 'bandpass', freq: 600, q: 4 });
    tone({ dur: 0.3, peak: 0.25, f0: 220, f1: 440, type: 'sawtooth' });
  },
  laser() {
    tone({ dur: 0.35, peak: 0.4, f0: 1400, f1: 90, type: 'sawtooth' });
    burst({ dur: 0.3, peak: 0.3, type: 'highpass', freq: 2000 });
    tone({ dur: 0.4, peak: 0.3, f0: 60, f1: 45, type: 'sine' });
  },
  slam() {
    burst({ dur: 0.22, peak: 1.0, freq: 300 });
    tone({ dur: 0.3, peak: 0.7, f0: 100, f1: 28, type: 'sine' });
  },
  ko() {
    burst({ dur: 0.5, peak: 1.1, freq: 400 });
    tone({ dur: 0.7, peak: 0.8, f0: 130, f1: 24, type: 'sine' });
    tone({ dur: 0.5, peak: 0.35, f0: 500, f1: 60, type: 'sawtooth', delay: 0.02 });
  },
  bell() {
    tone({ dur: 0.9, peak: 0.4, f0: 660, type: 'sine' });
    tone({ dur: 0.9, peak: 0.25, f0: 1320, type: 'sine' });
  },
  beep() {
    tone({ dur: 0.07, peak: 0.25, f0: 700, type: 'square' });
  },
  announce() {
    tone({ dur: 0.25, peak: 0.4, f0: 300, f1: 500, type: 'triangle' });
  },
};
