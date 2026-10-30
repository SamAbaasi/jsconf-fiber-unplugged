// Builds each test against the real npm packages and runs it in headless Chromium.
// `scheduler` is aliased to sched-wrapper.js so we can record real task/yield events.
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const { chromium } = require('playwright');

const out = path.join(__dirname, '.out');
fs.mkdirSync(out, { recursive: true });

const tests = [
  { name: 'scheduling', mode: 'production' },
  { name: 'interrupt-order', mode: 'production' },
  { name: 'perf-tracks', mode: 'development' },
  { name: 'perf-tracks', mode: 'production' },
];

(async () => {
  const browser = await chromium.launch();
  const report = { chromium: browser.version(), react: require('react/package.json').version, scheduler: require('scheduler/package.json').version, results: {} };
  for (const t of tests) {
    const id = `${t.name}.${t.mode}`;
    esbuild.buildSync({
      entryPoints: [path.join(__dirname, 'tests', `${t.name}.jsx`)],
      bundle: true,
      jsx: 'automatic',
      define: { 'process.env.NODE_ENV': JSON.stringify(t.mode) },
      alias: {
        scheduler: path.join(__dirname, 'sched-wrapper.js'),
        'real-scheduler': path.join(__dirname, 'node_modules/scheduler', t.mode === 'production' ? 'cjs/scheduler.production.js' : 'cjs/scheduler.development.js'),
      },
      outfile: path.join(out, `${id}.js`),
      logLevel: 'error',
    });
    fs.writeFileSync(path.join(out, `${id}.html`), `<!doctype html><body><script src="${id}.js"></script>`);
    const page = await browser.newPage();
    page.on('pageerror', e => console.error(id, 'PAGEERROR', e.message));
    await page.goto('file://' + path.join(out, `${id}.html`));
    await page.waitForFunction(() => document.title === 'done', null, { timeout: 60000 });
    report.results[id] = await page.evaluate(() => window.__r);
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
})();
