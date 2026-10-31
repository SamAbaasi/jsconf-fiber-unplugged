// The boss: a generic pixel dragon made of grid cells. Each cell is one React component,
// so one render of the dragon walks that many fibers. It faces left, toward the hero.
// Original shape, drawn with simple geometry (no franchise design).
//
// The shape is designed on a 125×80 grid. The deck can draw it with fewer cells
// (calibration, section 7 of the Phase 3a brief): the same shape is sampled on a coarser
// grid and then scaled up to the same size on screen, so only the DOM size changes.

export const DESIGN = { cols: 125, rows: 80 }; // design grid; 6 px per design cell on screen
// The dragon is drawn as pixel art on Fiber-kun's ×12 grid: one art pixel = 12 px = 2×2 design cells.
export const ART_PX = 12;
export const DESIGN_PX = 6;
export const DRAGON_PX = { w: DESIGN.cols * DESIGN_PX, h: DESIGN.rows * DESIGN_PX }; // 750 × 480
// Cell counts the calibration can choose from. The cell size is a whole number of px, so there
// are no seams: 6 px → 125×80 = 10,000 · 8 px → 93×60 = 5,580 · 10 px → 75×48 = 3,600 · 12 px → 62×40 = 2,480.
const LEVEL_PX = { 10000: 6, 5580: 8, 3600: 10, 2480: 12 };
export const CELL_LEVELS = [10000, 5580, 3600, 2480];
export const DEFAULT_CELLS = 10000;

const SYLLABLES = ['to', 'kyo', 'fi', 'ber', 're', 'act', 'la', 'ne', 'yo', 'ka', 'mi', 'su', 'shi', 'ta', 'na', 'ri', 'ko', 'sa'];

// Small deterministic PRNG, so the names are the same every time.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(2026);
const NAMES = Array.from({ length: DEFAULT_CELLS }, () => {
  let s = '';
  for (let k = 0; k < 3; k++) s += SYLLABLES[Math.floor(rand() * SYLLABLES.length)];
  return s;
});

// Points used by the game (impact point, head), in design-grid cells.
export const DRAGON_POINTS = { head: [21, 28], chest: [46, 52], mouth: [7, 35] };

// 0 bg · 1 body · 2 eye · 3 shade · 4 highlight · 5 mouth · 6 teeth/claws · 7 wing · 8 belly · 9 horn
function segDist(x, y, ax, ay, bx, by) {
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
  return Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay)));
}
const inEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

function wingTop(x) {
  // Scalloped top edge of the wing between its bone tips.
  const tips = [
    [56, 40],
    [62, 8],
    [80, 1],
    [98, 20],
    [100, 40],
  ];
  for (let i = 0; i < tips.length - 1; i++) {
    const [ax, ay] = tips[i];
    const [bx, by] = tips[i + 1];
    if (x >= ax && x <= bx) {
      const t = (x - ax) / (bx - ax);
      return ay + (by - ay) * t + Math.sin(t * Math.PI) * 6;
    }
  }
  return Infinity;
}

// A compact dragon (design x 0…104): a short S-shaped neck, so the head sits close to the body
// and the mouth is far enough from Fiber-kun for a breath. It faces left.
function baseShape(x, y) {
  // head and snout, with an open mouth
  const inHead = inEllipse(x, y, 22, 30, 9, 6.5) || inEllipse(x, y, 13, 33, 6.5, 3.8);
  if (inHead) {
    if ((x === 20 || x === 21) && y === 28) return 2; // eye
    if (y === 34 && x >= 7 && x <= 16) return x % 2 === 0 ? 6 : 5; // teeth
    if (y >= 35 && x >= 7 && x <= 15) return 5; // open mouth
    return 1;
  }
  // two horns that point back and apart
  if (segDist(x, y, 26, 25, 37, 18) <= 1.6 || segDist(x, y, 21, 24, 25, 15) <= 1.5) return 9;
  // wing bones and membrane (behind the body)
  if (segDist(x, y, 60, 42, 62, 8) <= 1.2 || segDist(x, y, 60, 42, 80, 1) <= 1.2 || segDist(x, y, 60, 42, 98, 20) <= 1.2) return 1;
  if (x >= 56 && x <= 100 && y >= wingTop(x) && y <= 44) return 7;
  // S-shaped neck: body → back → forward to the head
  if (segDist(x, y, 46, 48, 38, 44) <= 6.5 || segDist(x, y, 38, 44, 34, 38) <= 6 || segDist(x, y, 34, 38, 29, 33) <= 5.5) return 1;
  // body and belly
  if (inEllipse(x, y, 64, 54, 24, 14)) return y > 57 && x < 82 ? 8 : 1;
  // legs: a thick thigh, a bent shin, a foot with claws pointing forward (left)
  for (const lx of [50, 72]) {
    if (inEllipse(x, y, lx + 4, 64, 6.5, 6)) return 1;
    if (segDist(x, y, lx + 5, 67, lx + 2, 75) <= 2.8) return 1;
    if (x >= lx - 3 && x <= lx + 6 && y >= 75 && y <= 77) return 1;
    if (y >= 78 && (x === lx - 4 || x === lx - 3 || x === lx || x === lx + 1 || x === lx + 4)) return 6;
  }
  // tail: a short curve up to a spade tip
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const cx = 86 + t * 16;
    const cy = 58 - Math.sin(t * Math.PI * 0.9) * 20;
    if (Math.hypot(x - cx, y - cy) <= 5 - t * 3.5) return 1;
  }
  if (Math.abs(x - 103) + Math.abs(y - 38) <= 3) return 1;
  return 0;
}

const DESIGN_SHAPE = Array.from({ length: DESIGN.cols * DESIGN.rows }, (_, i) => baseShape(i % DESIGN.cols, Math.floor(i / DESIGN.cols)));
const used = (() => {
  let r0 = Infinity, r1 = -1, c0 = Infinity, c1 = -1;
  DESIGN_SHAPE.forEach((v, i) => {
    if (!v) return;
    const x = i % DESIGN.cols;
    const y = Math.floor(i / DESIGN.cols);
    r0 = Math.min(r0, y); r1 = Math.max(r1, y); c0 = Math.min(c0, x); c1 = Math.max(c1, x);
  });
  return { r0, r1, c0, c1 };
})();
// The design grid rows/columns the shape really uses (for the scale test).
export const SHAPE_ROWS_USED = used.r1 - used.r0 + 1;
export const SHAPE_COLS_USED = used.c1 - used.c0 + 1;

// The art: the design shape sampled once per 12 px art pixel (63 × 40).
const ART = { cols: Math.ceil(DRAGON_PX.w / ART_PX), rows: DRAGON_PX.h / ART_PX };
const artRaw = Array.from({ length: ART.cols * ART.rows }, (_, i) => {
  const ax = i % ART.cols;
  const ay = Math.floor(i / ART.cols);
  const dx = Math.min(DESIGN.cols - 1, ax * 2 + 1);
  const dy = Math.min(DESIGN.rows - 1, ay * 2 + 1);
  return ax * 2 + 1 >= DESIGN.cols ? 0 : DESIGN_SHAPE[dy * DESIGN.cols + dx];
});
// Spikes along the top of the neck and back (every third art column): a dragon, not a horse.
for (let ax = 14; ax < 24; ax += 3) {
  for (let ay = 0; ay < ART.rows; ay++) {
    const v = artRaw[ay * ART.cols + ax];
    if (v === 0) continue;
    if (v === 1 && ay > 0) artRaw[(ay - 1) * ART.cols + ax] = 9;
    break;
  }
}
const artAt = (x, y) => (x < 0 || y < 0 || x >= ART.cols || y >= ART.rows ? 0 : artRaw[y * ART.cols + x]);
// Shading on body art pixels: 4 = highlight (open air above), 3 = shade (open air below).
const ART_SHAPE = artRaw.map((v, i) => {
  if (v !== 1) return v;
  const x = i % ART.cols;
  const y = Math.floor(i / ART.cols);
  if (artAt(x, y - 1) === 0) return 4;
  if (artAt(x, y + 1) === 0) return 3;
  return 1;
});

const cache = new Map();
// The dragon drawn with `cells` grid cells (one of CELL_LEVELS). Every cell is one fiber and one
// DOM node; it takes the colour of the 12 px art pixel under its centre.
export function makeDragon(cells = DEFAULT_CELLS) {
  if (!CELL_LEVELS.includes(cells)) cells = DEFAULT_CELLS;
  if (cache.has(cells)) return cache.get(cells);
  const px = LEVEL_PX[cells];
  const cols = Math.floor(DRAGON_PX.w / px);
  const rows = DRAGON_PX.h / px;
  const count = cols * rows;
  const shape = Array.from({ length: count }, (_, i) => {
    const ax = Math.floor((((i % cols) + 0.5) * px) / ART_PX);
    const ay = Math.floor(((Math.floor(i / cols) + 0.5) * px) / ART_PX);
    return ART_SHAPE[ay * ART.cols + ax];
  });
  const names = NAMES.slice(0, count);
  const d = {
    cells: count,
    cols,
    rows,
    cellPx: px,
    names,
    shape,
    baseClass: shape.map((v) => `c${v}`),
    // a search hit: a lighter shade of the same art colour (no noise on the ×12 pixel art)
    hitClass: shape.map((v) => (v === 0 ? 'c0' : `c${v} h`)),
    countHits(q) {
      if (!q) return 0;
      let n = 0;
      for (let i = 0; i < count; i++) if (names[i].includes(q)) n++;
      return n;
    },
  };
  cache.set(cells, d);
  return d;
}

// The fallen pose, drawn from the same art (12 px pixels): legs fold, the body lowers onto the
// ground, the neck droops until the head lies on the grass, the eyes close. t = 0 … 1.
const LEG_COLS = [23, 42]; // art columns of the legs
const BODY_BOTTOM = 34; // first art row below the belly
export function fallenArt(t) {
  const out = new Array(ART.cols * ART.rows).fill(0);
  const drop = (ax) => {
    const base = 6;
    const neck = ax < 24 ? (24 - ax) * 1.1 : 0;
    return Math.round(t * (base + neck));
  };
  for (let ay = 0; ay < ART.rows; ay++) {
    for (let ax = 0; ax < ART.cols; ax++) {
      let v = ART_SHAPE[ay * ART.cols + ax];
      if (!v) continue;
      // legs fold away under the body
      if (ay >= BODY_BOTTOM && ax >= LEG_COLS[0] && ax <= LEG_COLS[1] && t > 0.3) continue;
      if (v === 2 && t >= 1) v = 5; // eyes closed
      const ny = Math.min(ART.rows - 1, ay + drop(ax));
      out[ny * ART.cols + ax] = v;
    }
  }
  return { cols: ART.cols, rows: ART.rows, px: ART_PX, shape: out };
}

// The kneeling pose (QUEST FAILED): the list did render, so the dragon is beaten, but the user
// already left. It does not lie down: it kneels, legs folded under it, head bowed, eyes open.
export function kneelingArt(t) {
  const out = new Array(ART.cols * ART.rows).fill(0);
  const drop = (ax) => Math.round(t * (3 + (ax < 24 ? (24 - ax) * 0.45 : 0)));
  for (let ay = 0; ay < ART.rows; ay++) {
    for (let ax = 0; ax < ART.cols; ax++) {
      const v = ART_SHAPE[ay * ART.cols + ax];
      if (!v) continue;
      const leg = ay >= BODY_BOTTOM && ax >= LEG_COLS[0] && ax <= LEG_COLS[1];
      if (leg) {
        // folded legs: only the feet stay, on the ground
        if (ay >= ART.rows - 2 || t < 0.3) out[ay * ART.cols + ax] = v;
        continue;
      }
      const ny = Math.min(ART.rows - 3, ay + drop(ax));
      out[ny * ART.cols + ax] = v;
    }
  }
  return { cols: ART.cols, rows: ART.rows, px: ART_PX, shape: out };
}

// Breathing fire: only the neck and head bend down (the body and legs stay), so the mouth is
// near Fiber-kun's height and the flame can go straight. t = 0 … 1.
// Neck and head bend down toward Fiber-kun; at t = 1 the mouth (art column 3) drops 13 rows.
export const BREATH_DROP = (ax, t) => (ax < 24 ? Math.round(t * (24 - ax) * 0.62) : 0);
export function breathArt(t) {
  const out = new Array(ART.cols * ART.rows).fill(0);
  for (let ay = 0; ay < ART.rows; ay++) {
    for (let ax = 0; ax < ART.cols; ax++) {
      const v = ART_SHAPE[ay * ART.cols + ax];
      if (!v) continue;
      const ny = Math.min(ART.rows - 1, ay + BREATH_DROP(ax, t));
      out[ny * ART.cols + ax] = v;
    }
  }
  return { cols: ART.cols, rows: ART.rows, px: ART_PX, shape: out };
}
