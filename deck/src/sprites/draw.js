// Tiny helper for drawing pixel sprites as code: rects and pixels on a grid,
// then an automatic 1-pixel outline ('k') around everything that is not transparent.
export function makeSprite(w, h, paint, { outline = true } = {}) {
  const g = Array.from({ length: h }, () => new Array(w).fill('.'));
  const api = {
    px(x, y, c) {
      if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c;
    },
    rect(x, y, rw, rh, c) {
      for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) api.px(x + i, y + j, c);
    },
  };
  paint(api);
  if (outline) {
    const copy = g.map((r) => r.slice());
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (copy[y][x] !== '.') continue;
        const near = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => {
          const c = copy[y + dy]?.[x + dx];
          return c && c !== '.' && c !== 'k';
        });
        if (near) g[y][x] = 'k';
      }
    }
  }
  return g.map((r) => r.join(''));
}
