// Talk-order test of the boss room in Chromium with real keyboard events:
//   round 1 → replay 1 → round 2 → replay 2 → round 3 → replay 3, moving with PageDown like the
//   clicker. Each pass is typed by hand (12 keys, `--gap` ms apart, "tokyo ramens") or with A
//   (auto-type). `--runs` passes of each.
// Checks: every step opens with an empty search box and an empty list query (hits 0); round 1 =
// QUEST FAILED; rounds 2 and 3 = S or A; frames over 50 ms in rounds 2 and 3 (from the round's
// own frame trace); console errors.
// `--strip`: afterwards, one hand-typed round 2 is captured (25% screencast, every 2nd frame) into
// .check/round2-hand-strip.png.
// Usage: node scripts/test-talk.mjs [--runs 5] [--gap 250] [--html dist/index.html] [--out name] [--strip]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const runs = Number(arg('--runs', 5));
const gap = Number(arg('--gap', 250));
const html = path.resolve(arg('--html', path.join(root, 'dist', 'index.html')));
const outName = arg('--out', 'test-talk');
const outDir = path.join(root, '.check');
mkdirSync(outDir, { recursive: true });
const TEXT = 'tokyo ramens'; // 12 keys, with an "a" in the middle of the round
const url = pathToFileURL(html).href;
const browser = await chromium.launch();

async function openPage() {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await context.route('**/*', (r) => (/^(file|data|blob):/.test(r.request().url()) ? r.continue() : r.abort()));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return { context, page, errors };
}
const searchState = (page) =>
  page.evaluate(() => ({
    value: document.querySelector('#boss-search')?.value ?? null,
    hits: document.querySelector('.boss-hits b')?.textContent ?? null,
    focused: document.activeElement?.id === 'boss-search',
  }));

async function playRound(page, how) {
  if (how === 'hand') {
    await page.click('#boss-search');
    for (const ch of TEXT) {
      await page.keyboard.press(ch === ' ' ? 'Space' : ch);
      await page.waitForTimeout(gap);
    }
  } else {
    await page.keyboard.press('a');
  }
  await page.locator('.boss-overlay.is-result').waitFor({ timeout: 40000 });
  return page.evaluate(() => {
    const r = JSON.parse(document.querySelector('.boss-overlay').dataset.result);
    const tr = globalThis.__roundTraces[r.round - 1];
    const f = tr.frames;
    const long = [];
    for (let i = 1; i < f.length; i++) if (f[i] - f[i - 1] > 50) long.push(`${Math.round(f[i] - f[i - 1])}@${Math.round(f[i - 1] - tr.t0)}`); // length@ms into the round
    return { ...r, long };
  });
}

const rows = [];
const allErrors = [];
for (const how of ['hand', 'auto']) {
  for (let run = 1; run <= runs; run++) {
    const { context, page, errors } = await openPage();
    await page.goto(`${url}#/9/0`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    for (let round = 0; round < 3; round++) {
      // the round step just opened (first one by URL, the others by PageDown)
      await page.waitForTimeout(700);
      const atOpen = await searchState(page);
      const r = await playRound(page, how);
      await page.waitForTimeout(400);
      await page.keyboard.press('PageDown'); // → replay
      await page.waitForTimeout(900);
      const replay = await page.evaluate(() => JSON.parse(document.querySelector('.boss-replay-canvas')?.dataset.summary || 'null'));
      const atReplay = await searchState(page);
      const row = {
        how,
        run,
        round: round + 1,
        emptyAtOpen: atOpen.value === '' && atOpen.hits === '0',
        atOpen,
        emptyAtReplay: atReplay.value === '' && atReplay.hits === '0',
        keys: r.keys,
        rank: r.rank,
        questFailed: r.questFailed,
        outcome: r.outcome,
        worstKeyMs: r.worstLatencyMs,
        worstFrameMs: r.worstFrameMs,
        longFrames: r.long,
        replayKeys: replay?.keys ?? null,
      };
      row.ok = row.emptyAtOpen && row.emptyAtReplay && row.keys === 12 && row.replayKeys === 12 && (round === 0 ? row.questFailed === true : !row.questFailed && (row.rank === 'S' || row.rank === 'A'));
      rows.push(row);
      console.error(`${how} #${run} R${row.round}: box at open "${atOpen.value}" hits ${atOpen.hits} · keys ${row.keys} · ${row.questFailed ? 'QUEST FAILED' : row.rank} · worst key ${row.worstKeyMs} · worst frame ${row.worstFrameMs} · frames > 50 ms: [${row.longFrames}] · replay keys ${row.replayKeys} · ${row.ok ? 'OK' : 'FAIL'}`);
      if (round < 2) await page.keyboard.press('PageDown'); // → next round
    }
    allErrors.push(...errors);
    await context.close();
  }
}

if (args.includes('--strip')) {
  // One hand-typed round 2 in talk order, captured at 25% (light capture, see round-strip.mjs).
  const { context, page, errors } = await openPage();
  await page.goto(`${url}#/9/0`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.keyboard.press('a');
  await page.locator('.boss-overlay.is-result').waitFor({ timeout: 40000 });
  await page.waitForTimeout(400);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(900);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(1500);
  const frames = [];
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ t: f.metadata.timestamp * 1000, data: f.data });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: 480, maxHeight: 270, everyNthFrame: 2 });
  const t0 = Date.now();
  const r = await playRound(page, 'hand');
  await page.waitForTimeout(1200);
  await cdp.send('Page.stopScreencast');
  const end = frames[frames.length - 1].t;
  const picked = [];
  for (let t = t0; t <= end; t += 250) {
    let best = null;
    for (const f of frames) if (f.t <= t + 20 && (!best || f.t > best.t)) best = f;
    if (best && !picked.some((p) => p.f === best)) picked.push({ f: best, label: `${((t - t0) / 1000).toFixed(2)} s` });
  }
  const sheet = await browser.newPage({ viewport: { width: 6 * 490 + 10, height: 400 } });
  await sheet.setContent(`<body style="margin:0;background:#05071a;color:#fff;font:16px monospace;padding:6px"><div style="font-size:20px;margin:4px">Round 2 typed by hand ("${TEXT}", ${gap} ms between keys) · ${r.questFailed ? 'QUEST FAILED' : `rank ${r.rank}`} · worst key ${r.worstLatencyMs} ms · one frame every 250 ms (captured at 25%)</div><div style="display:flex;flex-wrap:wrap;gap:10px">${picked
    .map((p) => `<div><img src="data:image/jpeg;base64,${p.f.data}" width="480" height="270" style="display:block"><div>${p.label}</div></div>`)
    .join('')}</div></body>`);
  await sheet.waitForTimeout(300);
  await sheet.screenshot({ path: path.join(outDir, 'round2-hand-strip.png'), fullPage: true });
  allErrors.push(...errors);
  await context.close();
}
await browser.close();

writeFileSync(path.join(outDir, `${outName}.json`), JSON.stringify({ runs, gap, rows, errors: allErrors }, null, 2));
const ok = rows.filter((r) => r.ok).length;
console.log(`${ok}/${rows.length} OK · console errors: ${allErrors.length}`);
