// Interactive props: keyboard tables (tilt) and ribbon-wound planks / pillars.
// SPOILERS: this is how those rooms work.
import * as THREE from 'three';
import { glyph } from './glyphs.js';
import { KEY_ROWS, keyOf } from './rules.js';

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
  // keys
  for (let r = 0; r < 3; r++) for (let c = 0; c < KEY_ROWS[r].length; c++) {
    const [x, y] = keyPos(r, c);
    if (!dark) {
      ctx.fillStyle = '#d8b98a';
      ctx.fillRect(x - K / 2 + 5, y - K / 2 + 5, K - 10, K - 10);
      ctx.strokeStyle = '#3b2412'; ctx.lineWidth = 3; ctx.strokeRect(x - K / 2 + 5, y - K / 2 + 5, K - 10, K - 10);
      glyph(ctx, KEY_ROWS[r][c], x, y, K * 0.5, INK);
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
  // chain
  const live = cups.filter((c) => c.alpha > 0.05);
  if (live.length > 1) {
    ctx.save();
    ctx.strokeStyle = dark ? 'rgba(201,255,224,0.15)' : 'rgba(200,200,210,0.75)';
    ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
    ctx.beginPath();
    live.forEach((c, i) => (i ? ctx.lineTo(c.x, c.y + K * 0.36) : ctx.moveTo(c.x, c.y + K * 0.36)));
    ctx.stroke(); ctx.restore();
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
      if (c.onKey !== null) glyph(ctx, KEY_ROWS[c.row][c.onKey], c.x, c.y, K * 0.5, GLOW, { glow: 16 });
    } else {
      // a pewter cup rim: the key inside glows warm so the letter under the cup stands out
      ctx.fillStyle = 'rgba(255,196,92,0.75)';
      ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.fill();
      if (c.onKey !== null) glyph(ctx, KEY_ROWS[c.row][c.onKey], c.x, c.y, K * 0.55, '#2a160a');
      ctx.strokeStyle = '#4b4f58'; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#d6dae2'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(c.x, c.y, R - 3, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
      if (t.pegs) { ctx.fillStyle = '#2b2522'; ctx.beginPath(); ctx.arc(c.x - R - 6, c.y, 6, 0, Math.PI * 2); ctx.arc(c.x + R + 6, c.y, 6, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
  // a little ring marking the start of the chain
  if (!dark && live.length) {
    const f = live[0];
    ctx.fillStyle = '#b8bcc4';
    ctx.beginPath(); ctx.arc(f.x - K * 0.5, f.y + K * 0.36, 7, 0, Math.PI * 2); ctx.fill();
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
  const cups = lettersOf(def.clue).map((c, i) => { const [row, col] = keyOf(c); return { row, col, glow: glowSet.has(i), fallsAt: null }; });

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

function drawFace(ctx, def, face) {
  const word = lettersOf(def.word);
  const n = word.length, faces = def.faces;
  ctx.fillStyle = '#e9dcc0'; ctx.fillRect(0, 0, FW, FH);
  // silk weave
  ctx.globalAlpha = 0.08; ctx.fillStyle = '#7a5a3a';
  for (let y = 0; y < FH; y += 6) ctx.fillRect(0, y, FW, 2);
  ctx.globalAlpha = 1;
  // painted plum blossom, just decoration
  ctx.fillStyle = 'rgba(176,70,80,0.18)';
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc((i * 97 + face * 53) % FW, (i * 211 + face * 89) % FH, 10, 0, Math.PI * 2); ctx.fill(); }
  const top = 60, bottom = FH - 60;
  const dh = Math.min(150, (bottom - top) / n);
  const yOf = (k) => (def.up ? bottom - dh / 2 - k * dh : top + dh / 2 + k * dh);
  for (let k = 0; k < n; k++) {
    if (k % faces !== face) continue;
    const y = yOf(k);
    const dy = (def.up ? -1 : 1) * (dh * faces) / 2 / faces; // slope: one step per face
    // band
    ctx.save();
    ctx.fillStyle = '#8a2f2a';
    ctx.beginPath();
    ctx.moveTo(0, y - dy - 30); ctx.lineTo(FW, y + dy - 30); ctx.lineTo(FW, y + dy + 30); ctx.lineTo(0, y - dy + 30);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d29a2e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, y - dy - 30); ctx.lineTo(FW, y + dy - 30); ctx.moveTo(0, y - dy + 30); ctx.lineTo(FW, y + dy + 30); ctx.stroke();
    ctx.restore();
    glyph(ctx, word[k], FW / 2, y, 50, '#f6ead0');
    if (k === 0) {
      // the tassel hangs where the ribbon begins
      const tx = 18, ty = y - dy;
      ctx.strokeStyle = '#d29a2e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty + 46); ctx.stroke();
      ctx.fillStyle = '#d29a2e';
      ctx.beginPath(); ctx.moveTo(tx - 12, ty + 46); ctx.lineTo(tx + 12, ty + 46); ctx.lineTo(tx + 6, ty + 96); ctx.lineTo(tx - 6, ty + 96); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(tx, ty + 44, 9, 0, Math.PI * 2); ctx.fill();
    }
  }
}

export function makeRibbonProp(scene, M, def, cx, cz) {
  const g = new THREE.Group();
  const faces = def.faces;
  // apothem: distance from centre to each face
  const apo = faces === 2 ? 0.05 : FACE_W / (2 * Math.sqrt(3));
  for (let f = 0; f < faces; f++) {
    const cvs = document.createElement('canvas'); cvs.width = FW; cvs.height = FH;
    drawFace(cvs.getContext('2d'), def, f);
    const tex = new THREE.CanvasTexture(cvs); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
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
  scene.add(g);
  return g;
}
