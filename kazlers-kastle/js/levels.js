// Castle layout and every panel. SPOILERS: answers live here.
// The map is a grid of 2 m cells. x grows east, y grows south.

export const CELL = 2;
export const W = 64;
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
  { id: 'tailor', x: [22, 25], y: [25, 31], light: 'bright' },
  // Glasshouse wing (east of the water wing)
  { id: 'glassHall', x: [48, 49], y: [12, 12], light: 'warm' },
  { id: 'cisternHall', x: [50, 56], y: [9, 15], light: 'bright' },
  { id: 'seesawRoom', x: [50, 56], y: [1, 7], light: 'bright' },
  { id: 'glasshouse', x: [58, 62], y: [1, 7], light: 'bright' },
  // Garden wing (south of the glasshouse): an open-air pond garden, the well room, and a room of mixed rules
  { id: 'wordHall', x: [50, 62], y: [17, 23], light: 'bright' },
  { id: 'soundRoom', x: [50, 55], y: [25, 31], light: 'warm' },
  { id: 'mixedRoom', x: [57, 62], y: [25, 31], light: 'bright' },
  { id: 'runeRoom', x: [50, 62], y: [33, 38], light: 'bright' },
  { id: 'mirrorAlcove', x: [41, 46], y: [27, 31], light: 'bright' },
  { id: 'nestRoom', x: [40, 46], y: [33, 38], light: 'bright' },
  { id: 'workroom', x: [30, 38], y: [33, 38], light: 'bright' },
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
  { id: 'tiltBolted', at: [7, 29], requires: ['b-rust', 'b-views', 'b-super', 'b-vital'] },
  { id: 'boltedWest', at: [1, 32], requires: [] },
  { id: 'westSteep', at: [7, 36], requires: ['b-dream', 'b-tardy'] },
  { id: 'steepCellar', at: [17, 36], requires: ['b-lantern', 'b-about', 'b-minute', 'l-scare', 'l-nit', 'l-ate'] },
  { id: 'glass', at: [47, 12], requires: [], capstones: 2 },
  { id: 'cisternSeesaw', at: [53, 8], requires: ['g-post', 'g-drive', 'g-hatred', 'g-canoe', 'g-whoever', 'g-outlook'] },
  { id: 'seesawGlass', at: [57, 4], requires: ['s-down', 's-full', 's-awake', 's-modern', 's-wide'] },
  { id: 'garden', at: [53, 16], requires: ['g-post', 'g-drive', 'g-hatred', 'g-canoe', 'g-whoever', 'g-outlook'], capstones: 3 },
  { id: 'gardenWell', at: [54, 24], requires: ['w-plug', 'w-warts', 'w-reward', 'w-glad', 'w-big', 'w-shut', 'w-tree', 'w-bird', 'w-tool', 'w-rect'] },
  { id: 'wellMixed', at: [56, 28], requires: ['e-night', 'e-flower', 'e-week', 'e-right', 'o-short', 'o-light', 'o-lose'] },
  { id: 'mixedRune', at: [60, 32], requires: ['m-old', 'm-go', 'm-pan', 'm-god', 'm-bottoms', 'm-read', 'm-flower'] },
  { id: 'plankTailor', at: [26, 29], requires: ['r-count', 'r-chair', 'r-friends', 'r-parrot'] },
  { id: 'plankAlcove', at: [40, 29], requires: ['t-tower', 't-ghost', 't-blow', 't-toast', 't-wick'] },
  { id: 'alcoveNest', at: [43, 32], requires: ['m-motto', 'm-atom'] },
  { id: 'nestWork', at: [39, 36], requires: ['n-book', 'n-tree', 'n-foot', 'n-galaxy', 'n-day', 'n-week', 'n-year', 'n-letter'] },
];

// Wing capstones: solving all of these lights that wing's brazier in the courtyard.
export const CAPSTONES = {
  lantern: ['l-scare', 'l-nit', 'l-ate'],
  water: ['w-mat', 'w-soon', 'w-son'],
  banquet: ['b-lantern', 'b-about', 'b-minute'],
  solar: ['n-hoe', 'n-bid', 'n-flower', 'n-chapter'],
  glass: ['x-cod', 'x-boo', 'x-future'],
  garden: ['q-nono', 'q-byebye', 'q-evil', 'q-one', 'q-flour'],
};

// Cells with water (a pool under a panel) or a dry basin. Both block walking.
export const POOLS = [[35, 15], [37, 15], [39, 15]];
export const BASINS = [[35, 1], [37, 1], [39, 1]];
// Baskets of torn ribbon scraps: [letter, the panel whose ribbon it was torn from].
export const BASKETS = [
  { at: [24, 28], scraps: [['B', 't-blow'], ['W', 't-wick'], ['G', 't-ghost'], ['T', 't-toast']] },
];

// Mirrors hung flat on a wall: cell `at`, on its `wall` side.
export const WALL_MIRRORS = [
  { at: [42, 27], wall: 'N' },
  { at: [45, 27], wall: 'N' },
];
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
  { id: 'w-bike', at: [35, 1], wall: 'N', kind: 'mark', sigils: ['pool'], clue: 'BIKERS', answer: 'BIKE', rev: 2 },
  { id: 'w-cooked', at: [37, 1], wall: 'N', kind: 'mark', sigils: ['pool'], clue: 'CROOKED', answer: 'COOKED' },
  { id: 'w-book', at: [39, 1], wall: 'N', kind: 'mark', sigils: ['pool'], clue: 'BROOKS', answer: 'BOOK' },
  // the mirror room
  { id: 'w-may', at: [42, 1], wall: 'N', kind: 'mark', sigils: ['mirror'], clue: 'YAMS', answer: 'MAY', rev: 2, size: 1.2, height: 2.95 },
  { id: 'w-way', at: [46, 1], wall: 'N', kind: 'mark', sigils: ['mirror'], clue: 'YAWN', answer: 'WAY', size: 1.2, height: 2.95 },
  // capstone: nothing to look into
  { id: 'w-mat', at: [42, 15], wall: 'S', kind: 'mark', sigils: ['mirror'], clue: 'STAMPED', answer: 'MAT' },
  { id: 'w-soon', at: [44, 15], wall: 'S', kind: 'mark', sigils: ['pool', 'mirror'], clue: 'NOOSE', answer: 'SOON' },
  { id: 'w-son', at: [46, 15], wall: 'S', kind: 'mark', sigils: ['pool', 'mirror'], clue: 'NOSE', answer: 'SON' },

  // The shrine
  { id: 'final', at: [24, 1], wall: 'N', kind: 'ink', frame: 'moon', sigils: ['pool'], clue: 'WHISKERS', glow: mask('.**.****'), answer: 'HIKE', final: true },

  // Banquet wing: keyboard tables. `tilt` = keys slid (+ east). `table`: lever | bolted | fixed
  { id: 'b-rust', at: [9, 27], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'RUST', tilt: 1, table: 'lever', answer: 'TIDY', rev: 2, height: 2.15 },
  { id: 'b-views', at: [12, 27], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'VIEWS', tilt: 1, table: 'lever', answer: 'BORED', height: 2.15 },
  { id: 'b-super', at: [15, 27], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'SUPER', tilt: 1, table: 'lever', answer: 'DIRT', height: 2.15 },
  { id: 'b-vital', at: [18, 27], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'VITAL', tilt: 1, table: 'lever', answer: 'BOYS', height: 2.15 },
  { id: 'b-dream', at: [3, 33], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'DREAM', tilt: -1, table: 'fixed', answer: 'SEWN', height: 2.15 },
  { id: 'b-tardy', at: [5, 33], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'TARDY', tilt: -1, table: 'fixed', answer: 'REST', height: 2.15 },
  { id: 'b-lantern', at: [9, 33], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'LANTERN', tilt: 2, table: 'fixed', answer: 'DUTY', height: 2.15 },
  { id: 'b-about', at: [12, 33], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'ABOUT', tilt: -2, table: 'fixed', answer: 'CUTE', height: 2.15 },
  { id: 'b-minute', at: [15, 33], wall: 'N', kind: 'tilt', sigils: ['tilt'], clue: 'MINUTE', tilt: 2, table: 'fixed', answer: 'POUT', height: 2.15 },
  // crossing: the dark cellar table (lantern x tilt)
  { id: 'x-duet', at: [20, 33], wall: 'N', kind: 'tilt', frame: 'moon', sigils: ['tilt-w'], clue: 'FAIRLY', glow: mask('****.*'), tilt: -1, table: 'bolted', answer: 'DUET', height: 2.15 },

  // Solar wing: ribbon-wound planks (2 faces) and pillars (3 faces). `prop` = where it stands,
  // `nudge` = metres it stands towards the panel's wall side, `turn` = extra rotation (radians).
  { id: 'r-count', at: [29, 27], wall: 'N', kind: 'ribbon', word: 'COUNT', faces: 2, prop: [29, 29], answer: 'COUNT', rev: 2, height: 2.6, size: 0.9 },
  { id: 'r-chair', at: [32, 27], wall: 'N', kind: 'ribbon', word: 'CHAIR', faces: 2, prop: [32, 29], answer: 'CHAIR', height: 2.6, size: 0.9 },
  { id: 'r-friends', at: [35, 27], wall: 'N', kind: 'ribbon', word: 'FRIENDS', faces: 2, fold: 3, prop: [35, 29], answer: 'FRIENDS', height: 2.6, size: 0.9, rev: 2 },
  { id: 'r-parrot', at: [38, 27], wall: 'N', kind: 'ribbon', word: 'PARROT', faces: 2, up: true, prop: [38, 29], answer: 'PARROT', height: 2.6, size: 0.9 },
  // the tailor's room: torn ribbons; every missing letter is a scrap in the basket. `torn` = letter positions torn away.
  { id: 't-tower', at: [22, 26], wall: 'W', kind: 'ribbon', word: 'TOWER', faces: 2, torn: [2], footScrap: true, prop: [23, 26], answer: 'TOWER', rev: 2, height: 2.6, size: 0.9 },
  { id: 't-ghost', at: [25, 26], wall: 'E', kind: 'ribbon', word: 'GHOST', faces: 3, torn: [0], prop: [24, 26], answer: 'GHOST', height: 2.6, size: 0.9 },
  { id: 't-blow', at: [22, 28], wall: 'W', kind: 'ribbon', word: 'BLOW', faces: 2, torn: [0], prop: [23, 28], answer: 'BLOW', height: 2.6, size: 0.9 },
  { id: 't-toast', at: [22, 30], wall: 'W', kind: 'ribbon', word: 'TOAST', faces: 3, up: true, torn: [0], prop: [23, 30], answer: 'TOAST', height: 2.6, size: 0.9 },
  { id: 't-wick', at: [25, 30], wall: 'E', kind: 'ribbon', word: 'WICK', faces: 2, torn: [0], prop: [24, 30], answer: 'WICK', height: 2.6, size: 0.9 },
  // the mirror alcove: each prop stands close to a wall mirror, one side only visible in the glass
  { id: 'm-motto', at: [42, 31], wall: 'S', kind: 'ribbon', word: 'BOTTOM', faces: 2, prop: [42, 27], backTo: 'N', sigils: ['mirror'], answer: 'MOTTO', height: 2.4, size: 0.9 },
  { id: 'm-atom', at: [45, 31], wall: 'S', kind: 'ribbon', word: 'MORTAL', faces: 3, prop: [45, 27], backTo: 'N', sigils: ['mirror'], answer: 'ATOM', height: 2.4, size: 0.9 },

  // Nest room: three nested boxes, smallest inside; one box's plaque is blank. `chain` runs inner -> outer.
  { id: 'n-book', at: [41, 38], wall: 'S', kind: 'nest', chain: ['PAGE', null, 'LIBRARY'], word: 'BOOK', answer: 'BOOK', rev: 2, height: 2.75, size: 0.85 },
  { id: 'n-tree', at: [43, 38], wall: 'S', kind: 'nest', chain: ['LEAF', null, 'FOREST'], word: 'TREE', answer: 'TREE', height: 2.75, size: 0.85 },
  { id: 'n-foot', at: [45, 38], wall: 'S', kind: 'nest', chain: ['TOE', null, 'LEG'], word: 'FOOT', answer: 'FOOT', height: 2.75, size: 0.85 },
  { id: 'n-galaxy', at: [46, 34], wall: 'E', kind: 'nest', chain: ['STAR', null, 'UNIVERSE'], word: 'GALAXY', answer: 'GALAXY', height: 2.75, size: 0.85 },
  { id: 'n-day', at: [46, 36], wall: 'E', kind: 'nest', chain: ['MINUTE', 'HOUR', null], word: 'DAY', answer: 'DAY', crest: 'sun', height: 2.75, size: 0.85 },
  { id: 'n-week', at: [41, 33], wall: 'N', kind: 'nest', chain: [{ ref: 'n-day' }, null, 'MONTH'], word: 'WEEK', answer: 'WEEK', crest: 'moon', height: 2.75, size: 0.85 },
  { id: 'n-year', at: [45, 33], wall: 'N', kind: 'nest', chain: [{ ref: 'n-week' }, 'MONTH', null], word: 'YEAR', answer: 'YEAR', height: 2.75, size: 0.85 },
  { id: 'n-letter', at: [40, 34], wall: 'W', kind: 'nest', chain: [null, 'WORD', 'SENTENCE'], word: 'LETTER', answer: 'LETTER', height: 2.75, size: 0.85 },
  // workroom (capstone): the nest, then a rule you already know
  { id: 'n-hoe', at: [32, 38], wall: 'S', kind: 'nest', chain: ['KITCHEN', null, 'VILLAGE'], word: 'HOUSE', sigils: ['pool'], answer: 'HOE', height: 2.75, size: 0.85 },
  { id: 'n-flower', at: [32, 33], wall: 'N', kind: 'nest', twin: true, chain: ['PETAL', null, 'GARDEN'], prop: [32, 35], word: 'FLOWER', answer: 'FLOWER', height: 2.75, size: 0.85 },
  { id: 'n-chapter', at: [36, 33], wall: 'N', kind: 'nest', twin: true, chain: ['PAGE', null, 'BOOK'], prop: [36, 35], word: 'CHAPTER', answer: 'CHAPTER', height: 2.75, size: 0.85 },
  { id: 'n-bid', at: [36, 38], wall: 'S', kind: 'nest', chain: ['FEATHER', null, 'FLOCK'], word: 'BIRD', sigils: ['pool'], answer: 'BID', height: 2.75, size: 0.85 },

  // Glasshouse wing. Cistern Hall: glass tanks with a pull-chain that drops the clue's tiles into the water.
  { id: 'g-post', at: [50, 9], wall: 'N', kind: 'cistern', clue: 'SPOT', answer: 'POST', rev: 2, tank: true, height: 2.45, size: 0.9 },
  // one tile bounces out of the tank and lands face-down on the floor
  { id: 'g-drive', at: [52, 9], wall: 'N', kind: 'cistern', clue: 'DIVER', lost: 2, answer: 'DRIVE', tank: true, height: 2.45, size: 0.9, rev: 4 },
  // cracked tanks: the same rule, but no water to show which tiles float. Split the letters into two groups
  // (each keeping its order), floaters first: only one such rearrangement is a word.
  { id: 'g-hatred', at: [54, 9], wall: 'N', kind: 'split', clue: 'THREAD', answer: 'HATRED', height: 2.45, size: 0.9 },
  { id: 'g-canoe', at: [56, 9], wall: 'N', kind: 'split', clue: 'OCEAN', answer: 'CANOE', height: 2.45, size: 0.9 },
  { id: 'g-whoever', at: [51, 15], wall: 'S', kind: 'split', clue: 'HOWEVER', answer: 'WHOEVER', height: 2.45, size: 0.9 },
  { id: 'g-outlook', at: [55, 15], wall: 'S', kind: 'split', clue: 'LOOKOUT', answer: 'OUTLOOK', height: 2.45, size: 0.9 },
  // Seesaw Room: the word on the low end; the answer is what balances it on the high end.
  { id: 's-down', at: [51, 1], wall: 'N', kind: 'seesaw', clue: 'UP', word: 'DOWN', answer: 'DOWN', rev: 2, height: 2.5, size: 0.9 },
  { id: 's-full', at: [53, 1], wall: 'N', kind: 'seesaw', clue: 'EMPTY', word: 'FULL', answer: 'FULL', height: 2.5, size: 0.9 },
  { id: 's-awake', at: [55, 1], wall: 'N', kind: 'seesaw', clue: 'ASLEEP', word: 'AWAKE', answer: 'AWAKE', height: 2.5, size: 0.9 },
  { id: 's-modern', at: [51, 7], wall: 'S', kind: 'seesaw', clue: 'ANCIENT', word: 'MODERN', answer: 'MODERN', height: 2.5, size: 0.9 },
  { id: 's-wide', at: [55, 7], wall: 'S', kind: 'seesaw', clue: 'NARROW', word: 'WIDE', answer: 'WIDE', height: 2.5, size: 0.9 },
  // the glasshouse (capstone): a seesaw, then the pool; and a cistern, then a seesaw
  { id: 'x-cod', at: [59, 1], wall: 'N', kind: 'seesaw', clue: 'HOT', word: 'COLD', sigils: ['pool'], answer: 'COD', height: 2.5, size: 0.9 },
  { id: 'x-boo', at: [61, 1], wall: 'N', kind: 'seesaw', clue: 'TOP', word: 'BOTTOM', sigils: ['pool'], answer: 'BOO', height: 2.5, size: 0.9 },
  { id: 'x-future', at: [60, 7], wall: 'S', kind: 'seesaw', pre: 'cistern', clue: 'SPAT', via: 'PAST', word: 'FUTURE', answer: 'FUTURE', noProp: true, height: 2.0, size: 1 },

  // Word hall. Every rune here is arbitrary: compare the panels that share one to work out what it does.
  // west end, rune 'tri': the word backwards
  { id: 'w-plug', at: [51, 17], wall: 'N', kind: 'mark', sigils: ['back'], clue: 'GULP', answer: 'PLUG', height: 1.9, size: 1 },
  { id: 'w-warts', at: [53, 17], wall: 'N', kind: 'mark', sigils: ['back'], clue: 'STRAW', answer: 'WARTS', height: 1.9, size: 1 },
  { id: 'w-reward', at: [50, 20], wall: 'W', kind: 'mark', sigils: ['back'], clue: 'DRAWER', answer: 'REWARD', height: 1.9, size: 1 },
  // middle, rune 'hour': same meaning
  { id: 'w-glad', at: [55, 17], wall: 'N', kind: 'chain', clue: 'HAPPY', steps: [['syn', 'GLAD']], answer: 'GLAD', height: 1.9, size: 1 },
  { id: 'w-big', at: [57, 17], wall: 'N', kind: 'chain', clue: 'LARGE', steps: [['syn', 'BIG']], answer: 'BIG', height: 1.9, size: 1 },
  { id: 'w-shut', at: [56, 23], wall: 'S', kind: 'chain', clue: 'CLOSED', steps: [['syn', 'SHUT']], answer: 'SHUT', height: 1.9, size: 1 },
  // east end, rune 'arch': what it is a kind of
  { id: 'w-tree', at: [59, 17], wall: 'N', kind: 'chain', clue: 'OAK', steps: [['kind', 'TREE']], answer: 'TREE', height: 1.9, size: 1 },
  { id: 'w-bird', at: [61, 17], wall: 'N', kind: 'chain', clue: 'SPARROW', steps: [['kind', 'BIRD']], answer: 'BIRD', height: 1.9, size: 1 },
  { id: 'w-tool', at: [62, 20], wall: 'E', kind: 'chain', clue: 'HAMMER', steps: [['kind', 'TOOL']], answer: 'TOOL', height: 1.9, size: 1 },
  { id: 'w-rect', at: [60, 23], wall: 'S', kind: 'chain', clue: 'SQUARE', steps: [['kind', 'RECTANGLE']], answer: 'RECTANGLE', height: 1.9, size: 1 },
  // Sound room, rune 'knot': sounds the same, spelled differently
  { id: 'e-night', at: [51, 25], wall: 'N', kind: 'chain', clue: 'KNIGHT', steps: [['echo', 'NIGHT']], answer: 'NIGHT', height: 1.9, size: 1 },
  { id: 'e-flower', at: [54, 25], wall: 'N', kind: 'chain', clue: 'FLOUR', steps: [['echo', 'FLOWER']], answer: 'FLOWER', height: 1.9, size: 1 },
  { id: 'e-week', at: [51, 31], wall: 'S', kind: 'chain', clue: 'WEAK', steps: [['echo', 'WEEK']], answer: 'WEEK', height: 1.9, size: 1 },
  { id: 'e-right', at: [54, 31], wall: 'S', kind: 'chain', clue: 'WRITE', steps: [['echo', 'RIGHT']], answer: 'RIGHT', height: 1.9, size: 1 },
  // sound room, west and east walls, rune 'bar': the opposite
  { id: 'o-short', at: [50, 27], wall: 'W', kind: 'chain', clue: 'TALL', steps: [['opp', 'SHORT']], answer: 'SHORT', height: 1.9, size: 1 },
  { id: 'o-light', at: [50, 29], wall: 'W', kind: 'chain', clue: 'DARK', steps: [['opp', 'LIGHT']], answer: 'LIGHT', height: 1.9, size: 1 },
  { id: 'o-lose', at: [55, 28], wall: 'E', kind: 'chain', clue: 'WIN', steps: [['opp', 'LOSE']], answer: 'LOSE', height: 1.9, size: 1 },
  // Mixed room: two runes, applied left to right
  { id: 'm-old', at: [58, 25], wall: 'N', kind: 'chain', clue: 'KNEW', steps: [['echo', 'NEW'], ['opp', 'OLD']], answer: 'OLD', height: 2.0, size: 1 },
  { id: 'm-go', at: [60, 25], wall: 'N', kind: 'chain', clue: 'GO', steps: [['opp', 'STOP'], ['back', 'POTS']], answer: 'POTS', height: 2.0, size: 1 },
  { id: 'm-pan', at: [62, 26], wall: 'E', kind: 'chain', clue: 'SNOOZE', steps: [['syn', 'NAP'], ['back', 'PAN']], answer: 'PAN', height: 2.0, size: 1 },
  { id: 'm-god', at: [62, 30], wall: 'E', kind: 'chain', clue: 'SPANIEL', steps: [['kind', 'DOG'], ['back', 'GOD']], answer: 'GOD', height: 2.0, size: 1 },
  { id: 'm-bottoms', at: [61, 31], wall: 'S', kind: 'chain', clue: 'SPOT', steps: [['back', 'TOPS'], ['opp', 'BOTTOMS']], answer: 'BOTTOMS', height: 2.0, size: 1 },
  { id: 'm-read', at: [59, 31], wall: 'S', kind: 'chain', clue: 'DEER', steps: [['back', 'REED'], ['echo', 'READ']], answer: 'READ', height: 2.0, size: 1 },
  { id: 'm-flower', at: [57, 31], wall: 'S', kind: 'chain', clue: 'ROWS', steps: [['echo', 'ROSE'], ['kind', 'FLOWER']], answer: 'FLOWER', height: 2.0, size: 1 },
  // Rune room: a new block (the word twice), then longer chains
  { id: 'q-dodo', at: [51, 33], wall: 'N', kind: 'mark', sigils: ['dup'], clue: 'DO', answer: 'DODO', height: 1.9, size: 1 },
  { id: 'q-yoyo', at: [53, 33], wall: 'N', kind: 'mark', sigils: ['dup'], clue: 'YO', answer: 'YOYO', height: 1.9, size: 1 },
  { id: 'q-cancan', at: [55, 33], wall: 'N', kind: 'mark', sigils: ['dup'], clue: 'CAN', answer: 'CANCAN', height: 1.9, size: 1 },
  { id: 'q-nono', at: [57, 33], wall: 'N', kind: 'chain', clue: 'KNOW', steps: [['echo', 'NO'], ['dup', 'NONO']], answer: 'NONO', height: 1.9, size: 1 },
  { id: 'q-byebye', at: [51, 38], wall: 'S', kind: 'chain', clue: 'FAREWELL', steps: [['syn', 'BYE'], ['dup', 'BYEBYE']], answer: 'BYEBYE', height: 1.9, size: 1 },
  { id: 'q-evil', at: [54, 38], wall: 'S', kind: 'chain', clue: 'DYE', steps: [['echo', 'DIE'], ['opp', 'LIVE'], ['back', 'EVIL']], answer: 'EVIL', height: 1.9, size: 1 },
  { id: 'q-one', at: [57, 38], wall: 'S', kind: 'chain', clue: 'THEN', steps: [['opp', 'NOW'], ['back', 'WON'], ['echo', 'ONE']], answer: 'ONE', height: 1.9, size: 1 },
  { id: 'q-flour', at: [60, 38], wall: 'S', kind: 'chain', clue: 'TULIP', steps: [['kind', 'FLOWER'], ['echo', 'FLOUR']], answer: 'FLOUR', height: 1.9, size: 1 },
];
