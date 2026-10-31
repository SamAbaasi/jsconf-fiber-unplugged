import { memo, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Dialogue } from '../ui/Dialogue.jsx';
import { LINES } from '../content/lines.js';
import { spriteCanvas } from '../ui/Sprite.jsx';
import { TRUCK, TRUCK_PALETTE, TRUCK_LABEL_BOX } from '../sprites/truck.js';
import { FIBER_KUN, PALETTE, DEV, LAPTOP, COFFEE } from '../sprites/fiberkun.js';
import { TORII, TORII_PALETTE } from '../sprites/torii.js';
import { drawSword } from '../sprites/sword.js';
import { SCALES, bbox, reportBox } from '../sprites/scale.js';
import { burnIters, ensureCalibrated, itersFor } from '../demo/work.js';
import { gateRank } from '../demo/gates.js';
import { play } from '../audio/sfx.js';
import '../styles/cold.css';

// Cold open: Tehran → truck LONG TASK → another world (a fantasy Japan) → torii Gate.
//
// The long task is real: on impact we run a synchronous React render
// (flushSync → SyncLane, never sliced: A1, A4, I4) of HEAVY_COUNT components,
// each doing about HEAVY_MICROS µs of real work (~1.2 s in total).
// The number on screen is the measured gap between the two animation frames around it.
const HEAVY_COUNT = 5000;
const HEAVY_MICROS = 240;
const DRIVE_MS = 450; // fast entrance: no dead air
const FLY_MS = 1100;
const GROUND = 700;
const S = SCALES.world; // Fiber-kun: 16 × 8 = 128 px, in every world scene
const TS = SCALES.truck;
const ME_X = 1320;
const HERO_X = 700; // reborn Fiber-kun, in front of the torii
const TORII_X = 980;

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

const step8 = (v) => Math.round(v / 8) * 8;

// Tehran at night: the Alborz mountains with snow behind the city, a tall TV tower
// silhouette (generic shaft + pod + antenna; no logo), lit windows, a blue street sign.
let tehranCache = null;
function tehran() {
  if (tehranCache) return tehranCache;
  const c = document.createElement('canvas');
  c.width = 1920;
  c.height = 1080;
  const g = c.getContext('2d');
  ['#0b0c2e', '#111241', '#181853', '#211f63', '#2b2672'].forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(0, i * 120, 1920, 121);
  });
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 80; i++) g.fillRect((i * 211) % 1920, (i * 97) % 300, i % 9 ? 3 : 6, i % 9 ? 3 : 6);
  // crescent moon (pixel circle minus an offset circle)
  for (let y = -40; y <= 40; y += 8) {
    for (let x = -40; x <= 40; x += 8) {
      const inMoon = x * x + y * y <= 40 * 40;
      const inShadow = (x - 20) * (x - 20) + (y + 8) * (y + 8) <= 36 * 36;
      if (inMoon && !inShadow) {
        g.fillStyle = '#f4f1ff';
        g.fillRect(1600 + x, 110 + y, 8, 8);
      }
    }
  }
  // Alborz: a long snowy ridge to the north
  for (let x = 0; x < 1920; x += 8) {
    const h = step8(300 + Math.sin(x / 260) * 70 + Math.sin(x / 90) * 28 + Math.sin(x / 37) * 8);
    const top = GROUND - 90 - h;
    g.fillStyle = '#3d3487';
    g.fillRect(x, top, 8, GROUND - top);
    g.fillStyle = '#d6daf7';
    const snow = Math.max(0, h - 300);
    if (snow > 0) g.fillRect(x, top, 8, step8(Math.min(56, snow * 0.9 + 8)));
  }
  // A tall TV tower silhouette (generic: tapered shaft, a big multi-ring pod, an antenna).
  const tx = 430;
  g.fillStyle = '#17143f';
  for (let y = GROUND; y > GROUND - 440; y -= 8) {
    const w = step8(36 + Math.max(0, (y - (GROUND - 160)) * 0.45));
    g.fillRect(tx - w / 2, y - 8, w, 8);
  }
  const rings = [
    [-560, 24, 96],
    [-536, 32, 150],
    [-504, 40, 196],
    [-464, 24, 168],
    [-440, 16, 112],
  ];
  for (const [dy, h, w] of rings) g.fillRect(tx - w / 2, GROUND + dy, w, h);
  g.fillRect(tx - 8, GROUND - 680, 16, 120); // antenna
  g.fillStyle = '#ffd166';
  for (let k = -4; k <= 4; k++) g.fillRect(tx + k * 20 - 4, GROUND - 490, 8, 10);
  g.fillStyle = '#9af5ea';
  for (let k = -3; k <= 3; k++) g.fillRect(tx + k * 18 - 3, GROUND - 524, 6, 8);
  g.fillStyle = '#ff5d73';
  g.fillRect(tx - 8, GROUND - 692, 16, 12); // aircraft light
  // low city with lit windows
  let x = 0;
  let k = 0;
  while (x < 1920) {
    const w = 90 + ((k * 37) % 70);
    const h = 100 + ((k * 53) % 130);
    g.fillStyle = k % 2 ? '#1a1648' : '#221d58';
    g.fillRect(x, GROUND - h, w, h);
    g.fillStyle = '#ffd166';
    for (let wy = GROUND - h + 18; wy < GROUND - 20; wy += 34) {
      for (let wx = x + 14; wx < x + w - 14; wx += 26) if ((wx * 7 + wy * 3 + k) % 5 === 0) g.fillRect(wx, wy, 10, 14);
    }
    x += w + 6;
    k++;
  }
  // road
  g.fillStyle = '#26214f';
  g.fillRect(0, GROUND, 1920, 1080 - GROUND);
  g.fillStyle = '#3b2f8f';
  g.fillRect(0, GROUND, 1920, 8);
  g.fillStyle = '#ffd166';
  for (let dx = 40; dx < 1920; dx += 200) g.fillRect(dx, 742, 100, 10);
  // street sign: blue, white border, on a pole
  const sx = 1660;
  g.fillStyle = '#8a90b5';
  g.fillRect(sx + 108, GROUND - 330, 12, 330);
  g.fillStyle = '#ffffff';
  g.fillRect(sx, GROUND - 400, 228, 92);
  g.fillStyle = '#1f4fa8';
  g.fillRect(sx + 8, GROUND - 392, 212, 76);
  g.fillStyle = '#ffffff';
  g.font = '52px DotGothic16';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('TEHRAN', sx + 114, GROUND - 352);
  tehranCache = c;
  return c;
}

// Another world: a fantasy Japan at dawn. Mt Fuji silhouette, cherry trees, a torii (the Gate).
let japanCache = null;
function japan() {
  if (japanCache) return japanCache;
  const c = document.createElement('canvas');
  c.width = 1920;
  c.height = 1080;
  const g = c.getContext('2d');
  ['#2c3e8f', '#4a5bb0', '#7b78c8', '#c08fc6', '#f2a7b8', '#ffd1b0'].forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(0, i * 100, 1920, 101);
  });
  // Mt Fuji: a wide cone with a flat top and a snow cap with jagged edge
  const fx = 1180;
  const top = 250;
  for (let y = top; y < GROUND - 60; y += 8) {
    const half = 70 + (y - top) * 1.55;
    g.fillStyle = '#4b4f9e';
    g.fillRect(step8(fx - half), y, step8(half * 2), 8);
    if (y < top + 110 - (Math.floor(y / 8) % 3) * 8) {
      g.fillStyle = '#f4f1ff';
      g.fillRect(step8(fx - half), y, step8(half * 2), 8);
    }
  }
  // snow teeth under the cap
  g.fillStyle = '#f4f1ff';
  for (let i = -5; i <= 5; i++) g.fillRect(step8(fx + i * 40 - 8), top + 110, 16, 24 + (Math.abs(i) % 2) * 16);
  // far hills
  for (let x = 0; x < 1920; x += 8) {
    const h = step8(100 + Math.sin(x / 170) * 34 + Math.sin(x / 57) * 10);
    g.fillStyle = '#5a8f6a';
    g.fillRect(x, GROUND - h, 8, h);
  }
  // ground: grass and a stone path to the torii
  g.fillStyle = '#4f9a5c';
  g.fillRect(0, GROUND, 1920, 1080 - GROUND);
  g.fillStyle = '#3f8a4c';
  g.fillRect(0, GROUND, 1920, 8);
  g.fillStyle = '#c9c3b0';
  for (let i = 0; i < 6; i++) g.fillRect(TORII_X + 120 - i * 12, GROUND + 20 + i * 44, 160 + i * 24, 28);
  // cherry trees: trunk + pink blossom clusters
  const tree = (x, y, size) => {
    g.fillStyle = '#5c3a2e';
    g.fillRect(x - 12, y - size * 0.9, 24, size * 0.9);
    g.fillRect(x - 60, y - size * 0.8, 60, 16);
    g.fillRect(x, y - size * 0.95, 70, 16);
    const blobs = [[-90, -1.05, 1], [-20, -1.25, 1.2], [60, -1.05, 1], [-50, -0.92, 0.8], [30, -0.9, 0.9]];
    for (const [dx, dy, r] of blobs) {
      const cx = x + dx;
      const cy = y + dy * size;
      const rr = 70 * r;
      for (let yy = -rr; yy <= rr; yy += 8) {
        for (let xx = -rr; xx <= rr; xx += 8) {
          if (xx * xx + yy * yy > rr * rr) continue;
          g.fillStyle = (xx + yy * 3) % 5 === 0 ? '#ffd6e2' : (xx * 2 + yy) % 7 === 0 ? '#e87a9a' : '#ff9fb2';
          g.fillRect(step8(cx + xx), step8(cy + yy), 8, 8);
        }
      }
    }
  };
  tree(200, GROUND, 330);
  tree(1720, GROUND, 360);
  japanCache = c;
  return c;
}

function drawToriiGlow(g, ts, strength) {
  const img = spriteCanvas(TORII, TORII_PALETTE, SCALES.torii);
  const cx = TORII_X + img.width / 2;
  const cy = GROUND - img.height * 0.45;
  const pulse = 0.55 + 0.45 * Math.sin(ts / 420);
  const grad = g.createRadialGradient(cx, cy, 40, cx, cy, 420);
  grad.addColorStop(0, `rgba(255, 240, 180, ${0.55 * strength * pulse + 0.15})`);
  grad.addColorStop(1, 'rgba(255, 240, 180, 0)');
  g.fillStyle = grad;
  g.fillRect(cx - 440, cy - 440, 880, 880);
  // the gate's inside: a shimmering portal between the pillars
  const b = bbox(TORII);
  const inner = { x: TORII_X + 8 * SCALES.torii, y: GROUND - img.height + 12 * SCALES.torii, w: 10 * SCALES.torii, h: (b.h - 12 - 4) * SCALES.torii };
  g.fillStyle = `rgba(160, 120, 255, ${0.25 + 0.25 * strength * pulse})`;
  g.fillRect(inner.x, inner.y, inner.w, inner.h);
  for (let i = 0; i < 6; i++) {
    const yy = inner.y + ((ts / 6 + i * 70) % inner.h);
    g.fillStyle = 'rgba(255, 255, 255, 0.35)';
    g.fillRect(inner.x + 8, Math.floor(yy / 8) * 8, inner.w - 16, 8);
  }
  g.drawImage(img, TORII_X, GROUND - img.height);
  reportBox('cold-open', 'torii', { x: TORII_X, y: GROUND - img.height, w: img.width, h: img.height });
}

function drawPetals(g, ts) {
  g.fillStyle = '#ffd6e2';
  for (let i = 0; i < 26; i++) {
    const x = (i * 173 + ts * (0.04 + (i % 5) * 0.01)) % 1960 - 20;
    const y = (i * 97 + ts * (0.06 + (i % 3) * 0.015)) % 760;
    g.fillRect(step8(x + Math.sin(ts / 600 + i) * 30), step8(y), 8, 8);
  }
}

function drawTruck(g, x, label) {
  const img = spriteCanvas(TRUCK, TRUCK_PALETTE, TS);
  const y = GROUND - img.height;
  g.drawImage(img, Math.round(x), y);
  const b = TRUCK_LABEL_BOX;
  g.fillStyle = '#120c2c';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '68px DotGothic16';
  const cx = x + (b.x + b.w / 2) * TS;
  const cy = y + (b.y + b.h / 2) * TS;
  g.fillText('LONG TASK', cx, cy - (label ? 32 : 0));
  if (label) {
    g.font = '56px DotGothic16';
    g.fillText(label, cx, cy + 40);
  }
  // headlight beam from the front of the cab
  const fx = x + 31 * TS;
  const fy = y + 7.5 * TS;
  g.fillStyle = 'rgba(255, 240, 170, 0.28)';
  g.beginPath();
  g.moveTo(fx, fy - 12);
  g.lineTo(fx + 700, fy - 180);
  g.lineTo(fx + 700, fy + 150);
  g.closePath();
  g.fill();
  const tb = bbox(TRUCK);
  reportBox('cold-open', 'truck', { x: x + tb.x * TS, y: y + tb.y * TS, w: tb.w * TS, h: tb.h * TS });
}

// Frames per second of this very page over the last second. Right after the freeze it
// honestly reads about 1, then climbs back.
function drawFps(g, frames) {
  g.textAlign = 'right';
  g.textBaseline = 'alphabetic';
  g.font = '40px DotGothic16';
  g.fillStyle = '#05071a';
  g.fillText(`${frames.length} fps (last 1 s)`, 1863, 73);
  g.fillStyle = frames.length >= 50 ? '#34e0a1' : '#ff5d73';
  g.fillText(`${frames.length} fps (last 1 s)`, 1860, 70);
}

function drawBonk(g, x, y) {
  g.fillStyle = '#ffd166';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    for (let r = 24; r < 72; r += 12) g.fillRect(Math.round(x + Math.cos(a) * r) - 6, Math.round(y + Math.sin(a) * r) - 6, 12, 12);
  }
  g.font = '56px DotGothic16';
  g.textAlign = 'center';
  g.fillStyle = '#120c2c';
  g.fillText('BONK!', x + 4, y - 96 + 4);
  g.fillStyle = '#ffffff';
  g.fillText('BONK!', x, y - 96);
}

// The developer (previous life): laptop under his left side, coffee in the other hand.
function drawDev(g, x, ts) {
  const img = spriteCanvas(DEV[Math.floor(ts / 600) % 2], PALETTE, S);
  const y = GROUND - img.height;
  const lap = spriteCanvas(LAPTOP, PALETTE, S);
  const cup = spriteCanvas(COFFEE, PALETTE, S);
  g.drawImage(lap, x - lap.width + 4 * S, y + 9 * S);
  g.drawImage(img, x, y);
  g.drawImage(cup, x + 13 * S, y + 7 * S);
  const b = bbox(DEV[0]);
  reportBox('cold-open', 'previous-life', { x: x + b.x * S, y: y + b.y * S, w: b.w * S, h: b.h * S });
  return img;
}

export function ColdOpen({ step, preview }) {
  const canvasRef = useRef(null);
  // Calibrate the work loop now, so it never runs inside the measured frame.
  useState(ensureCalibrated);
  const [run, setRun] = useState(0);
  const [frozen, setFrozen] = useState(null); // measured ms, or null
  const scene = useRef({ startedAt: 0, impactDone: false, impactEnd: 0, frozenMs: null, frames: [] });
  const stepRef = useRef(step);
  stepRef.current = step;

  // Step 0 resets the scene; step 1 starts the drive (once).
  useEffect(() => {
    const s = scene.current;
    if (step === 0) {
      Object.assign(s, { startedAt: 0, impactDone: false, impactEnd: 0, frozenMs: null });
      setFrozen(null);
    } else if (step === 1 && !s.startedAt) {
      s.startedAt = performance.now();
      play('horn');
    }
    if (step === 4) play('unlock');
  }, [step]);

  useEffect(() => {
    if (preview) return;
    const g = canvasRef.current.getContext('2d');
    g.imageSmoothingEnabled = false;
    const s = scene.current;
    let raf = 0;
    let impactTs = 0;

    const frame = (ts) => {
      raf = requestAnimationFrame(frame);
      // The frozen frame: the gap from the impact frame to the next one.
      if (impactTs && s.frozenMs === null) {
        s.frozenMs = Math.round(ts - impactTs);
        s.impactEnd = ts;
        globalThis.__truckFrozenMs = s.frozenMs; // the Gate slide shows this measured value
        setFrozen(s.frozenMs);
        play('hit');
      }
      s.frames.push(ts);
      while (s.frames.length && s.frames[0] < ts - 1000) s.frames.shift();
      const st = stepRef.current;

      // Steps 2–4: another world. Fiber-kun is reborn with a headband and a sword.
      if (st >= 2) {
        g.drawImage(japan(), 0, 0);
        drawToriiGlow(g, ts, st >= 4 ? 1 : 0.5);
        drawPetals(g, ts);
        const img = spriteCanvas(FIBER_KUN.idle[Math.floor(ts / 400) % 2], PALETTE, S);
        g.drawImage(img, HERO_X, GROUND - img.height);
        drawSword(g, HERO_X + img.width - 20, GROUND - img.height * 0.4, -Math.PI / 2 + Math.sin(ts / 500) * 0.05, { scale: 0.75 });
        const b = bbox(FIBER_KUN.idle[0]);
        reportBox('cold-open', 'reborn', { x: HERO_X + b.x * S, y: GROUND - img.height + b.y * S, w: b.w * S, h: b.h * S });
        return;
      }

      g.drawImage(tehran(), 0, 0);
      const truckW = TRUCK[0].length * TS;
      const impactX = ME_X - truckW + 6 * S;

      if (!s.impactDone) {
        drawDev(g, ME_X, ts);
        if (s.startedAt) {
          g.font = '88px DotGothic16';
          g.textAlign = 'center';
          g.fillStyle = '#ffd166';
          g.fillText('!', ME_X + 8 * S, GROUND - 16 * S - 40);
        }
      } else if (s.frozenMs !== null && ts - s.impactEnd < FLY_MS) {
        // Cartoon launch: up and away, spinning. Nobody gets hurt.
        const p = (ts - s.impactEnd) / FLY_MS;
        const img = spriteCanvas(DEV[0], PALETTE, S);
        g.save();
        g.translate(ME_X + 64 + p * 420, GROUND - 120 - Math.sin(p * Math.PI) * 380 - p * 260);
        g.rotate(p * Math.PI * 3);
        g.globalAlpha = 1 - p * 0.6;
        g.drawImage(img, -64, -64);
        g.restore();
      }

      // The truck: hidden until it drives in.
      if (s.startedAt) {
        const p = Math.min(1, (ts - s.startedAt) / DRIVE_MS);
        const x = -truckW + (impactX + truckW) * p * p;
        drawTruck(g, x, s.frozenMs !== null ? `${s.frozenMs.toLocaleString('en-US')} ms` : '');
        if (p >= 1 && !s.impactDone) {
          s.impactDone = true;
          // Draw the impact frame first: this picture stays on screen while frozen.
          const img = spriteCanvas(DEV[0], PALETTE, S);
          g.drawImage(img, ME_X + 30, GROUND - img.height - 20);
          drawBonk(g, ME_X + 60, GROUND - 200);
          impactTs = ts;
          // The real long task: a synchronous React render of HEAVY_COUNT components.
          flushSync(() => setRun((r) => r + 1));
        }
      }
      drawFps(g, s.frames);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [preview]);

  const rank = frozen !== null ? gateRank(frozen) : null;
  return (
    <div className="truck-slide">
      <canvas ref={canvasRef} width={1920} height={1080} className="truck-canvas pixelated" />
      {frozen !== null && step === 1 && (
        <div className="truck-frozen pop-in">
          <div>
            FROZEN FRAME <b>{frozen.toLocaleString('en-US')} ms</b>
          </div>
          <div className="truck-gate">
            [SYSTEM] Gate rank <span className={`gate-rank rank-${rank.rank}`}>{rank.rank}</span> · {rank.rule}
          </div>
        </div>
      )}
      {step === 2 && <div className="truck-flash" />}
      {step === 0 && <Dialogue line={LINES.tehran} preview={preview} />}
      {step === 1 && frozen !== null && <Dialogue line={LINES.truckAfter} preview={preview} />}
      {step === 2 && <Dialogue line={LINES.coldWake} preview={preview} />}
      {step === 3 && <Dialogue line={LINES.wakeUp} preview={preview} />}
      {step === 4 && (
        <div className="sys-win pop-in">
          <div className="sys-tag">[SYSTEM]</div>
          <div className="sys-line">{LINES.sysReborn.text}</div>
          <div className="sys-line sys-small">{LINES.sysLevel.text}</div>
          <div className="sys-line sys-gate">{LINES.sysGate.text}</div>
        </div>
      )}
      <div className="heavy-host" aria-hidden="true">
        <HeavyLoad run={run} />
      </div>
    </div>
  );
}
