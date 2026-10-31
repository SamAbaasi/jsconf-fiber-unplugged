import { memo, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Dialogue } from '../ui/Dialogue.jsx';
import { LINES } from '../content/lines.js';
import { spriteCanvas } from '../ui/Sprite.jsx';
import { TRUCK, TRUCK_PALETTE, TRUCK_LABEL_BOX } from '../sprites/truck.js';
import { FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import { burnIters, ensureCalibrated, itersFor } from '../demo/work.js';
import { play } from '../audio/sfx.js';
import '../styles/cold.css';

// The long task is real: on impact we run a synchronous React render
// (flushSync → SyncLane, not sliced: A1, A4, I4) of HEAVY_COUNT components,
// each doing about HEAVY_MICROS of work. The number on screen is the measured
// gap between the two animation frames around it.
const HEAVY_COUNT = 5000;
const HEAVY_MICROS = 36;
const DRIVE_MS = 900;
const UI = { x: 1180, y: 300, w: 420, h: 330 };
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

function drawUI(ctx, knocked, t) {
  ctx.save();
  ctx.translate(UI.x + UI.w / 2, UI.y + UI.h);
  if (knocked) ctx.rotate(0.32);
  ctx.translate(-UI.w / 2, -UI.h);
  // window
  ctx.fillStyle = '#05071a';
  ctx.fillRect(-8, -8, UI.w + 16, UI.h + 16);
  ctx.fillStyle = '#f4f6ff';
  ctx.fillRect(0, 0, UI.w, UI.h);
  ctx.fillStyle = '#4cc9f0';
  ctx.fillRect(0, 0, UI.w, 44);
  ['#ff5d73', '#ffd166', '#34e0a1'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(16 + i * 30, 14, 16, 16);
  });
  // face
  const cx = UI.w / 2;
  const bob = knocked ? 0 : Math.round(Math.sin(t / 250) * 6);
  ctx.fillStyle = '#120c2c';
  if (knocked) {
    // x_x
    for (const ex of [cx - 70, cx + 40]) {
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(ex + i * 6, 130 + i * 6, 8, 8);
        ctx.fillRect(ex + 24 - i * 6, 130 + i * 6, 8, 8);
      }
    }
    ctx.fillRect(cx - 40, 230, 80, 10);
  } else {
    ctx.fillRect(cx - 70, 120 + bob, 26, 40);
    ctx.fillRect(cx + 44, 120 + bob, 26, 40);
    ctx.fillRect(cx - 64, 210 + bob, 128, 12);
    ctx.fillRect(cx - 76, 198 + bob, 14, 14);
    ctx.fillRect(cx + 62, 198 + bob, 14, 14);
  }
  ctx.restore();
}

function drawTruck(ctx, x, label) {
  const img = spriteCanvas(TRUCK, TRUCK_PALETTE, TRUCK_SCALE);
  const y = 700 - img.height;
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

export function Truck({ step, preview }) {
  const canvasRef = useRef(null);
  // Calibrate now, so the calibration never runs inside the measured frame.
  useState(ensureCalibrated);
  const [run, setRun] = useState(0);
  const [frozen, setFrozen] = useState(null); // measured ms, or null
  const scene = useRef({ startedAt: 0, impactDone: false, frozenMs: null, frames: [] });

  // Step 0 resets the scene; step ≥ 1 starts the drive (once).
  useEffect(() => {
    const s = scene.current;
    if (step === 0) {
      s.startedAt = 0;
      s.impactDone = false;
      s.frozenMs = null;
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
    let lastTs = 0;
    let impactTs = 0;

    const frame = (ts) => {
      raf = requestAnimationFrame(frame);
      // Measure the frozen frame: the gap from the impact frame to the next one.
      if (impactTs && s.frozenMs === null) {
        s.frozenMs = Math.round(ts - impactTs);
        setFrozen(s.frozenMs);
        play('hit');
      }
      s.frames.push(ts);
      while (s.frames.length && s.frames[0] < ts - 1000) s.frames.shift();
      lastTs = ts;

      // background: sky + road
      ctx.fillStyle = '#1a1660';
      ctx.fillRect(0, 0, 1920, 1080);
      ctx.fillStyle = '#2c2466';
      for (let x = 0; x < 1920; x += 64) ctx.fillRect(x, 700, 32, 380);
      ctx.fillStyle = '#3b2f8f';
      ctx.fillRect(0, 700, 1920, 8);
      ctx.fillStyle = '#ffd166';
      for (let x = 40; x < 1920; x += 200) ctx.fillRect(x, 860, 100, 12);

      const knocked = s.impactDone;
      drawUI(ctx, knocked, ts);

      // FPS of this very page, measured.
      ctx.fillStyle = s.frames.length >= 50 ? '#34e0a1' : '#ff5d73';
      ctx.font = '48px DotGothic16';
      ctx.textAlign = 'right';
      ctx.fillText(`${s.frames.length} fps`, 1840, 110);

      // truck
      const truckW = TRUCK[0].length * TRUCK_SCALE;
      const impactX = UI.x - truckW + 30;
      if (s.startedAt) {
        const p = Math.min(1, (ts - s.startedAt) / DRIVE_MS);
        const x = -truckW + (impactX + truckW) * p * p;
        drawTruck(ctx, x, s.frozenMs !== null ? `${s.frozenMs} ms` : '');
        if (p >= 1 && !s.impactDone) {
          s.impactDone = true;
          drawUI(ctx, true, ts);
          impactTs = ts;
          // The real long task: a synchronous React render of HEAVY_COUNT components.
          flushSync(() => setRun((r) => r + 1));
        }
      } else {
        drawTruck(ctx, -truckW + 260, '');
      }

      if (step >= 2 && s.impactDone) {
        const img = spriteCanvas(FIBER_KUN.idle[Math.floor(ts / 400) % 2], PALETTE, 9);
        ctx.drawImage(img, UI.x + 60, 700 - img.height);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [preview, step]);

  return (
    <div className="truck-slide">
      <canvas ref={canvasRef} width={1920} height={1080} className="truck-canvas pixelated" />
      {frozen !== null && (
        <div className="truck-frozen pop-in">
          FROZEN FRAME
          <b>{frozen} ms</b>
        </div>
      )}
      {step === 0 && <Dialogue line={LINES.truckHappy} preview={preview} />}
      {step === 1 && frozen !== null && <Dialogue line={LINES.truckAfter} preview={preview} />}
      {step >= 2 && <Dialogue line={LINES.wakeUp} preview={preview} />}
      <div className="heavy-host" aria-hidden="true">
        <HeavyLoad run={run} />
      </div>
    </div>
  );
}
