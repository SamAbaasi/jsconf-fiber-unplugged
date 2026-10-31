// The live monitor for the boss fight. Runs one requestAnimationFrame loop that
// draws the game world, the FPS meter and the scheduler timeline, outside React.
// Because everything here runs on the main thread, it freezes when React blocks
// the main thread. That freeze is the thing we want the audience to see.
import { readSince } from '../instrument/eventLog.js';
import { ARENA } from './game.js';

const WINDOW_MS = 3000;
const PRI_COLOR = { 1: '#ffd166', 2: '#ff5d73', 3: '#34e0a1', 4: '#4cc9f0', 5: '#a3a9c2' };
const PRI_NAME = { 1: 'Immediate', 2: 'UserBlocking', 3: 'Normal', 4: 'Low', 5: 'Idle' };

export function startMonitor(els, game) {
  const state = {
    frames: [], // rAF timestamps
    tasks: new Map(), // id -> { pri, kind, slices: [{start, end}], open }
    attempts: [], // { start, end, q, sync, status: 'running'|'committed'|'discarded' }
    keys: [], // timestamps
    readIndex: 0,
    committed: 0,
    discarded: 0,
    slicesTotal: 0,
    lastStatsAt: 0,
  };
  // Only look at events from now on.
  state.readIndex = readSince(Infinity, () => {});

  let raf = 0;
  let prev = performance.now();
  const fx = els.fx ? els.fx.getContext('2d') : null;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    state.frames.push(now);
    while (state.frames.length && state.frames[0] < now - WINDOW_MS) state.frames.shift();
    ingest(state, now, game);
    if (game) {
      game.frame(now, prev);
      if (fx) game.draw(fx, now);
    }
    prev = now;
    if (els.world) drawWorld(els.world, now);
    if (els.timeline) drawTimeline(els.timeline, state, now);
    if (els.fpsGraph) drawFpsGraph(els.fpsGraph, state, now);
    if (now - state.lastStatsAt > 200) {
      state.lastStatsAt = now;
      writeStats(els, state, now);
    }
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

function ingest(state, now, game) {
  state.readIndex = readSince(state.readIndex, (e) => {
    switch (e.type) {
      case 'task:start': {
        let task = state.tasks.get(e.id);
        if (!task) state.tasks.set(e.id, (task = { pri: e.pri, kind: e.kind, slices: [] }));
        task.open = { start: e.t, end: null };
        task.slices.push(task.open);
        break;
      }
      case 'task:yield':
      case 'task:end': {
        const task = state.tasks.get(e.id);
        if (task && task.open) {
          task.open.end = e.t;
          task.open = null;
          if (task.kind === 'render') {
            state.slicesTotal++;
            game?.onSliceEnd(e.t);
          }
        }
        break;
      }
      case 'render:attempt': {
        const last = state.attempts[state.attempts.length - 1];
        if (last && last.status === 'running') {
          // A new attempt started before the last one committed: React threw it away.
          last.status = 'discarded';
          last.end = e.t;
          state.discarded++;
          game?.onDiscard(e.t);
        }
        state.attempts.push({ start: e.t, end: null, q: e.q, sync: e.task === null, status: 'running' });
        game?.onAttempt(e);
        break;
      }
      case 'render:commit': {
        const last = state.attempts[state.attempts.length - 1];
        if (last && last.status === 'running') {
          last.status = 'committed';
          last.end = e.t;
          state.committed++;
          game?.onCommit(e);
        }
        break;
      }
      case 'key':
        state.keys.push(e.t);
        game?.onKey(e);
        break;
      case 'text:commit':
        game?.onTextCommit(e);
        break;
      case 'typing:start':
        game?.onTypingStart(e.total);
        break;
      case 'typing:end':
        game?.onTypingEnd(e.seq);
        break;
      default:
        break;
    }
  });
  const cutoff = now - WINDOW_MS;
  for (const [id, task] of state.tasks) {
    const lastSlice = task.slices[task.slices.length - 1];
    if (!task.open && (!lastSlice || lastSlice.end < cutoff)) state.tasks.delete(id);
  }
  while (state.attempts.length > 1 && state.attempts[0].end !== null && state.attempts[0].end < cutoff) state.attempts.shift();
  while (state.keys.length && state.keys[0] < cutoff) state.keys.shift();
}

// ---------- arena background ----------

let worldCache = null;
function worldLayers(w, h) {
  if (worldCache && worldCache.w === w && worldCache.h === h) return worldCache;
  const sky = document.createElement('canvas');
  sky.width = w;
  sky.height = h;
  const s = sky.getContext('2d');
  const bands = ['#120f45', '#1b1660', '#24206f', '#2f2c86', '#3b3a9c', '#4a4bb0'];
  bands.forEach((c, i) => {
    s.fillStyle = c;
    s.fillRect(0, (i * ARENA.groundY) / bands.length, w, ARENA.groundY / bands.length + 1);
  });
  // Pixel stars, fixed positions.
  s.fillStyle = '#ffffff';
  for (let i = 0; i < 60; i++) s.fillRect((i * 197) % w, (i * 89) % 300, i % 7 ? 3 : 6, i % 7 ? 3 : 6);
  // Hills
  s.fillStyle = '#231d66';
  for (let x = 0; x < w; x += 8) {
    const y = ARENA.groundY - 150 + Math.round((Math.sin(x / 90) * 30 + Math.sin(x / 37) * 10) / 8) * 8;
    s.fillRect(x, y, 8, ARENA.groundY - y);
  }
  // Ground
  for (let x = 0, k = 0; x < w; x += 32, k++) {
    s.fillStyle = k % 2 ? '#2f7a3e' : '#38904a';
    s.fillRect(x, ARENA.groundY, 32, h - ARENA.groundY);
  }
  s.fillStyle = '#5fd47a';
  s.fillRect(0, ARENA.groundY, w, 6);
  worldCache = { w, h, sky };
  return worldCache;
}

function drawWorld(canvas, now) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(worldLayers(w, h).sky, 0, 0);
  // Two clouds drifting: they only move when frames run.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 2; i++) {
    const x = Math.round(((now * (0.02 + i * 0.015) + i * 500) % (w + 300)) - 300);
    const y = 80 + i * 90;
    ctx.fillRect(x, y, 220, 32);
    ctx.fillRect(x + 40, y - 24, 120, 24);
  }
}

// ---------- FPS graph ----------

function drawFpsGraph(canvas, state, now) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#0a0f2e';
  ctx.fillRect(0, 0, w, h);
  const maxMs = 200;
  const y16 = h - (16.7 / maxMs) * h;
  ctx.fillStyle = '#2a356f';
  ctx.fillRect(0, Math.round(y16), w, 2);
  const f = state.frames;
  const bars = Math.min(f.length - 1, 150);
  const bw = w / 150;
  for (let i = 0; i < bars; i++) {
    const k = f.length - 1 - i;
    const dt = f[k] - f[k - 1];
    const bh = Math.min(h, (dt / maxMs) * h);
    ctx.fillStyle = dt > 50 ? '#ff5d73' : dt > 20 ? '#ffd166' : '#34e0a1';
    ctx.fillRect(w - (i + 1) * bw, h - bh, Math.max(1, bw - 1), bh);
  }
}

// ---------- scheduler timeline ----------

const LANES = [
  { label: 'keys', y: 6 },
  { label: 'render', y: 40 },
  { label: 'tasks', y: 80 },
  { label: 'frames', y: 132 },
];
const ZOOM_MS = 120;
const ZOOM_Y = 196;

function drawTimeline(canvas, state, now) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const labelW = 112;
  const plotW = w - labelW - 8;
  const x = (t) => labelW + ((t - (now - WINDOW_MS)) / WINDOW_MS) * plotW;
  const pxPerMs = plotW / WINDOW_MS;

  ctx.fillStyle = '#0a0f2e';
  ctx.fillRect(0, 0, w, h);
  ctx.font = '24px "JetBrains Mono", monospace';
  ctx.textBaseline = 'middle';

  // Lane labels and grid (one line every 500 ms).
  ctx.fillStyle = '#7d86c4';
  for (const lane of LANES) ctx.fillText(lane.label, 6, lane.y + 14);
  ctx.fillStyle = '#18204f';
  for (let t = Math.ceil((now - WINDOW_MS) / 500) * 500; t < now; t += 500) ctx.fillRect(Math.round(x(t)), 0, 1, ZOOM_Y - 22);

  // input: one marker per keystroke
  ctx.fillStyle = '#ffd166';
  for (const t of state.keys) {
    const kx = x(t);
    ctx.beginPath();
    ctx.moveTo(kx - 7, LANES[0].y + 4);
    ctx.lineTo(kx + 7, LANES[0].y + 4);
    ctx.lineTo(kx, LANES[0].y + 22);
    ctx.fill();
  }

  // React render attempts
  const ry = LANES[1].y;
  for (const a of state.attempts) {
    const end = a.end ?? now;
    const x0 = Math.max(labelW, x(a.start));
    const x1 = Math.max(x0 + 2, x(end));
    if (a.status === 'discarded') {
      ctx.fillStyle = 'rgba(255,93,115,0.35)';
      ctx.fillRect(x0, ry, x1 - x0, 28);
      ctx.strokeStyle = '#ff5d73';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1 - 9, ry + 5);
      ctx.lineTo(x1 + 1, ry + 23);
      ctx.moveTo(x1 + 1, ry + 5);
      ctx.lineTo(x1 - 9, ry + 23);
      ctx.stroke();
    } else if (a.sync) {
      // Ran outside any Scheduler task: a sync (S-rank) render in a microtask.
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(x0, ry, x1 - x0, 28);
    } else {
      ctx.strokeStyle = '#34e0a1';
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 + 1, ry + 1, x1 - x0 - 2, 26);
    }
    if (a.status === 'committed') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x1 - 2, ry - 4, 4, 36);
    }
  }

  // Scheduler task slices (3 s view)
  const sy = LANES[2].y;
  forEachSlice(state, now, (task, s0, s1) => {
    const x0 = Math.max(labelW, x(s0));
    const x1 = x(s1);
    if (x1 < labelW) return;
    const render = task.kind === 'render';
    ctx.fillStyle = render ? PRI_COLOR[task.pri] : '#4cc9f0';
    ctx.fillRect(x0, sy + (render ? 0 : 26), Math.max(2, x1 - x0 - 1), render ? 40 : 14);
  });

  // Frames: one tick per rAF; a long gap is a red block
  const fy = LANES[3].y;
  const f = state.frames;
  for (let i = 1; i < f.length; i++) {
    const dt = f[i] - f[i - 1];
    if (dt > 50) {
      ctx.fillStyle = '#ff5d73';
      ctx.fillRect(x(f[i - 1]), fy, dt * pxPerMs, 28);
    } else {
      ctx.fillStyle = dt > 20 ? '#ffd166' : '#34e0a1';
      ctx.fillRect(x(f[i]) - 1, fy + 4, 2, 20);
    }
  }

  // Zoom: the last 120 ms, big enough to see each 5 ms slice and the frames between.
  const zx = (t) => labelW + ((t - (now - ZOOM_MS)) / ZOOM_MS) * plotW;
  ctx.fillStyle = '#283270';
  ctx.fillRect(0, ZOOM_Y - 14, w, 2);
  ctx.fillStyle = '#7d86c4';
  ctx.fillText('zoom', 6, ZOOM_Y + 16);
  ctx.fillText('120ms', 6, ZOOM_Y + 46);
  forEachSlice(state, now, (task, s0, s1) => {
    if (s1 < now - ZOOM_MS) return;
    const x0 = Math.max(labelW, zx(s0));
    const x1 = zx(s1);
    const render = task.kind === 'render';
    ctx.fillStyle = render ? PRI_COLOR[task.pri] : '#4cc9f0';
    ctx.fillRect(x0, ZOOM_Y + (render ? 0 : 40), Math.max(2, x1 - x0 - 2), render ? 56 : 16);
    if (render && x1 - x0 > 48) {
      ctx.fillStyle = '#00140c';
      ctx.fillText(`${(s1 - s0).toFixed(1)}`, x0 + 4, ZOOM_Y + 28);
    }
  });
  // Sync renders in the zoom lane (they have no task).
  for (const a of state.attempts) {
    if (!a.sync) continue;
    const end = a.end ?? now;
    if (end < now - ZOOM_MS) continue;
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(Math.max(labelW, zx(a.start)), ZOOM_Y, Math.max(2, zx(end) - Math.max(labelW, zx(a.start))), 56);
  }
  ctx.fillStyle = '#ffffff';
  for (let i = f.length - 1; i >= 0 && f[i] >= now - ZOOM_MS; i--) ctx.fillRect(zx(f[i]) - 1, ZOOM_Y + 60, 3, 22);
  ctx.fillStyle = '#7d86c4';
  ctx.fillText('▲ = frame', w - 150, ZOOM_Y + 104);
}

function forEachSlice(state, now, fn) {
  for (const task of state.tasks.values()) {
    for (const s of task.slices) fn(task, s.start, s.end ?? now);
  }
}

// ---------- numbers ----------

function writeStats(els, state, now) {
  const f = state.frames;
  const fps = f.filter((t) => t > now - 1000).length;
  let worst = 0;
  for (let i = 1; i < f.length; i++) worst = Math.max(worst, f[i] - f[i - 1]);
  set(els.fps, String(fps));
  if (els.fps) els.fps.dataset.level = fps >= 50 ? 'good' : fps >= 30 ? 'warn' : 'bad';
  set(els.worst, `${Math.round(worst)} ms`);
}

function set(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

export { PRI_NAME };
