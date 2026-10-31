// Opens dist/index.html from file:// in Chromium with the network blocked, then:
//  - walks every slide and step and saves a screenshot of each state
//  - runs the boss-fight demo in all three modes (auto-typing) and reads the live numbers
//  - opens the presenter window and checks that it controls the deck
// Fails if any request leaves file:/data:/blob:, or if the page logs an error.
//
// Usage: npm run build && npm run check [-- --out <dir>] [-- --headed]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Playwright is preinstalled globally in this environment; createRequire also honors NODE_PATH.
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const outDir = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(root, '.check'));
mkdirSync(outDir, { recursive: true });
const url = pathToFileURL(path.join(root, 'dist', 'index.html')).href;

const problems = [];
const blocked = [];

const browser = await chromium.launch({ headless: !args.includes('--headed') });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await context.route('**/*', (route) => {
  const u = route.request().url();
  if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
  blocked.push(u);
  return route.abort();
});

function watch(page, name) {
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${name} console.${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`${name} pageerror: ${e.message}`));
}

const page = await context.newPage();
watch(page, 'audience');
await page.goto(url);
await page.evaluate(() => document.fonts.ready);

const hash = () => page.evaluate(() => location.hash);
const report = { url, slides: [], demo: {}, presenter: {} };

// Walk all states until the hash stops changing.
let last = '';
for (let i = 0; i < 200; i++) {
  const h = await hash();
  if (h === last) break;
  last = h;
  const [, slide, step] = h.split('/');
  const isBoss = await page.locator('.boss').count();
  const isWalk = await page.locator('.yield-walk').count();
  await page.waitForTimeout(isWalk ? 6200 : isBoss ? 1500 : 700);
  await page.screenshot({ path: path.join(outDir, `slide-${slide.padStart(2, '0')}-step-${step}.png`) });
  report.slides.push(h);

  if (isBoss) {
    const mode = await page.locator('.boss-mode.is-on').innerText();
    await page.keyboard.press('c');
    await page.waitForTimeout(1200);
    const before = await page.evaluate(() => ({
      committed: Number(document.querySelector('.boss-stats b:nth-of-type(1)')?.textContent ?? 0),
    }));
    await page.keyboard.press('a');
    await page.waitForTimeout(2400);
    const stats = await page.evaluate(() => {
      const t = (sel) => document.querySelector(sel)?.textContent;
      const bs = [...document.querySelectorAll('.boss-stats b')].map((b) => b.textContent);
      const log = globalThis.__fiberEventLog;
      const events = [];
      for (let i = Math.max(0, log.n - log.size); i < log.n; i++) events.push(log.buf[i % log.size]);
      const recent = events.filter((e) => e.t > performance.now() - 3000);
      const counts = {};
      for (const e of recent) counts[e.type] = (counts[e.type] || 0) + 1;
      return {
        fps: t('.boss-fps-num'),
        worstFrame: t('.boss-fps-worst b'),
        committed: bs[0],
        thrownAway: bs[1],
        slices3s: bs[2],
        lastRender: bs[3],
        input: document.querySelector('#boss-search')?.value,
        eventCounts3s: counts,
      };
    });
    await page.screenshot({ path: path.join(outDir, `slide-${slide.padStart(2, '0')}-step-${step}-typing.png`) });
    report.demo[mode] = { ...stats, committedBefore: before.committed };
    await page.keyboard.press('c');
    await page.waitForTimeout(800);
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
await presenter.keyboard.press('PageDown');
await presenter.waitForTimeout(500);
report.presenter.audienceHashAfterTwoClicks = await hash();
report.presenter.presenterPos = await presenter.locator('.p-pos').innerText();
await presenter.screenshot({ path: path.join(outDir, 'presenter.png') });

report.blockedRequests = blocked;
report.problems = problems;
writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
if (blocked.length || problems.length) {
  console.error(`\nFAILED: ${blocked.length} blocked request(s), ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`\nOK: ${report.slides.length} states, no network, no errors. Screenshots in ${outDir}`);
