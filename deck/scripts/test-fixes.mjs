// Tests for the boss-room fixes, in Chromium with real keyboard events (Playwright keyboard.press).
// For each round (1, 2, 3), `--runs` times each:
//   auto   the search box has focus (clicked), then A in the READY state → auto-type must start,
//          no "a" typed, 12 keys
//   human  12 keys typed into the box, 180 ms apart
//   A-after  12 keys typed by hand, then A right away (box still focused) → no 13th key; after the
//          result a new round starts and auto-types 12 keys
// Checks on every result: outcome is "FAILED" whenever questFailed; a failed round never shows a
// green INP label; the input has no focus after the round ends.
// Then the three REPLAY steps are captured (after the last auto round of each mode) into
// .check/replays.png, and the long-frame labels are checked for overlap (from the drawn boxes).
// Usage: node scripts/test-fixes.mjs [--runs 5] [--html dist/index.html]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const runs = Number(arg('--runs', 5));
const html = path.resolve(arg('--html', path.join(root, 'dist', 'index.html')));
const outDir = path.join(root, '.check');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await context.route('**/*', (r) => (/^(file|data|blob):/.test(r.request().url()) ? r.continue() : r.abort()));
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const url = pathToFileURL(html).href;
const LETTERS = 'tokyofibersu'; // 12 letters, no "a"

// Waits for the next result card. With `afterNewRound`, first waits for the card to go away
// (a new round started), so the same result is never read twice.
async function result(afterNewRound = false) {
  if (afterNewRound) await page.waitForFunction(() => !document.querySelector('.boss-overlay.is-result'), null, { timeout: 40000 });
  await page.waitForFunction(() => document.querySelector('.boss-overlay.is-result')?.dataset.result, null, { timeout: 40000 });
  // the result and its INP label, read together (A may open the next round right after)
  return page.evaluate(() => {
    const o = document.querySelector('.boss-overlay');
    const i = o.querySelector('.bo-key i');
    return JSON.stringify({ ...JSON.parse(o.dataset.result), inpClass: i ? i.className : '' });
  });
}
const focused = () => page.evaluate(() => document.activeElement?.id === 'boss-search');
const rows = [];
for (let round = 0; round < 3; round++) {
  await page.goto(`${url}#/9/${round * 2}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  for (const mode of ['auto', 'human', 'A-after']) {
    for (let run = 1; run <= runs; run++) {
      // fresh READY round (R needs the box blurred, like on stage)
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press('r');
      await page.waitForTimeout(900);
      await page.click('#boss-search'); // the bug: the box has focus in the READY state
      const row = { round: round + 1, mode, run };
      if (mode === 'auto') {
        await page.keyboard.press('a');
        await page.waitForTimeout(250);
        row.firstValue = await page.inputValue('#boss-search');
        row.typedA = row.firstValue.startsWith('a');
      } else {
        for (const ch of LETTERS) {
          await page.keyboard.press(ch);
          await page.waitForTimeout(180);
        }
        if (mode === 'A-after') {
          await page.keyboard.press('a'); // right after the 12th key, box still focused
          await page.waitForTimeout(50);
          row.valueAfterA = await page.inputValue('#boss-search');
          row.thirteenthKey = row.valueAfterA.endsWith('a');
        }
      }
      const json = await result();
      const r = JSON.parse(json);
      Object.assign(row, { keys: r.keys, rank: r.rank, questFailed: r.questFailed, outcome: r.outcome, worstKeyMs: r.worstLatencyMs, worstFrameMs: r.worstFrameMs, inp: r.inpClass });
      await page.waitForTimeout(200);
      row.focusAfterEnd = await focused();
      if (mode === 'A-after') {
        // the A should start a new round and auto-type it
        try {
          const json2 = await result(true);
          const r2 = JSON.parse(json2);
          Object.assign(row, { aRoundKeys: r2.keys, aRank: r2.rank, aQuestFailed: r2.questFailed, aOutcome: r2.outcome });
        } catch {
          row.aRoundKeys = 'NO ROUND';
        }
      }
      const failedOk = !row.questFailed || row.outcome === 'FAILED';
      const inpOk = !row.questFailed || !/inp-good/.test(row.inp);
      const rankOk = round === 0 ? row.questFailed === true : row.rank === 'S' || row.rank === 'A';
      const modeOk = mode === 'auto' ? !row.typedA && row.keys === 12 : mode === 'A-after' ? !row.thirteenthKey && row.keys === 12 && row.aRoundKeys === 12 : row.keys === 12;
      row.ok = failedOk && inpOk && rankOk && modeOk && !row.focusAfterEnd;
      rows.push(row);
      console.error(`R${row.round} ${mode} #${run}: keys ${row.keys} ${row.questFailed ? 'QUEST FAILED' : row.rank} outcome ${row.outcome} worst key ${row.worstKeyMs} inp ${row.inp}${mode === 'A-after' ? ` · A → round of ${row.aRoundKeys} keys (${row.aQuestFailed ? 'QUEST FAILED' : row.aRank})` : ''}${mode === 'auto' ? ` · typed "a": ${row.typedA}` : ''} · focus after end: ${row.focusAfterEnd} ${row.ok ? 'OK' : 'FAIL'}`);
    }
  }
  // REPLAY of this round (the last round played in this mode is the A-after's auto round)
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(1200);
  const summary = await page.locator('.boss-replay-canvas').getAttribute('data-summary');
  await page.locator('.boss-replay-canvas').screenshot({ path: path.join(outDir, `replay-${round + 1}.png`) });
  rows.push({ replay: round + 1, summary: JSON.parse(summary || 'null') });
}

// One image with the three replays (half size).
const sheet = await browser.newPage({ viewport: { width: 940, height: 400 } });
const { readFileSync } = await import('node:fs');
const imgs = [1, 2, 3].map((i) => `data:image/png;base64,${readFileSync(path.join(outDir, `replay-${i}.png`)).toString('base64')}`);
await sheet.setContent(`<body style="margin:0;background:#05071a;color:#fff;font:18px monospace;padding:6px">${imgs.map((s, i) => `<div style="margin:6px 0 2px">Replay ${i + 1}</div><img src="${s}" width="920">`).join('')}</body>`);
await sheet.waitForTimeout(300);
await sheet.screenshot({ path: path.join(outDir, 'replays.png'), fullPage: true });
await browser.close();

const play = rows.filter((r) => r.mode);
const table = {};
for (const r of play) {
  const k = `R${r.round} ${r.mode}`;
  table[k] ||= { runs: 0, ok: 0, results: {}, worstKeys: [] };
  table[k].runs++;
  if (r.ok) table[k].ok++;
  const label = r.questFailed ? 'QUEST FAILED' : r.rank;
  table[k].results[label] = (table[k].results[label] || 0) + 1;
  table[k].worstKeys.push(r.worstKeyMs);
}
writeFileSync(path.join(outDir, 'test-fixes.json'), JSON.stringify({ runs, table, rows, errors }, null, 2));
console.log(JSON.stringify(table));
console.log(`errors: ${errors.length}`);
