// REPLAY step: the real scheduler timeline of one finished round, drawn big for the back row.
// Everything comes from the round's trace (raw events from the event log + frame times).
//   keys       ▼ per keystroke; red if its text needed more than 50 ms to show (a bite)
//   React      yellow = one synchronous render (keystroke → its text on screen)
//              green  = a Scheduler slice (a transition / deferred render, 5 ms each)
//              red ×  = a render thrown away before it committed (restart from the root)
//   frames     each gap between two frames; red when it is longer than 50 ms
// Top: the whole round. Bottom: 300 ms around the worst keystroke, zoomed.
const W = 1840;
const H = 840;
const LABEL_W = 230;
const PLOT = W - LABEL_W - 30;
const JANK = 50;

function analyse(trace) {
  const ev = trace.events;
  const keys = [];
  const keyBySeq = new Map();
  const sync = [];
  const slices = [];
  const thrown = [];
  const open = new Map();
  let lastAttempt = null;
  for (const e of ev) {
    if (e.type === 'key') {
      const k = { t: e.t, ts: e.ts, seq: e.seq };
      keys.push(k);
      keyBySeq.set(e.seq, k);
    } else if (e.type === 'text:commit' && keyBySeq.has(e.seq)) {
      const k = keyBySeq.get(e.seq);
      if (!k.commitT) {
        k.commitT = e.t;
        sync.push([k.t, e.t]);
      }
    } else if (e.type === 'task:start') open.set(e.id, e);
    else if ((e.type === 'task:yield' || e.type === 'task:end') && open.has(e.id)) {
      const s = open.get(e.id);
      if (s.pri >= 3) slices.push([s.t, e.t]);
      open.delete(e.id);
    } else if (e.type === 'render:attempt') {
      if (lastAttempt && !lastAttempt.committed) thrown.push([lastAttempt.t, e.t]);
      lastAttempt = { t: e.t, committed: false };
    } else if (e.type === 'render:commit' && lastAttempt) lastAttempt.committed = true;
  }
  // latency of each key: first frame after its text commit − event.timeStamp
  const frames = trace.frames;
  for (const k of keys) {
    if (!k.commitT) continue;
    const f = frames.find((t) => t > k.commitT);
    if (f) k.latency = f - k.ts;
  }
  const gaps = [];
  for (let i = 1; i < frames.length; i++) gaps.push([frames[i - 1], frames[i]]);
  return { keys, sync, slices, thrown, gaps };
}

function lanes(g, a, t0, t1, top, scale) {
  const x = (t) => LABEL_W + ((t - t0) / (t1 - t0)) * PLOT;
  const clip = ([s, e]) => [Math.max(s, t0), Math.min(e, t1)];
  const rows = { keys: top, react: top + 70, frames: top + 160 };
  g.font = '34px DotGothic16';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillStyle = '#c9cdf5';
  g.fillText('keys', 20, rows.keys + 20);
  g.fillText('React', 20, rows.react + 30);
  g.fillText('frames', 20, rows.frames + 24);
  // React work
  for (const iv of a.sync) {
    const [s, e] = clip(iv);
    if (e <= s) continue;
    g.fillStyle = '#ffd166';
    g.fillRect(x(s), rows.react, Math.max(2, x(e) - x(s)), 60);
  }
  for (const iv of a.slices) {
    const [s, e] = clip(iv);
    if (e <= s) continue;
    g.fillStyle = '#34e0a1';
    g.fillRect(x(s), rows.react + 8, Math.max(scale > 1 ? 3 : 1, x(e) - x(s) - (scale > 1 ? 2 : 0)), 44);
  }
  for (const iv of a.thrown) {
    const [s, e] = clip(iv);
    if (e <= s) continue;
    g.strokeStyle = '#ff5d73';
    g.lineWidth = 4;
    g.strokeRect(x(s), rows.react - 4, Math.max(4, x(e) - x(s)), 68);
    if (scale > 1) {
      g.fillStyle = '#ff5d73';
      g.font = '34px DotGothic16';
      g.fillText('×', x(e) - 22, rows.react - 22);
    }
  }
  // frames
  for (const [s, e] of a.gaps) {
    if (e < t0 || s > t1) continue;
    const long = e - s > JANK;
    g.fillStyle = long ? '#ff5d73' : '#3b8f6a';
    if (long) g.fillRect(x(Math.max(s, t0)), rows.frames, Math.max(3, x(Math.min(e, t1)) - x(Math.max(s, t0)) - 2), 48);
    else g.fillRect(x(e) - 1, rows.frames + 8, scale > 1 ? 3 : 1, 32);
    if (long && e - s >= 100 && x(e) - x(s) > 80) {
      g.fillStyle = '#ffffff';
      g.font = '32px DotGothic16';
      g.textAlign = 'center';
      g.fillText(`${Math.round(e - s)} ms`, (x(Math.max(s, t0)) + x(Math.min(e, t1))) / 2, rows.frames + 76);
      g.textAlign = 'left';
    }
  }
  // keys
  for (const k of a.keys) {
    if (k.t < t0 || k.t > t1) continue;
    const bite = k.latency > JANK;
    g.fillStyle = bite ? '#ff5d73' : '#34e0a1';
    const kx = x(k.t);
    g.beginPath();
    g.moveTo(kx - 12, rows.keys);
    g.lineTo(kx + 12, rows.keys);
    g.lineTo(kx, rows.keys + 28);
    g.closePath();
    g.fill();
  }
  return x;
}

export function drawReplay(canvas, trace, takeaway) {
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#070a24';
  g.fillRect(0, 0, W, H);
  if (!trace) {
    g.fillStyle = '#c9cdf5';
    g.font = '48px DotGothic16';
    g.textAlign = 'center';
    g.fillText('Play the round first (previous step, key A).', W / 2, H / 2);
    return null;
  }
  const a = analyse(trace);
  const t0 = trace.t0 - 50;
  const t1 = Math.max(trace.t1, ...trace.frames.slice(-1)) + 50;
  // whole round
  g.fillStyle = '#ffffff';
  g.font = '36px DotGothic16';
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillText(`whole round · ${((t1 - t0) / 1000).toFixed(1)} s`, LABEL_W, 40);
  lanes(g, a, t0, t1, 64, 1);
  // zoom: 300 ms around the worst key
  const worst = a.keys.filter((k) => k.latency).reduce((m, k) => (!m || k.latency > m.latency ? k : m), null);
  const center = worst ? worst.t + Math.min(150, worst.latency / 2) : (t0 + t1) / 2;
  const z0 = center - 150;
  const z1 = center + 150;
  g.fillStyle = '#ffffff';
  g.font = '36px DotGothic16';
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillText(`zoom · 300 ms around the worst key${worst ? ` (${Math.round(worst.latency)} ms)` : ''}`, LABEL_W, 400);
  // a bracket on the whole-round view showing where the zoom is
  const xw = (t) => LABEL_W + ((t - t0) / (t1 - t0)) * PLOT;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 3;
  g.strokeRect(xw(z0), 56, Math.max(6, xw(z1) - xw(z0)), 300);
  g.strokeRect(LABEL_W - 4, 420, PLOT + 8, 300);
  lanes(g, a, z0, z1, 436, 2);
  // legend + takeaway
  g.textBaseline = 'middle';
  g.font = '32px DotGothic16';
  const legend = [
    ['#ffd166', 'sync render'],
    ['#34e0a1', '5 ms slice'],
    ['#ff5d73', 'long frame / bite / thrown away'],
  ];
  let lx = LABEL_W;
  for (const [c, t] of legend) {
    g.fillStyle = c;
    g.fillRect(lx, 756, 28, 28);
    g.fillStyle = '#c9cdf5';
    g.fillText(t, lx + 40, 771);
    lx += 64 + g.measureText(t).width + 40;
  }
  g.fillStyle = '#ffd166';
  g.font = '44px DotGothic16';
  g.textAlign = 'center';
  g.fillText(takeaway, W / 2, 818);
  return {
    keys: a.keys.length,
    bites: a.keys.filter((k) => k.latency > JANK).length,
    syncRenders: a.sync.length,
    slices: a.slices.length,
    thrown: a.thrown.length,
    longFrames: a.gaps.filter(([s, e]) => e - s > JANK).length,
    worstKeyMs: worst ? Math.round(worst.latency) : null,
  };
}
