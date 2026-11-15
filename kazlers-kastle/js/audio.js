// Tiny Web Audio sound kit: no files.
let ac = null;
const ctx = () => (ac ||= new (window.AudioContext || window.webkitAudioContext)());
export const unlockAudio = () => { const a = ctx(); if (a.state === 'suspended') a.resume(); };

function tone(freq, start, dur, type = 'triangle', vol = 0.18, slideTo = null) {
  const a = ctx();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

// "beep boop": two bright notes, a fifth apart, with a soft sparkle on top.
export function chime() {
  tone(659.25, 0, 0.16, 'square', 0.07);
  tone(659.25, 0, 0.22, 'sine', 0.16);
  tone(987.77, 0.12, 0.38, 'square', 0.06);
  tone(987.77, 0.12, 0.5, 'sine', 0.16);
  tone(1975.5, 0.14, 0.4, 'sine', 0.04);
}

export function thud() {
  tone(150, 0, 0.22, 'triangle', 0.22, 70);
}

export function click() {
  tone(2400, 0, 0.03, 'square', 0.03);
}

export function fizzle() {
  tone(500, 0, 0.18, 'sawtooth', 0.03, 120);
}

export function rumble() {
  const a = ctx();
  const len = a.sampleRate * 1.1;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 180;
  const g = a.createGain(); g.gain.value = 0.35;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export function fanfare() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tone(f, i * 0.14, 0.6, 'sine', 0.14);
    tone(f, i * 0.14, 0.3, 'square', 0.04);
  });
  tone(1567.98, 0.6, 1.2, 'sine', 0.08);
}
