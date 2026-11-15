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
  let w = letters(panel.clue).join('');
  if (panel.frame === 'moon') w = glowLetters(panel.clue, panel.glow);
  if (panel.frame === 'sun') w = litLetters(panel.clue, panel.glow);
  const marks = panel.sigils || [];
  const hasPool = marks.includes('pool');
  const hasMirror = marks.includes('mirror');
  if (hasPool && hasMirror) w = turnRead(w);
  else if (hasPool) w = poolRead(w);
  else if (hasMirror) w = mirrorRead(w);
  return w;
}

export const normalize = (s) => letters(s).join('');
