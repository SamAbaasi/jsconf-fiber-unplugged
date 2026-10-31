// Captures real screen frames (CDP screencast) during boss round 2 and builds two strips
// at 8 fps (one frame every 125 ms): one around a dragon hit, one around a goblin kill.
// The contact moments come from the game's own hit log (globalThis.__fiberHits).
// Usage: node scripts/frame-strip.mjs [--out <dir>]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const outDir = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(root, '.check'));
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
await page.goto(`${pathToFileURL(path.join(root, 'dist', 'index.html')).href}#/6/1`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);

const frames = [];
const cdp = await context.newCDPSession(page);
cdp.on('Page.screencastFrame', async (f) => {
  frames.push({ t: f.metadata.timestamp * 1000, data: f.data });
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
await page.keyboard.press('a');
await page.locator('.boss-overlay.is-result').waitFor({ timeout: 60000 });
await page.waitForTimeout(500);
await cdp.send('Page.stopScreencast');
const { origin, hits } = await page.evaluate(() => ({ origin: performance.timeOrigin, hits: globalThis.__fiberHits }));

// Pick the first dragon hit and the first goblin kill that have frames around them.
const toEpoch = (t) => origin + t;
const pick = (type) => hits.find((h) => h.type === type && toEpoch(h.t) - 400 > frames[0].t && toEpoch(h.t) + 600 < frames[frames.length - 1].t);
const strips = [];
for (const [type, title] of [
  ['dragon', 'dragon hit (a real list commit)'],
  ['goblin', 'goblin kill (a real keystroke commit)'],
]) {
  const hit = pick(type);
  if (!hit) continue;
  const c = toEpoch(hit.t);
  const shots = [];
  for (let k = -3; k <= 4; k++) {
    const target = c + k * 125;
    const best = frames.reduce((a, b) => (Math.abs(b.t - target) < Math.abs(a.t - target) ? b : a));
    shots.push({ offset: k * 125, actual: Math.round(best.t - c), data: best.data });
  }
  strips.push({ type, title, shots });
}

// Lay the strips out on a page and screenshot it (crop: the arena only).
const html = `<!doctype html><body style="margin:0;background:#05060f;color:#fff;font:22px monospace">${strips
  .map(
    (s) => `<div style="padding:10px 16px">${s.title} · 8 fps · contact = 0 ms</div><div style="display:flex;gap:6px;padding:0 16px 16px">${s.shots
      .map(
        (sh) =>
          `<div><div style="width:460px;height:304px;overflow:hidden;position:relative;border:3px solid ${sh.offset === 0 ? '#ffd166' : '#333'}"><img src="data:image/jpeg;base64,${sh.data}" style="position:absolute;left:-12px;top:-44px;width:768px"></div><div>${sh.offset >= 0 ? '+' : ''}${sh.offset} ms (frame ${sh.actual >= 0 ? '+' : ''}${sh.actual})</div></div>`,
      )
      .join('')}</div>`,
  )
  .join('')}</body>`;
const sheet = await context.newPage();
await sheet.setViewportSize({ width: 3800, height: 900 });
await sheet.setContent(html);
await sheet.waitForTimeout(300);
await sheet.screenshot({ path: path.join(outDir, 'frame-strip.png'), fullPage: true });
writeFileSync(path.join(outDir, 'frame-strip.json'), JSON.stringify({ frames: frames.length, strips: strips.map((s) => ({ type: s.type, offsets: s.shots.map((x) => [x.offset, x.actual]) })) }, null, 2));
await browser.close();
console.log(`frames captured: ${frames.length}; strips: ${strips.map((s) => s.type).join(', ')}`);
