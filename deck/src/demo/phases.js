// Where does a long frame's time go? (Phase 3a, section 7)
// Uses Long Animation Frames (LoAF, CLAIMS L4: Chromium) for the frame's timeline, and
// our own marks for the React commit:
//   render:tail   = the last cell of the list rendered (end of the list's render phase)
//   render:commit = the list's layout effect ran (inside the commit)
// For one long frame:
//   style/layout/paint = frame end − styleAndLayoutStart
//   canvas (rAF)       = styleAndLayoutStart − renderStart (our monitor + game drawing)
//   commit             = Σ (render:commit − render:tail) for list commits inside the frame
//   render             = time React code ran in the frame (our marks, see reactIntervals) − commit
//   other              = the rest (gaps, GC, input dispatch the browser does not attribute)
// All numbers are measured. Nothing here is estimated or simulated.
import { eventLog } from '../instrument/eventLog.js';

const loafs = (globalThis.__loafs ||= []);
let started = false;

export function startPhaseObserver() {
  if (started) return;
  started = true;
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        loafs.push({
          start: e.startTime,
          duration: e.duration,
          renderStart: e.renderStart,
          styleStart: e.styleAndLayoutStart,
          blocking: e.blockingDuration,
          scripts: (e.scripts || []).map((s) => ({ invoker: s.invoker, type: s.invokerType, start: s.startTime, duration: s.duration })),
        });
        if (loafs.length > 600) loafs.shift();
      }
    });
    po.observe({ type: 'long-animation-frame', buffered: true });
    globalThis.__loafSupported = true;
  } catch {
    globalThis.__loafSupported = false;
  }
}

function events(t0, t1) {
  const out = [];
  const end = eventLog.n;
  for (let i = Math.max(0, end - eventLog.size); i < end; i++) {
    const e = eventLog.buf[i % eventLog.size];
    if (e && e.t >= t0 && e.t <= t1) out.push(e);
  }
  return out;
}

// Intervals when React code was running, from our own marks (LoAF does not attribute
// scripts on a file:// page, so we cannot use its script list):
//   - every Scheduler task: task:start → task:yield / task:end (transition slices, effects)
//   - every keystroke: key → text:commit of the same keystroke (its SyncLane render + commit,
//     which in round 1 includes the whole list)
function reactIntervals(ev) {
  const iv = [];
  const open = new Map();
  const keys = new Map();
  for (const e of ev) {
    if (e.type === 'task:start') open.set(e.id, e.t);
    else if ((e.type === 'task:yield' || e.type === 'task:end') && open.has(e.id)) {
      iv.push([open.get(e.id), e.t]);
      open.delete(e.id);
    } else if (e.type === 'key') keys.set(e.seq, e.t);
    else if (e.type === 'text:commit' && keys.has(e.seq)) {
      iv.push([keys.get(e.seq), e.t]);
      keys.delete(e.seq);
    }
  }
  return iv;
}

function overlap(iv, a, b) {
  // total length of the union of intervals, clipped to [a, b]
  const xs = iv.map(([s, e]) => [Math.max(s, a), Math.min(e, b)]).filter(([s, e]) => e > s).sort((x, y) => x[0] - y[0]);
  let total = 0;
  let cs = -Infinity;
  let ce = -Infinity;
  for (const [s, e] of xs) {
    if (s > ce) {
      if (ce > cs) total += ce - cs;
      cs = s;
      ce = e;
    } else ce = Math.max(ce, e);
  }
  if (ce > cs) total += ce - cs;
  return total;
}

const r = (v) => Math.max(0, Math.round(v));

function breakdown(f, ev, iv) {
  const end = f.start + f.duration;
  const style = f.styleStart > 0 ? end - f.styleStart : 0;
  const raf = f.styleStart > 0 && f.renderStart > 0 ? f.styleStart - f.renderStart : 0;
  // commit: render:tail → render:commit of the same keystroke, inside this frame
  let commit = 0;
  let lastTail = null;
  for (const e of ev) {
    if (e.t < f.start || e.t > end) continue;
    if (e.type === 'render:tail') lastTail = e;
    else if (e.type === 'render:commit' && lastTail && lastTail.seq === e.seq) {
      commit += e.t - lastTail.t;
      lastTail = null;
    }
  }
  const react = overlap(iv, f.start, f.styleStart > 0 ? f.renderStart || f.styleStart : end);
  const render = Math.max(0, react - commit);
  const other = f.duration - render - commit - style - raf;
  return { start: Math.round(f.start), duration: r(f.duration), render: r(render), commit: r(commit), styleLayoutPaint: r(style), canvas: r(raf), other: r(other) };
}

// Breakdown of the worst long frame in [t0, t1], plus totals over all long frames there.
export function analyzePhases(t0, t1) {
  if (!globalThis.__loafSupported) return { supported: false };
  const frames = loafs.filter((f) => f.start >= t0 - 50 && f.start <= t1);
  if (!frames.length) return { supported: true, count: 0 };
  const ev = events(t0 - 2000, t1 + 500);
  const iv = reactIntervals(ev);
  const all = frames.map((f) => breakdown(f, ev, iv));
  const worst = all.reduce((a, b) => (b.duration > a.duration ? b : a));
  const sum = (k) => all.reduce((a, b) => a + b[k], 0);
  return {
    supported: true,
    count: all.length,
    worst,
    totals: { duration: sum('duration'), render: sum('render'), commit: sum('commit'), styleLayoutPaint: sum('styleLayoutPaint'), canvas: sum('canvas'), other: sum('other') },
  };
}
