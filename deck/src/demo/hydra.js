// The boss: a pixel "Hydra" made of 10,000 grid cells. Each cell is one React
// component, so one render of the boss walks 10,000+ fibers.

export const COLS = 125;
export const ROWS = 80;
export const CELL_COUNT = COLS * ROWS;

const SYLLABLES = ['to', 'kyo', 'fi', 'ber', 're', 'act', 'la', 'ne', 'yo', 'ka', 'mi', 'su', 'shi', 'ta', 'na', 'ri', 'ko', 'sa'];

// Small deterministic PRNG, so the boss looks the same every time.
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
export const NAMES = Array.from({ length: CELL_COUNT }, () => {
  let s = '';
  for (let k = 0; k < 3; k++) s += SYLLABLES[Math.floor(rand() * SYLLABLES.length)];
  return s;
});

// 0 = background, 1 = body, 2 = eye
function shapeAt(x, y) {
  const inEllipse = (cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const heads = [
    [24, 16],
    [62, 9],
    [100, 16],
  ];
  for (const [hx, hy] of heads) {
    if (Math.abs(x - (hx + 3)) <= 1 && y === hy - 1) return 2;
    if (inEllipse(hx, hy, 9, 6.5)) return 1;
    // Neck: a thick line from the head down to the body.
    const bx = 62 + (hx - 62) * 0.35;
    const by = 50;
    const t = Math.max(0, Math.min(1, ((x - hx) * (bx - hx) + (y - hy) * (by - hy)) / ((bx - hx) ** 2 + (by - hy) ** 2)));
    const px = hx + t * (bx - hx);
    const py = hy + t * (by - hy);
    if ((x - px) ** 2 + (y - py) ** 2 <= 16) return 1;
  }
  if (inEllipse(62, 60, 36, 15)) return 1;
  if (y >= 70 && y <= 77 && (Math.abs(x - 40) <= 3 || Math.abs(x - 84) <= 3)) return 1; // legs
  if (inEllipse(105, 66, 16, 3.5) && x > 92) return 1; // tail
  return 0;
}

export const SHAPE = Array.from({ length: CELL_COUNT }, (_, i) => shapeAt(i % COLS, Math.floor(i / COLS)));
export const BASE_CLASS = SHAPE.map((s) => (s === 0 ? 'c0' : s === 1 ? 'c1' : 'c2'));
export const HIT_CLASS = SHAPE.map((s) => (s === 0 ? 'h0' : 'h1'));

export function countHits(q) {
  if (!q) return 0;
  let n = 0;
  for (let i = 0; i < CELL_COUNT; i++) if (NAMES[i].includes(q)) n++;
  return n;
}
