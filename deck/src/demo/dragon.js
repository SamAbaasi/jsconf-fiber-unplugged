// The boss: a generic pixel dragon made of grid cells. Each cell is one React component,
// so one render of the dragon walks that many fibers. It faces left, toward the hero.
// Original shape, drawn with simple geometry (no franchise design).
//
// The shape is designed on a 125×80 grid. The deck can draw it with fewer cells
// (calibration, section 7 of the Phase 3a brief): the same shape is sampled on a coarser
// grid and then scaled up to the same size on screen, so only the DOM size changes.

export const DESIGN = { cols: 125, rows: 80 };
// Cell counts the calibration can choose from: 125×80, 100×64, 75×48, 50×32 (same 25:16 shape).
export const CELL_LEVELS = [10000, 6400, 3600, 1600];
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
export const DRAGON_POINTS = { head: [14, 20], chest: [46, 46] };

// 0 bg · 1 body · 2 eye · 3 shade · 4 highlight · 5 mouth · 6 teeth/claws · 7 wing · 8 belly · 9 horn
function segDist(x, y, ax, ay, bx, by) {
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
  return Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay)));
}
const inEllipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

function wingTop(x) {
  // Scalloped top edge of the wing between its bone tips.
  const tips = [
    [58, 36],
    [66, 4],
    [82, 12],
    [96, 0],
    [110, 20],
    [112, 36],
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

function baseShape(x, y) {
  // head and snout
  const inHead = inEllipse(x, y, 18, 19, 10, 7) || inEllipse(x, y, 8, 23, 7, 4);
  if (inHead) {
    if ((x === 14 || x === 15) && y === 17) return 2;
    if (y === 25 && x >= 3 && x <= 13) return x % 2 === 0 ? 6 : 5;
    if (y === 24 && x >= 3 && x <= 12) return 5;
    return 1;
  }
  // horns
  if (segDist(x, y, 20, 13, 31, 2) <= 1.2 || segDist(x, y, 15, 13, 22, 5) <= 1.0) return 9;
  // wing bones and membrane (behind the body)
  if (segDist(x, y, 62, 38, 66, 4) <= 1.2 || segDist(x, y, 62, 38, 96, 0) <= 1.2 || segDist(x, y, 62, 38, 110, 20) <= 1.2) return 1;
  if (x >= 58 && x <= 112 && y >= wingTop(x) && y <= 40) return 7;
  // neck
  if (segDist(x, y, 50, 44, 24, 22) <= 6.5) return 1;
  // body and belly
  if (inEllipse(x, y, 72, 52, 28, 15)) return y > 55 && x < 92 ? 8 : 1;
  // legs and claws
  for (const lx of [56, 86]) {
    if (x >= lx && x <= lx + 7 && y >= 60 && y <= 77) return 1;
    if (x >= lx - 1 && x <= lx + 8 && y >= 78) return x % 3 === 0 ? 6 : 3;
  }
  // tail: tapering curve to a spade tip
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const cx = 98 + t * 22;
    const cy = 56 - Math.sin(t * Math.PI * 0.9) * 22;
    if (Math.hypot(x - cx, y - cy) <= 5 - t * 3.5) return 1;
  }
  if (Math.abs(x - 121) + Math.abs(y - 36) <= 4) return 1;
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

const cache = new Map();
// The dragon drawn with `cells` grid cells (one of CELL_LEVELS).
export function makeDragon(cells = DEFAULT_CELLS) {
  if (!CELL_LEVELS.includes(cells)) cells = DEFAULT_CELLS;
  if (cache.has(cells)) return cache.get(cells);
  const k = Math.round(Math.sqrt(cells / (DESIGN.cols * DESIGN.rows)) * 5) / 5; // 1, 0.8, 0.6, 0.4
  const cols = Math.round(DESIGN.cols * k);
  const rows = Math.round(DESIGN.rows * k);
  const count = cols * rows;
  const raw = Array.from({ length: count }, (_, i) => {
    const dx = Math.floor(((i % cols) + 0.5) * (DESIGN.cols / cols));
    const dy = Math.floor((Math.floor(i / cols) + 0.5) * (DESIGN.rows / rows));
    return DESIGN_SHAPE[dy * DESIGN.cols + dx];
  });
  const at = (x, y) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : raw[y * cols + x]);
  // Shading on body cells: 4 = highlight (open air above), 3 = shade (open air below).
  const shape = raw.map((v, i) => {
    if (v !== 1) return v;
    const x = i % cols;
    const y = Math.floor(i / cols);
    if (at(x, y - 1) === 0) return 4;
    if (at(x, y + 1) === 0 || (k === 1 && at(x, y + 2) === 0)) return 3;
    return 1;
  });
  const names = NAMES.slice(0, count);
  const d = {
    cells: count,
    cols,
    rows,
    names,
    shape,
    baseClass: shape.map((v) => `c${v}`),
    hitClass: shape.map((v) => (v === 0 ? 'h0' : 'h1')),
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
