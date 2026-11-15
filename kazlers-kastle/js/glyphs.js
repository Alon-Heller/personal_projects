// The castle's own stroke lettering. Each letter is an SVG path in a 100 x 100 box (y grows down).
// Letters that should survive a reflection are built to be exactly symmetric,
// so a flipped letter is drawn by honestly flipping its strokes.
const O = 'M50 0 A34 50 0 1 1 50 100 A34 50 0 1 1 50 0';
const P = 'M22 100 L22 0 L56 0 A26 26 0 0 1 56 52 L22 52';
export const GLYPHS = {
  A: 'M15 100 L50 0 L85 100 M28 64 L72 64',
  B: 'M22 0 L22 100 M22 0 L58 0 A25 25 0 0 1 58 50 L22 50 M22 50 L58 50 A25 25 0 0 1 58 100 L22 100',
  C: 'M80 16 A36 50 0 1 0 80 84',
  D: 'M22 0 L22 100 L42 100 A40 50 0 0 0 42 0 Z',
  E: 'M80 0 L22 0 L22 100 L80 100 M22 50 L70 50',
  F: 'M80 0 L22 0 L22 100 M22 50 L70 50',
  G: 'M80 16 A36 50 0 1 0 82 70 L82 54 L58 54',
  H: 'M20 0 L20 100 M80 0 L80 100 M20 50 L80 50',
  I: 'M50 0 L50 100 M30 0 L70 0 M30 100 L70 100',
  J: 'M38 0 L78 0 M66 0 L66 68 A24 32 0 0 1 18 68',
  K: 'M22 0 L22 100 M80 0 L22 50 L80 100',
  L: 'M22 0 L22 100 L80 100',
  M: 'M15 100 L15 0 L50 62 L85 0 L85 100',
  N: 'M20 100 L20 0 L80 100 L80 0',
  O,
  P,
  Q: `${O} M60 72 L86 102`,
  R: `${P} M48 52 L82 100`,
  S: 'M78 12 C65 -4 22 0 22 25 C22 50 78 50 78 75 C78 100 35 104 22 88',
  T: 'M15 0 L85 0 M50 0 L50 100',
  U: 'M20 0 L20 64 A30 36 0 0 0 80 64 L80 0',
  V: 'M15 0 L50 100 L85 0',
  W: 'M8 0 L28 100 L50 38 L72 100 L92 0',
  X: 'M18 0 L82 100 M82 0 L18 100',
  Y: 'M15 0 L50 50 L85 0 M50 50 L50 100',
  Z: 'M18 0 L82 0 L18 100 L82 100',
};

const cache = {};
const path = (c) => (cache[c] ||= new Path2D(GLYPHS[c]));

export const ADVANCE = 0.8; // letter spacing as a share of letter height

// Draw one letter centred on (x, y) with total height h.
export function glyph(ctx, c, x, y, h, color, { flipX = false, flipY = false, glow = 0 } = {}) {
  if (!GLYPHS[c]) return;
  const s = h / 112;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (flipX ? -1 : 1), s * (flipY ? -1 : 1));
  ctx.translate(-50, -50);
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.stroke(path(c));
  ctx.restore();
}

// Draw a word centred on (cx, y); returns its width.
export function word(ctx, w, cx, y, h, color, opts) {
  const adv = h * ADVANCE;
  const x0 = cx - (adv * w.length) / 2 + adv / 2;
  [...w].forEach((c, i) => glyph(ctx, c, x0 + i * adv, y, h, color, opts));
  return adv * w.length;
}
