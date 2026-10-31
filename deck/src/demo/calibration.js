// Calibration mode for the presentation laptop (key K on the boss slide).
// Runs rounds 1–3 five times each with auto-type, with ONE setting (cells × µs per cell) for
// all three rounds. It stops at the first setting where round 2 is S in ≥ 4/5 AND round 1 is
// still C in ≥ 4/5. If round 2 fails, it looks at the measured breakdown of round 2's worst
// frames (demo/phases.js):
//   - mostly commit + style/layout/paint (DOM size) → fewer cells (next CELL_LEVEL), and more
//     µs per cell so that cells × µs (the render work) stays about the same;
//   - mostly render → 2 µs less per cell (the same step as the [ key).
// If nothing works, it says so. Everything here reads real results; nothing is simulated.
import { CELL_LEVELS } from './dragon.js';

const RUNS = 5;
const STEP = 2; // µs, same as [ and ]
const MIN_WORK = 2;
const MAX_WORK = 80;
const PASS = 4;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function showChecklist(panel, work, cells) {
  if (!panel) return;
  panel.className = 'boss-calib is-on';
  panel.innerHTML = `
    <div class="bc-title">CALIBRATION</div>
    <div class="bc-sub">for this laptop and this screen · starts at ${cells.toLocaleString('en-US')} cells × ${work} µs</div>
    <ul class="bc-list">
      <li>☐ laptop on power (charger plugged in)</li>
      <li>☐ battery saver / low-power mode OFF</li>
      <li>☐ other apps closed</li>
      <li>☐ external monitor connected, like the projector</li>
      <li>☐ Chrome in fullscreen (F11 / ⌃⌘F)</li>
    </ul>
    <div class="bc-go blink">press K again to start · Esc to cancel</div>
    <div class="bc-note">Runs rounds 1–3 × ${RUNS}, about 2–3 minutes per setting. Don't touch the keyboard.</div>`;
}

export function runCalibration({ panel, game, setMode, autoType, getWork, setWork, getCells, setCells, modes, onDone }) {
  const ctl = { running: true, cancelled: false };
  ctl.cancel = () => {
    ctl.cancelled = true;
    ctl.running = false;
  };
  const rows = []; // { cells, work, ranks: [[r1…], [r2…], [r3…]], why }

  const render = (status, chosen = null, verdict = '') => {
    if (!panel) return;
    panel.className = 'boss-calib is-on';
    const cells = (ranks) => ranks.map((r) => `<span class="bc-rank rank-${r}">${r}</span>`).join('');
    panel.innerHTML = `
      <div class="bc-title">CALIBRATION</div>
      <div class="bc-sub">${status}</div>
      <table class="bc-table">
        <tr><th>cells × µs</th><th>R1</th><th>R2</th><th>R3</th><th>R2 worst frame</th></tr>
        ${rows.map((row) => `<tr><td>${row.cells.toLocaleString('en-US')} × ${row.work}</td><td>${cells(row.ranks[0])}</td><td>${cells(row.ranks[1])}</td><td>${cells(row.ranks[2])}</td><td class="bc-why">${row.why || ''}</td></tr>`).join('')}
      </table>
      ${chosen !== null ? `<div class="bc-chosen">${chosen.cells.toLocaleString('en-US')} × ${chosen.work} µs</div><div class="bc-reuse">Reuse it: open <b>index.html?work=${chosen.work}&amp;cells=${chosen.cells}</b><br>[ and ] still change µs by hand.</div>` : ''}
      ${verdict ? `<div class="bc-verdict">${verdict}</div>` : ''}
      ${ctl.running ? '<div class="bc-note">K or Esc cancels</div>' : '<div class="bc-note">Esc closes this panel</div>'}`;
  };

  async function playRound(index) {
    setMode(index);
    await wait(1500);
    if (ctl.cancelled) return null;
    game().reset();
    await wait(400);
    autoType();
    const t0 = performance.now();
    while (!ctl.cancelled && game().state.phase !== 'result') {
      if (performance.now() - t0 > 30000) return 'timeout';
      await wait(100);
    }
    if (ctl.cancelled) return null;
    const r = game().state.result;
    await wait(1200);
    return r || { rank: '?' };
  }

  (async () => {
    let work = getWork();
    let cells = getCells();
    let chosen = null;
    let verdict = '';
    while (!ctl.cancelled) {
      setWork(work);
      setCells(cells);
      const row = { cells, work, ranks: [[], [], []], results: [[], [], []] };
      rows.push(row);
      for (let run = 1; run <= RUNS && !ctl.cancelled; run++) {
        for (let i = 0; i < modes.length && !ctl.cancelled; i++) {
          render(`${cells.toLocaleString('en-US')} cells × ${work} µs · run ${run}/${RUNS} · round ${i + 1}`);
          const res = await playRound(i);
          if (res && res !== 'timeout') {
            row.ranks[i].push(res.rank);
            row.results[i].push(res);
          } else if (res === 'timeout') row.ranks[i].push('?');
        }
      }
      if (ctl.cancelled) break;
      const r1C = row.ranks[0].filter((r) => r === 'C').length;
      const r2S = row.ranks[1].filter((r) => r === 'S').length;
      // Where did round 2's worst frames go? (sum over the 5 runs)
      const sum = { render: 0, dom: 0, n: 0 };
      for (const res of row.results[1]) {
        const w = res.phases?.worst;
        if (!w) continue;
        sum.render += w.render;
        sum.dom += w.commit + w.styleLayoutPaint;
        sum.n++;
      }
      const domHeavy = sum.n === 0 || sum.dom >= sum.render;
      row.why = sum.n ? `render ${Math.round(sum.render / sum.n)} · DOM ${Math.round(sum.dom / sum.n)} ms` : 'no long frame';
      if (r2S >= PASS && r1C >= PASS) {
        chosen = { cells, work };
        verdict = `Round 2 is S in ${r2S}/${RUNS} and round 1 is C in ${r1C}/${RUNS} with ${cells.toLocaleString('en-US')} cells × ${work} µs.`;
        break;
      }
      if (r2S >= PASS && r1C < PASS) {
        verdict = `No setting works on this machine: round 2 is already S, but round 1 is C in only ${r1C}/${RUNS}. Less work would make round 1 even smoother. The demo can't show a clear difference here.`;
        break;
      }
      const nextCells = CELL_LEVELS[CELL_LEVELS.indexOf(cells) + 1];
      if (nextCells && domHeavy) {
        // Long frames are the DOM (commit + style/layout/paint): fewer cells, same render work.
        work = Math.min(MAX_WORK, Math.round((work * cells) / nextCells));
        cells = nextCells;
      } else if (nextCells) {
        // Long frames are render: fewer cells at the same µs = less render work AND a smaller DOM.
        // (A long render inside a transition can be a Scheduler timeout: CLAIMS C11.)
        cells = nextCells;
      } else if (work - STEP >= MIN_WORK) {
        work -= STEP;
      } else {
        verdict = `No setting works on this machine: even with ${cells.toLocaleString('en-US')} cells × ${work} µs, round 2 is S in only ${r2S}/${RUNS}.`;
        break;
      }
    }
    ctl.running = false;
    if (ctl.cancelled) render('cancelled');
    else render(chosen !== null ? 'done' : 'done: no setting found', chosen, verdict);
    onDone?.();
  })();

  return ctl;
}
