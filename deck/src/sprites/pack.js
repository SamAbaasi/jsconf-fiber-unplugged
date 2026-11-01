// Draws sprites from Saman's pixel pack (pack.generated.js) at an integer scale, cached.
// `swap` maps colours to colours (the dragon's round palettes); `flip` mirrors it.
import { PACK, PACK_META } from './pack.generated.js';

export { PACK, PACK_META };

const cache = new Map();
export function packCanvas(name, { scale = 12, swap = null, swapKey = '', flip = false } = {}) {
  const key = `${name}:${scale}:${swapKey}:${flip}`;
  if (cache.has(key)) return cache.get(key);
  const art = PACK[name];
  const c = document.createElement('canvas');
  c.width = art.w * scale;
  c.height = art.h * scale;
  const g = c.getContext('2d');
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const col = art.pal[ch];
      g.fillStyle = (swap && swap[col]) || col;
      g.fillRect((flip ? art.w - 1 - x : x) * scale, y * scale, scale, scale);
    }
  });
  cache.set(key, c);
  return c;
}

// Bounding box of the opaque pixels, in art pixels (like scale.js bbox).
export function packBox(name) {
  const art = PACK[name];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '.') continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  });
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
