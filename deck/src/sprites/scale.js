// The scale bible. Every scene takes its sprite scales from here, and
// scripts/check-scale.mjs fails the build if a ratio leaves its range.
// Stage = 1920×1080. Fiber-kun is 16×16 and always drawn at an integer scale,
// the same scale everywhere inside one scene.
import { FIBER_KUN, DEV } from './fiberkun.js';
import { GOBLIN } from './goblin.js';
import { TRUCK } from './truck.js';
import { TORII } from './torii.js';
import { SHAPE_ROWS_USED, SHAPE_COLS_USED } from '../demo/dragon.js';

export const SCALES = {
  world: 8, // Fiber-kun in world scenes: 16 × 8 = 128 px
  title: 12, // title close-up
  truck: 8, // the LONG TASK truck: same pixel size as Fiber-kun (80×40 sprite)
  torii: 8, // the torii: same pixel size as Fiber-kun (52×58 sprite)
  boss: {
    arenaH: 760, // boss arena height H, px
    hero: 12, // Fiber-kun in the arena
    goblin: 12, // 8×8 goblin on the same ×12 grid as Fiber-kun
    dragonH: 480, // the dragon's drawn height, px: 80 rows × 6 px, so 10,000 cells are whole pixels
  },
};

// Allowed ranges (from the brief's scale bible).
export const RANGES = {
  truckHeight: [2.2, 2.8], // × Fiber-kun height
  truckLength: [4.5, 5.5], // "~5×"
  toriiHeight: [3, 4],
  bossDragon: [0.55, 0.65], // × arena H
  bossHero: [0.22, 0.26],
  bossGoblin: [0.1, 0.13],
  worldHero: [128, 128], // px
};

// Bounding box of the non-transparent pixels of a sprite frame, in sprite pixels.
export function bbox(frame) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  frame.forEach((row, y) => {
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

export const px = (frame, scale) => {
  const b = bbox(frame);
  return { w: b.w * scale, h: b.h * scale };
};

// Every ratio the bible asks for, computed from the real sprite data and the scales above.
export function scaleReport() {
  const s = SCALES;
  const hero = px(FIBER_KUN.idle[0], s.world);
  const dev = px(DEV[0], s.world);
  const truck = px(TRUCK, s.truck);
  const torii = px(TORII, s.torii);
  const bossHero = px(FIBER_KUN.idle[0], s.boss.hero);
  const goblin = px(GOBLIN[0], s.boss.goblin);
  const H = s.boss.arenaH;
  const row = (scene, name, value, [min, max], unit = '×') => ({ scene, name, value: Math.round(value * 1000) / 1000, min, max, unit, ok: value >= min - 1e-9 && value <= max + 1e-9 });
  return [
    row('world', 'Fiber-kun height (px)', hero.h, RANGES.worldHero, 'px'),
    row('world', 'previous-life Fiber-kun height (px)', dev.h, RANGES.worldHero, 'px'),
    row('cold open', 'truck height / Fiber-kun', truck.h / dev.h, RANGES.truckHeight),
    row('cold open', 'truck length / Fiber-kun', truck.w / dev.h, RANGES.truckLength),
    row('cold open', 'torii height / Fiber-kun', torii.h / hero.h, RANGES.toriiHeight),
    row('boss', 'dragon height / arena H', s.boss.dragonH / H, RANGES.bossDragon),
    row('boss', 'Fiber-kun height / arena H', bossHero.h / H, RANGES.bossHero),
    row('boss', 'goblin height / arena H', goblin.h / H, RANGES.bossGoblin),
  ];
}

// Dragon: its grid is drawn so that the used rows of the shape are exactly dragonH tall.
export const DRAGON_SHAPE_USED = { rows: SHAPE_ROWS_USED, cols: SHAPE_COLS_USED };

// Scenes report what they really drew, so the browser check can compare it with the bible.
export function reportBox(scene, name, box) {
  const all = (globalThis.__sceneBoxes ||= {});
  (all[scene] ||= {})[name] = { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h) };
}
