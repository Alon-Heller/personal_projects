// Interactive props: keyboard tables (tilt) and ribbon-wound planks / pillars.
// SPOILERS: this is how those rooms work.
import * as THREE from 'three';
import { glyph } from './glyphs.js';
import { KEY_ROWS, keyOf, HOLED, layoutPond } from './rules.js';

const INK = '#3a281b', GLOW = '#c9ffe0';
const lettersOf = (s) => [...s.toUpperCase()].filter((c) => c >= 'A' && c <= 'Z');

// ---------------------------------------------------------------- keyboard tables
const TW = 1024, TH = 420;             // canvas
const K = 92;                          // key size in px
const ROW_X = [60, 60 + K * 0.45, 60 + K * 0.95];
const ROW_Y = [70, 70 + K * 1.08, 70 + K * 2.16];
const STAR_X = TW / 2, STAR_Y = 372;
export const TABLE_W = 2.5, TABLE_D = 1.05, TABLE_Y = 0.92;
const PX = TABLE_W / TW;               // metres per px
export const KEY_M = K * PX;

const keyPos = (r, col) => [ROW_X[r] + col * K + K / 2, ROW_Y[r] + K / 2];

function drawTable(ctx, t) {
  const { dark } = t;
  ctx.clearRect(0, 0, TW, TH);
  // wood
  ctx.fillStyle = dark ? '#060506' : '#6a4426';
  ctx.fillRect(0, 0, TW, TH);
  if (!dark) {
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 60; i++) { ctx.fillStyle = i % 2 ? '#3b2412' : '#8a5a33'; ctx.fillRect(0, (i * 37) % TH, TW, 3); }
    ctx.globalAlpha = 1;
  }
  // cups
  const cups = t.cups.map((cup) => {
    const shift = cup.fallsAt !== null ? t.slide : t.slide;
    let col = cup.col + shift;
    const len = KEY_ROWS[cup.row].length;
    let [x, y] = keyPos(cup.row, Math.max(-0.5, Math.min(len - 0.5, col)));
    let alpha = 1, scale = 1;
    const over = col < -0.5 ? -0.5 - col : col > len - 0.5 ? col - (len - 0.5) : 0;
    if (over > 0) { x += Math.sign(col) * over * K * 0.9; alpha = Math.max(0, 1 - over * 2.2); scale = 1 - over * 0.6; }
    return { ...cup, x, y, alpha, scale, onKey: over === 0 ? Math.round(col) : null };
  });
  // keys: square, then the warm light of any cup over it, then the key's own letter (letters never move)
  const near = (r, c) => {
    const [x, y] = keyPos(r, c);
    let best = 0;
    for (const cup of cups) {
      if (cup.alpha <= 0.02 || (dark && !cup.glow)) continue;
      const d = Math.hypot(cup.x - x, cup.y - y) / K;
      best = Math.max(best, (1 - Math.min(1, d * 1.6)) * cup.alpha);
    }
    return best;
  };
  for (let r = 0; r < 3; r++) for (let c = 0; c < KEY_ROWS[r].length; c++) {
    const [x, y] = keyPos(r, c);
    const lit = near(r, c);
    if (!dark) {
      ctx.fillStyle = '#d8b98a';
      ctx.fillRect(x - K / 2 + 5, y - K / 2 + 5, K - 10, K - 10);
      if (lit > 0) { ctx.fillStyle = `rgba(255,190,80,${0.8 * lit})`; ctx.fillRect(x - K / 2 + 5, y - K / 2 + 5, K - 10, K - 10); }
      ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 3; ctx.strokeRect(x - K / 2 + 5, y - K / 2 + 5, K - 10, K - 10);
      glyph(ctx, KEY_ROWS[r][c], x, y, K * 0.5, INK);
    } else if (lit > 0.05) {
      ctx.save(); ctx.globalAlpha = lit;
      glyph(ctx, KEY_ROWS[r][c], x, y, K * 0.5, GLOW, { glow: 16 });
      ctx.restore();
    }
  }
  // troughs at the row ends
  if (!dark) {
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(0, 40, 26, ROW_Y[2] + K - 30);
    ctx.fillRect(TW - 26, 40, 26, ROW_Y[2] + K - 30);
    // the plumb scale and star
    ctx.strokeStyle = '#d8b98a'; ctx.lineWidth = 3;
    for (let i = -4; i <= 4; i++) {
      const x = STAR_X + i * K;
      ctx.beginPath(); ctx.moveTo(x, STAR_Y - (i ? 14 : 0)); ctx.lineTo(x, STAR_Y + 14); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(STAR_X - 4 * K, STAR_Y + 14); ctx.lineTo(STAR_X + 4 * K, STAR_Y + 14); ctx.stroke();
    ctx.fillStyle = '#e9c46a';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 9 : 22;
      ctx.lineTo(STAR_X + Math.cos(a) * rr, STAR_Y - 8 + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }
  for (const c of cups) {
    if (c.alpha <= 0.02) continue;
    ctx.save();
    ctx.globalAlpha = c.alpha;
    const R = K * 0.42 * c.scale;
    if (dark) {
      if (!c.glow) { ctx.restore(); continue; }
      ctx.shadowColor = GLOW; ctx.shadowBlur = 18;
      ctx.strokeStyle = GLOW; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.stroke();
    } else {
      // a pewter cup rim (an open ring: the key's letter shows through)
      ctx.strokeStyle = '#4b4f58'; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#d6dae2'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(c.x, c.y, R - 3, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    }
    ctx.restore();
  }
}

// Build a table in front of a north-wall panel. Returns an object the game updates.
export function makeTable(scene, M, def, cx, wallZ) {
  const cvs = document.createElement('canvas'); cvs.width = TW; cvs.height = TH;
  const ctx = cvs.getContext('2d');
  const tex = new THREE.CanvasTexture(cvs); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const topMat = new THREE.MeshLambertMaterial({ map: tex });
  const glowMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, 0.08, TABLE_D), [M.wood, M.wood, topMat, M.wood, M.wood, M.wood]);
  g.add(top);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, TABLE_Y, 0.1), M.wood);
    leg.position.set(dx * (TABLE_W / 2 - 0.12), -TABLE_Y / 2, dz * (TABLE_D / 2 - 0.12));
    g.add(leg);
  }
  const cz = wallZ + 0.12 + TABLE_D / 2;
  g.position.set(cx, TABLE_Y, cz);
  scene.add(g);

  // the clue's cups: one per letter, on its key, in chain order
  const glowSet = new Set(def.glow || []);
  const cups = def.table === 'fixed' ? [] : lettersOf(def.clue).map((c, i) => { const [row, col] = keyOf(c); return { row, col, glow: glowSet.has(i), fallsAt: null }; });

  // plumb bob: a post at the west end with an arm over the scale
  const metal = M.iron;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), metal);
  const armY = TABLE_Y + 0.75;
  const starZ = cz - TABLE_D / 2 + STAR_Y * (TABLE_D / TH);
  post.position.set(cx - TABLE_W / 2 + 0.05, TABLE_Y + 0.37, starZ);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W - 0.1, 0.035, 0.035), metal);
  arm.position.set(cx, armY, starZ);
  const bobGroup = new THREE.Group();
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.62, 4), new THREE.MeshBasicMaterial({ color: '#d9cfb8' }));
  string.position.y = -0.31;
  const bob = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 12), new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.8, roughness: 0.3 }));
  bob.rotation.x = Math.PI; bob.position.y = -0.66;
  bobGroup.add(string, bob);
  bobGroup.position.set(cx, armY, starZ);
  scene.add(post, arm, bobGroup);

  // lever on the east end
  let lever = null;
  if (def.table === 'lever') {
    lever = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), metal);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8), metal);
    handle.position.y = 0.3;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshLambertMaterial({ color: '#8a3b26' }));
    knob.position.y = 0.6;
    const pivot = new THREE.Group(); pivot.add(handle, knob);
    lever.add(base, pivot);
    lever.userData.pivot = pivot;
    lever.position.set(cx + TABLE_W / 2 + 0.18, TABLE_Y - 0.1, cz);
    // invisible click target: rides on the handle (so it leans with it) and is a little larger than it
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), hidden);
    hit.position.y = 0.36;
    pivot.add(hit);
    const baseHit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), hidden);
    lever.add(baseHit);
    lever.userData.hits = [hit, baseHit];
    scene.add(lever);
  }

  const t = {
    def, group: g, top, ctx, tex, topMat, glowMat, cups, lever, bobGroup, cx, cz, dark: false,
    tilt: 0, slide: 0, target: 0, pegs: def.table === 'fixed', key: '',
    // collision box
    box: { x0: cx - TABLE_W / 2 - (lever ? 0 : 0), x1: cx + TABLE_W / 2 + (lever ? 0.3 : 0), z0: wallZ, z1: cz + TABLE_D / 2 },
  };
  if (def.table === 'fixed') { t.tilt = def.tilt; t.target = def.tilt; }
  if (def.ghost) { t.tilt = t.target = def.tilt; t.slide = def.tilt; }
  return t;
}

export function updateTable(t, dt, dark) {
  const step = dt * 1.6;
  if (t.def.table === 'lever') {
    t.tilt += Math.sign(t.target - t.tilt) * Math.min(step, Math.abs(t.target - t.tilt));
    t.slide = t.tilt; // cups follow the tilt
    if (t.lever) t.lever.userData.pivot.rotation.z = -0.7 * (t.tilt / (t.def.tilt || 1)) + 0.35;
  }
  t.group.rotation.z = -t.tilt * 0.035;
  t.bobGroup.position.x = t.cx + t.tilt * KEY_M;
  t.dark = dark;
  t.top.material[2] = dark ? t.glowMat : t.topMat;
  const key = `${t.slide.toFixed(3)}|${dark}`;
  if (key !== t.key) { t.key = key; drawTable(t.ctx, t); t.tex.needsUpdate = true; }
}

// ---------------------------------------------------------------- ribbons
const FW = 256, FH = 768;            // canvas per face
const FACE_W = 0.62, FACE_H = 1.86;  // metres

// Which ribbons wind round a prop. One ribbon normally; a "twin" nest prop carries two, interleaved.
export const RIBBON_COLORS = ['#8a2f2a', '#2c4a8a'];
function ribbonsOf(def) {
  if (def.kind === 'nest') return [def.chain[0], def.chain[2]].map((w, r) => ({ word: lettersOf(w), color: RIBBON_COLORS[r], torn: new Set() }));
  return [{ word: lettersOf(def.word), color: RIBBON_COLORS[0], torn: new Set(def.torn || []) }];
}

function rng(seed) { let s = seed % 2147483647 || 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
// a ragged outline: where a piece of ribbon was torn away (and the matching scrap)
export function ragged(seed, hw, hh) {
  const r = rng(seed), pts = [];
  for (let i = 0; i <= 6; i++) pts.push([-hw + (i / 6) * 2 * hw, -hh + (r() - 0.5) * 12]);
  for (let i = 0; i <= 4; i++) pts.push([hw + (r() - 0.5) * 14, -hh + (i / 4) * 2 * hh]);
  for (let i = 6; i >= 0; i--) pts.push([-hw + (i / 6) * 2 * hw, hh + (r() - 0.5) * 12]);
  for (let i = 4; i >= 0; i--) pts.push([-hw + (r() - 0.5) * 14, -hh + (i / 4) * 2 * hh]);
  return pts;
}

function drawFace(ctx, def, face) {
  const faces = def.faces;
  const ribbons = ribbonsOf(def);
  const R = ribbons.length;
  ctx.fillStyle = '#e9dcc0'; ctx.fillRect(0, 0, FW, FH);
  // silk weave
  ctx.globalAlpha = 0.08; ctx.fillStyle = '#7a5a3a';
  for (let y = 0; y < FH; y += 6) ctx.fillRect(0, y, FW, 2);
  ctx.globalAlpha = 1;
  // painted plum blossom, just decoration
  ctx.fillStyle = 'rgba(176,70,80,0.18)';
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc((i * 97 + face * 53) % FW, (i * 211 + face * 89) % FH, 10, 0, Math.PI * 2); ctx.fill(); }
  const top = 60, bottom = FH - 60;
  const slots = Math.max(...ribbons.map((rb) => Math.min(rb.word.length, (def.fold ?? 99) + 1.5))) * R;
  const dh = Math.min(150, (bottom - top) / slots);
  const half = Math.min(30, dh * 0.42);
  const fold = def.fold ?? Infinity;
  ribbons.forEach((rb, r) => {
    const base = (k) => { const sl = k * R + r; return def.up ? bottom - dh / 2 - sl * dh : top + dh / 2 + sl * dh; };
    // past the fold the band climbs back, half a step off from where it came down
    const yOf = (k) => (k <= fold ? base(k) : base(2 * fold - k) + (def.up ? -1 : 1) * dh * 0.5);
    rb.word.forEach((ch, k) => {
      if ((k + r) % faces !== face) return;
      const back = k > fold;
      const dy = (def.up !== back ? -1 : 1) * (R * dh) / 2; // the band drops (or climbs) one letter-step per face
      const y = yOf(k);
      ctx.save();
      ctx.fillStyle = rb.color;
      ctx.beginPath();
      ctx.moveTo(0, y - dy - half); ctx.lineTo(FW, y + dy - half); ctx.lineTo(FW, y + dy + half); ctx.lineTo(0, y - dy + half);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d29a2e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, y - dy - half); ctx.lineTo(FW, y + dy - half); ctx.moveTo(0, y - dy + half); ctx.lineTo(FW, y + dy + half); ctx.stroke();
      if (rb.torn.has(k)) {
        // torn away: the bare silk shows through a ragged hole, with loose threads at the edge
        const pts = ragged(1000 + k * 37 + face, 54, half + 6);
        ctx.beginPath();
        pts.forEach(([px, py], i) => (i ? ctx.lineTo(FW / 2 + px, y + py) : ctx.moveTo(FW / 2 + px, y + py)));
        ctx.closePath();
        ctx.fillStyle = '#e9dcc0'; ctx.fill();
        ctx.strokeStyle = rb.color; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
      } else {
        glyph(ctx, ch, FW / 2, y, Math.min(50, half * 1.7), '#f6ead0');
      }
      if (k === fold) {
        // the brass peg the ribbon turns around
        ctx.fillStyle = '#c9a24a'; ctx.strokeStyle = '#5a3d14'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(FW - 14, y + dy, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (k === 0) {
        const tx = 18, ty = y - dy;
        ctx.strokeStyle = '#d29a2e'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty + 46); ctx.stroke();
        ctx.fillStyle = '#d29a2e';
        ctx.beginPath(); ctx.moveTo(tx - 12, ty + 46); ctx.lineTo(tx + 12, ty + 46); ctx.lineTo(tx + 6, ty + 96); ctx.lineTo(tx - 6, ty + 96); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(tx, ty + 44, 9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });
  });
}

// A loose scrap of torn ribbon carrying one letter (lies in a basket or on the floor).
export function makeScrap(letter, seed) {
  const c = document.createElement('canvas'); c.width = 160; c.height = 110;
  const g = c.getContext('2d');
  const pts = ragged(seed, 66, 40);
  g.beginPath();
  pts.forEach(([px, py], i) => (i ? g.lineTo(80 + px, 55 + py) : g.moveTo(80 + px, 55 + py)));
  g.closePath();
  g.fillStyle = RIBBON_COLORS[0]; g.fill();
  g.strokeStyle = '#d29a2e'; g.lineWidth = 3; g.stroke();
  glyph(g, letter, 80, 55, 56, '#f6ead0');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.235), new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export function makeBasket(scene, M, x, z, letters) {
  const g = new THREE.Group();
  const wicker = new THREE.MeshLambertMaterial({ color: '#b08a4f' });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.32, 18, 1, true), wicker);
  body.position.y = 0.16;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.34, 18).rotateX(-Math.PI / 2), wicker);
  floor.position.y = 0.2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 24), new THREE.MeshLambertMaterial({ color: '#8a6a38' }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.32;
  g.add(body, floor, rim);
  // scraps heaped on top, a little jumbled
  letters.forEach((ch, i) => {
    const s = makeScrap(ch, 500 + i * 13);
    const a = (i / letters.length) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.14, 0.22 + i * 0.012, Math.sin(a) * 0.14);
    s.rotation.z = a + 0.6;
    g.add(s);
  });
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

export function makeRibbonProp(scene, M, def, cx, cz, turn = 0) {
  const g = new THREE.Group();
  const faces = def.faces;
  // apothem: distance from centre to each face
  const apo = faces === 2 ? 0.05 : FACE_W / (2 * Math.sqrt(3));
  const faceTex = [];
  for (let f = 0; f < faces; f++) {
    const cvs = document.createElement('canvas'); cvs.width = FW; cvs.height = FH;
    drawFace(cvs.getContext('2d'), def, f);
    const tex = new THREE.CanvasTexture(cvs); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    faceTex.push({ ctx: cvs.getContext('2d'), tex });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(FACE_W, FACE_H), new THREE.MeshLambertMaterial({ map: tex }));
    const a = (f * 2 * Math.PI) / faces;
    plane.rotation.y = a;
    plane.position.set(Math.sin(a) * apo, 0.35 + FACE_H / 2, Math.cos(a) * apo);
    g.add(plane);
  }
  if (faces === 2) {
    // edges of the plank
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, FACE_H, 0.1), M.wood);
      e.position.set(s * (FACE_W / 2 + 0.015), 0.35 + FACE_H / 2, 0);
      g.add(e);
    }
  }
  const capGeo = faces === 2 ? new THREE.BoxGeometry(FACE_W + 0.12, 0.08, 0.16) : new THREE.CylinderGeometry(apo * 2.3, apo * 2.3, 0.08, 3);
  const cap = new THREE.Mesh(capGeo, M.wood);
  if (faces === 3) cap.rotation.y = Math.PI;
  cap.position.y = 0.35 + FACE_H + 0.04;
  const base = cap.clone(); base.position.y = 0.31;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.5), M.wood);
  foot.position.y = 0.15;
  g.add(cap, base, foot);
  g.position.set(cx, 0, cz);
  g.rotation.y = turn;
  // redraw (e.g. a torn ribbon mended once solved)
  g.userData.redraw = (d) => faceTex.forEach(({ ctx, tex }, f) => { drawFace(ctx, d, f); tex.needsUpdate = true; });
  scene.add(g);
  return g;
}

// ---------------------------------------------------------------- nests: boxes inside boxes, hung on a wall
// `chain` runs inner -> outer; null marks the box whose plaque is blank.
export function emblem(g, kind, x, y, r, color) {
  g.save(); g.fillStyle = color; g.strokeStyle = color; g.lineWidth = r * 0.18;
  if (kind === 'sun') {
    g.beginPath(); g.arc(x, y, r * 0.45, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.65, y + Math.sin(a) * r * 0.65); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
  } else if (kind === 'star') {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  } else if (kind === 'moon') {
    g.beginPath(); g.arc(x, y, r * 0.9, Math.PI * 0.3, Math.PI * 1.7); g.arc(x + r * 0.42, y, r * 0.7, Math.PI * 1.62, Math.PI * 0.38, true); g.closePath(); g.fill();
  }
  g.restore();
}
function plaque(word, w, h) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, c.height);
  grd.addColorStop(0, '#e8c46a'); grd.addColorStop(1, '#a87a2c');
  g.fillStyle = grd; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#5a3d14'; g.lineWidth = 6; g.strokeRect(5, 5, c.width - 10, c.height - 10);
  if (word && word.crest) emblem(g, word.crest, c.width / 2, c.height / 2, c.height * 0.36, '#2a1a08');
  else if (word) {
    const hgt = Math.min(c.height * 0.62, (c.width - 40) / (word.length * 0.82));
    const adv = hgt * 0.8, x0 = c.width / 2 - (adv * word.length) / 2 + adv / 2;
    [...word].forEach((ch, i) => glyph(g, ch, x0 + i * adv, c.height / 2, hgt, '#2a1a08'));
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t }));
}

export function makeNest(scene, M, def, pos, rotY) {
  const g = new THREE.Group();
  const sizes = [[0.62, 0.46, 0.14], [1.06, 0.86, 0.27], [1.5, 1.26, 0.4]]; // inner -> outer: w, h, depth
  const woods = ['#8a5a33', '#6e4426', '#523119'].map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const T = 0.04;
  sizes.forEach(([w, h, d], i) => {
    const m = woods[i];
    const box = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, T), m); back.position.z = T / 2 + i * 0.002;
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, T, d), m); top.position.set(0, h / 2 - T / 2, d / 2);
    const bot = top.clone(); bot.position.y = -h / 2 + T / 2;
    const l = new THREE.Mesh(new THREE.BoxGeometry(T, h, d), m); l.position.set(-w / 2 + T / 2, 0, d / 2);
    const r = l.clone(); r.position.x = w / 2 - T / 2;
    box.add(back, top, bot, l, r);
    // its plaque sits on the front edge of its lid
    const word = def.chain[i] && def.chain[i].ref ? { crest: def.crestOf(def.chain[i].ref) } : def.chain[i];
    const pw = Math.min(w * 0.92, 0.18 + 0.085 * Math.max(4, typeof word === 'string' ? word.length : 4)), ph = 0.14;
    const p = plaque(word, pw, ph);
    p.position.set(0, h / 2 + ph / 2 - 0.005, d + 0.004);
    box.add(p);
    g.add(box);
  });
  if (def.crest) {
    // this cabinet's own crest, on a brass tag at the outer box's top corner
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const gg = c.getContext('2d');
    gg.fillStyle = '#c9a24a'; gg.beginPath(); gg.arc(64, 64, 60, 0, Math.PI * 2); gg.fill();
    gg.strokeStyle = '#5a3d14'; gg.lineWidth = 6; gg.stroke();
    emblem(gg, def.crest, 64, 64, 40, '#2a1a08');
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const tag = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshLambertMaterial({ map: tx }));
    tag.position.set(-0.62, 0.52, 0.405);
    g.add(tag);
  }
  g.position.copy(pos);
  g.position.y = 1.12;
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}

// ---------------------------------------------------------------- cistern: a glass tank; pull the chain and the clue's tiles drop in
function tileMesh(ch) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#d9b77a'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#6b4a2b'; g.lineWidth = 8; g.strokeRect(4, 4, 120, 120);
  glyph(g, ch, 64, 64, 82, '#2a1a08');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.MeshLambertMaterial({ map: t }), side = new THREE.MeshLambertMaterial({ color: '#b8935a' });
  return new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.06), [side, side, side, side, face, side]);
}
export function makeTank(scene, M, def, cx, wallZ) {
  const g = new THREE.Group();
  const TW_ = 1.7, TH_ = 0.95, TD = 0.5, Y0 = 0.62;
  const glass = new THREE.MeshPhongMaterial({ color: '#cfe6ea', transparent: true, opacity: 0.18, shininess: 120, depthWrite: false });
  const water = new THREE.MeshPhongMaterial({ color: '#2f6f7a', transparent: true, opacity: 0.38, depthWrite: false });
  const box = new THREE.Mesh(new THREE.BoxGeometry(TW_, TH_, TD), glass);
  box.position.y = Y0 + TH_ / 2;
  const wat = new THREE.Mesh(new THREE.BoxGeometry(TW_ - 0.04, TH_ * 0.82, TD - 0.04), water);
  wat.position.y = Y0 + (TH_ * 0.82) / 2 + 0.01;
  const base = new THREE.Mesh(new THREE.BoxGeometry(TW_ + 0.1, 0.06, TD + 0.1), M.wood);
  base.position.y = Y0 - 0.03;
  g.add(base, box, wat);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, Y0, 0.07), M.wood);
    leg.position.set(dx * (TW_ / 2 - 0.05), Y0 / 2, dz * (TD / 2 - 0.05));
    g.add(leg);
  }
  // a rack over the tank holds the tiles before they drop
  const rack = new THREE.Mesh(new THREE.BoxGeometry(TW_, 0.04, 0.14), M.iron);
  rack.position.set(0, Y0 + TH_ + 0.28, 0.08);
  g.add(rack);
  const ls = [...def.clue];
  const n = ls.length, step = 0.27, x0 = -((n - 1) * step) / 2;
  const floats = ls.filter((c) => HOLED.has(c)), sinks = ls.filter((c) => !HOLED.has(c));
  const surfY = Y0 + TH_ * 0.82 - 0.06, floorY = Y0 + 0.13, rackY = Y0 + TH_ + 0.41;
  const left = -TW_ / 2 + 0.2;
  const tiles = ls.map((ch, i) => {
    const m = tileMesh(ch);
    const fl = HOLED.has(ch);
    // position of this exact tile within its layer (repeated letters keep order)
    // place among the tiles that actually land in the water (the lost one leaves no gap)
    const layer = ls.slice(0, i).filter((c, j) => HOLED.has(c) === fl && j !== def.lost).length;
    m.userData = { from: new THREE.Vector3(x0 + i * step, rackY, 0.08), to: new THREE.Vector3(left + layer * step, fl ? surfY : floorY, 0.06), float: fl };
    if (def.lost === i) m.userData = { from: m.userData.from, to: new THREE.Vector3(0.35, 0.03, TD / 2 + 0.75), float: false, lost: true };
    m.position.copy(m.userData.from);
    g.add(m);
    return m;
  });
  // pull chain with a ring at the right end
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.55, 5), M.iron);
  chain.position.set(TW_ / 2 + 0.12, Y0 + TH_ + 0.1, 0.08);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 14), new THREE.MeshLambertMaterial({ color: '#c9a24a' }));
  ring.position.set(TW_ / 2 + 0.12, Y0 + TH_ - 0.2, 0.08);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(TW_ / 2 + 0.12, Y0 + TH_ - 0.05, 0.08);
  g.add(chain, ring, hit);
  const cz = wallZ + 0.1 + TD / 2;
  g.position.set(cx, 0, cz);
  scene.add(g);
  const t = { def, group: g, tiles, ring, hits: [hit], dropped: !!def.ghost, p: def.ghost ? 1 : 0, box: { x0: cx - TW_ / 2 - 0.05, x1: cx + TW_ / 2 + 0.2, z0: wallZ, z1: cz + TD / 2 + 0.05 } };
  hit.userData.tank = t;
  return t;
}
export function updateTank(t, dt, now) {
  const target = t.dropped ? 1 : 0;
  t.p += Math.sign(target - t.p) * Math.min(Math.abs(target - t.p), dt * 0.9);
  for (const m of t.tiles) {
    const { from, to } = m.userData;
    // fall straight down into the water first, then drift along to its place in the layer
    const a = Math.min(1, t.p * 2), b = Math.max(0, t.p * 2 - 1);
    if (m.userData.lost) {
      // bounces off the rim and out: an arc to the floor in front, landing face-down
      const k = t.p;
      m.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k + Math.sin(k * Math.PI) * 0.5, from.z + (to.z - from.z) * k);
      m.rotation.set(-Math.PI / 2 * Math.min(1, k * 1.4), 0, k * 2.2);
      continue;
    }
    const midY = m.userData.float ? to.y - 0.25 : to.y;
    const y = a < 1 ? from.y + (midY - from.y) * (a * a) : midY + (to.y - midY) * (1 - (1 - b) ** 2);
    m.position.set(from.x + (to.x - from.x) * b, y, from.z + (to.z - from.z) * b);
    if (m.userData.float && t.p > 0.9) m.position.y += Math.sin(now * 0.003 + to.x * 7) * 0.012;
    m.rotation.z = Math.sin(t.p * Math.PI) * 0.25 * (m.userData.float ? 1 : -1);
  }
  t.ring.position.y = 0.62 + 0.95 - 0.2 - (t.dropped ? 0.08 : 0);
}

// ---------------------------------------------------------------- seesaw: the clue sits on the low end; the answer balances it
export function makeSeesaw(scene, M, def, cx, cz) {
  const g = new THREE.Group();
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.32, 0.55, 3), M.wood);
  pivot.position.y = 0.27; pivot.rotation.y = Math.PI / 2;
  const arm = new THREE.Group();
  arm.position.y = 0.6;
  const plank = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.07, 0.4), M.wood);
  arm.add(plank);
  const mk = (word, x) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 180;
    const gg = c.getContext('2d');
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const draw = (w) => {
      const grd = gg.createLinearGradient(0, 0, 0, 180); grd.addColorStop(0, '#e8c46a'); grd.addColorStop(1, '#a87a2c');
      gg.fillStyle = grd; gg.fillRect(0, 0, 512, 180);
      gg.strokeStyle = '#5a3d14'; gg.lineWidth = 8; gg.strokeRect(6, 6, 500, 168);
      if (w && w.crest) emblem(gg, w.crest, 256, 90, 62, '#2a1a08');
      else if (w) {
        const h = Math.min(110, 470 / (w.length * 0.82)), adv = h * 0.8, x0 = 256 - (adv * w.length) / 2 + adv / 2;
        [...w].forEach((ch, i) => glyph(gg, ch, x0 + i * adv, 90, h, '#2a1a08'));
      }
      t.needsUpdate = true;
    };
    draw(word);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.3), new THREE.MeshLambertMaterial({ map: t }));
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), M.iron);
    post.position.set(x, 0.18, 0);
    m.position.set(x, 0.45, 0.03);
    arm.add(post, m);
    return draw;
  };
  mk(def.ref ? { crest: def.crestOf(def.ref) } : def.clue, -1.0);
  const setRight = mk(null, 1.0);
  g.add(pivot, arm);
  g.position.set(cx, 0, cz);
  scene.add(g);
  const s = { def, arm, setRight, level: false, a: 0.22 };
  return s;
}
export function updateSeesaw(s, dt, solvedNow) {
  if (solvedNow && !s.level) { s.level = true; s.setRight(s.def.word); }
  const target = s.level ? 0 : 0.22;
  s.a += (target - s.a) * Math.min(1, dt * 3);
  s.arm.rotation.z = s.a; // left end down
}

export function makeCracked(scene, M, def, cx, cz, rotY = 0) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.45), M.wood);
  base.position.y = 0.62;
  g.add(base);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.07), M.wood);
    leg.position.set(dx * 0.68, 0.31, dz * 0.18);
    g.add(leg);
  }
  const glass = new THREE.MeshPhongMaterial({ color: '#cfe6ea', transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
  const r = rng(def.clue.length * 131 + 7);
  // jagged stumps of the broken tank walls, and shards on the floor
  for (let i = 0; i < 7; i++) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.05 + r() * 0.08, 0.15 + r() * 0.35, 3), glass);
    shard.position.set(-0.7 + i * 0.23, 0.72 + r() * 0.1, (r() < 0.5 ? -1 : 1) * 0.2);
    g.add(shard);
  }
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.08 + r() * 0.1, 0.05 + r() * 0.08), glass);
    s.rotation.set(-Math.PI / 2, 0, r() * 6);
    s.position.set((r() - 0.5) * 1.6, 0.012, 0.35 + r() * 0.5);
    g.add(s);
  }
  // the tiles in a jumbled heap on the floor, letters up
  [...def.clue].forEach((ch, i) => {
    const tile = tileMesh(ch);
    tile.rotation.set(-Math.PI / 2, 0, (r() - 0.5) * 1.6);
    tile.position.set((r() - 0.5) * 0.9, 0.035 + (i % 2) * 0.02, 0.45 + r() * 0.45);
    g.add(tile);
  });
  g.position.set(cx, 0, cz);
  g.rotation.y = rotY;
  scene.add(g);
  return g;
}

// ---------------------------------------------------------------- ripple pond: lily pads; drop a pebble at the pier
export function makePond(scene, M, def, cx, cz, rotY) {
  const g = new THREE.Group();
  const R = 2.0;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 0.08, 0.12, 8, 48), M.rim);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.06;
  const surface = new THREE.Mesh(new THREE.CircleGeometry(R, 48).rotateX(-Math.PI / 2),
    def.frozen ? new THREE.MeshPhongMaterial({ color: '#dceef4', emissive: '#4a6a78', shininess: 120 }) : M.water);
  surface.position.y = 0.04;
  g.add(rim, surface);
  if (def.frozen) {
    // a few cracks in the ice
    const crack = new THREE.LineBasicMaterial({ color: '#8fb0bd' });
    const r = rng(def.decoy.length * 97);
    for (let i = 0; i < 6; i++) {
      const pts = []; let x = (r() - 0.5) * 2.4, z = (r() - 0.5) * 2.4;
      for (let k = 0; k < 5; k++) { pts.push(new THREE.Vector3(x, 0.05, z)); x += (r() - 0.5) * 0.5; z += (r() - 0.5) * 0.5; }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), crack));
    }
  }
  const pads = layoutPond(def.decoy, def.order).map((p) => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const gg = c.getContext('2d');
    gg.fillStyle = '#5f7f34'; gg.beginPath(); gg.arc(64, 64, 60, 0.25, Math.PI * 2 - 0.05); gg.lineTo(64, 64); gg.closePath(); gg.fill();
    gg.strokeStyle = '#3f5a22'; gg.lineWidth = 4; gg.stroke();
    glyph(gg, p.ch, 64, 64, 66, '#f3ecd2');
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const mat = new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.4, emissive: '#ffd27a', emissiveIntensity: 0 });
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.27, 24).rotateX(-Math.PI / 2), mat);
    m.position.set(p.x, 0.06, p.z);
    m.rotation.y = 0.3;
    g.add(m);
    return { m, dist: Math.hypot(p.x, p.z - (R + 0.25)) };
  });
  // the pier: a stone step at the near edge with a little heap of pebbles
  const pier = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.55), M.rim);
  pier.position.set(0, 0.11, R + 0.38);
  g.add(pier);
  const pebMat = new THREE.MeshLambertMaterial({ color: '#8d8478' });
  for (let i = 0; i < 4; i++) { const pb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), pebMat); pb.position.set(-0.2 + i * 0.12, 0.25, R + 0.45 + (i % 2) * 0.06); g.add(pb); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e8f4f6', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  ring.position.set(0, 0.07, R + 0.25);
  g.add(ring);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.copy(pier.position);
  g.add(hit);
  g.position.set(cx, 0, cz);
  g.rotation.y = rotY;
  scene.add(g);
  const pond = { def, pads, ring, hits: def.frozen ? [] : [hit], t: -1 };
  hit.userData.pond = pond;
  return pond;
}
export function dropPebble(pond) { if (!pond.def.frozen) pond.t = 0; }
export function updatePond(pond, dt) {
  if (pond.t < 0) return;
  pond.t += dt;
  const radius = pond.t * 0.9; // metres per second: slow enough to watch the order
  pond.ring.scale.setScalar(Math.max(0.01, radius));
  pond.ring.material.opacity = Math.max(0, 0.75 - radius * 0.12);
  for (const p of pond.pads) {
    const since = radius - p.dist;
    const k = since > 0 && since < 0.9 ? Math.sin((since / 0.9) * Math.PI) : 0;
    p.m.position.y = 0.06 + k * 0.08;
    p.m.material.emissiveIntensity = k * 0.9;
  }
  if (radius > 6) { pond.t = -1; pond.ring.material.opacity = 0; }
}

// ---------------------------------------------------------------- well: words come back up sounding the same
export function makeWell(scene, M, cx, cz) {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.8, 24, 1, true), M.rim);
  wall.position.y = 0.4;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.8, 24, 1, true), new THREE.MeshLambertMaterial({ color: '#2a2018', side: THREE.BackSide }));
  inner.position.y = 0.4;
  const dark = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#050403' }));
  dark.position.y = 0.2;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.07, 6, 24), M.rim);
  lip.rotation.x = Math.PI / 2; lip.position.y = 0.8;
  g.add(wall, inner, dark, lip);
  for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.1), M.wood); post.position.set(s * 0.68, 1.4, 0); g.add(post); }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8).rotateZ(Math.PI / 2), M.wood);
  beam.position.y = 1.9;
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 4), new THREE.MeshBasicMaterial({ color: '#b89a6a' }));
  rope.position.y = 1.5;
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.2, 10), M.wood);
  bucket.position.y = 1.05;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.5, 4), M.wood);
  roof.position.y = 2.3; roof.rotation.y = Math.PI / 4;
  g.add(beam, rope, bucket, roof);
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.6;
  g.add(hit);
  g.position.set(cx, 0, cz);
  scene.add(g);
  hit.userData.well = { bucket };
  return { hits: [hit] };
}
