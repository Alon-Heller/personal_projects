// Canvas drawing for panels, reflections and procedural textures.
import { POOL_SAFE, MIRROR_SAFE } from './rules.js';

export const PW = 1024, PH = 640;
const SERIF = '"Georgia", "Times New Roman", serif';
const INK = '#3a281b';
const PAPER = '#f1e2c2';
const GLOW = '#c9ffe0';
const GOLD = '#c98a1a';
const GHOST = '#7a8fb0';

const lettersOf = (s) => [...s.toUpperCase()].filter((c) => c >= 'A' && c <= 'Z');

function slots(n) {
  const w = Math.min(150, 900 / n);
  const x0 = PW / 2 - (w * n) / 2 + w / 2;
  return { w, xs: Array.from({ length: n }, (_, i) => x0 + i * w), size: Math.round(w * 0.98) };
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

function fitText(ctx, text, max, start) {
  let s = start;
  ctx.font = `bold ${s}px ${SERIF}`;
  while (ctx.measureText(text).width > max && s > 20) { s -= 4; ctx.font = `bold ${s}px ${SERIF}`; }
  return s;
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

  const kinds = [p.frame, ...(p.sigils || [])].filter(Boolean);
  if (kinds.length) sigilRow(ctx, kinds, dark ? GLOW : INK, dark);

  const cy = kinds.length ? 330 : 290;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (p.kind === 'bridge') {
    const [a, b] = p.clue.split('|');
    ctx.fillStyle = INK;
    const s = fitText(ctx, `${a}  ##  ${b}`, 900, 104);
    ctx.font = `bold ${s}px ${SERIF}`;
    const box = s * 0.9;
    const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width;
    const total = wa + wb + box + s * 1.2;
    let x = PW / 2 - total / 2;
    ctx.textAlign = 'left';
    ctx.fillText(a, x, cy);
    x += wa + s * 0.6;
    ctx.lineWidth = 6; ctx.strokeStyle = INK;
    ctx.strokeRect(x, cy - box / 2, box, box);
    x += box + s * 0.6;
    ctx.fillText(b, x, cy);
    ctx.textAlign = 'center';
  } else {
    const ls = lettersOf(p.clue);
    const { xs, size } = slots(ls.length);
    const glow = new Set(p.glow || []);
    ctx.font = `bold ${size}px ${SERIF}`;
    ls.forEach((c, i) => {
      if (!dark) { ctx.fillStyle = INK; ctx.fillText(c, xs[i], cy); return; }
      if (glow.has(i)) {
        ctx.save(); ctx.shadowColor = GLOW; ctx.shadowBlur = 26; ctx.fillStyle = GLOW;
        ctx.fillText(c, xs[i], cy); ctx.restore();
      } else if (p.gaps) {
        ctx.save(); ctx.shadowColor = GLOW; ctx.shadowBlur = 12; ctx.fillStyle = 'rgba(201,255,224,0.55)';
        ctx.beginPath(); ctx.arc(xs[i], cy + size * 0.32, 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    });
  }

  // answer line
  const ly = 540;
  ctx.lineWidth = 3;
  ctx.strokeStyle = dark ? 'rgba(201,255,224,0.12)' : 'rgba(58,40,27,0.35)';
  ctx.beginPath(); ctx.moveTo(220, ly + 42); ctx.lineTo(PW - 220, ly + 42); ctx.stroke();
  let shown = st.input || '';
  let color = dark ? GLOW : INK;
  if (st.solved) { shown = p.answer; color = GOLD; }
  if (p.ghost) { shown = p.answer; color = dark ? 'rgba(201,138,26,0.8)' : GHOST; }
  const s2 = fitText(ctx, shown || 'M', 560, 92);
  ctx.font = `bold ${s2}px ${SERIF}`;
  ctx.fillStyle = color;
  if (dark && (st.solved || p.ghost)) { ctx.shadowColor = GOLD; ctx.shadowBlur = 18; }
  ctx.fillText(shown, PW / 2, ly);
  ctx.shadowBlur = 0;
  if (st.focused && st.caret && !st.solved) {
    const w = ctx.measureText(shown).width;
    ctx.fillRect(PW / 2 + w / 2 + 8, ly - s2 * 0.42, 6, s2 * 0.84);
  }
  if (done) {
    ctx.strokeStyle = dark ? 'rgba(201,138,26,0.8)' : (p.ghost ? GHOST : GOLD);
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(PW - 120, 520); ctx.lineTo(PW - 96, 548); ctx.lineTo(PW - 52, 494); ctx.stroke();
  }
}

// ---- reflections ----------------------------------------------------------
const scratch = typeof document !== 'undefined' ? document.createElement('canvas') : null;

function smearGlyph(ctx, c, x, y, size, flipX, flipY) {
  const s = Math.ceil(size * 1.4);
  scratch.width = s; scratch.height = s;
  const g = scratch.getContext('2d');
  g.clearRect(0, 0, s, s);
  g.save();
  g.translate(s / 2, s / 2);
  g.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  g.font = `bold ${size}px ${SERIF}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = INK;
  g.fillText(c, 0, 0);
  g.restore();
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.filter = 'blur(8px)';
  for (let row = 0; row < s; row += 4) {
    const dx = Math.sin(row / 6) * 14;
    ctx.drawImage(scratch, 0, row, s, 4, x - s / 2 + dx, y - s / 2 + row, s, 4);
  }
  ctx.restore();
}

// mode: 'pool' (top-bottom flip, order kept) or 'mirror' (left-right flip, order reversed)
export function drawReflection(ctx, word, mode) {
  ctx.clearRect(0, 0, PW, PH);
  ctx.fillStyle = 'rgba(241,226,194,0.55)';
  ctx.fillRect(30, 140, PW - 60, 380);
  const ls = lettersOf(word);
  const { xs, size } = slots(ls.length);
  const n = ls.length;
  const safe = mode === 'pool' ? POOL_SAFE : MIRROR_SAFE;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ls.forEach((c, i) => {
    const x = mode === 'mirror' ? xs[n - 1 - i] : xs[i];
    if (safe.has(c)) {
      ctx.font = `bold ${size}px ${SERIF}`;
      ctx.fillStyle = INK;
      ctx.fillText(c, x, 330);
    } else {
      smearGlyph(ctx, c, x, 330, size, mode === 'mirror', mode === 'pool');
    }
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
