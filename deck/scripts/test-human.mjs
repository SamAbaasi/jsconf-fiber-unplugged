// Human-like typing test for the boss room. Real keyboard events (Playwright keyboard.press),
// so each key is a real keydown/input in the page, like a presenter typing by hand.
//
// Modes (random timing; the randomness is in the TEST, never in the game's rules):
//   mixed  12 keys, gaps 80–450 ms, sometimes a pause of 1.5–3 s, sometimes a burst of 3 keys
//          80–120 ms apart, sometimes Backspace
//   slow   12 keys, one key every 1.2 s
//   early  3–8 keys with mixed gaps, then Enter (ends the round early)
//   repro  the three cases from the bug report, in turn: (1) 3 keys, a 4 s pause (the round
//          must NOT end; checked), then Enter · (2) 12 keys with a 1.5 s pause after key 4 ·
//          (3) 12 keys without a pause
// Required: round 1 = QUEST FAILED every run; rounds 2 and 3 = rank S or A every run.
//
// Usage: node scripts/test-human.mjs [--runs 20] [--throttle 1] [--modes mixed,slow,early] [--html path]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const arg = (name, def) => (args.includes(name) ? args[args.indexOf(name) + 1] : def);
const runs = Number(arg('--runs', 20));
const throttle = Number(arg('--throttle', 1));
const modes = arg('--modes', 'mixed,slow,early,repro').split(',');
const html = arg('--html', path.join(root, 'dist', 'index.html'));
const outDir = path.join(root, '.check');
mkdirSync(outDir, { recursive: true });
const BOSS = 9;

const rnd = (a, b) => a + Math.random() * (b - a);
const LETTERS = 'tokyofiberreactkyotosushiramen';

function plan(mode) {
  // returns [{ key, wait }] — wait = ms before pressing this key
  const steps = [];
  let len = 0;
  const letter = () => LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const push = (wait) => {
    // Backspace sometimes (only when there is text to delete, so it is a real input event)
    const back = len > 1 && Math.random() < 0.12;
    steps.push({ key: back ? 'Backspace' : letter(), wait });
    len += back ? -1 : 1;
  };
  if (mode.startsWith('repro')) {
    const c = Number(mode.slice(5));
    if (c === 1) {
      for (let i = 0; i < 3; i++) push(i ? 200 : 0);
      steps.push({ key: '__check_no_result__', wait: 4000 });
      steps.push({ key: 'Enter', wait: 100 });
    } else {
      for (let i = 0; i < 12; i++) push(i === 0 ? 0 : c === 2 && i === 4 ? 1500 : 200);
    }
    return steps;
  }
  if (mode === 'slow') {
    for (let i = 0; i < 12; i++) push(i ? 1200 : 0);
    return steps;
  }
  const n = mode === 'early' ? 3 + Math.floor(Math.random() * 6) : 12;
  let i = 0;
  while (i < n) {
    if (i && Math.random() < 0.18) {
      // burst of up to 3 keys
      for (let k = 0; k < 3 && i < n; k++, i++) push(i ? rnd(80, 120) : 0);
      continue;
    }
    const pause = i && Math.random() < 0.15 ? rnd(1500, 3000) : 0;
    push(i ? pause || rnd(80, 450) : 0);
    i++;
  }
  if (mode === 'early') steps.push({ key: 'Enter', wait: rnd(150, 600) });
  return steps;
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await context.route('**/*', (r) => (/^(file|data|blob):/.test(r.request().url()) ? r.continue() : r.abort()));
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
if (throttle > 1) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
}
const url = pathToFileURL(html).href;
await page.goto(`${url}#/${BOSS}/0`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

const rows = [];
for (let round = 0; round < 3; round++) {
  await page.goto(`${url}#/${BOSS}/${round * 2}`);
  await page.waitForTimeout(1200);
  for (const mode of modes) {
    for (let run = 1; run <= runs; run++) {
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.keyboard.press('r'); // new round + warm-up
      await page.waitForTimeout(throttle > 1 ? 1500 : 800);
      await page.focus('#boss-search');
      const realMode = mode === 'repro' ? `repro${((run - 1) % 3) + 1}` : mode;
      const steps = plan(realMode);
      let pauseEndedRound = false;
      for (const st of steps) {
        if (st.wait) await page.waitForTimeout(st.wait);
        if (st.key === '__check_no_result__') {
          pauseEndedRound = (await page.locator('.boss-overlay.is-result').count()) > 0;
          continue;
        }
        await page.keyboard.press(st.key);
      }
      let r = null;
      try {
        await page.locator('.boss-overlay.is-result').waitFor({ timeout: 40000 });
        r = JSON.parse(await page.locator('.boss-overlay').getAttribute('data-result'));
      } catch {
        r = { outcome: 'NO RESULT' };
      }
      const keys = steps.filter((s) => s.key !== 'Enter' && !s.key.startsWith('__')).length;
      const row = { round: round + 1, mode: realMode, pauseEndedRound, run, typed: keys, keys: r.keys, rank: r.rank, questFailed: r.questFailed, bites: r.bites, biteRatio: r.biteRatio, worstKeyMs: r.worstLatencyMs, outcome: r.outcome, durationMs: r.durationMs };
      const ok = !pauseEndedRound && (round === 0 ? r.questFailed === true : r.rank === 'S' || r.rank === 'A');
      row.ok = ok;
      rows.push(row);
      console.error(`x${throttle} R${row.round} ${mode} #${run}: typed ${keys} keys ${row.keys} → ${row.rank} ${row.questFailed ? 'QUEST FAILED' : ''} bites ${row.bites} worst key ${row.worstKeyMs} ${ok ? 'OK' : 'FAIL'}`);
      await page.waitForTimeout(600);
    }
  }
}
await browser.close();

const table = {};
for (const r of rows) {
  const k = `R${r.round} ${r.mode.startsWith('repro') ? 'repro' : r.mode}`;
  table[k] ||= { runs: 0, ok: 0, ranks: {} };
  table[k].runs++;
  if (r.ok) table[k].ok++;
  const label = r.questFailed ? 'QUEST FAILED' : r.rank;
  table[k].ranks[label] = (table[k].ranks[label] || 0) + 1;
}
const name = `human-x${throttle}.json`;
writeFileSync(path.join(outDir, name), JSON.stringify({ throttle, runs, modes, table, rows, errors }, null, 2));
console.log(JSON.stringify(table, null, 1));
console.log(`errors: ${errors.length}; wrote ${path.join(outDir, name)}`);
