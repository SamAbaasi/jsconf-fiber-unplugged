import { memo, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Dialogue } from '../ui/Dialogue.jsx';
import { LINES } from '../content/lines.js';
import { spriteCanvas } from '../ui/Sprite.jsx';
import { TRUCK, TRUCK_PALETTE, TRUCK_LABEL_BOX } from '../sprites/truck.js';
import { ENGINEER, ENGINEER_PALETTE } from '../sprites/engineer.js';
import { FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import { burnIters, ensureCalibrated, itersFor } from '../demo/work.js';
import { play } from '../audio/sfx.js';
import '../styles/cold.css';

// The long task is real: on impact we run a synchronous React render
// (flushSync → SyncLane, never sliced: A1, A4, I4) of HEAVY_COUNT components,
// each doing about HEAVY_MICROS µs of real work, about 1.5 s in total.
// The number on screen is the measured gap between the two animation frames around it.
const HEAVY_COUNT = 5000;
const HEAVY_MICROS = 300;
const DRIVE_MS = 900;
const FLY_MS = 1100;
const GROUND = 700;
const ME = { x: 1180, scale: 12 }; // the engineer, and later Fiber-kun, stand here
const TRUCK_SCALE = 11;

const HeavyItem = ({ iters }) => {
  burnIters(iters);
  return <i />;
};

const HeavyLoad = memo(function HeavyLoad({ run }) {
  if (!run) return null;
  const iters = itersFor(HEAVY_MICROS);
  const items = new Array(HEAVY_COUNT);
  for (let i = 0; i < HEAVY_COUNT; i++) items[i] = <HeavyItem key={i} iters={iters} />;
  return <div className="heavy-load">{items}</div>;
});

// Tehran at night: generic mountains with snow, low buildings with lit windows. No landmarks.
let bgCache = null;
function background() {
  if (bgCache) return bgCache;
  const c = document.createElement('canvas');
  c.width = 1920;
  c.height = 1080;
  const g = c.getContext('2d');
  const bands = ['#0b0c2e', '#141443', '#1d1b58', '#28236b', '#352b7c'];
  bands.forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(0, i * 110, 1920, 111);
  });
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) g.fillRect((i * 211) % 1920, (i * 97) % 380, i % 9 ? 3 : 6, i % 9 ? 3 : 6);
  // mountains
  for (let x = 0; x < 1920; x += 8) {
    const h = 230 + Math.round((Math.sin(x / 210) * 70 + Math.sin(x / 73) * 25) / 8) * 8;
    const top = GROUND - 120 - h;
    g.fillStyle = '#4a3f9a';
    g.fillRect(x, top, 8, GROUND - top);
    g.fillStyle = '#c9cdf5';
    if (h > 270) g.fillRect(x, top, 8, Math.min(40, (h - 270) * 1.2));
  }
  // buildings
  let x = 0;
  let k = 0;
  while (x < 1920) {
    const w = 90 + ((k * 37) % 70);
    const h = 120 + ((k * 53) % 150);
    g.fillStyle = k % 2 ? '#1a1648' : '#211c57';
    g.fillRect(x, GROUND - h, w, h);
    g.fillStyle = '#ffd166';
    for (let wy = GROUND - h + 18; wy < GROUND - 20; wy += 34) {
      for (let wx = x + 14; wx < x + w - 14; wx += 26) if ((wx * 7 + wy * 3 + k) % 5 === 0) g.fillRect(wx, wy, 10, 14);
    }
    x += w + 6;
    k++;
  }
  // road; the lane dashes sit above the dialogue box
  g.fillStyle = '#26214f';
  g.fillRect(0, GROUND, 1920, 1080 - GROUND);
  g.fillStyle = '#3b2f8f';
  g.fillRect(0, GROUND, 1920, 8);
  g.fillStyle = '#ffd166';
  for (let dx = 40; dx < 1920; dx += 200) g.fillRect(dx, 742, 100, 10);
  bgCache = c;
  return c;
}

function drawTruck(ctx, x, label) {
  const img = spriteCanvas(TRUCK, TRUCK_PALETTE, TRUCK_SCALE);
  const y = GROUND - img.height;
  ctx.drawImage(img, Math.round(x), y);
  const b = TRUCK_LABEL_BOX;
  ctx.fillStyle = '#120c2c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '34px DotGothic16';
  const cx = x + (b.x + b.w / 2) * TRUCK_SCALE;
  const cy = y + (b.y + b.h / 2) * TRUCK_SCALE;
  ctx.fillText('LONG TASK', cx, cy - (label ? 18 : 0));
  if (label) ctx.fillText(label, cx, cy + 24);
}

function drawBonk(ctx, x, y) {
  // A cartoon "impact star" made of pixel rays.
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    for (let r = 30; r < 90; r += 12) ctx.fillRect(Math.round(x + Math.cos(a) * r) - 6, Math.round(y + Math.sin(a) * r) - 6, 12, 12);
  }
  ctx.font = '64px DotGothic16';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#120c2c';
  ctx.fillText('BONK!', x + 4, y - 110 + 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BONK!', x, y - 110);
}

export function Truck({ step, preview }) {
  const canvasRef = useRef(null);
  // Calibrate now, so the calibration never runs inside the measured frame.
  useState(ensureCalibrated);
  const [run, setRun] = useState(0);
  const [frozen, setFrozen] = useState(null); // measured ms, or null
  const scene = useRef({ startedAt: 0, impactDone: false, impactEnd: 0, frozenMs: null, frames: [] });
  const stepRef = useRef(step);
  stepRef.current = step;

  // Step 0 resets the scene; step ≥ 1 starts the drive (once).
  useEffect(() => {
    const s = scene.current;
    if (step === 0) {
      Object.assign(s, { startedAt: 0, impactDone: false, impactEnd: 0, frozenMs: null });
      setFrozen(null);
    } else if (!s.startedAt) {
      s.startedAt = performance.now();
    }
  }, [step]);

  useEffect(() => {
    if (preview) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const s = scene.current;
    let raf = 0;
    let impactTs = 0;

    const frame = (ts) => {
      raf = requestAnimationFrame(frame);
      // Measure the frozen frame: the gap from the impact frame to the next one.
      if (impactTs && s.frozenMs === null) {
        s.frozenMs = Math.round(ts - impactTs);
        s.impactEnd = ts;
        setFrozen(s.frozenMs);
        play('hit');
      }
      s.frames.push(ts);
      while (s.frames.length && s.frames[0] < ts - 1000) s.frames.shift();

      ctx.drawImage(background(), 0, 0);
      const truckW = TRUCK[0].length * TRUCK_SCALE;
      const impactX = ME.x - truckW + 40;
      const st = stepRef.current;

      // The engineer, then (after the flash) Fiber-kun.
      if (!s.impactDone) {
        const img = spriteCanvas(ENGINEER.typing[Math.floor(ts / 260) % 2], ENGINEER_PALETTE, ME.scale);
        ctx.drawImage(img, ME.x, GROUND - img.height);
      } else if (s.frozenMs !== null && ts - s.impactEnd < FLY_MS) {
        // Cartoon launch: up and away, spinning, with stars. Nobody gets hurt.
        const p = (ts - s.impactEnd) / FLY_MS;
        const img = spriteCanvas(ENGINEER.dazed, ENGINEER_PALETTE, ME.scale);
        ctx.save();
        ctx.translate(ME.x + 96 + p * 520, GROUND - 150 - Math.sin(p * Math.PI) * 420 - p * 260);
        ctx.rotate(p * Math.PI * 3);
        ctx.globalAlpha = 1 - p * 0.6;
        ctx.drawImage(img, -96, -144);
        ctx.restore();
      } else if (st >= 2) {
        const img = spriteCanvas(FIBER_KUN.idle[Math.floor(ts / 400) % 2], PALETTE, 12);
        ctx.drawImage(img, ME.x, GROUND - img.height);
      }

      // The truck: hidden until it drives in.
      if (s.startedAt) {
        const p = Math.min(1, (ts - s.startedAt) / DRIVE_MS);
        const x = -truckW + (impactX + truckW) * p * p;
        drawTruck(ctx, x, s.frozenMs !== null ? `${s.frozenMs.toLocaleString('en-US')} ms` : '');
        if (p >= 1 && !s.impactDone) {
          s.impactDone = true;
          // Draw the impact frame first: this is the picture that stays on screen while frozen.
          const img = spriteCanvas(ENGINEER.dazed, ENGINEER_PALETTE, ME.scale);
          ctx.drawImage(img, ME.x + 30, GROUND - img.height - 20);
          drawBonk(ctx, ME.x + 40, GROUND - 200);
          impactTs = ts;
          // The real long task: a synchronous React render of HEAVY_COUNT components.
          flushSync(() => setRun((r) => r + 1));
        }
      }

      // Frames per second of this very page, over the last second. It drops after the freeze.
      ctx.textAlign = 'right';
      ctx.font = '40px DotGothic16';
      ctx.fillStyle = s.frames.length >= 50 ? '#34e0a1' : '#ff5d73';
      ctx.fillText(`${s.frames.length} fps (last 1 s)`, 1860, 70);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [preview]);

  return (
    <div className="truck-slide">
      <canvas ref={canvasRef} width={1920} height={1080} className="truck-canvas pixelated" />
      {frozen !== null && (
        <div className="truck-frozen pop-in">
          FROZEN FRAME
          <b>{frozen.toLocaleString('en-US')} ms</b>
        </div>
      )}
      {step >= 2 && <div className="truck-flash" />}
      {step === 0 && <Dialogue line={LINES.tehran} preview={preview} />}
      {step === 1 && frozen !== null && <Dialogue line={LINES.truckAfter} preview={preview} />}
      {step >= 2 && <Dialogue line={LINES.wakeUp} preview={preview} />}
      <div className="heavy-host" aria-hidden="true">
        <HeavyLoad run={run} />
      </div>
    </div>
  );
}
