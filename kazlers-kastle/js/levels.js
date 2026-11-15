// Castle layout and every panel. SPOILERS: answers live here.
// The map is a grid of 2 m cells. x grows east, y grows south.

export const CELL = 2;
export const W = 48;
export const H = 41;

// Interior rectangles (inclusive). `light`: sky | bright | warm | dark.
export const ROOMS = [
  { id: 'gatehouse', x: [22, 26], y: [20, 23], light: 'warm' },
  { id: 'courtyard', x: [19, 29], y: [4, 18], light: 'sky' },
  { id: 'shrine', x: [22, 26], y: [1, 2], light: 'dark' },
  { id: 'lanternHall', x: [16, 17], y: [12, 12], light: 'warm' },
  { id: 'cryptA', x: [8, 14], y: [9, 15], light: 'dark' },
  { id: 'cryptB', x: [8, 14], y: [1, 7], light: 'dark' },
  { id: 'darkRoom', x: [1, 6], y: [1, 7], light: 'dark', noLantern: true },
  { id: 'waterHall', x: [31, 32], y: [12, 12], light: 'warm' },
  { id: 'poolRoom', x: [34, 40], y: [9, 15], light: 'warm' },
  { id: 'dryRoom', x: [34, 40], y: [1, 7], light: 'warm' },
  { id: 'mirrorRoom', x: [42, 46], y: [1, 7], light: 'warm' },
  { id: 'capRoom', x: [42, 46], y: [9, 15], light: 'warm' },
  // Banquet wing (south-west)
  { id: 'banquetHall', x: [20, 20], y: [20, 25], light: 'warm' },
  { id: 'tiltHall', x: [8, 20], y: [27, 31], light: 'warm' },
  { id: 'boltedHall', x: [1, 6], y: [27, 31], light: 'warm' },
  { id: 'westGallery', x: [1, 6], y: [33, 38], light: 'warm' },
  { id: 'steepHall', x: [8, 16], y: [33, 38], light: 'warm' },
  { id: 'cellar', x: [18, 21], y: [33, 38], light: 'dark' },
  // Solar wing (south-east)
  { id: 'solarStair', x: [28, 28], y: [20, 25], light: 'warm' },
  { id: 'plankRoom', x: [27, 39], y: [27, 31], light: 'bright' },
  { id: 'turnedRoom', x: [41, 46], y: [27, 31], light: 'bright' },
  { id: 'pillarRoom', x: [30, 46], y: [33, 38], light: 'bright' },
];

// Plain gaps in walls.
export const OPENINGS = [[15, 12], [33, 12], [20, 26], [28, 26]];

// Doors open once every panel in `requires` is solved.
export const DOORS = [
  { id: 'gate', at: [24, 19], requires: ['c-open'] },
  { id: 'lantern', at: [18, 12], requires: ['c-rain', 'c-honey', 'c-butter', 'c-candle', 'c-bed'] },
  { id: 'water', at: [30, 12], requires: ['c-rain', 'c-honey', 'c-butter', 'c-candle', 'c-bed'] },
  { id: 'cryptAB', at: [11, 8], requires: ['l-plan', 'l-carpet'] },
  { id: 'cryptBC', at: [7, 4], requires: ['l-chart', 'l-pant'] },
  { id: 'poolDry', at: [37, 8], requires: ['w-hike', 'w-bide'] },
  { id: 'dryMirror', at: [41, 6], requires: ['w-cooked', 'w-book'] },
  { id: 'mirrorCap', at: [44, 8], requires: ['w-way'] },
  { id: 'shrine', at: [24, 3], requires: ['l-scare', 'l-nit', 'l-ate', 'w-mat', 'w-soon', 'w-son'] },
  // `capstones: n` = opens once any n wings are complete
  { id: 'banquet', at: [20, 19], requires: [], capstones: 1 },
  { id: 'solar', at: [28, 19], requires: [], capstones: 1 },
  { id: 'tiltBolted', at: [7, 29], requires: ['b-views', 'b-super', 'b-vital'] },
  { id: 'boltedWest', at: [1, 32], requires: ['b-spiral', 'b-ford'] },
  { id: 'westSteep', at: [7, 36], requires: ['b-dream', 'b-tardy'] },
  { id: 'steepCellar', at: [17, 36], requires: ['b-lantern', 'b-about', 'b-minute', 'l-scare', 'l-nit', 'l-ate'] },
  { id: 'plankTurned', at: [40, 29], requires: ['r-chair', 'r-friends', 'r-stained'] },
  { id: 'turnedPillar', at: [43, 32], requires: ['r-parrot', 'r-schooled'] },
];

// Wing capstones: solving all of these lights that wing's brazier in the courtyard.
export const CAPSTONES = {
  lantern: ['l-scare', 'l-nit', 'l-ate'],
  water: ['w-mat', 'w-soon', 'w-son'],
  banquet: ['b-lantern', 'b-about', 'b-minute'],
  solar: ['r-charity', 'r-limited', 'r-lowered'],
};

// Cells with water (a pool under a panel) or a dry basin. Both block walking.
export const POOLS = [[35, 15], [37, 15], [39, 15]];
export const BASINS = [[35, 1], [37, 1], [39, 1]];
// Freestanding mirrors in cell `at`, their glass facing `facing` (towards the panel they show).
export const MIRRORS = [
  { at: [42, 3], facing: 'N', panel: 'w-may' },
  { at: [46, 3], facing: 'N', panel: 'w-way' },
];

export const START = { at: [24, 22], facing: 'N' };

// `glow` is a mask over the clue: '*' marks a letter painted in glow ink.
const mask = (m) => [...m].map((c, i) => (c === '*' ? i : -1)).filter((i) => i >= 0);

export const PANELS = [
  // Courtyard and gatehouse
  { id: 'c-open', at: [23, 20], wall: 'N', kind: 'plain', clue: 'OPEN', answer: 'OPEN' },
  { id: 'c-sun', at: [21, 4], wall: 'N', kind: 'bridge', clue: 'SUN|POT', answer: 'FLOWER', ghost: true },
  { id: 'c-rain', at: [27, 4], wall: 'N', kind: 'bridge', clue: 'RAIN|TIE', answer: 'BOW' },
  { id: 'c-honey', at: [19, 7], wall: 'W', kind: 'bridge', clue: 'HONEY|LIGHT', answer: 'MOON' },
  { id: 'c-butter', at: [19, 16], wall: 'W', kind: 'bridge', clue: 'BUTTER|WEIGHT', answer: 'FLY' },
  { id: 'c-candle', at: [29, 7], wall: 'E', kind: 'bridge', clue: 'CANDLE|HOUSE', answer: 'LIGHT' },
  { id: 'c-bed', at: [29, 16], wall: 'E', kind: 'bridge', clue: 'BED|SERVICE', answer: 'ROOM' },

  // Lantern wing: crypt A (moon)
  { id: 'l-spark', at: [8, 10], wall: 'W', kind: 'ink', frame: 'moon', clue: 'SPARKLE', glow: mask('*****..'), answer: 'SPARK', ghost: true },
  { id: 'l-plan', at: [8, 12], wall: 'W', kind: 'ink', frame: 'moon', clue: 'PLATINUM', glow: mask('***..*..'), answer: 'PLAN' },
  { id: 'l-carpet', at: [8, 14], wall: 'W', kind: 'ink', frame: 'moon', clue: 'CARPENTER', glow: mask('*****.*..'), answer: 'CARPET' },
  // crypt B (sun)
  { id: 'l-heart', at: [10, 1], wall: 'N', kind: 'ink', frame: 'sun', clue: 'HEARTBEAT', glow: mask('.....****'), answer: 'HEART', ghost: true },
  { id: 'l-chart', at: [12, 1], wall: 'N', kind: 'ink', frame: 'sun', clue: 'CHARIOT', glow: mask('....**.'), answer: 'CHART' },
  { id: 'l-pant', at: [14, 4], wall: 'E', kind: 'ink', frame: 'sun', clue: 'PLEASANT', glow: mask('.**.**..'), answer: 'PANT' },
  // the dark room (capstone): no lantern here
  { id: 'l-scare', at: [2, 1], wall: 'N', kind: 'ink', frame: 'sun', clue: 'SCARECROW', glow: mask('.....****'), answer: 'SCARE', gaps: true },
  { id: 'l-nit', at: [5, 1], wall: 'N', kind: 'ink', frame: 'sun', clue: 'KNIGHT', glow: mask('*..**.'), answer: 'NIT', gaps: true },
  { id: 'l-ate', at: [1, 5], wall: 'W', kind: 'ink', frame: 'sun', clue: 'LANTERN', glow: mask('*.*..**'), answer: 'ATE', gaps: true },

  // Water wing: the pool room (reflections visible)
  { id: 'w-choke', at: [35, 15], wall: 'S', kind: 'mark', sigils: ['pool'], clue: 'CHOKER', answer: 'CHOKE', ghost: true, show: 'pool' },
  { id: 'w-hike', at: [37, 15], wall: 'S', kind: 'mark', sigils: ['pool'], clue: 'HIKERS', answer: 'HIKE', show: 'pool' },
  { id: 'w-bide', at: [39, 15], wall: 'S', kind: 'mark', sigils: ['pool'], clue: 'BRIDGES', answer: 'BIDE', show: 'pool' },
  // the dry room (no water left)
  { id: 'w-bike', at: [35, 1], wall: 'N', kind: 'mark', sigils: ['pool'], clue: 'BIKERS', answer: 'BIKE', ghost: true },
  { id: 'w-cooked', at: [37, 1], wall: 'N', kind: 'mark', sigils: ['pool'], clue: 'CROOKED', answer: 'COOKED' },
  { id: 'w-book', at: [39, 1], wall: 'N', kind: 'mark', sigils: ['pool'], clue: 'BROOKS', answer: 'BOOK' },
  // the mirror room
  { id: 'w-may', at: [42, 1], wall: 'N', kind: 'mark', sigils: ['mirror'], clue: 'YAMS', answer: 'MAY', ghost: true, size: 1.2, height: 2.95 },
  { id: 'w-way', at: [46, 1], wall: 'N', kind: 'mark', sigils: ['mirror'], clue: 'YAWN', answer: 'WAY', size: 1.2, height: 2.95 },
  // capstone: nothing to look into
  { id: 'w-mat', at: [42, 15], wall: 'S', kind: 'mark', sigils: ['mirror'], clue: 'STAMPED', answer: 'MAT' },
  { id: 'w-soon', at: [44, 15], wall: 'S', kind: 'mark', sigils: ['pool', 'mirror'], clue: 'NOOSE', answer: 'SOON' },
  { id: 'w-son', at: [46, 15], wall: 'S', kind: 'mark', sigils: ['pool', 'mirror'], clue: 'NOSE', answer: 'SON' },

  // The shrine
  { id: 'final', at: [24, 1], wall: 'N', kind: 'ink', frame: 'moon', sigils: ['pool'], clue: 'WHISKERS', glow: mask('.**.****'), answer: 'HIKE', final: true },

  // Banquet wing: keyboard tables. `tilt` = keys slid (+ east). `table`: lever | bolted | fixed
  { id: 'b-rust', at: [9, 27], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'RUST', tilt: 1, table: 'lever', answer: 'TIDY', ghost: true, height: 2.15 },
  { id: 'b-views', at: [12, 27], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'VIEWS', tilt: 1, table: 'lever', answer: 'BORED', height: 2.15 },
  { id: 'b-super', at: [15, 27], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'SUPER', tilt: 1, table: 'lever', answer: 'DIRT', height: 2.15 },
  { id: 'b-vital', at: [18, 27], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'VITAL', tilt: 1, table: 'lever', answer: 'BOYS', height: 2.15 },
  { id: 'b-spiral', at: [2, 27], wall: 'N', kind: 'tilt', clue: 'SPIRAL', tilt: 1, table: 'bolted', sigils: ['tilt-e'], answer: 'DOTS', height: 2.15 },
  { id: 'b-ford', at: [5, 27], wall: 'N', kind: 'tilt', clue: 'DIES', tilt: 1, table: 'bolted', sigils: ['tilt-e'], answer: 'FORD', height: 2.15 },
  { id: 'b-dream', at: [3, 33], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'DREAM', tilt: -1, table: 'fixed', answer: 'SEWN', height: 2.15 },
  { id: 'b-tardy', at: [5, 33], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'TARDY', tilt: -1, table: 'fixed', answer: 'REST', height: 2.15 },
  { id: 'b-lantern', at: [9, 33], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'LANTERN', tilt: 2, table: 'fixed', answer: 'DUTY', height: 2.15 },
  { id: 'b-about', at: [12, 33], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'ABOUT', tilt: -2, table: 'fixed', answer: 'CUTE', height: 2.15 },
  { id: 'b-minute', at: [15, 33], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'MINUTE', tilt: 2, table: 'fixed', answer: 'POUT', height: 2.15 },
  // crossing: the dark cellar table (lantern x tilt)
  { id: 'x-duet', at: [20, 33], wall: 'N', kind: 'tilt', frame: 'moon', sigils: ['tilt-w'], clue: 'FAIRLY', glow: mask('****.*'), tilt: -1, table: 'bolted', answer: 'DUET', height: 2.15 },

  // Solar wing: ribbon-wound planks (2 faces) and pillars (3 faces). `prop` = where it stands.
  { id: 'r-count', at: [29, 27], wall: 'N', kind: 'ribbon', word: 'COUNT', faces: 2, prop: [29, 29], answer: 'COUNT', ghost: true, height: 2.6, size: 0.9 },
  { id: 'r-chair', at: [32, 27], wall: 'N', kind: 'ribbon', word: 'CHAIR', faces: 2, prop: [32, 29], answer: 'CHAIR', height: 2.6, size: 0.9 },
  { id: 'r-friends', at: [35, 27], wall: 'N', kind: 'ribbon', word: 'FRIENDS', faces: 2, prop: [35, 29], answer: 'FRIENDS', height: 2.6, size: 0.9 },
  { id: 'r-stained', at: [38, 27], wall: 'N', kind: 'ribbon', word: 'STAINED', faces: 2, prop: [38, 29], answer: 'STAINED', height: 2.6, size: 0.9 },
  { id: 'r-parrot', at: [42, 27], wall: 'N', kind: 'ribbon', word: 'PARROT', faces: 2, up: true, prop: [42, 29], answer: 'PARROT', height: 2.6, size: 0.9 },
  { id: 'r-schooled', at: [45, 27], wall: 'N', kind: 'ribbon', word: 'SCHOOLED', faces: 2, up: true, prop: [45, 29], answer: 'SCHOOLED', height: 2.6, size: 0.9 },
  { id: 'r-charity', at: [33, 33], wall: 'N', kind: 'ribbon', word: 'CHARITY', faces: 3, prop: [33, 35], answer: 'CHARITY', height: 2.6, size: 0.9 },
  { id: 'r-limited', at: [37, 33], wall: 'N', kind: 'ribbon', word: 'LIMITED', faces: 3, prop: [37, 35], answer: 'LIMITED', height: 2.6, size: 0.9 },
  { id: 'r-lowered', at: [41, 33], wall: 'N', kind: 'ribbon', word: 'LOWERED', faces: 3, prop: [41, 35], answer: 'LOWERED', height: 2.6, size: 0.9 },
];
