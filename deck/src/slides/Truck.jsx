import { memo, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Dialogue } from '../ui/Dialogue.jsx';
import { LINES } from '../content/lines.js';
import { spriteCanvas } from '../ui/Sprite.jsx';
import { TRUCK, TRUCK_PALETTE, TRUCK_LABEL_BOX } from '../sprites/truck.js';
import { FIBER_KUN, PALETTE, SALARYMAN, BRIEFCASE } from '../sprites/fiberkun.js';
import { drawSword } from '../sprites/sword.js';
import { burnIters, ensureCalibrated, itersFor } from '../demo/work.js';
import { play } from '../audio/sfx.js';
import '../styles/cold.css';

// The long task is real: on impact we run a synchronous React render
// (flushSync → SyncLane, never sliced: A1, A4, I4) of HEAVY_COUNT components,
// each doing about HEAVY_MICROS µs of real work, about 1.2–1.5 s in total.
// The number on screen is the measured gap between the two animation frames around it.
const HEAVY_COUNT = 5000;
const HEAVY_MICROS = 260;
const DRIVE_MS = 450; // fast entrance: no dead air
const FLY_MS = 1100;
const GROUND = 700;
const ME = { x: 1400, scale: 12 }; // the salaryman (previous life), later Fiber-kun, stands here
const TRUCK_SCALE = 36; // 576 px tall: three times the character (192 px)

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

// Another world: an original pixel field with a castle. Bright, daytime, fantasy.
let worldCache = null;
function otherWorld() {
  if (worldCache) return worldCache;
  const c = document.createElement('canvas');
  c.width = 1920;
  c.height = 1080;
  const g = c.getContext('2d');
  ['#4cc9f0', '#6fd3f3', '#93ddf5', '#b7e8f7', '#d8f2fa'].forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(0, i * 120, 1920, 121);
  });
  g.fillStyle = '#fff3b0';
  g.fillRect(1560, 90, 120, 120);
  g.fillStyle = '#ffffff';
  for (const [x, y, w] of [[200, 140, 260], [760, 90, 200], [1180, 210, 300]]) {
    g.fillRect(x, y, w, 40);
    g.fillRect(x + 40, y - 30, w - 100, 30);
  }
  // far hills
  for (let x = 0; x < 1920; x += 8) {
    const h = 120 + Math.round((Math.sin(x / 160) * 50 + Math.sin(x / 61) * 15) / 8) * 8;
    g.fillStyle = '#5fbf6a';
    g.fillRect(x, GROUND - h, 8, h);
  }
  // castle (generic towers, flags)
  const cx = 360;
  g.fillStyle = '#c9c3e8';
  g.fillRect(cx, GROUND - 330, 300, 230);
  for (const tx of [cx - 40, cx + 120, cx + 280]) {
    g.fillRect(tx, GROUND - 420, 60, 320);
    for (let k = 0; k < 3; k++) g.fillRect(tx + k * 24, GROUND - 444, 12, 24);
    g.fillStyle = '#ff5d73';
    g.fillRect(tx + 26, GROUND - 500, 6, 56);
    g.fillRect(tx + 32, GROUND - 500, 34, 22);
    g.fillStyle = '#c9c3e8';
  }
  g.fillStyle = '#6b5bd1';
  g.fillRect(cx + 120, GROUND - 200, 60, 100);
  g.fillStyle = '#3b2f8f';
  for (let k = 0; k < 4; k++) g.fillRect(cx + 30 + k * 70, GROUND - 290, 16, 28);
  // near field and flowers
  g.fillStyle = '#3b8f4a';
  g.fillRect(0, GROUND - 100, 1920, 100);
  g.fillStyle = '#46a957';
  g.fillRect(0, GROUND, 1920, 1080 - GROUND);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = ['#ffd166', '#ff9fb2', '#ffffff'][i % 3];
    g.fillRect((i * 277) % 1900, GROUND + 20 + ((i * 53) % 330), 10, 10);
  }
  worldCache = c;
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
  ctx.font = '104px DotGothic16';
  const cx = x + (b.x + b.w / 2) * TRUCK_SCALE;
  const cy = y + (b.y + b.h / 2) * TRUCK_SCALE;
  ctx.fillText('LONG TASK', cx, cy - (label ? 56 : 0));
  if (label) ctx.fillText(label, cx, cy + 66);
  // headlight beam from the front of the cab
  const fx = x + 31 * TRUCK_SCALE;
  const fy = y + 7.5 * TRUCK_SCALE;
  ctx.fillStyle = 'rgba(255, 240, 170, 0.28)';
  ctx.beginPath();
  ctx.moveTo(fx, fy - 20);
  ctx.lineTo(fx + 900, fy - 260);
  ctx.lineTo(fx + 900, fy + 220);
  ctx.closePath();
  ctx.fill();
}

// Frames per second of this very page, over the last second. Right after the freeze it
// honestly reads "1 fps", then climbs back.
function drawFps(ctx, s) {
  ctx.textAlign = 'right';
  ctx.font = '40px DotGothic16';
  ctx.fillStyle = '#05071a';
  ctx.fillText(`${s.frames.length} fps (last 1 s)`, 1863, 73);
  ctx.fillStyle = s.frames.length >= 50 ? '#34e0a1' : '#ff5d73';
  ctx.fillText(`${s.frames.length} fps (last 1 s)`, 1860, 70);
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
      play('horn');
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
      const impactX = ME.x - truckW + 60;
      const st = stepRef.current;

      // Step 2: another world. Fiber-kun is reborn: headband and a sword.
      if (st >= 2) {
        ctx.drawImage(otherWorld(), 0, 0);
        const img = spriteCanvas(FIBER_KUN.idle[Math.floor(ts / 400) % 2], PALETTE, 14);
        const hx = 860;
        ctx.drawImage(img, hx, GROUND - img.height);
        drawSword(ctx, hx + img.width - 34, GROUND - img.height * 0.4, -Math.PI / 2 + Math.sin(ts / 500) * 0.05, { scale: 1.3 });
        return;
      }

      // The salaryman (previous life), then his cartoon launch after the impact.
      if (!s.impactDone) {
        const img = spriteCanvas(SALARYMAN[Math.floor(ts / 600) % 2], PALETTE, ME.scale);
        ctx.drawImage(img, ME.x, GROUND - img.height);
        const bc = spriteCanvas(BRIEFCASE, PALETTE, 9);
        ctx.drawImage(bc, ME.x + img.width - 10, GROUND - bc.height);
        if (s.startedAt) {
          ctx.font = '96px DotGothic16';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffd166';
          ctx.fillText('!', ME.x + img.width / 2, GROUND - img.height - 60);
        }
      } else if (s.frozenMs !== null && ts - s.impactEnd < FLY_MS) {
        // Cartoon launch: up and away, spinning. Nobody gets hurt.
        const p = (ts - s.impactEnd) / FLY_MS;
        const img = spriteCanvas(SALARYMAN[0], PALETTE, ME.scale);
        ctx.save();
        ctx.translate(ME.x + 96 + p * 420, GROUND - 150 - Math.sin(p * Math.PI) * 420 - p * 260);
        ctx.rotate(p * Math.PI * 3);
        ctx.globalAlpha = 1 - p * 0.6;
        ctx.drawImage(img, -96, -96);
        ctx.restore();
      }

      // The truck: hidden until it drives in.
      if (s.startedAt) {
        const p = Math.min(1, (ts - s.startedAt) / DRIVE_MS);
        const x = -truckW + (impactX + truckW) * p * p;
        drawTruck(ctx, x, s.frozenMs !== null ? `${s.frozenMs.toLocaleString('en-US')} ms` : '');
        if (p >= 1 && !s.impactDone) {
          s.impactDone = true;
          // Draw the impact frame first: this is the picture that stays on screen while frozen.
          const img = spriteCanvas(SALARYMAN[0], PALETTE, ME.scale);
          ctx.drawImage(img, ME.x + 40, GROUND - img.height - 30);
          drawBonk(ctx, ME.x + 60, GROUND - 260);
          impactTs = ts;
          // The real long task: a synchronous React render of HEAVY_COUNT components.
          flushSync(() => setRun((r) => r + 1));
        }
      }

      drawFps(ctx, s);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [preview]);

  return (
    <div className="truck-slide">
      <canvas ref={canvasRef} width={1920} height={1080} className="truck-canvas pixelated" />
      {frozen !== null && step < 2 && (
        <div className="truck-frozen pop-in">
          FROZEN FRAME <b>{frozen.toLocaleString('en-US')} ms</b>
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
