import * as THREE from 'three';
import { Reflector } from 'three/addons/Reflector.js';
import { CELL, W, H, ROOMS, OPENINGS, DOORS, PANELS, POOLS, BASINS, MIRRORS, START, CAPSTONES } from './levels.js';
import { normalize } from './rules.js';
import { drawPanel, PW, PH, stoneTexture, floorTexture, woodTexture, grassTexture, doorTexture } from './draw.js';
import * as sfx from './audio.js';
import { makeTable, updateTable, makeRibbonProp } from './props.js';

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
  door: new THREE.MeshLambertMaterial({ map: tex(doorTexture()) }),
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
  make('banquet', 21 * CELL + 1, 17 * CELL + 1);
  make('solar', 27 * CELL + 1, 17 * CELL + 1);
}

// doors
const doors = DOORS.map((d) => {
  const [x, y] = d.at;
  const horiz = grid[y][x - 1] === WALL && grid[y][x + 1] === WALL; // wall runs east-west
  const g = new THREE.Group();
  // planks on both faces, plain wood on the edges
  const faces = horiz ? [M.wood, M.wood, M.wood, M.wood, M.door, M.door] : [M.door, M.door, M.wood, M.wood, M.wood, M.wood];
  const slab = new THREE.Mesh(new THREE.BoxGeometry(horiz ? CELL : 0.3, DOOR_H, horiz ? 0.3 : CELL), faces);
  slab.position.y = DOOR_H / 2;
  g.add(slab);
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
  const k = p.size || 1;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.7 * k, 1.0625 * k), mat);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7 * k + 0.16, 1.0625 * k + 0.16, 0.08), M.wood);
  const c = cellCenter(...p.at);
  const n = wallDir[p.wall];
  const rot = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 }[p.wall];
  const edge = CELL / 2;
  const py = p.height || 1.75;
  mesh.position.set(c.x + n[0] * (edge - 0.1), py, c.z + n[1] * (edge - 0.1));
  frame.position.set(c.x + n[0] * (edge - 0.03), py, c.z + n[1] * (edge - 0.03));
  mesh.rotation.y = rot; frame.rotation.y = rot;
  scene.add(frame, mesh);
  const panel = { def: p, mesh, ctx: cvs.getContext('2d'), tex: t, input: '', key: '', wrongUntil: 0, room: roomOf[p.at[1]][p.at[0]] };
  mesh.userData.panel = panel;

  return panel;
});
const panelById = Object.fromEntries(panels.map((p) => [p.def.id, p]));

// keyboard tables and ribbon props
const obstacles = [];
const tables = [];
for (const p of panels) {
  const d = p.def;
  if (d.kind === 'tilt') {
    const t = makeTable(scene, M, d, d.at[0] * CELL + 1, d.at[1] * CELL);
    t.room = p.room;
    tables.push(t);
    obstacles.push(t.box);
    if (t.lever) for (const h of t.lever.userData.hits) h.userData.table = t;
  }
  if (d.kind === 'ribbon') {
    const [x, y] = d.prop;
    makeRibbonProp(scene, M, d, x * CELL + 1, y * CELL + 1);
    grid[y][x] = PROP;
  }
}
const leverHits = tables.filter((t) => t.lever).flatMap((t) => t.lever.userData.hits);

// ---------------------------------------------------------------- real reflections
// Every pool and mirror renders the scene again from a mirrored camera.
// Layer 1 = the player's body (seen only in reflections), layer 2 = first-person lantern (never reflected).
const reflectors = [];
const rippleShader = {
  name: 'PoolShader',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, time: { value: 0 } },
  vertexShader: Reflector.ReflectorShader.vertexShader,
  fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; uniform float time; varying vec4 vUv;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      vec4 uv = vUv;
      vec2 p = uv.xy / uv.w;
      uv.xy += vec2(sin(p.y * 90.0 + time * 1.7), cos(p.x * 70.0 + time * 1.3)) * 0.0016 * uv.w;
      vec3 base = texture2DProj(tDiffuse, uv).rgb;
      gl_FragColor = vec4(mix(base * color, vec3(0.04, 0.13, 0.15), 0.18), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};
const mirrorShader = {
  name: 'MirrorShader',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null } },
  vertexShader: Reflector.ReflectorShader.vertexShader,
  fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; varying vec4 vUv;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      gl_FragColor = vec4(texture2DProj(tDiffuse, vUv).rgb * color, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};
let reflecting = false;
function makeReflector(geo, opts, fallback) {
  const r = new Reflector(geo, { clipBias: 0.003, multisample: 4, ...opts });
  r.camera.layers.enable(1);
  r.camera.layers.disable(2);
  const draw = r.onBeforeRender;
  r.onBeforeRender = function (...args) {
    if (reflecting) return; // never render a reflection inside a reflection
    reflecting = true; draw.apply(this, args); reflecting = false;
  };
  r.userData.fallback = fallback;
  reflectors.push(r);
  scene.add(r);
  return r;
}
const RES = Math.min(window.devicePixelRatio, 2);
for (const [x, y] of POOLS) {
  const c = cellCenter(x, y);
  const r = makeReflector(new THREE.PlaneGeometry(CELL - 0.3, CELL - 0.3),
    { color: '#b9d6d2', textureWidth: 768 * RES, textureHeight: 768 * RES, shader: rippleShader }, null);
  r.rotation.x = -Math.PI / 2;
  r.position.set(c.x, -0.11, c.z);
}
for (const m of MIRRORS) {
  const c = cellCenter(...m.at);
  const rot = { N: Math.PI, S: 0, W: -Math.PI / 2, E: Math.PI / 2 }[m.facing]; // glass faces `facing`
  const g = new THREE.Group();
  const MH = 2.0, MY = 1.9;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, MH + 0.2, 0.12), M.wood);
  frame.position.y = MY;
  const legs = [-0.85, 0.85].map((dx) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.5), M.wood); l.position.set(dx, 0.4, 0); return l; });
  const fallback = new THREE.Mesh(new THREE.PlaneGeometry(1.8, MH), M.mirror);
  fallback.position.set(0, MY, 0.065);
  g.add(frame, ...legs, fallback);
  g.position.set(c.x, 0, c.z);
  g.rotation.y = rot;
  scene.add(g);
  const r = makeReflector(new THREE.PlaneGeometry(1.8, MH),
    { color: '#ece6dc', textureWidth: 900 * RES, textureHeight: 1000 * RES, shader: mirrorShader }, fallback);
  r.position.set(c.x, MY, c.z).add(new THREE.Vector3(0, 0, 0.07).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot));
  r.rotation.y = rot;
  grid[m.at[1]][m.at[0]] = PROP;
}

// ---------------------------------------------------------------- the wanderer (you, as seen in reflections)
const body = new THREE.Group();
{
  const cloak = new THREE.MeshLambertMaterial({ color: '#8a3b26' });
  const inner = new THREE.MeshLambertMaterial({ color: '#1a120e' });
  const scarf = new THREE.MeshLambertMaterial({ color: '#d29a2e' });
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.45, 18, 1, true), cloak);
  robe.position.y = 0.72;
  const hem = new THREE.Mesh(new THREE.CircleGeometry(0.42, 18).rotateX(Math.PI / 2), inner);
  hem.position.y = 0.0;
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), cloak);
  hood.position.y = 1.62; hood.scale.set(1, 1.08, 1.05);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 12), cloak);
  tip.position.set(0, 1.78, 0.14); tip.rotation.x = 0.9;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), inner);
  face.position.set(0, 1.6, -0.1); face.scale.set(1, 1.05, 0.8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#ffd27a' });
  const eyes = [-0.06, 0.06].map((dx) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), eyeMat); e.position.set(dx, 1.63, -0.235); e.scale.y = 1.4; return e; });
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 8, 18), scarf);
  band.position.y = 1.42; band.rotation.x = Math.PI / 2;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.04), scarf);
  tail.position.set(0.1, 1.24, -0.2); tail.rotation.z = 0.15;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.55, 8), cloak);
  arm.position.set(0.3, 1.12, -0.12); arm.rotation.x = 0.5;
  // the lantern in hand
  const held = new THREE.Group();
  const brass = new THREE.MeshLambertMaterial({ color: '#9a7638' });
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), new THREE.MeshBasicMaterial({ color: '#ffcf87', transparent: true, opacity: 0.5 }));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.05, 10), brass);
  cap.position.y = 0.1;
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
  held.add(cage, cap, flame);
  held.position.set(0.34, 0.86, -0.3);
  body.add(robe, hem, hood, tip, face, ...eyes, band, tail, arm, held);
  body.userData = { held: flame, cage };
  body.traverse((o) => o.layers.set(1));
  scene.add(body);
}
camera.layers.enable(2);
lanternProp.traverse((o) => o.layers.set(2));

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
  for (const b of obstacles) {
    const nx = Math.max(b.x0, Math.min(px, b.x1)), nz = Math.max(b.z0, Math.min(pz, b.z1));
    if ((px - nx) ** 2 + (pz - nz) ** 2 < RADIUS * RADIUS) return true;
  }
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
  if (hoverLever) { pullLever(hoverLever); return; }
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
    if (/^[a-zA-Z]$/.test(e.key)) { if (focus.input.length < normalize(focus.def.answer).length) { focus.input += e.key.toUpperCase(); sfx.click(); } return; }
    return;
  }
  keys.add(e.code);
  if (e.code === 'KeyF') toggleLantern();
  if (e.code === 'KeyH') showWay();
  if (e.code === 'KeyE' && hoverLever) pullLever(hoverLever);
  else if (e.code === 'KeyE' && hover && canWrite(hover)) setFocus(hover);
});
document.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

let hoverLever = null;
function pullLever(t) {
  if (t.def.ghost) return;
  t.target = t.target ? 0 : t.def.tilt;
  sfx.click(); sfx.creak();
}
const canWrite = (p) => !p.def.ghost && !solved.has(p.def.id);
function setFocus(p) {
  if (focus === p) return;
  focus = p;
  keys.clear();
  crosshair.classList.toggle('writing', !!p);
  document.body.classList.toggle('writing', !!p);
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
const panelDark = (p) => !!p.def.glow && p.room.light === 'dark' && !(lanternOn && !lanternBlocked());

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
    const wings = Object.values(CAPSTONES).filter((ids) => ids.every((r) => solved.has(r))).length;
    if (!d.open && d.requires.every((r) => solved.has(r)) && wings >= (d.capstones || 0)) {
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

// ---------------------------------------------------------------- way-finding (H)
// Walk the grid (open doors only) from the player to the nearest reachable unsolved panel,
// then flash a short trail of arrows on the floor along that route.
const WAY_TIME = 3.2, WAY_N = 6;
const arrowShape = new THREE.Shape();
arrowShape.moveTo(0, 0.55); arrowShape.lineTo(0.42, 0.05); arrowShape.lineTo(0.16, 0.05); arrowShape.lineTo(0.16, -0.45);
arrowShape.lineTo(-0.16, -0.45); arrowShape.lineTo(-0.16, 0.05); arrowShape.lineTo(-0.42, 0.05); arrowShape.closePath();
const arrowGeo = new THREE.ShapeGeometry(arrowShape).rotateX(-Math.PI / 2);
const wayArrows = Array.from({ length: WAY_N }, (_, i) => {
  const a = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  a.visible = false; a.userData.i = i;
  scene.add(a);
  return a;
});
const walkable = (x, y) => {
  const v = grid[y]?.[x];
  if (v === FLOOR) return true;
  if (v === DOOR) return doors.find((d) => d.at[0] === x && d.at[1] === y).open;
  return false;
};
function showWay() {
  const sx = Math.floor(player.x / CELL), sy = Math.floor(player.z / CELL);
  // goal cells: where you stand to work on each unsolved panel
  const goals = new Map();
  for (const p of panels) {
    if (p.def.ghost || solved.has(p.def.id)) continue;
    const [x, y] = p.def.at;
    for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) if (walkable(x + dx, y + dy)) goals.set(`${x + dx},${y + dy}`, p);
  }
  const prev = new Map([[`${sx},${sy}`, null]]);
  const queue = [[sx, sy]];
  let end = null;
  while (queue.length) {
    const [x, y] = queue.shift();
    if (goals.has(`${x},${y}`)) { end = [x, y]; break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (prev.has(k) || !walkable(nx, ny)) continue;
      prev.set(k, [x, y]);
      queue.push([nx, ny]);
    }
  }
  if (!end) { sfx.fizzle(); return; }
  const path = [];
  for (let c = end; c; c = prev.get(`${c[0]},${c[1]}`)) path.unshift(c);
  // points along the route: the player, then cell centres; the last arrow points at the panel itself
  const target = goals.get(`${end[0]},${end[1]}`).mesh.position;
  const pts = [new THREE.Vector3(player.x, 0, player.z), ...path.slice(1).map(([x, y]) => cellCenter(x, y)), new THREE.Vector3(target.x, 0, target.z)];
  // place arrows every ~1.6 m along that polyline
  let placed = 0, dist = 1.2;
  for (let i = 0; i < pts.length - 1 && placed < WAY_N; i++) {
    const a = pts[i], b = pts[i + 1], seg = a.distanceTo(b);
    while (dist <= seg && placed < WAY_N) {
      const p = a.clone().lerp(b, dist / seg);
      const arrow = wayArrows[placed];
      arrow.position.set(p.x, 0.03, p.z);
      arrow.rotation.y = Math.atan2(-(b.x - a.x), -(b.z - a.z));
      arrow.userData.life = WAY_TIME; arrow.userData.delay = placed * 0.12;
      arrow.visible = true;
      placed++; dist += 1.6;
    }
    dist -= seg;
  }
  for (let i = placed; i < WAY_N; i++) wayArrows[i].visible = false;
  sfx.click();
}

// ---------------------------------------------------------------- loop
const ray = new THREE.Raycaster();
ray.far = 7;
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
  else if (L === 'bright') { target.hemi = 0.7; target.sun = 0; target.fog.set('#3a2a1c'); target.near = 10; target.far = 45; }
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

  // body + reflections
  body.position.set(player.x, Math.abs(Math.sin(player.bob)) * 0.03, player.z);
  body.rotation.y = player.yaw;
  body.userData.held.visible = on;
  body.userData.cage.material.opacity = on ? 0.55 : 0.15;
  rippleShader.time = (rippleShader.time || 0) + dt;
  for (const r of reflectors) {
    const near = r.position.distanceToSquared(camera.position) < 15 * 15;
    r.visible = near;
    if (r.userData.fallback) r.userData.fallback.visible = !near;
    if (r.material.uniforms.time) r.material.uniforms.time.value = rippleShader.time;
  }

  // doors
  for (const d of doors) {
    if (d.open && d.t < 1) d.t = Math.min(1, d.t + dt * 0.8);
    d.mesh.position.y = -DOOR_H * d.t * d.t * (3 - 2 * d.t) - 0.01 * (d.t > 0);
    d.mesh.visible = d.t < 1;
  }

  // aim
  hover = null; hoverLever = null;
  if (locked) {
    ray.setFromCamera({ x: 0, y: 0 }, camera);
    const hit = ray.intersectObjects([...panelMeshes, ...leverHits], false)[0];
    if (hit && hit.distance < 4.5 && hit.object.userData.table) hoverLever = hit.object.userData.table;
    else if (hit && hit.object.userData.panel) hover = hit.object.userData.panel;
  }
  if (focus && hover !== focus) setFocus(null);
  crosshair.classList.toggle('active', (!!hover && canWrite(hover)) || (!!hoverLever && !hoverLever.def.ghost));
  for (const t of tables) updateTable(t, dt, t.room.light === 'dark' && !(lanternOn && !lanternBlocked()));

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

  // way-finding arrows
  for (const a of wayArrows) {
    if (!a.visible) continue;
    a.userData.life -= dt;
    const life = a.userData.life, delay = a.userData.delay;
    const t = WAY_TIME - life - delay;
    a.material.opacity = t < 0 ? 0 : Math.max(0, Math.min(1, t * 4, life * 1.5)) * (0.65 + 0.35 * Math.sin(now * 0.012 - a.userData.i));
    if (life <= 0) a.visible = false;
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
window.__kastle = { showWay, player, panels, doors, solved, tables, pullLever, get region() { return region?.id; }, get lanternOn() { return lanternOn; }, toggleLantern, submit, setFocus, camera };
document.body.classList.add('ready');
