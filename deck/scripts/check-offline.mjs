// Opens dist/index.html from file:// in Chromium with the network blocked, then:
//  - walks every slide and step, waits for animations/typewriters, saves a screenshot of each state
//  - audits visible text: font size (stage px) and word count per state
//  - checks that a click while a dialogue line is typing finishes the line (and does not advance)
//  - plays the three boss rounds with auto-type and reads each result screen (real numbers)
//  - opens the presenter window and checks that it controls the deck
// Fails if any request leaves file:/data:/blob:, or if any page logs an error or warning.
//
// Usage: npm run build && npm run check [-- --out <dir>] [-- --headed] [-- --record]
//   --record        also records the truck scene and the three boss rounds (truck.webm, boss-rounds.webm)
//   --stability N   replays the three boss rounds N more times and reports every result
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Playwright is preinstalled globally in this environment; createRequire also honors NODE_PATH.
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const outDir = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(root, '.check'));
mkdirSync(outDir, { recursive: true });
const url = pathToFileURL(path.join(root, 'dist', 'index.html')).href;
const MIN_PX = 28;

const problems = [];
const BOSS = 9; // 1-based slide number of the boss room
const blocked = [];

const browser = await chromium.launch({ headless: !args.includes('--headed') });

async function newContext(extra = {}) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, ...extra });
  await context.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    blocked.push(u);
    return route.abort();
  });
  return context;
}

function watch(page, name) {
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${name} console.${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`${name} pageerror: ${e.message}`));
}

const hashOf = (page) => page.evaluate(() => location.hash);

// Visible text inside the stage: font size in stage px, and a word count.
function auditText(page) {
  return page.evaluate((min) => {
    const stage = document.querySelector('.stage');
    const sr = stage.getBoundingClientRect();
    const scale = sr.width / 1920;
    const small = [];
    let words = 0;
    const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent.trim();
      if (!text) continue;
      const el = node.parentElement;
      if (!el || el.closest('.dlg-ghost')) continue;
      if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (!r.width || !r.height || r.right < sr.left || r.left > sr.right || r.bottom < sr.top || r.top > sr.bottom) continue;
      let size = parseFloat(getComputedStyle(el).fontSize);
      const svg = el.closest('svg');
      if (svg && svg.viewBox.baseVal && svg.viewBox.baseVal.width) {
        size *= svg.getBoundingClientRect().width / scale / svg.viewBox.baseVal.width;
      }
      words += text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
      if (size < min - 0.5) {
        const cls = typeof el.className === 'string' ? el.className : el.className?.baseVal;
        small.push({ px: Math.round(size * 10) / 10, text: text.slice(0, 40), cls });
      }
    }
    return { small, words };
  }, MIN_PX);
}

async function measureScale(page) {
  return page.evaluate(() => {
        const boxes = JSON.parse(JSON.stringify(globalThis.__sceneBoxes || {}));
        const arena = document.querySelector('.boss-arena');
        const grid = document.querySelector('.dragon-grid');
        // Arena H = the arena box (760 px on the 1920×1080 stage); the stage may be scaled.
        const k = arena ? arena.getBoundingClientRect().width / 1150 : 1;
        return {
          boxes,
          arenaH: arena ? arena.getBoundingClientRect().height / k : null,
          dragonH: grid ? grid.getBoundingClientRect().height / k : null,
        };
      });
}

async function waitForState(page) {
  if (await page.locator('.yw').count()) return page.waitForTimeout(9500); // Yield walk animation
  if (await page.locator('.truck-slide').count()) {
    const h = await hashOf(page);
    if (h.endsWith('/1')) await page.locator('.truck-frozen').waitFor({ timeout: 8000 });
  }
  if (await page.locator('.dlg').count()) {
    await page.locator('.dlg-more').first().waitFor({ timeout: 6000 }).catch(() => {});
  }
  return page.waitForTimeout(700);
}

// Plays one round with auto-type. Options: shot = screenshot mid-fight; jumpAt = press ↑ after this many ms.
async function playRound(page, label, { shot = null, jumpAt = null } = {}) {
  await page.keyboard.press('r');
  await page.waitForTimeout(600);
  await page.keyboard.press('a');
  if (jumpAt !== null) {
    await page.waitForTimeout(jumpAt);
    await page.keyboard.press('ArrowUp');
  }
  if (shot) {
    await page.waitForTimeout(500);
    await page.screenshot({ path: shot });
  }
  await page.locator('.boss-overlay.is-result').waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
  const result = JSON.parse(await page.locator('.boss-overlay').getAttribute('data-result'));
  const fps = await page.locator('.boss-fps-num').innerText();
  return { label, ...result, fpsAfter: fps };
}

const report = { url, states: [], fontAudit: [], wordsOver40: [], dialogueClick: null, rounds: [], presenter: {}, truckFrozenMs: null };

// ---------- main run ----------
{
  const context = await newContext();
  const page = await context.newPage();
  watch(page, 'audience');
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);

  // Dialogue: a click while typing finishes the line and stays on the same step.
  // (Cold open, step 0: the Tehran line starts typing on load.)
  await page.waitForTimeout(120);
  const before = await page.locator('.dlg-ghost').textContent();
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(80);
  report.dialogueClick = {
    ghostBeforeClick: before.length,
    hashAfterClick: await hashOf(page),
    ghostAfterClick: (await page.locator('.dlg-ghost').textContent()).length,
  };
  report.dialogueClick.ok = report.dialogueClick.hashAfterClick === '#/1/0' && report.dialogueClick.ghostBeforeClick > 0 && report.dialogueClick.ghostAfterClick === 0;
  if (!report.dialogueClick.ok) problems.push(`dialogue click test failed: ${JSON.stringify(report.dialogueClick)}`);
  await page.keyboard.press('Home');
  await page.waitForTimeout(300);

  let last = '';
  for (let i = 0; i < 300; i++) {
    const h = await hashOf(page);
    if (h === last) break;
    last = h;
    const [, slide, step] = h.split('/');
    await waitForState(page);
    const name = `slide-${slide.padStart(2, '0')}-step-${step}`;
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    const isBoss = (await page.locator('.boss').count()) > 0 && (await page.locator('.boss-replay').count()) === 0;
    const audit = await auditText(page);
    report.states.push(h);
    if (audit.small.length) report.fontAudit.push({ state: h, boss: isBoss, small: audit.small });
    // Dense by design: the bestiary (a recap to photograph) and the storyboard placeholders.
    const dense = (await page.locator('.bs-slide, .ph-slide').count()) > 0;
    if (!isBoss && audit.words > 40) (dense ? (report.denseByDesign ||= []) : report.wordsOver40).push({ state: h, words: audit.words });
    if (await page.locator('.truck-frozen b').count()) report.truckFrozenMs = await page.locator('.truck-frozen b').innerText();
    if (h === '#/1/1') await page.waitForTimeout(2500); // let the truck freeze and the number appear, then shoot again
    if (h === '#/1/1') await page.screenshot({ path: path.join(outDir, `${name}-after.png`) });
    if (h === '#/1/1' && (await page.locator('.truck-frozen b').count())) report.truckFrozenMs = await page.locator('.truck-frozen b').innerText();
    // Scale bible, measured in the page: what the scenes really drew.
    if (h === '#/1/0' || h === '#/1/3') await page.waitForTimeout(400);
    if (h === '#/1/1' || h === '#/1/3' || isBoss) {
      const m = await measureScale(page);
      (report.scaleMeasured ||= {})[h] = m;
    }

    if (isBoss) {
      const mode = (await page.locator('.boss-mode.is-on').innerText()).trim();
      const r = await playRound(page, mode, { shot: path.join(outDir, `${name}-fight.png`), jumpAt: step === '0' ? 1800 : null });
      report.rounds.push(r);
      // After the fight: goblins were drawn. Keep the dragon size from before the fight
      // (after a win it lies rotated on the ground, which changes its bounding box).
      report.scaleMeasured[h] = { ...report.scaleMeasured[h], boxes: (await measureScale(page)).boxes };
      await page.screenshot({ path: path.join(outDir, `${name}-result.png`) });
      await page.keyboard.press('c');
      await page.waitForTimeout(600);
    }
    await page.keyboard.press('PageDown');
  }

  // Presenter window: open it, check the link, drive the deck from it.
  await page.keyboard.press('Home');
  await page.waitForTimeout(300);
  const [presenter] = await Promise.all([context.waitForEvent('page'), page.keyboard.press('p')]);
  watch(presenter, 'presenter');
  await presenter.waitForLoadState('load');
  await presenter.waitForTimeout(800);
  report.presenter.linked = await presenter.locator('.p-link').innerText();
  await presenter.keyboard.press('PageDown');
  await presenter.waitForTimeout(1500);
  await presenter.keyboard.press('PageDown');
  await presenter.waitForTimeout(500);
  report.presenter.audienceHashAfterTwoClicks = await hashOf(page);
  report.presenter.presenterPos = await presenter.locator('.p-pos').innerText();
  report.presenter.notesNow = await presenter.locator('.p-notes .is-now').first().innerText().catch(() => '');
  await presenter.screenshot({ path: path.join(outDir, 'presenter.png') });
  await context.close();
}

// ---------- optional: replay the three rounds N times, for the rank distribution ----------
const stabilityRuns = args.includes('--stability') ? Number(args[args.indexOf('--stability') + 1]) : 0;
if (stabilityRuns > 0) {
  const context = await newContext();
  const page = await context.newPage();
  watch(page, 'stability');
  report.stability = [];
  for (let run = 1; run <= stabilityRuns; run++) {
    await page.goto(`${url}#/${BOSS}/0`);
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    for (let step = 0; step < 3; step++) {
      if (step > 0) {
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(600);
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(1500);
      }
      const r = await playRound(page, `run ${run} · round ${step + 1}`);
      report.stability.push(r);
      console.error(`${r.label}: ${r.outcome} rank ${r.rank} hits ${r.hits} worst ${r.worstFrameMs} ms fps ${r.avgFps} thrown ${r.thrownAway}`);
      await page.waitForTimeout(1200);
    }
  }
  await context.close();
}

// ---------- optional: record the truck scene and the three boss rounds ----------
if (args.includes('--record')) {
  {
    // The whole cold open: Tehran → truck → Japan → "plain JS object?" → [SYSTEM] → title.
    const videoDir = path.join(outDir, 'video-truck');
    mkdirSync(videoDir, { recursive: true });
    const context = await newContext({ recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } } });
    const page = await context.newPage();
    watch(page, 'record-cold-open');
    await page.goto(`${url}#/1/0`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(3500);
    await page.keyboard.press('PageDown');
    await page.locator('.truck-frozen').waitFor({ timeout: 10000 });
    report.recordedTruckFrozenMs = await page.locator('.truck-frozen b').innerText();
    await page.waitForTimeout(4000);
    for (const wait of [3500, 3500, 3500, 3000]) {
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(wait);
    }
    await context.close();
    const file = readdirSync(videoDir).find((f) => f.endsWith('.webm'));
    if (file) renameSync(path.join(videoDir, file), path.join(outDir, 'cold-open.webm'));
  }
  const videoDir = path.join(outDir, 'video-tmp');
  mkdirSync(videoDir, { recursive: true });
  const context = await newContext({ recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } } });
  const page = await context.newPage();
  watch(page, 'record');
  await page.goto(`${url}#/${BOSS}/0`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  report.recordedRounds = [];
  for (let step = 0; step < 3; step++) {
    if (step > 0) {
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(1500);
    }
    // Round 1: press ↑ during the fight, so the late jump and its input delay are on video.
    report.recordedRounds.push(await playRound(page, `round ${step + 1} (while recording)`, { jumpAt: step === 0 ? 1500 : null }));
    await page.waitForTimeout(3000);
    // the REPLAY step of this round
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(3500);
  }
  await context.close();
  const file = readdirSync(videoDir).find((f) => f.endsWith('.webm'));
  if (file) renameSync(path.join(videoDir, file), path.join(outDir, 'boss-rounds.webm'));
}

// QR on the ending slide: decode it from a real screenshot and compare with the URL.
{
  const { default: jsQR } = await import('jsqr');
  const context = await newContext();
  const page = await context.newPage();
  watch(page, 'qr');
  await page.goto(`${url}#/12/0`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const png = await page.screenshot();
  const decoder = await context.newPage();
  const img = await decoder.evaluate(async (b64) => {
    const im = new Image();
    im.src = `data:image/png;base64,${b64}`;
    await im.decode();
    const c = document.createElement('canvas');
    c.width = im.width;
    c.height = im.height;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    return { w: c.width, h: c.height, data: Array.from(g.getImageData(0, 0, c.width, c.height).data) };
  }, png.toString('base64'));
  const code = jsQR(Uint8ClampedArray.from(img.data), img.w, img.h);
  const expected = 'https://www.linkedin.com/in/samabaasi';
  report.qr = { decoded: code ? code.data : null, expected, ok: !!code && code.data === expected };
  if (!report.qr.ok) problems.push(`QR on the ending slide decodes to ${JSON.stringify(report.qr.decoded)}, expected ${expected}`);
  await context.close();
}

// Scale bible, measured in the page (what was really drawn).
{
  const rows = [];
  const cold = report.scaleMeasured?.['#/1/1']?.boxes?.['cold-open'] || {};
  const cold3 = report.scaleMeasured?.['#/1/3']?.boxes?.['cold-open'] || {};
  const bossM = Object.entries(report.scaleMeasured || {}).find(([k]) => k.startsWith(`#/${BOSS}/`))?.[1];
  const add = (name, v, min, max) => rows.push({ name, value: v == null ? null : Math.round(v * 1000) / 1000, min, max, ok: v != null && v >= min && v <= max });
  const hero = cold3.reborn?.h;
  const dev = cold.truck ? cold['previous-life']?.h : null;
  add('previous-life Fiber-kun px', cold['previous-life']?.h, 128, 128);
  add('reborn Fiber-kun px', hero, 128, 128);
  add('truck height / Fiber-kun', cold.truck && dev ? cold.truck.h / dev : null, 2.2, 2.8);
  add('truck length / Fiber-kun', cold.truck && dev ? cold.truck.w / dev : null, 4.5, 5.5);
  add('torii height / Fiber-kun', cold3.torii && hero ? cold3.torii.h / hero : null, 3, 4);
  const b = bossM?.boxes?.boss || {};
  add('boss dragon / arena H', bossM?.dragonH && bossM?.arenaH ? bossM.dragonH / bossM.arenaH : null, 0.55, 0.65);
  add('boss Fiber-kun / arena H', b.hero && bossM?.arenaH ? b.hero.h / bossM.arenaH : null, 0.22, 0.26);
  add('boss goblin / arena H', b.goblin && bossM?.arenaH ? b.goblin.h / bossM.arenaH : null, 0.1, 0.13);
  report.scaleInPage = rows;
  for (const r of rows) if (!r.ok) problems.push(`scale bible (in page): ${r.name} = ${r.value}, allowed ${r.min}–${r.max}`);
}

report.blockedRequests = blocked;
report.problems = problems;
writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();

console.log(JSON.stringify({ ...report, states: report.states.length }, null, 2));
if (blocked.length || problems.length) {
  console.error(`\nFAILED: ${blocked.length} blocked request(s), ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`\nOK: ${report.states.length} states, no network, no errors. Output in ${outDir}`);
