// The scale bible as a test. Fails (exit 1) if any sprite ratio is outside its range.
// Runs before every build (npm run build) and in npm run check.
//   node scripts/check-scale.mjs            → table + exit code
//   node scripts/check-scale.mjs --lineup   → also renders .check/LINEUP.png (needs Playwright)
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { scaleReport, SCALES, bbox } from '../src/sprites/scale.js';
import { FIBER_KUN, DEV, LAPTOP, COFFEE, PALETTE } from '../src/sprites/fiberkun.js';
import { GOBLIN, GOBLIN_PALETTE } from '../src/sprites/goblin.js';
import { TRUCK, TRUCK_PALETTE } from '../src/sprites/truck.js';
import { TORII, TORII_PALETTE } from '../src/sprites/torii.js';
import { makeDragon, SHAPE_ROWS_USED } from '../src/demo/dragon.js';

const rows = scaleReport();
const w = Math.max(...rows.map((r) => r.name.length));
console.log('Scale bible (stage 1920×1080)');
for (const r of rows) {
  const range = r.unit === 'px' ? `${r.min} px` : `${r.min}–${r.max}×`;
  console.log(`  ${r.ok ? 'OK  ' : 'FAIL'} ${r.scene.padEnd(10)} ${r.name.padEnd(w)}  ${String(r.value).padStart(7)}  (allowed ${range})`);
}
const bad = rows.filter((r) => !r.ok);

if (process.argv.includes('--lineup')) {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const out = path.join(root, '.check');
  mkdirSync(out, { recursive: true });
  const { chromium } = createRequire(import.meta.url)('playwright');
  const d = makeDragon(10000);
  const dragonCell = SCALES.boss.dragonH / SHAPE_ROWS_USED;
  const items = [
    { group: 'world', label: 'previous life ×8', frame: DEV[0], pal: PALETTE, scale: SCALES.world },
    { group: 'world', label: 'reborn ×8', frame: FIBER_KUN.idle[0], pal: PALETTE, scale: SCALES.world },
    { group: 'world', label: `truck ×${SCALES.truck}`, frame: TRUCK, pal: TRUCK_PALETTE, scale: SCALES.truck },
    { group: 'world', label: `torii ×${SCALES.torii}`, frame: TORII, pal: TORII_PALETTE, scale: SCALES.torii },
    { group: 'boss', label: `goblin ×${SCALES.boss.goblin}`, frame: GOBLIN[0], pal: GOBLIN_PALETTE, scale: SCALES.boss.goblin },
    { group: 'boss', label: `Fiber-kun ×${SCALES.boss.hero}`, frame: FIBER_KUN.idle[0], pal: PALETTE, scale: SCALES.boss.hero },
    { group: 'boss', label: `dragon ${SCALES.boss.dragonH} px`, dragon: { cols: d.cols, rows: d.rows, shape: d.shape }, scale: dragonCell },
  ].map((it) => (it.frame ? { ...it, box: bbox(it.frame) } : it));
  const props = { laptop: LAPTOP, coffee: COFFEE, pal: PALETTE };
  const html = `<!doctype html><html><body style="margin:0;background:#0b0c2e"><canvas id=c width=3500 height=1000></canvas><script>
  const items = ${JSON.stringify(items)}; const props = ${JSON.stringify(props)}; const H = ${SCALES.boss.arenaH};
  const DRAGON_COLORS = ['', '#6b5bd1','#ffd166','#3b2f8f','#9a8cf0','#120c2c','#ffffff','#4a3f9a','#c9c3e8','#ffd166'];
  const g = document.getElementById('c').getContext('2d');
  const base = 880;
  g.font = '22px monospace'; g.fillStyle = '#ffffff';
  // ruler: every 64 px (= half of Fiber-kun at world scale)
  for (let y = 0; y <= 800; y += 64) { g.fillStyle = y % 128 ? '#3b3f7a' : '#6b70b0'; g.fillRect(70, base - y, 3420, 1); g.fillStyle = '#c9cdf5'; g.fillText(String(y), 8, base - y + 7); }
  g.fillStyle = '#ffd166'; g.fillRect(70, base - H, 3420, 2); g.fillText('boss arena H = ' + H + ' px', 2200, base - H - 10);
  for (const p of [[0.55, 0.65, 'dragon'], [0.22, 0.26, 'Fiber-kun'], [0.10, 0.13, 'goblin']]) { g.fillStyle = 'rgba(52,224,161,0.12)'; g.fillRect(2080, base - H * p[1], 1400, H * (p[1] - p[0])); g.fillStyle = '#34e0a1'; g.fillText(p[2] + ' ' + Math.round(p[0] * 100) + '–' + Math.round(p[1] * 100) + '% of H', 1870, base - H * p[1] + 22); }
  const draw = (frame, pal, scale, x, box) => { frame.forEach((row, y) => { for (let i = 0; i < row.length; i++) { const c = pal[row[i]]; if (!c) continue; g.fillStyle = c; g.fillRect(x + (i - box.x) * scale, base - (box.y + box.h - y) * scale, scale, scale); } }); };
  let x = 150; let lastGroup = 'world';
  g.fillStyle = '#ffffff'; g.font = 'bold 26px monospace'; g.fillText('WORLD SCENES (cold open, title close-up is ×12)', 110, 40);
  g.font = '22px monospace';
  for (const it of items) {
    if (it.group !== lastGroup) { x = Math.max(x + 40, 2120); g.fillStyle = '#ffffff'; g.font = 'bold 26px monospace'; g.fillText('BOSS ARENA (allowed bands in green)', 1870, 40); g.font = '22px monospace'; lastGroup = it.group; }
    let w, h;
    if (it.dragon) {
      const { cols, rows, shape } = it.dragon; const s = it.scale;
      for (let i = 0; i < shape.length; i++) { if (!shape[i]) continue; g.fillStyle = DRAGON_COLORS[shape[i]]; g.fillRect(x + (i % cols) * s, base - (rows - Math.floor(i / cols)) * s, Math.ceil(s), Math.ceil(s)); }
      w = cols * s; h = rows * s;
    } else {
      draw(it.frame, it.pal, it.scale, x, it.box); w = it.box.w * it.scale; h = it.box.h * it.scale;
      if (it.label.startsWith('previous')) { draw(props.laptop, props.pal, 8, x - 40, {x:0,y:0,w:10,h:11}); draw(props.coffee, props.pal, 8, x + w - 8, {x:0,y:0,w:6,h:12}); }
    }
    g.fillStyle = '#ffd166'; g.fillRect(x, base - h - 6, w, 2);
    g.fillStyle = '#ffffff'; g.fillText(it.label, x, base + 40); g.fillStyle = '#c9cdf5'; g.fillText(Math.round(w) + '×' + Math.round(h) + ' px', x, base + 70);
    x += Math.max(w, 230) + 60;
  }
  </script></body></html>`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 3500, height: 1000 } });
  await page.setContent(html);
  await page.locator('#c').screenshot({ path: path.join(out, 'LINEUP.png') });
  await browser.close();
  console.log(`wrote ${path.join(out, 'LINEUP.png')}`);
}

if (bad.length) {
  console.error(`\nFAILED: ${bad.length} ratio(s) outside the scale bible.`);
  process.exit(1);
}
console.log('OK: every ratio is inside the scale bible.');
