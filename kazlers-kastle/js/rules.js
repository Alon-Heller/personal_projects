// Pure puzzle logic, shared by the game and tools/verify.mjs.
// SPOILERS: this file spells out how every panel works.

// Letters that still read correctly in each kind of reflection (uppercase glyphs).
export const POOL_SAFE = new Set('BCDEHIKOX');      // flipped top to bottom (water below the panel)
export const MIRROR_SAFE = new Set('AHIMOTUVWXY');  // flipped left to right (a mirror facing the panel)
export const TURN_SAFE = new Set('HINOSXZ');        // both at once = turned half a circle

const letters = (s) => [...s.toUpperCase()].filter((c) => c >= 'A' && c <= 'Z');

// Lantern: which letters are painted in glow ink.
export function glowLetters(clue, glow) {
  const g = new Set(glow);
  return letters(clue).filter((_, i) => g.has(i)).join('');
}
export function litLetters(clue, glow) {
  const g = new Set(glow);
  return letters(clue).filter((_, i) => !g.has(i)).join('');
}

// Reflections. Each returns what still reads, left to right, as a viewer would see it.
export const poolRead = (w) => letters(w).filter((c) => POOL_SAFE.has(c)).join('');
export const mirrorRead = (w) => letters(w).reverse().filter((c) => MIRROR_SAFE.has(c)).join('');
export const turnRead = (w) => letters(w).reverse().filter((c) => TURN_SAFE.has(c)).join('');

// Apply a panel's rules in order and return the word the panel wants.
export function derive(panel) {
  if (panel.kind === 'bridge' || panel.kind === 'plain' || panel.kind === 'split' || panel.kind === 'initials') return panel.answer;
  if (panel.kind === 'ripple') return rippleRead(layoutPond(panel.decoy, panel.order));
  let w = letters(['nest', 'seesaw', 'ribbon', 'echo'].includes(panel.kind) ? panel.word : panel.clue).join('');
  if (panel.kind === 'cistern') w = cisternRead(w);
  if (panel.frame === 'moon') w = glowLetters(panel.clue, panel.glow);
  if (panel.frame === 'sun') w = litLetters(panel.clue, panel.glow);
  const marks = panel.sigils || [];
  const hasPool = marks.includes('pool');
  const hasMirror = marks.includes('mirror');
  if (hasPool && hasMirror) w = turnRead(w);
  else if (hasPool) w = poolRead(w);
  else if (hasMirror) w = mirrorRead(w);
  // simple word rules, applied in the order their signs appear
  for (const m of marks) w = (WORD_RULES[m] || ((x) => x))(w);
  if (panel.kind === 'tilt') w = tiltSlide(w, panel.tilt);
  return w;
}

export const normalize = (s) => letters(s).join('');

// Keyboard tilt: every letter slides `n` keys along its QWERTY row (+ = right/east).
// A letter pushed past the end of its row falls off.
export const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
export function keyOf(c) {
  for (let r = 0; r < 3; r++) { const i = KEY_ROWS[r].indexOf(c); if (i >= 0) return [r, i]; }
  return null;
}
export function tiltSlide(word, n) {
  return letters(word).map((c) => {
    const [r, i] = keyOf(c);
    return KEY_ROWS[r][i + n] || '';
  }).join('');
}

// Cistern: letter tiles dropped into water. Letters with a closed hole (in the castle's own lettering)
// trap air and float; the rest sink. Each layer keeps its order; read the surface, then the floor.
export const HOLED = new Set('ABDOPQR');
export const cisternRead = (w) => {
  const ls = letters(w);
  return ls.filter((c) => HOLED.has(c)).join('') + ls.filter((c) => !HOLED.has(c)).join('');
};

// Cracked tank: the tiles fall in a heap. The answer splits the clue's letters into two groups,
// each keeping its order, with one group put first. (Checks that an answer is such a split.)
export function isSplit(clue, ans) {
  const c = letters(clue), a = letters(ans);
  if (c.length !== a.length) return false;
  for (let m = 1; m < (1 << c.length) - 1; m++) {
    let x = '', y = '';
    c.forEach((ch, i) => ((m >> i) & 1 ? (x += ch) : (y += ch)));
    if (x + y === a.join('')) return true;
  }
  return false;
}

// Ripple pond: letters float on lily pads. A pebble dropped at the pier sends out a ring;
// pads are reached nearest first, and that order spells the answer.
// Pads are laid out from a "decoy" (their left-to-right order) so the reading differs.
export function layoutPond(decoy, answer) {
  const d = letters(decoy), a = letters(answer);
  const used = new Array(a.length).fill(false);
  const rank = d.map((c) => { const r = a.findIndex((x, i) => x === c && !used[i]); used[r] = true; return r; });
  const n = d.length, span = 2.6, step = 0.42;
  const xs = d.map((_, i) => -span / 2 + (i * span) / (n - 1));
  const base = Math.max(0.9, ...xs.map((x, i) => Math.abs(x) + 0.25 - rank[i] * step));
  const R = 2.0; // pond radius; the pier is at (0, R + 0.25)
  return d.map((c, i) => {
    const dist = base + rank[i] * step;
    const z = R + 0.25 - Math.sqrt(dist * dist - xs[i] * xs[i]);
    return { ch: c, x: xs[i], z };
  });
}
export function rippleRead(pads) {
  const pier = { x: 0, z: 2.25 };
  return pads.map((p) => ({ ...p, d: Math.hypot(p.x - pier.x, p.z - pier.z) })).sort((a, b) => a.d - b.d).map((p) => p.ch).join('');
}

// Sign-only word rules. Each takes a word and gives a word; they chain in sign order.
export const WORD_RULES = {
  turn: (w) => w.slice(1) + w[0],              // the first letter moves to the end
  'turn-l': (w) => w.slice(-1) + w.slice(0, -1), // the last letter moves to the front
  back: (w) => [...w].reverse().join(''),        // the word read backwards
  comb: (w) => [...w].filter((_, i) => i % 2 === 0).join(''), // every other letter, from the first
};
