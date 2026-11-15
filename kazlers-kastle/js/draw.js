// Canvas drawing for panels, reflections and procedural textures.
import { glyph, word, ADVANCE } from './glyphs.js';

export const PW = 1024, PH = 640;
const INK = '#3a281b';
const PAPER = '#f1e2c2';
const GLOW = '#c9ffe0';
const GOLD = '#c98a1a';
const GHOST = '#7a8fb0';

const lettersOf = (s) => [...s.toUpperCase()].filter((c) => c >= 'A' && c <= 'Z');

function slots(n) {
  const w = Math.min(150, 900 / n);
  const x0 = PW / 2 - (w * n) / 2 + w / 2;
  return { w, xs: Array.from({ length: n }, (_, i) => x0 + i * w), size: Math.round(w * 0.95) };
}

function paper(ctx) {
  const g = ctx.createRadialGradient(PW / 2, PH / 2, 80, PW / 2, PH / 2, 620);
  g.addColorStop(0, '#f6ead0');
  g.addColorStop(1, '#d9c39a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PW, PH);
  // a few fibres
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#6b4a2b';
  for (let i = 0; i < 70; i++) {
    const x = (i * 337) % PW, y = (i * 211) % PH;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30 + (i % 7) * 6, y + ((i % 5) - 2) * 3); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---- sigils ---------------------------------------------------------------
function sigil(ctx, kind, cx, cy, color, glow) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 7; ctx.lineCap = 'round';
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 22; }
  if (kind === 'sun') {
    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
      ctx.lineTo(cx + Math.cos(a) * 42, cy + Math.sin(a) * 42);
      ctx.stroke();
    }
  } else if (kind === 'moon') {
    ctx.beginPath();
    ctx.arc(cx, cy, 34, Math.PI * 0.3, Math.PI * 1.7, false);
    ctx.arc(cx + 16, cy, 26, Math.PI * 1.62, Math.PI * 0.38, true);
    ctx.closePath(); ctx.fill();
  } else if (kind === 'pool') {
    for (let r = -1; r <= 1; r++) {
      ctx.beginPath();
      for (let x = -40; x <= 40; x += 4) {
        const y = cy + r * 18 + Math.sin((x / 40) * Math.PI * 2) * 6;
        if (x === -40) ctx.moveTo(cx + x, y); else ctx.lineTo(cx + x, y);
      }
      ctx.stroke();
    }
  } else if (kind === 'tilt') {
    // a level plank with a plumb line: "a table rule; the table shows how"
    ctx.fillRect(cx - 46, cy + 14, 92, 9);
    ctx.beginPath(); ctx.moveTo(cx - 30, cy - 34); ctx.lineTo(cx + 30, cy - 34); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy - 34); ctx.lineTo(cx, cy - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 8, cy - 4); ctx.lineTo(cx + 8, cy - 4); ctx.lineTo(cx, cy + 10); ctx.closePath(); ctx.fill();
  } else if (kind === 'tilt-e' || kind === 'tilt-w') {
    const s = kind === 'tilt-e' ? 1 : -1;
    ctx.save(); ctx.translate(cx, cy + 10); ctx.rotate(s * 0.22);
    ctx.fillRect(-46, 6, 92, 9);
    ctx.beginPath(); ctx.arc(s * 18, -6, 11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(cx + s * 30, cy - 30); ctx.lineTo(cx + s * 46, cy - 22); ctx.lineTo(cx + s * 30, cy - 14); ctx.stroke();
  } else if (kind === 'cistern') {
    // a tank: a line of water, one tile floating on it, one resting on the bottom
    ctx.lineWidth = 5; ctx.strokeRect(cx - 40, cy - 34, 80, 68);
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 40, cy - 14); ctx.lineTo(cx + 40, cy - 14); ctx.stroke();
    ctx.fillRect(cx - 26, cy - 24, 16, 16); ctx.fillRect(cx + 8, cy + 14, 16, 16);
  } else if (kind === 'cracked') {
    // a tank with a crack through it, tiles fallen below
    ctx.lineWidth = 5; ctx.strokeRect(cx - 40, cy - 40, 80, 56);
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 6, cy - 40); ctx.lineTo(cx - 6, cy - 22); ctx.lineTo(cx + 8, cy - 8); ctx.lineTo(cx - 2, cy + 16); ctx.stroke();
    ctx.fillRect(cx - 34, cy + 26, 14, 14); ctx.save(); ctx.translate(cx + 22, cy + 32); ctx.rotate(0.5); ctx.fillRect(-7, -7, 14, 14); ctx.restore();
  } else if (kind === 'ripple') {
    ctx.lineWidth = 4;
    for (const r of [12, 26, 40]) { ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'knot') {
    ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(cx - 16, cy, 16, 24, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx + 16, cy, 16, 24, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (kind === 'tri') {
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy - 32); ctx.lineTo(cx + 34, cy + 26); ctx.lineTo(cx - 34, cy + 26); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + 8, 7, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'hour') {
    ctx.beginPath(); ctx.moveTo(cx - 26, cy - 32); ctx.lineTo(cx + 26, cy - 32); ctx.lineTo(cx, cy); ctx.lineTo(cx + 26, cy + 32); ctx.lineTo(cx - 26, cy + 32); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
  } else if (kind === 'arch') {
    ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(cx - 28, cy + 30); ctx.lineTo(cx - 28, cy - 4); ctx.arc(cx, cy - 4, 28, Math.PI, 0); ctx.lineTo(cx + 28, cy + 30); ctx.stroke();
  } else if (kind === 'eye') {
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 40, cy); ctx.quadraticCurveTo(cx, cy - 36, cx + 40, cy); ctx.quadraticCurveTo(cx, cy + 36, cx - 40, cy); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'bar') {
    ctx.fillRect(cx - 34, cy - 6, 68, 12); ctx.fillRect(cx - 34, cy - 30, 12, 60); ctx.fillRect(cx + 22, cy - 30, 12, 60);
  } else if (kind === 'seesaw') {
    ctx.beginPath(); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx - 14, cy + 30); ctx.lineTo(cx + 14, cy + 30); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx - 44, cy + 14); ctx.lineTo(cx + 44, cy - 6); ctx.stroke();
    ctx.fillRect(cx - 50, cy - 2, 16, 14);
  } else if (kind === 'nest') {
    ctx.lineWidth = 5;
    for (const r of [40, 27, 14]) ctx.strokeRect(cx - r, cy - r * 0.8, r * 2, r * 1.6);
  } else if (kind === 'ribbon') {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const y = cy - 40 + i * 2; const x = cx + Math.sin(i / 40 * Math.PI * 3) * 22; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  } else if (kind === 'mirror') {
    ctx.beginPath(); ctx.moveTo(cx, cy - 40); ctx.lineTo(cx, cy + 40); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - 10, cy, 24, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx + 10, cy, 24, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
}

function sigilRow(ctx, kinds, color, glow) {
  const gap = 120;
  const x0 = PW / 2 - ((kinds.length - 1) * gap) / 2;
  kinds.forEach((k, i) => sigil(ctx, k, x0 + i * gap, 92, color, glow));
}

// ---- panels ---------------------------------------------------------------
// state: { dark, solved, input, focused, hover, wrong, caret }
export function drawPanel(ctx, p, st) {
  ctx.clearRect(0, 0, PW, PH);
  const dark = st.dark;
  if (dark) { ctx.fillStyle = '#07070b'; ctx.fillRect(0, 0, PW, PH); } else paper(ctx);

  // frame
  const done = st.solved || p.ghost;
  ctx.lineWidth = 18;
  ctx.strokeStyle = dark ? (done ? 'rgba(201,138,26,0.55)' : 'rgba(255,255,255,0.05)') : (done ? GOLD : (st.hover || st.focused ? '#a0522d' : '#6b4a2b'));
  ctx.strokeRect(9, 9, PW - 18, PH - 18);
  if (st.wrong) { ctx.lineWidth = 18; ctx.strokeStyle = '#b3261e'; ctx.strokeRect(9, 9, PW - 18, PH - 18); }

  // left to right is the order the rules apply: the panel's own kind first, then anything done to its result
  if (p.crest) crestMark(ctx, p.crest, 70, 70, dark);
  const RUNE = { back: 'tri', syn: 'hour', kind: 'arch', echo: 'knot', opp: 'bar', dup: 'eye' };
  const chainRunes = p.kind === 'chain' ? p.steps.map(([r]) => RUNE[r]) : [];
  const kinds0 = [p.kind === 'ribbon' || p.twin ? 'ribbon' : null, p.kind === 'nest' ? 'nest' : null, p.pre || null, p.kind === 'cistern' || p.kind === 'split' ? 'cistern' : null,  p.kind === 'seesaw' ? 'seesaw' : null, p.frame, ...(p.sigils || [])].filter(Boolean);
  const kinds = [...kinds0.map((k) => RUNE[k] || k), ...chainRunes];
  if (kinds.length) sigilRow(ctx, kinds, dark ? GLOW : INK, dark);

  const cy = kinds.length ? 330 : 290;
  if (p.kind === 'bridge') {
    const [a, b] = p.clue.split('|');
    const units = (a.length + b.length) * ADVANCE + 2.2;
    const h = Math.min(104, 900 / units);
    const box = h * 0.9, gap = h * 0.5;
    const wa = a.length * h * ADVANCE, wb = b.length * h * ADVANCE;
    let x = PW / 2 - (wa + wb + box + gap * 2) / 2;
    word(ctx, a, x + wa / 2, cy, h, INK);
    x += wa + gap;
    ctx.lineWidth = 6; ctx.strokeStyle = INK;
    ctx.strokeRect(x, cy - box / 2, box, box);
    x += box + gap;
    word(ctx, b, x + wb / 2, cy, h, INK);
  } else if (p.kind !== 'ribbon' && p.kind !== 'nest') {
    const ls = lettersOf(p.clue || '');
    const { xs, size } = slots(ls.length);
    const glow = new Set(p.glow || []);
    ls.forEach((c, i) => {
      if (!dark) { glyph(ctx, c, xs[i], cy, size, INK); return; }
      if (glow.has(i)) {
        glyph(ctx, c, xs[i], cy, size, GLOW, { glow: 26 });
      } else if (p.gaps) {
        ctx.save(); ctx.shadowColor = GLOW; ctx.shadowBlur = 12; ctx.fillStyle = 'rgba(201,255,224,0.55)';
        ctx.beginPath(); ctx.arc(xs[i], cy + size * 0.32, 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    });
  }

  // answer line: one slot per letter of the answer
  const ans = lettersOf(p.answer);
  const n = ans.length;
  let shown = st.input || '';
  let color = dark ? GLOW : INK;
  if (st.solved) { shown = p.answer; color = GOLD; }
  if (p.ghost) { shown = p.answer; color = dark ? 'rgba(201,138,26,0.8)' : GHOST; }
  const sw = Math.min(84, 640 / n), ly = 540;
  const sx0 = PW / 2 - (sw * n) / 2 + sw / 2;
  const s2 = Math.round(sw * 0.8);
  for (let i = 0; i < n; i++) {
    const x = sx0 + i * sw;
    ctx.lineWidth = 4;
    ctx.strokeStyle = dark ? 'rgba(201,255,224,0.25)' : 'rgba(58,40,27,0.4)';
    if (st.focused && i === shown.length && st.caret && !st.solved) ctx.strokeStyle = dark ? GLOW : '#a0522d';
    ctx.beginPath(); ctx.moveTo(x - sw * 0.36, ly + s2 * 0.5); ctx.lineTo(x + sw * 0.36, ly + s2 * 0.5); ctx.stroke();
    if (shown[i]) glyph(ctx, shown[i], x, ly, s2, color, { glow: dark && (st.solved || p.ghost) ? 18 : 0 });
  }
  if (done) {
    ctx.strokeStyle = dark ? 'rgba(201,138,26,0.8)' : (p.ghost ? GHOST : GOLD);
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(PW - 120, 520); ctx.lineTo(PW - 96, 548); ctx.lineTo(PW - 52, 494); ctx.stroke();
  }
}

// ---- reflections ----------------------------------------------------------
// A true reflection: every letter in the same full ink, honestly flipped.
// mode: 'pool' (top-bottom flip, order kept) or 'mirror' (left-right flip, order reversed)
export function drawReflection(ctx, w, mode) {
  ctx.clearRect(0, 0, PW, PH);
  ctx.fillStyle = 'rgba(241,226,194,0.55)';
  ctx.fillRect(30, 140, PW - 60, 380);
  const ls = lettersOf(w);
  const { xs, size } = slots(ls.length);
  const n = ls.length;
  ls.forEach((c, i) => {
    const x = mode === 'mirror' ? xs[n - 1 - i] : xs[i];
    glyph(ctx, c, x, 330, size, INK, { flipX: mode === 'mirror', flipY: mode === 'pool' });
  });
}

// ---- procedural textures -----------------------------------------------------
function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

export function stoneTexture(size = 512, seed = 7, base = [196, 160, 118]) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const r = rng(seed);
  g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, size, size);
  const rows = 8, bh = size / rows;
  for (let y = 0; y < rows; y++) {
    const off = (y % 2) * (size / 8);
    for (let x = -1; x < 4; x++) {
      const bw = size / 4, bx = x * bw + off;
      const k = 0.82 + r() * 0.3;
      g.fillStyle = `rgb(${base.map((v) => Math.min(255, v * k) | 0)})`;
      g.fillRect(bx + 3, y * bh + 3, bw - 6, bh - 6);
    }
  }
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '60,40,20' : '255,240,210'},${r() * 0.08})`;
    g.fillRect(r() * size, r() * size, 2, 2);
  }
  return c;
}

export function floorTexture(size = 512, seed = 3, base = [150, 120, 92]) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const r = rng(seed);
  g.fillStyle = '#3d2c1f'; g.fillRect(0, 0, size, size);
  const n = 4, t = size / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const k = 0.8 + r() * 0.35;
    g.fillStyle = `rgb(${base.map((v) => Math.min(255, v * k) | 0)})`;
    g.fillRect(x * t + 4, y * t + 4, t - 8, t - 8);
  }
  for (let i = 0; i < 7000; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '40,25,10' : '255,235,200'},${r() * 0.07})`;
    g.fillRect(r() * size, r() * size, 2, 2);
  }
  return c;
}

export function woodTexture(size = 256, seed = 11) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const r = rng(seed);
  g.fillStyle = '#5a3a22'; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = `rgba(30,15,5,0.5)`; g.fillRect(0, (i * size) / 4, size, 3);
  }
  for (let i = 0; i < 260; i++) {
    g.strokeStyle = `rgba(${r() < 0.5 ? '35,18,8' : '140,95,55'},${0.1 + r() * 0.15})`;
    const y = r() * size;
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(size / 3, y + r() * 6 - 3, (2 * size) / 3, y + r() * 6 - 3, size, y); g.stroke();
  }
  return c;
}

export function grassTexture(size = 512, seed = 5) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const r = rng(seed);
  g.fillStyle = '#6d7a3a'; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 16000; i++) {
    const k = r();
    g.fillStyle = k < 0.4 ? 'rgba(60,80,25,0.5)' : k < 0.8 ? 'rgba(150,160,70,0.45)' : 'rgba(210,180,90,0.4)';
    g.fillRect(r() * size, r() * size, 2, 5);
  }
  return c;
}

export function doorTexture(w = 512, h = 800, seed = 17) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); const r = rng(seed);
  const planks = 5, pw = w / planks;
  for (let i = 0; i < planks; i++) {
    const k = 0.85 + r() * 0.25;
    g.fillStyle = `rgb(${[92, 58, 34].map((v) => (v * k) | 0)})`;
    g.fillRect(i * pw, 0, pw, h);
    for (let j = 0; j < 40; j++) {
      g.strokeStyle = `rgba(${r() < 0.5 ? '35,18,8' : '150,105,60'},${0.12 + r() * 0.15})`;
      const x = i * pw + r() * pw;
      g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + r() * 6 - 3, h / 3, x + r() * 6 - 3, (2 * h) / 3, x, h); g.stroke();
    }
    g.fillStyle = 'rgba(20,10,4,0.7)'; g.fillRect(i * pw, 0, 4, h);
  }
  for (const y of [0.18, 0.82]) {
    g.fillStyle = '#2b2522'; g.fillRect(0, y * h - 22, w, 44);
    g.fillStyle = '#4a403a';
    for (let i = 0; i < planks; i++) { g.beginPath(); g.arc(i * pw + pw / 2, y * h, 9, 0, Math.PI * 2); g.fill(); }
  }
  g.fillStyle = '#2b2522'; g.beginPath(); g.arc(w * 0.8, h * 0.52, 22, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#4a403a'; g.lineWidth = 7; g.beginPath(); g.arc(w * 0.8, h * 0.52 + 26, 20, 0, Math.PI * 2); g.stroke();
  return c;
}

function crestMark(ctx, kind, x, y, dark, k = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y);
  ctx.fillStyle = dark ? '#3a2a10' : '#c9a24a'; ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5a3d14'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#2a1a08';
  if (kind === 'star') { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 11 : 26; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
  if (kind === 'sun') { ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill(); }
  if (kind === 'moon') { ctx.beginPath(); ctx.arc(x, y, 22, Math.PI * 0.3, Math.PI * 1.7); ctx.arc(x + 10, y, 17, Math.PI * 1.62, Math.PI * 0.38, true); ctx.fill(); }
  if (kind === 'key') {
    ctx.lineWidth = 6; ctx.strokeStyle = '#2a1a08';
    ctx.beginPath(); ctx.arc(x - 12, y, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillRect(x - 2, y - 3, 30, 6); ctx.fillRect(x + 14, y, 5, 12); ctx.fillRect(x + 22, y, 5, 9);
  }
  if (kind === 'leaf') {
    ctx.beginPath(); ctx.moveTo(x - 22, y + 18); ctx.quadraticCurveTo(x - 22, y - 22, x + 22, y - 20); ctx.quadraticCurveTo(x + 20, y + 20, x - 22, y + 18); ctx.fill();
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 18, y + 14); ctx.lineTo(x + 16, y - 14); ctx.stroke();
  }
  ctx.restore();
}
