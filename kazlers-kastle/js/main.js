import * as THREE from 'three';
import { CELL, W, H, ROOMS, OPENINGS, DOORS, PANELS, POOLS, BASINS, MIRRORS, START, CAPSTONES } from './levels.js';
import { normalize } from './rules.js';
import { drawPanel, drawReflection, PW, PH, stoneTexture, floorTexture, woodTexture, grassTexture } from './draw.js';
import * as sfx from './audio.js';

// ---------------------------------------------------------------- save
const SAVE_KEY = 'kazlers-kastle-v1';
let solved = new Set();
try { solved = new Set(JSON.parse(localStorage.getItem(SAVE_KEY) || '{}').solved || []); } catch { /* fresh start */ }
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ solved: [...solved] })); } catch { /* ignore */ } };

// ---------------------------------------------------------------- grid
const FLOOR = 1, WALL = 0, DOOR = 2, POOL = 3, BASIN = 4, PROP = 5;
const grid = Array.from({ length: H }, () => new Array(W).fill(WALL));
const roomOf = Array.from({ length: H }, () => new Array(W).fill(null));
for (const r of ROOMS) for (let y = r.y[0]; y <= r.y[1]; y++) for (let x = r.x[0]; x <= r.x[1]; x++) { grid[y][x] = FLOOR; roomOf[y][x] = r; }
for (const [x, y] of OPENINGS) grid[y][x] = FLOOR;
for (const d of DOORS) grid[d.at[1]][d.at[0]] = DOOR;
for (const [x, y] of POOLS) grid[y][x] = POOL;
for (const [x, y] of BASINS) grid[y][x] = BASIN;
const roomById = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
const isSky = (x, y) => roomOf[y]?.[x]?.light === 'sky';
const cellCenter = (x, y) => new THREE.Vector3(x * CELL + CELL / 2, 0, y * CELL + CELL / 2);

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const FOG_SKY = new THREE.Color('#e8b98a');
const FOG_IN = new THREE.Color('#1a120c');
scene.fog = new THREE.Fog(FOG_SKY.clone(), 18, 70);
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 200);
scene.add(camera);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// sky dome: warm late-afternoon gradient
{
  const geo = new THREE.SphereGeometry(150, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { night: { value: 0 } },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vp; uniform float night;
      void main(){ float h = clamp(vp.y,0.0,1.0);
        vec3 day = mix(vec3(1.0,0.72,0.45), vec3(0.42,0.55,0.78), pow(h,0.6));
        vec3 dusk = mix(vec3(0.25,0.15,0.3), vec3(0.03,0.04,0.12), pow(h,0.5));
        vec3 c = mix(day, dusk, night);
        float star = step(0.9985, fract(sin(dot(floor(vp*300.0), vec3(12.9898,78.233,45.164)))*43758.5453));
        c += star * night * h;
        gl_FragColor = vec4(c,1.0); }`,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.position.set(24 * CELL, 0, 11 * CELL);
  scene.add(sky);
  scene.userData.sky = mat;
}

// ---------------------------------------------------------------- lights
const hemi = new THREE.HemisphereLight('#ffe2b8', '#4a3424', 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffc98a', 1.8);
sun.position.set(24 * CELL - 30, 40, 11 * CELL + 25);
sun.target.position.set(24 * CELL, 0, 11 * CELL);
scene.add(sun, sun.target);

const lantern = new THREE.PointLight('#ffb35c', 0, 15, 1.4);
lantern.position.set(0.25, -0.2, -0.3);
camera.add(lantern);
let lanternOn = true;

// a little lantern in view
const lanternProp = new THREE.Group();
{
  const brass = new THREE.MeshStandardMaterial({ color: '#8a6a32', metalness: 0.8, roughness: 0.35 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.03, 12), brass);
  top.position.y = 0.08;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 12), brass);
  base.position.y = -0.07;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16), brass);
  ring.position.y = 0.12;
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.13, 12), new THREE.MeshBasicMaterial({ color: '#ffcf87', transparent: true, opacity: 0.35 }));
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
  flame.scale.y = 1.6;
  lanternProp.add(top, base, ring, glass, flame);
  lanternProp.userData.flame = flame;
  lanternProp.userData.glass = glass;
  lanternProp.scale.setScalar(0.75);
  lanternProp.position.set(0.4, -0.33, -0.72);
  camera.add(lanternProp);
}

// sconces + a small pool of real lights that follow the nearest ones
const sconces = [];
const LIGHT_POOL = 5;
const poolLights = Array.from({ length: LIGHT_POOL }, () => {
  const l = new THREE.PointLight('#ff9f45', 0, 11, 1.3);
  scene.add(l);
  return l;
});

// ---------------------------------------------------------------- materials
const tex = (c, rx = 1, ry = 1) => {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
const stoneCanvas = stoneTexture();
const M = {
  wall: new THREE.MeshLambertMaterial({ map: tex(stoneCanvas) }),
  wallTall: new THREE.MeshLambertMaterial({ map: tex(stoneCanvas, 1, 3.5 / 2.25) }),
  floor: new THREE.MeshLambertMaterial({ map: tex(floorTexture()) }),
  court: new THREE.MeshLambertMaterial({ map: tex(floorTexture(512, 9, [184, 150, 110])) }),
  grass: new THREE.MeshLambertMaterial({ map: tex(grassTexture()) }),
  ceil: new THREE.MeshLambertMaterial({ map: tex(woodTexture()) }),
  wood: new THREE.MeshLambertMaterial({ map: tex(woodTexture(256, 4)) }),
  iron: new THREE.MeshStandardMaterial({ color: '#2b2522', metalness: 0.7, roughness: 0.5 }),
  water: new THREE.MeshPhongMaterial({ color: '#1d4a55', emissive: '#0b2a33', shininess: 90, transparent: true, opacity: 0.92 }),
  basin: new THREE.MeshLambertMaterial({ color: '#6d5640' }),
  rim: new THREE.MeshLambertMaterial({ map: tex(stoneTexture(256, 21, [170, 140, 104])) }),
  flame: new THREE.MeshBasicMaterial({ color: '#ffcf70' }),
  candle: new THREE.MeshLambertMaterial({ color: '#efe3c8' }),
  mirror: new THREE.MeshStandardMaterial({ color: '#c8ccd4', metalness: 0.9, roughness: 0.15 }),
};

// ---------------------------------------------------------------- build world
const INDOOR_H = 4.5, TALL_H = 7.5, DOOR_H = 3.1;
function nearSky(x, y) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (isSky(x + dx, y + dy)) return true;
  return false;
}
function nearOpen(x, y) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const v = grid[y + dy]?.[x + dx];
    if (v !== undefined && v !== WALL) return true;
  }
  return false;
}

{
  const wallCells = [], tallCells = [], floorCells = [], courtCells = [], ceilCells = [], merlons = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = grid[y][x];
    if (v === WALL) {
      if (!nearOpen(x, y)) continue;
      (nearSky(x, y) ? tallCells : wallCells).push([x, y]);
      if (nearSky(x, y)) merlons.push([x, y]);
    } else {
      if (v === FLOOR || v === DOOR) (isSky(x, y) ? courtCells : floorCells).push([x, y]);
      if (!isSky(x, y)) ceilCells.push([x, y]);
    }
  }
  const m4 = new THREE.Matrix4();
  const inst = (geo, mat, cells, fn) => {
    const im = new THREE.InstancedMesh(geo, mat, cells.length);
    cells.forEach((c, i) => { fn(m4, c); im.setMatrixAt(i, m4); });
    scene.add(im);
    return im;
  };
  inst(new THREE.BoxGeometry(CELL, INDOOR_H, CELL), M.wall, wallCells, (m, [x, y]) => m.makeTranslation(x * CELL + 1, INDOOR_H / 2, y * CELL + 1));
  inst(new THREE.BoxGeometry(CELL, TALL_H, CELL), M.wallTall, tallCells, (m, [x, y]) => m.makeTranslation(x * CELL + 1, TALL_H / 2, y * CELL + 1));
  inst(new THREE.BoxGeometry(0.9, 0.8, 0.9), M.wall, merlons, (m, [x, y]) => m.makeTranslation(x * CELL + 1, TALL_H + 0.4, y * CELL + 1));
  const plane = new THREE.PlaneGeometry(CELL, CELL).rotateX(-Math.PI / 2);
  inst(plane, M.floor, floorCells, (m, [x, y]) => m.makeTranslation(x * CELL + 1, 0, y * CELL + 1));
  inst(plane, M.court, courtCells, (m, [x, y]) => m.makeTranslation(x * CELL + 1, 0, y * CELL + 1));
  const ceil = new THREE.PlaneGeometry(CELL, CELL).rotateX(Math.PI / 2);
  inst(ceil, M.ceil, ceilCells, (m, [x, y]) => m.makeTranslation(x * CELL + 1, INDOOR_H, y * CELL + 1));

  // lintels over doors and openings
  const lintels = [...DOORS.map((d) => d.at), ...OPENINGS];
  for (const [x, y] of lintels) {
    const top = nearSky(x, y) ? TALL_H : INDOOR_H;
    const b = new THREE.Mesh(new THREE.BoxGeometry(CELL, top - DOOR_H, CELL), M.wall);
    b.position.set(x * CELL + 1, DOOR_H + (top - DOOR_H) / 2, y * CELL + 1);
    scene.add(b);
  }
}

// grass beds and a fountain in the courtyard
const courtProps = [];
{
  const bed = (x0, y0, x1, y1) => {
    const g = new THREE.Mesh(new THREE.BoxGeometry((x1 - x0 + 1) * CELL - 0.6, 0.12, (y1 - y0 + 1) * CELL - 0.6), M.grass);
    g.position.set(((x0 + x1 + 1) / 2) * CELL, 0.06, ((y0 + y1 + 1) / 2) * CELL);
    scene.add(g);
  };
  bed(21, 6, 22, 9); bed(26, 6, 27, 9); bed(21, 13, 22, 16); bed(26, 13, 27, 16);
  // fountain
  const c = cellCenter(24, 11).add(new THREE.Vector3(0, 0, 1));
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.6, 32), M.rim);
  basin.position.set(c.x, 0.3, c.z);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.0, 32).rotateX(-Math.PI / 2), M.water);
  water.position.set(c.x, 0.55, c.z);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.6, 12), M.rim);
  column.position.set(c.x, 0.8, c.z);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.3, 0.3, 20), M.rim);
  bowl.position.set(c.x, 1.65, c.z);
  scene.add(basin, water, column, bowl);
  courtProps.push({ x: c.x, z: c.z, r: 2.5 });
  // trees: a trunk and two soft cones
  const leaf = new THREE.MeshLambertMaterial({ color: '#6f7d34' });
  const leafHi = new THREE.MeshLambertMaterial({ color: '#97a046' });
  for (const [x, y] of [[21.5, 7.5], [26.5, 7.5], [21.5, 14.5], [26.5, 14.5]]) {
    const p = new THREE.Vector3(x * CELL + 1, 0, y * CELL + 1);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.6, 8), M.wood);
    trunk.position.set(p.x, 0.8, p.z);
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.2, 10), leaf);
    c1.position.set(p.x, 2.4, p.z);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 10), leafHi);
    c2.position.set(p.x, 3.4, p.z);
    scene.add(trunk, c1, c2);
    courtProps.push({ x: p.x, z: p.z, r: 0.5 });
  }
}

// braziers that light when a wing is complete
const braziers = {};
{
  const make = (key, x, z) => {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.45, 16), M.iron);
    bowl.position.y = 1.1;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.0, 8), M.iron);
    leg.position.y = 0.5;
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 10), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9 }));
    fire.position.y = 1.7; fire.visible = false;
    const light = new THREE.PointLight('#ff9a3c', 0, 14, 1.2);
    light.position.y = 2;
    g.add(bowl, leg, fire, light);
    g.position.set(x, 0, z);
    scene.add(g);
    braziers[key] = { fire, light, lit: false };
    courtProps.push({ x, z, r: 0.6 });
  };
  make('lantern', 19.5 * CELL + 1, 10 * CELL + 1);
  make('water', 28.5 * CELL - 1 + 2, 10 * CELL + 1);
}

// doors
const doors = DOORS.map((d) => {
  const [x, y] = d.at;
  const horiz = grid[y][x - 1] === WALL && grid[y][x + 1] === WALL; // wall runs east-west
  const g = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.BoxGeometry(horiz ? CELL : 0.35, DOOR_H, horiz ? 0.35 : CELL), M.wood);
  slab.position.y = DOOR_H / 2;
  g.add(slab);
  for (const yy of [0.6, DOOR_H - 0.6]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(horiz ? CELL + 0.02 : 0.38, 0.12, horiz ? 0.38 : CELL + 0.02), M.iron);
    band.position.y = yy;
    g.add(band);
  }
  g.position.set(x * CELL + 1, 0, y * CELL + 1);
  scene.add(g);
  return { ...d, mesh: g, open: false, t: 0 };
});

// sconces: on the walls of every warm room, plus the gatehouse
function addSconce(x, y, wall) {
  const c = cellCenter(x, y);
  const n = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[wall];
  const pos = new THREE.Vector3(c.x + n[0] * (CELL / 2 - 0.12), 2.6, c.z + n[1] * (CELL / 2 - 0.12));
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.18), M.iron);
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 10), M.candle);
  candle.position.y = 0.26;
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), M.flame);
  flame.scale.y = 1.7; flame.position.y = 0.44;
  g.add(plate, candle, flame);
  g.position.copy(pos);
  scene.add(g);
  sconces.push({ pos: pos.clone().add(new THREE.Vector3(-n[0] * 0.25, 0.45, -n[1] * 0.25)), flame });
}
const panelCells = new Set(PANELS.map((p) => `${p.at}:${p.wall}`));
for (const r of ROOMS) {
  if (r.light !== 'warm') continue;
  const spots = [
    [r.x[0], Math.round((r.y[0] + r.y[1]) / 2), 'W'], [r.x[1], Math.round((r.y[0] + r.y[1]) / 2), 'E'],
    [Math.round((r.x[0] + r.x[1]) / 2), r.y[0], 'N'], [Math.round((r.x[0] + r.x[1]) / 2), r.y[1], 'S'],
  ];
  for (const [x, y, w] of spots) {
    const n = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[w];
    if (grid[y + n[1]]?.[x + n[0]] !== WALL) continue;
    if (panelCells.has(`${x},${y}:${w}`)) continue;
    if (MIRRORS.some((m) => m.at[0] === x && m.at[1] === y && m.wall === w)) continue;
    addSconce(x, y, w);
  }
}
// torches on the courtyard walls, beside the wing doors
addSconce(19, 11, 'W'); addSconce(19, 13, 'W'); addSconce(29, 11, 'E'); addSconce(29, 13, 'E');

// pools and basins
const wallDir = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
const flatRot = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 };
function addBasin(x, y, withWater) {
  const c = cellCenter(x, y);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(CELL - 0.3, CELL - 0.3).rotateX(-Math.PI / 2), M.basin);
  inner.position.set(c.x, -0.45, c.z);
  scene.add(inner);
  for (const [dx, dz, w, d] of [[0, -0.92, CELL, 0.16], [0, 0.92, CELL, 0.16], [-0.92, 0, 0.16, CELL], [0.92, 0, 0.16, CELL]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), M.rim);
    r.position.set(c.x + dx, -0.22, c.z + dz);
    scene.add(r);
  }
  if (withWater) {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(CELL - 0.3, CELL - 0.3).rotateX(-Math.PI / 2), M.water);
    water.position.set(c.x, -0.12, c.z);
    scene.add(water);
  }
}
for (const [x, y] of POOLS) addBasin(x, y, true);
for (const [x, y] of BASINS) addBasin(x, y, false);

// ---------------------------------------------------------------- panels
const panels = PANELS.map((p) => {
  const cvs = document.createElement('canvas');
  cvs.width = PW; cvs.height = PH;
  const t = new THREE.CanvasTexture(cvs);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0625), mat);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.22, 0.08), M.wood);
  const c = cellCenter(...p.at);
  const n = wallDir[p.wall];
  const rot = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 }[p.wall];
  const edge = CELL / 2;
  mesh.position.set(c.x + n[0] * (edge - 0.1), 1.75, c.z + n[1] * (edge - 0.1));
  frame.position.set(c.x + n[0] * (edge - 0.03), 1.75, c.z + n[1] * (edge - 0.03));
  mesh.rotation.y = rot; frame.rotation.y = rot;
  scene.add(frame, mesh);
  const panel = { def: p, mesh, ctx: cvs.getContext('2d'), tex: t, input: '', key: '', wrongUntil: 0, room: roomOf[p.at[1]][p.at[0]] };
  mesh.userData.panel = panel;

  // reflections that show this panel
  panel.reflections = [];
  if (p.show === 'pool') {
    const rc = document.createElement('canvas'); rc.width = PW; rc.height = PH;
    drawReflection(rc.getContext('2d'), p.clue, 'pool');
    const rt = new THREE.CanvasTexture(rc); rt.colorSpace = THREE.SRGBColorSpace; rt.anisotropy = 8;
    const rm = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 1.1), new THREE.MeshBasicMaterial({ map: rt, transparent: true, toneMapped: false, depthWrite: false }));
    rm.rotation.set(-Math.PI / 2, 0, flatRot[p.wall]);
    rm.position.set(c.x, -0.11, c.z);
    scene.add(rm);
  }
  return panel;
});
const panelById = Object.fromEntries(panels.map((p) => [p.def.id, p]));

for (const m of MIRRORS) {
  const p = panelById[m.panel].def;
  const c = cellCenter(...m.at);
  const n = wallDir[m.wall];
  const rot = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 }[m.wall];
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.3, 0.06), M.mirror);
  back.position.set(c.x + n[0] * (CELL / 2 - 0.03), 1.75, c.z + n[1] * (CELL / 2 - 0.03));
  back.rotation.y = rot;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.02, 1.42, 0.04), M.wood);
  frame.position.set(c.x + n[0] * (CELL / 2 - 0.01), 1.75, c.z + n[1] * (CELL / 2 - 0.01));
  frame.rotation.y = rot;
  const rc = document.createElement('canvas'); rc.width = PW; rc.height = PH;
  const g = rc.getContext('2d');
  drawReflection(g, p.clue, 'mirror');
  const rt = new THREE.CanvasTexture(rc); rt.colorSpace = THREE.SRGBColorSpace; rt.anisotropy = 8;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.0625), new THREE.MeshBasicMaterial({ map: rt, transparent: true, toneMapped: false }));
  face.position.set(c.x + n[0] * (CELL / 2 - 0.075), 1.75, c.z + n[1] * (CELL / 2 - 0.075));
  face.rotation.y = rot;
  scene.add(frame, back, face);
}

// ---------------------------------------------------------------- player
const player = { x: 0, z: 0, yaw: 0, pitch: 0, bob: 0 };
{
  const c = cellCenter(...START.at);
  player.x = c.x; player.z = c.z;
  player.yaw = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 }[START.facing];
}
const RADIUS = 0.32, EYE = 1.65;
const keys = new Set();

function blockedCell(x, y) {
  const v = grid[y]?.[x];
  if (v === undefined || v === WALL || v === POOL || v === BASIN || v === PROP) return true;
  if (v === DOOR) { const d = doors.find((dd) => dd.at[0] === x && dd.at[1] === y); return !d.open; }
  return false;
}
function collides(px, pz) {
  const x0 = Math.floor((px - RADIUS) / CELL), x1 = Math.floor((px + RADIUS) / CELL);
  const y0 = Math.floor((pz - RADIUS) / CELL), y1 = Math.floor((pz + RADIUS) / CELL);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!blockedCell(x, y)) continue;
    const nx = Math.max(x * CELL, Math.min(px, x * CELL + CELL));
    const nz = Math.max(y * CELL, Math.min(pz, y * CELL + CELL));
    if ((px - nx) ** 2 + (pz - nz) ** 2 < RADIUS * RADIUS) return true;
  }
  for (const p of courtProps) if ((px - p.x) ** 2 + (pz - p.z) ** 2 < (p.r + RADIUS) ** 2) return true;
  return false;
}

// ---------------------------------------------------------------- input
const overlay = document.getElementById('overlay');
const crosshair = document.getElementById('crosshair');
let locked = false;
let focus = null;   // panel being written on
let hover = null;   // panel under the crosshair

canvas.addEventListener('click', () => { if (!locked && !ended) canvas.requestPointerLock(); });
overlay.addEventListener('click', (e) => {
  if (e.target.closest('button')) return;
  sfx.unlockAudio();
  canvas.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  overlay.classList.toggle('hidden', locked || ended);
  if (!locked) setFocus(null);
});
document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('Forget every solved panel and start again?')) return;
  solved.clear(); save(); location.reload();
});

document.addEventListener('mousemove', (e) => {
  if (!locked) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - e.movementY * 0.0022));
});
document.addEventListener('mousedown', (e) => {
  if (!locked) return;
  if (e.button === 2) { toggleLantern(); return; }
  if (e.button !== 0) return;
  if (hover && hover !== focus && canWrite(hover)) setFocus(hover);
  else if (!hover) setFocus(null);
});
document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('keydown', (e) => {
  if (!locked) return;
  if (focus) {
    if (e.key === 'Enter') { submit(focus); e.preventDefault(); return; }
    if (e.key === 'Backspace') { focus.input = focus.input.slice(0, -1); e.preventDefault(); return; }
    if (e.key === 'Tab') { setFocus(null); e.preventDefault(); return; }
    if (/^[a-zA-Z]$/.test(e.key)) { if (focus.input.length < 14) focus.input += e.key.toUpperCase(); sfx.click(); return; }
    return;
  }
  keys.add(e.code);
  if (e.code === 'KeyF') toggleLantern();
  if (e.code === 'KeyE' && hover && canWrite(hover)) setFocus(hover);
});
document.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

const canWrite = (p) => !p.def.ghost && !solved.has(p.def.id);
function setFocus(p) {
  if (focus === p) return;
  focus = p;
  keys.clear();
  crosshair.classList.toggle('writing', !!p);
}

// ---------------------------------------------------------------- lantern + regions
let region = roomOf[START.at[1]][START.at[0]];
function lanternBlocked() { return !!region?.noLantern; }
function toggleLantern() {
  if (lanternBlocked()) { sfx.fizzle(); flicker = 0.4; return; }
  lanternOn = !lanternOn;
  sfx.click();
}
let flicker = 0;
const panelDark = (p) => p.def.kind === 'ink' && p.room.light === 'dark' && !(lanternOn && !lanternBlocked());

// ---------------------------------------------------------------- solving
const sparkles = [];
function submit(p) {
  if (!p.input) return;
  if (normalize(p.input) === normalize(p.def.answer)) {
    solved.add(p.def.id);
    save();
    sfx.chime();
    burst(p.mesh.position, p.mesh.getWorldDirection(new THREE.Vector3()));
    setFocus(null);
    checkProgress(true);
    if (p.def.final) setTimeout(finish, 1200);
  } else {
    sfx.thud();
    p.wrongUntil = performance.now() + 450;
    p.input = '';
  }
}

function burst(pos, normal) {
  const geo = new THREE.BufferGeometry();
  const n = 40;
  const arr = new Float32Array(n * 3);
  const vel = [];
  for (let i = 0; i < n; i++) {
    arr.set([pos.x + normal.x * 0.1, pos.y, pos.z + normal.z * 0.1], i * 3);
    vel.push(new THREE.Vector3((Math.random() - 0.5) * 2 + normal.x * 2, Math.random() * 2.2, (Math.random() - 0.5) * 2 + normal.z * 2));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffd27a', size: 0.06, transparent: true, toneMapped: false }));
  scene.add(pts);
  sparkles.push({ pts, vel, life: 1.2 });
}

function checkProgress(animate) {
  for (const d of doors) {
    if (!d.open && d.requires.every((r) => solved.has(r))) {
      d.open = true;
      if (animate) { sfx.rumble(); } else { d.t = 1; }
    }
  }
  for (const k in CAPSTONES) {
    const b = braziers[k];
    if (!b.lit && CAPSTONES[k].every((r) => solved.has(r))) {
      b.lit = true;
      b.fire.visible = true;
      b.light.intensity = 30;
    }
  }
}
checkProgress(false);

let ended = false;
function finish() {
  ended = true;
  sfx.fanfare();
  document.exitPointerLock?.();
  document.getElementById('ending').classList.remove('hidden');
  overlay.classList.add('hidden');
  night = 1;
}
document.getElementById('keep').addEventListener('click', () => {
  ended = false;
  document.getElementById('ending').classList.add('hidden');
  canvas.requestPointerLock();
});
let night = solved.has('final') ? 1 : 0;

// ---------------------------------------------------------------- loop
const ray = new THREE.Raycaster();
ray.far = 5;
const panelMeshes = panels.map((p) => p.mesh);
const clock = new THREE.Clock();
let lightTimer = 0;
const tmp = new THREE.Vector3();

const target = { hemi: 0.9, sun: 1.8, fog: FOG_SKY.clone(), near: 18, far: 70 };
function updateRegion() {
  const cx = Math.floor(player.x / CELL), cy = Math.floor(player.z / CELL);
  const r = roomOf[cy]?.[cx];
  if (r && r !== region) region = r;
  const L = region?.light || 'warm';
  if (L === 'sky') { target.hemi = 0.95 - night * 0.6; target.sun = 1.9 * (1 - night); target.fog.copy(FOG_SKY).lerp(new THREE.Color('#1b1a2e'), night); target.near = 18; target.far = 75; }
  else if (L === 'warm') { target.hemi = 0.22; target.sun = 0; target.fog.copy(FOG_IN); target.near = 6; target.far = 30; }
  else { target.hemi = 0.012; target.sun = 0; target.fog.set('#050406'); target.near = 3; target.far = 18; }
}

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  // move
  if (locked && !focus) {
    const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    if (f || s) {
      const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 7 : 4.2) * dt;
      const len = Math.hypot(f, s);
      const dx = (-Math.sin(player.yaw) * f + Math.cos(player.yaw) * s) / len * speed;
      const dz = (-Math.cos(player.yaw) * f - Math.sin(player.yaw) * s) / len * speed;
      if (!collides(player.x + dx, player.z)) player.x += dx;
      if (!collides(player.x, player.z + dz)) player.z += dz;
      player.bob += dt * 9;
    }
  }
  camera.position.set(player.x, EYE + Math.sin(player.bob) * 0.035, player.z);
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  updateRegion();

  // lights
  const k = 1 - Math.exp(-dt * 3);
  hemi.intensity += (target.hemi - hemi.intensity) * k;
  sun.intensity += (target.sun - sun.intensity) * k;
  scene.fog.color.lerp(target.fog, k);
  scene.fog.near += (target.near - scene.fog.near) * k;
  scene.fog.far += (target.far - scene.fog.far) * k;
  scene.userData.sky.uniforms.night.value += (night - scene.userData.sky.uniforms.night.value) * k * 0.4;
  const on = lanternOn && !lanternBlocked();
  flicker = Math.max(0, flicker - dt);
  const flick = 0.92 + Math.sin(now * 0.011) * 0.04 + Math.sin(now * 0.037) * 0.03;
  lantern.intensity = on ? 9 * flick : (flicker > 0 ? 3 * Math.random() : 0);
  lanternProp.userData.flame.visible = on || flicker > 0;
  lanternProp.userData.glass.material.opacity = on ? 0.4 : 0.12;
  lanternProp.position.y = -0.33 + Math.sin(player.bob) * 0.012;

  lightTimer -= dt;
  if (lightTimer <= 0) {
    lightTimer = 0.25;
    const near = sconces.map((s) => [s, s.pos.distanceToSquared(camera.position)]).sort((a, b) => a[1] - b[1]).slice(0, LIGHT_POOL);
    poolLights.forEach((l, i) => {
      const s = near[i];
      if (s && s[1] < 26 * 26) { l.position.copy(s[0].pos); l.userData.on = true; } else l.userData.on = false;
    });
  }
  poolLights.forEach((l, i) => { l.intensity = l.userData.on ? 7 * (0.9 + Math.sin(now * 0.013 + i * 2) * 0.06 + Math.sin(now * 0.041 + i) * 0.04) : 0; });
  for (const s of sconces) s.flame.scale.set(1, 1.6 + Math.sin(now * 0.02 + s.pos.x) * 0.2, 1);
  for (const b of Object.values(braziers)) if (b.lit) { b.fire.scale.y = 1 + Math.sin(now * 0.015) * 0.12; b.light.intensity = 30 + Math.sin(now * 0.02) * 4; }

  // doors
  for (const d of doors) {
    if (d.open && d.t < 1) d.t = Math.min(1, d.t + dt * 0.8);
    d.mesh.position.y = -DOOR_H * d.t * d.t * (3 - 2 * d.t) - 0.01 * (d.t > 0);
    d.mesh.visible = d.t < 1;
  }

  // aim
  hover = null;
  if (locked) {
    ray.setFromCamera({ x: 0, y: 0 }, camera);
    const hit = ray.intersectObjects(panelMeshes, false)[0];
    if (hit) hover = hit.object.userData.panel;
  }
  if (focus && hover !== focus) setFocus(null);
  crosshair.classList.toggle('active', !!hover && canWrite(hover));

  // panels
  const caret = Math.floor(now / 500) % 2 === 0;
  for (const p of panels) {
    const st = {
      dark: panelDark(p), solved: solved.has(p.def.id), input: p.input,
      focused: focus === p, hover: hover === p && canWrite(p), wrong: now < p.wrongUntil, caret: focus === p && caret,
    };
    const key = JSON.stringify(st);
    if (key !== p.key) {
      p.key = key;
      drawPanel(p.ctx, p.def, st);
      p.tex.needsUpdate = true;
    }
  }

  // sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.life -= dt;
    const a = s.pts.geometry.attributes.position;
    s.vel.forEach((v, j) => {
      v.y -= dt * 3;
      a.setXYZ(j, a.getX(j) + v.x * dt, a.getY(j) + v.y * dt, a.getZ(j) + v.z * dt);
    });
    a.needsUpdate = true;
    s.pts.material.opacity = Math.max(0, s.life / 1.2);
    if (s.life <= 0) { scene.remove(s.pts); s.pts.geometry.dispose(); sparkles.splice(i, 1); }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// for automated checks
window.__kastle = { player, panels, doors, solved, get region() { return region?.id; }, get lanternOn() { return lanternOn; }, toggleLantern, submit, setFocus, camera };
document.body.classList.add('ready');
