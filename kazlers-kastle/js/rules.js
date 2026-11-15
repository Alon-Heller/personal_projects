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
  if (panel.kind === 'bridge' || panel.kind === 'plain') return panel.answer;
  if (panel.kind === 'ribbon') return letters(panel.word).join('');
  let w = letters(panel.clue).join('');
  if (panel.frame === 'moon') w = glowLetters(panel.clue, panel.glow);
  if (panel.frame === 'sun') w = litLetters(panel.clue, panel.glow);
  const marks = panel.sigils || [];
  const hasPool = marks.includes('pool');
  const hasMirror = marks.includes('mirror');
  if (hasPool && hasMirror) w = turnRead(w);
  else if (hasPool) w = poolRead(w);
  else if (hasMirror) w = mirrorRead(w);
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
