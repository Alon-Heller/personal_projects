// Checks that every panel's stated answer follows from its rules,
// and that the map and doors are consistent. Run: node tools/verify.mjs
import { derive, normalize } from '../js/rules.js';
import { PANELS, DOORS, ROOMS, W, H, POOLS, BASINS, MIRRORS, CAPSTONES, WALL_MIRRORS } from '../js/levels.js';

let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };
const ids = new Set();

for (const p of PANELS) {
  if (ids.has(p.id)) fail(`duplicate id ${p.id}`);
  ids.add(p.id);
  const got = derive(p);
  if (normalize(got) !== normalize(p.answer)) fail(`${p.id}: rules give ${got}, answer is ${p.answer}`);
  if (p.glow && p.glow.some((i) => i >= normalize(p.clue).length)) fail(`${p.id}: glow mask longer than clue`);
}

const inRoom = ([x, y]) => ROOMS.some((r) => x >= r.x[0] && x <= r.x[1] && y >= r.y[0] && y <= r.y[1]);
for (const p of PANELS) {
  if (!inRoom(p.at)) fail(`${p.id}: cell ${p.at} is not inside a room`);
  const [x, y] = p.at;
  const back = { N: [x, y - 1], S: [x, y + 1], W: [x - 1, y], E: [x + 1, y] }[p.wall];
  if (inRoom(back)) fail(`${p.id}: the wall behind it at ${back} is open floor`);
}
for (const d of DOORS) for (const r of d.requires) if (!ids.has(r)) fail(`door ${d.id} needs unknown panel ${r}`);
for (const k in CAPSTONES) for (const r of CAPSTONES[k]) if (!ids.has(r)) fail(`capstone ${k} unknown ${r}`);
for (const m of MIRRORS) if (!ids.has(m.panel)) fail(`mirror shows unknown ${m.panel}`);
for (const c of [...POOLS, ...BASINS]) if (!inRoom(c)) fail(`pool/basin ${c} outside rooms`);
for (const m of WALL_MIRRORS) if (!inRoom(m.at)) fail(`wall mirror ${m.at} not in a room`);
for (const p of PANELS) if (p.kind === 'nest' && p.chain.filter((c) => c === null).length !== 1) fail(`${p.id}: a nest needs exactly one blank box`);
for (const p of PANELS) if (p.prop && !inRoom(p.prop)) fail(`${p.id}: prop ${p.prop} outside rooms`);
for (const r of ROOMS) if (r.x[1] >= W - 1 || r.y[1] >= H - 1 || r.x[0] < 1 || r.y[0] < 1) fail(`room ${r.id} touches the edge`);

const solvable = PANELS.filter((p) => !p.ghost).length;
console.log(`${PANELS.length} panels (${solvable} to solve), ${DOORS.length} doors.`);
if (bad) { console.log(`${bad} problem(s).`); process.exit(1); }
console.log('All panels check out.');
