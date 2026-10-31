// Plays the three boss rounds N times under different conditions and reports
// outcome, rank, worst frame, goblin bites and keystroke latency for every round.
//
// Usage: node scripts/test-conditions.mjs [--runs 5] [--work 12] [--only a,b,c2,c4,d1,d2] [--out <dir>]
//   a   normal headless, 1920×1080
//   b   with video recording running (1920×1080 capture)
//   c2  CPU throttling 2× (CDP Emulation.setCPUThrottlingRate)
//   c4  CPU throttling 4×
//   d1  deviceScaleFactor 1
//   d2  deviceScaleFactor 2 (high-DPI laptop screen)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const arg = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
const runs = Number(arg('--runs', 5));
const work = arg('--work', null);
const cells = arg('--cells', null);
const only = arg('--only', 'a,b,c2,c4,d1,d2').split(',');
const outDir = path.resolve(arg('--out', path.join(root, '.check')));
mkdirSync(outDir, { recursive: true });
const html = arg('--html', path.join(root, 'dist', 'index.html'));
const url = `${pathToFileURL(html).href}${work || cells ? `?${[work && `work=${work}`, cells && `cells=${cells}`].filter(Boolean).join('&')}` : ''}#/9/0`;

const CONDITIONS = {
  a: { label: 'a · normal headless 1920×1080' },
  b: { label: 'b · with video recording', record: true },
  c2: { label: 'c · CPU throttling 2×', throttle: 2 },
  c4: { label: 'c · CPU throttling 4×', throttle: 4 },
  d1: { label: 'd · deviceScaleFactor 1', dsf: 1 },
  d2: { label: 'd · deviceScaleFactor 2', dsf: 2 },
};

const browser = await chromium.launch();
const report = { url, work: work ?? 'default', cells: cells ?? 'default', runs, conditions: {} };

for (const key of only) {
  const cond = CONDITIONS[key];
  const videoDir = path.join(outDir, `video-cond-${key}`);
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: cond.dsf ?? 1,
    ...(cond.record ? { recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } } } : {}),
  });
  await context.route('**/*', (r) => (/^(file|data|blob):/.test(r.request().url()) ? r.continue() : r.abort()));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (cond.throttle) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cond.throttle });
  }
  const rows = [];
  for (let run = 1; run <= runs; run++) {
    await page.goto(url);
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2000);
    for (let round = 0; round < 3; round++) {
      if (round) {
        // round → REPLAY step → next round
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(600);
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(2000);
      }
      await page.keyboard.press('r');
      await page.waitForTimeout(500);
      await page.keyboard.press('a');
      await page.locator('.boss-overlay.is-result').waitFor({ timeout: 60000 });
      const r = JSON.parse(await page.locator('.boss-overlay').getAttribute('data-result'));
      const row = { run, round: round + 1, outcome: r.outcome, rank: r.rank, worstFrameMs: r.worstFrameMs, bites: r.bites, goblins: r.goblins, worstKeyMs: r.worstLatencyMs, medianKeyMs: r.medianLatencyMs, thrownAway: r.thrownAway, commits: r.commits, durationMs: r.durationMs, cells: r.cells, questFailed: r.questFailed, dragonDown: r.dragonDown, phasesWorst: r.phases?.worst || null, phasesTotals: r.phases?.totals || null };
      rows.push(row);
      const pw = row.phasesWorst;
      console.error(`${key} run ${run} round ${row.round}: ${row.outcome} ${row.rank} worst ${row.worstFrameMs} ms bites ${row.bites}/${row.goblins} key med ${row.medianKeyMs} max ${row.worstKeyMs}${pw ? ` | worst LoAF ${pw.duration} = render ${pw.render} commit ${pw.commit} slp ${pw.styleLayoutPaint} canvas ${pw.canvas} other ${pw.other}` : ''}`);
      await page.waitForTimeout(1500);
    }
  }
  await context.close();
  if (cond.record) rmSync(videoDir, { recursive: true, force: true });
  const dist = [1, 2, 3].map((round) => {
    const ranks = rows.filter((x) => x.round === round).map((x) => x.rank);
    return Object.fromEntries(['S', 'A', 'B', 'C'].map((k) => [k, ranks.filter((x) => x === k).length]));
  });
  report.conditions[key] = { label: cond.label, rows, rankDistribution: dist, errors };
}
await browser.close();

const name = `conditions-${cells ?? '10000'}x${work ?? 'default'}.json`;
writeFileSync(path.join(outDir, name), JSON.stringify(report, null, 2));
console.log(`wrote ${path.join(outDir, name)}`);
