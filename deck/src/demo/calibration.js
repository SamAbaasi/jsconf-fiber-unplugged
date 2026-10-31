// Calibration mode for the presentation laptop (key K on the boss slide).
// Runs rounds 1–3 five times each with auto-type, at one work value for all three rounds.
// If round 2 is not rank S in at least 4 of 5 runs, it lowers the work per cell by one step
// (the same step as the [ key) and runs again. It stops at the highest work value where
// round 2 is S in ≥ 4/5 AND round 1 is still C in ≥ 4/5. If no value does both, it says so.
// Everything here only reads real results from the game; nothing is simulated.

const RUNS = 5;
const STEP = 2; // µs, same as [ and ]
const MIN_WORK = 2;
const PASS = 4;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function showChecklist(panel, work) {
  if (!panel) return;
  panel.className = 'boss-calib is-on';
  panel.innerHTML = `
    <div class="bc-title">CALIBRATION</div>
    <div class="bc-sub">for this laptop and this screen · starts at ${work} µs per cell</div>
    <ul class="bc-list">
      <li>☐ laptop on power (charger plugged in)</li>
      <li>☐ battery saver / low-power mode OFF</li>
      <li>☐ other apps closed</li>
      <li>☐ external monitor connected, like the projector</li>
      <li>☐ Chrome in fullscreen (F11 / ⌃⌘F)</li>
    </ul>
    <div class="bc-go blink">press K again to start · Esc to cancel</div>
    <div class="bc-note">Runs rounds 1–3 × ${RUNS}, about 2–3 minutes per work value. Don't touch the keyboard.</div>`;
}

export function runCalibration({ panel, game, setMode, autoType, getWork, setWork, modes, onDone }) {
  const ctl = { running: true, cancelled: false };
  ctl.cancel = () => {
    ctl.cancelled = true;
    ctl.running = false;
  };
  const rows = []; // { work, ranks: [[r1…], [r2…], [r3…]] }

  const render = (status, chosen = null, verdict = '') => {
    if (!panel) return;
    panel.className = 'boss-calib is-on';
    const cells = (ranks) => ranks.map((r) => `<span class="bc-rank rank-${r}">${r}</span>`).join('');
    panel.innerHTML = `
      <div class="bc-title">CALIBRATION</div>
      <div class="bc-sub">${status}</div>
      <table class="bc-table">
        <tr><th>µs</th><th>R1</th><th>R2</th><th>R3</th></tr>
        ${rows.map((row) => `<tr><td>${row.work}</td><td>${cells(row.ranks[0])}</td><td>${cells(row.ranks[1])}</td><td>${cells(row.ranks[2])}</td></tr>`).join('')}
      </table>
      ${chosen !== null ? `<div class="bc-chosen">${chosen} µs</div><div class="bc-reuse">Reuse it: open <b>index.html?work=${chosen}</b><br>[ and ] still change it by hand.</div>` : ''}
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
    return r ? r.rank : '?';
  }

  (async () => {
    let work = getWork();
    let chosen = null;
    let verdict = '';
    while (!ctl.cancelled) {
      setWork(work);
      const row = { work, ranks: [[], [], []] };
      rows.push(row);
      for (let run = 1; run <= RUNS && !ctl.cancelled; run++) {
        for (let i = 0; i < modes.length && !ctl.cancelled; i++) {
          render(`work ${work} µs · run ${run}/${RUNS} · round ${i + 1}`);
          const rank = await playRound(i);
          if (rank) row.ranks[i].push(rank);
        }
      }
      if (ctl.cancelled) break;
      const r1C = row.ranks[0].filter((r) => r === 'C').length;
      const r2S = row.ranks[1].filter((r) => r === 'S').length;
      if (r2S >= PASS && r1C >= PASS) {
        chosen = work;
        verdict = `Round 2 is S in ${r2S}/${RUNS} and round 1 is C in ${r1C}/${RUNS} at ${work} µs.`;
        break;
      }
      if (r2S >= PASS && r1C < PASS) {
        verdict = `No value works on this machine: at ${work} µs round 2 is already S, but round 1 is C in only ${r1C}/${RUNS}. Less work would make round 1 even smoother. The demo can't show a clear difference here.`;
        break;
      }
      if (work - STEP < MIN_WORK) {
        verdict = `No value works on this machine: even at ${work} µs round 2 is S in only ${r2S}/${RUNS}.`;
        break;
      }
      work -= STEP;
    }
    ctl.running = false;
    if (ctl.cancelled) render('cancelled');
    else render(chosen !== null ? 'done' : 'done: no value found', chosen, verdict);
    onDone?.();
  })();

  return ctl;
}
