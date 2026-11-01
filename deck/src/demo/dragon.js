// The boss: the pack's pixel dragon (assets-src/boss-sprites, 66 × 46 art pixels, faces left),
// drawn at ×12. The IDLE pose is the real list: a DOM grid where every cell is one React
// component (one fiber) that takes the colour of the art pixel under its centre. With 6 px cells
// (2 × 2 per art pixel) that is 132 × 92 = 12,144 cells. The other poses (breath, hurt, kneel,
// defeated) are drawn on the canvas while the grid is hidden.
import { PACK, PACK_META } from '../sprites/pack.generated.js';

export const ART_PX = 12;
const IDLE = PACK.dragon_idle;
export const DRAGON_PX = { w: IDLE.w * ART_PX, h: IDLE.h * ART_PX }; // 792 × 552
// Cell counts the calibration can choose from (whole-pixel cells, no seams):
// 6 px → 132×92 = 12,144 · 8 px → 99×69 = 6,831 · 10 px → 79×55 = 4,345 · 12 px → 66×46 = 3,036.
const LEVEL_PX = { 12144: 6, 6831: 8, 4345: 10, 3036: 12 };
export const CELL_LEVELS = [12144, 6831, 4345, 3036];
export const DEFAULT_CELLS = 12144;

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

// Points on the art grid (columns, rows) used by the game. The breath mouth comes from the pack.
export const DRAGON_POINTS = {
  chest: [18, 28], // the front edge of the chest (where the sword lands)
  head: [10, 8],
  mouth: PACK_META.dragon.poses.breath.mouth, // [4, 20] in the breath pose
};
export const BASELINE_ROW = PACK_META.dragon.poses.idle.baseline_row; // feet

// Rows / columns the idle art really uses (for the scale test).
const usedRows = IDLE.rows.map((r, y) => (r.replace(/\./g, '') ? y : -1)).filter((y) => y >= 0);
export const SHAPE_ROWS_USED = usedRows[usedRows.length - 1] - usedRows[0] + 1;
export const SHAPE_COLS_USED = Math.max(...IDLE.rows.map((r) => r.replace(/\.+$/, '').length)) - Math.min(...IDLE.rows.filter((r) => r.replace(/\./g, '')).map((r) => r.search(/[^.]/)));

// Palette of the idle art (index → colour), and the colour of each art pixel as an index.
const PAL_CHARS = Object.keys(IDLE.pal);
const PAL_INDEX = Object.fromEntries(PAL_CHARS.map((c, i) => [c, i]));
export const DRAGON_COLORS = PAL_CHARS.map((c) => IDLE.pal[c]);

// Per-round palettes: round 1 = the art; rounds 2 and 3 = the pack's palette swaps.
const SWAPS = [null, PACK_META.swaps.round2_frost, PACK_META.swaps.round3_night];
export const formColors = (i) => DRAGON_COLORS.map((c) => (SWAPS[i] && SWAPS[i][c]) || c);

const cache = new Map();
// The dragon drawn with `cells` grid cells (one of CELL_LEVELS).
export function makeDragon(cells = DEFAULT_CELLS) {
  if (!CELL_LEVELS.includes(cells)) cells = DEFAULT_CELLS;
  if (cache.has(cells)) return cache.get(cells);
  const px = LEVEL_PX[cells];
  const cols = Math.floor(DRAGON_PX.w / px);
  const rows = Math.floor(DRAGON_PX.h / px);
  const count = cols * rows;
  const shape = Array.from({ length: count }, (_, i) => {
    const ax = Math.floor((((i % cols) + 0.5) * px) / ART_PX);
    const ay = Math.floor(((Math.floor(i / cols) + 0.5) * px) / ART_PX);
    const ch = IDLE.rows[ay]?.[ax] ?? '.';
    return ch === '.' ? -1 : PAL_INDEX[ch];
  });
  const names = NAMES.slice(0, count);
  const d = {
    cells: count,
    cols,
    rows,
    cellPx: px,
    names,
    shape,
    baseClass: shape.map((v) => (v < 0 ? 'e' : `p${v}`)),
    // a search hit: the same colour, a little lighter
    hitClass: shape.map((v) => (v < 0 ? 'e' : `p${v} h`)),
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

// CSS for the grid's colour classes, per round (form-1 … form-3), and lighter search hits.
function lighter(hex) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (v) => Math.round(v + (255 - v) * 0.22);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}
export function dragonCss() {
  let css = '.dragon-grid .e { background: transparent; }\n';
  for (let f = 0; f < 3; f++) {
    formColors(f).forEach((c, i) => {
      css += `.form-${f + 1} .dragon-grid .p${i} { background: ${c}; }\n.form-${f + 1} .dragon-grid .p${i}.h { background: ${lighter(c)}; }\n`;
    });
  }
  return css;
}

// The other poses (anticipation, breath, hurt, kneel, defeated), drawn on a canvas in the round's
// colours. The breath is ice in every round.
const poseCache = new Map();
export function poseCanvas(pose, formIndex) {
  const key = `${pose}:${formIndex}`;
  if (poseCache.has(key)) return poseCache.get(key);
  const art = PACK[`dragon_${pose}`];
  const swap = SWAPS[formIndex] || {};
  const c = document.createElement('canvas');
  c.width = art.w * ART_PX;
  c.height = art.h * ART_PX;
  const g = c.getContext('2d');
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const col = art.pal[ch];
      g.fillStyle = swap[col] || col;
      g.fillRect(x * ART_PX, y * ART_PX, ART_PX, ART_PX);
    }
  });
  poseCache.set(key, c);
  return c;
}
