// A frame strip of each boss round at 25% size: real screen frames (CDP screencast) while the
// round auto-types, one frame every 300 ms from the first key to the result (plus the frame at
// each dragon hit from the game's hit log). Writes .check/round-strip.png.
// Usage: node scripts/round-strip.mjs [--html dist/index.html]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const html = path.resolve(args.includes('--html') ? args[args.indexOf('--html') + 1] : path.join(root, 'dist', 'index.html'));
const outDir = path.join(root, '.check');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await context.route('**/*', (r) => (/^(file|data|blob):/.test(r.request().url()) ? r.continue() : r.abort()));
const page = await context.newPage();
const url = pathToFileURL(html).href;
const rounds = [];
for (let round = 0; round < 3; round++) {
  await page.goto(`${url}#/9/${round * 2}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2000);
  const frames = [];
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ t: f.metadata.timestamp * 1000, data: f.data });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  // Capture at 25% and every 2nd frame: a full-size screencast costs the page enough CPU to cause
  // long frames of its own (a 61 ms frame in round 2 that never happens without it).
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: 480, maxHeight: 270, everyNthFrame: 2 });
  const t0 = Date.now();
  await page.keyboard.press('a');
  await page.locator('.boss-overlay.is-result').waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await cdp.send('Page.stopScreencast');
  await cdp.detach();
  const { origin, hits } = await page.evaluate(() => ({ origin: performance.timeOrigin, hits: globalThis.__fiberHits || [] }));
  const res = JSON.parse((await page.locator('.boss-overlay').getAttribute('data-result')) || '{}');
  const end = frames[frames.length - 1].t;
  const want = [];
  for (let t = t0; t <= end; t += 300) want.push({ t, label: `${((t - t0) / 1000).toFixed(1)} s` });
  for (const h of hits) {
    const t = origin + h.t;
    if (t >= t0 && h.type.startsWith('dragon')) want.push({ t, label: `${((t - t0) / 1000).toFixed(1)} s ${h.type === 'dragon-final' ? 'final hit' : 'hit'}` });
  }
  want.sort((a, b) => a.t - b.t);
  const picked = [];
  for (const w of want) {
    let best = null;
    for (const f of frames) if (f.t <= w.t + 20 && (!best || f.t > best.t)) best = f;
    if (best && !picked.some((p) => p.f === best)) picked.push({ f: best, label: w.label });
  }
  rounds.push({ title: `Round ${round + 1} · ${res.questFailed ? 'QUEST FAILED' : `rank ${res.rank}`} · worst key ${res.worstLatencyMs} ms · worst frame ${res.worstFrameMs ?? '?'} ms (while capturing)`, frames: picked.slice(0, 24).map((p) => ({ label: p.label, src: `data:image/jpeg;base64,${p.f.data}` })) });
}

// Compose: 25% frames (480 × 270), 6 per row.
const W = 480; // 25% of the 1920 × 1080 stage
const H = 270;
const PER = 6;
const sheet = await browser.newPage({ viewport: { width: PER * (W + 10) + 10, height: 400 } });
await sheet.setContent(`<body style="margin:0;background:#05071a;color:#fff;font:16px monospace;padding:6px">${rounds
  .map(
    (r) => `<div style="margin:8px 4px 4px;font-size:20px">${r.title}</div><div style="display:flex;flex-wrap:wrap;gap:10px">${r.frames
      .map((f) => `<div><img src="${f.src}" width="${W}" height="${H}" style="display:block"><div>${f.label}</div></div>`)
      .join('')}</div>`,
  )
  .join('')}</body>`);
await sheet.waitForTimeout(500);
const out = path.join(outDir, 'round-strip.png');
await sheet.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`wrote ${out}`);
