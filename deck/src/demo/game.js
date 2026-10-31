// The boss fight as a game. Every outcome comes from real measurements:
//   - frame timings from requestAnimationFrame (the same frames the FPS meter counts)
//   - render attempts, commits and thrown-away renders from the instrumented scheduler / list.
// Nothing is random. The rules are fixed below and shown on screen before each round.
// All of this runs in the monitor's rAF loop, outside React.
import { FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import { spriteCanvas } from '../ui/Sprite.jsx';
import { HEADS, NAMES, COLS, CELL_COUNT, SHAPE } from './hydra.js';
import { play } from '../audio/sfx.js';

export const RULES = {
  roundMs: 8000, // a round lasts up to 8 s from the first keystroke
  jankMs: 50, // a frame longer than this is a "long frame"
  fiberHp: 5000, // a long frame costs Fiber-kun its real length in ms
  hydraHp: 360, // every frame that is not long deals 1 damage (360 frames = 6 s at 60 fps)
};

// Rank, decided only by real numbers. Shown on screen and in the notes.
export function rankOf({ hits, ko }) {
  if (ko) return 'C';
  if (hits === 0) return 'S';
  if (hits <= 2) return 'A';
  if (hits <= 5) return 'B';
  return 'C';
}
export const RANK_RULE = 'S: 0 hits · A: 1–2 · B: 3–5 · C: 6+ or K.O.';

// Same boss, same workload (10,000 fibers × the same µs), three looks.
export const FORMS = [
  { name: 'JANK HYDRA', cls: 'form-1', ornament: null },
  { name: 'JANK HYDRA · FROST', cls: 'form-2', ornament: 'horns' },
  { name: 'JANK HYDRA · SHADOW', cls: 'form-3', ornament: 'crown' },
];

// Arena geometry (stage px, inside the arena box).
export const ARENA = { w: 1150, h: 760, groundY: 690 };
export const HYDRA_BOX = { x: 400, y: 210, cell: 6 };
const FK = { x: 150, scale: 12, size: 192 };
const FIRE_EVERY_MS = 650; // decor: the Hydra throws a fireball this often
const FIRE_FLIGHT_MS = 700;
const GRAVITY = 4200; // px/s²
const JUMP_V = 1500; // px/s → about 270 px high, 0.7 s in the air
const MAX_PHYS_STEP = 34; // ms: physics never moves more than this per frame

// Fiber-kun flashes red when hit: same sprite, every pixel in red tones.
const HURT_PALETTE = Object.fromEntries(Object.entries(PALETTE).map(([k]) => [k, k === 'k' ? '#5a0a1a' : '#ff5d73']));

const headPos = (i) => {
  const [hx, hy] = HEADS[((i % HEADS.length) + HEADS.length) % HEADS.length];
  return [HYDRA_BOX.x + hx * HYDRA_BOX.cell, HYDRA_BOX.y + hy * HYDRA_BOX.cell];
};
const cellPos = (i) => [HYDRA_BOX.x + (i % COLS) * HYDRA_BOX.cell + 3, HYDRA_BOX.y + Math.floor(i / COLS) * HYDRA_BOX.cell + 3];

function freshRound() {
  return {
    phase: 'ready', // ready → fight → result
    startAt: 0,
    fiberHp: RULES.fiberHp,
    hydraHp: RULES.hydraHp,
    hits: 0,
    damage: 0,
    dodges: 0,
    onTime: 0,
    frames: 0,
    worst: 0,
    thrown: 0,
    commits: 0,
    slices: 0,
    ko: false,
    pendingHydraDmg: 0,
    lastHydraFloat: 0,
    nextFire: 0,
    fireIndex: 0,
    fireballs: [],
    shake: 0,
    shakeAt: 0,
    fkY: 0,
    fkVy: 0,
    fkHitAt: -1e9,
    floaters: [],
    hitLog: [], // the last hits, shown as a fixed list so the numbers never overlap
    respawns: [],
    swing: null, // { kind: 'windup' | 'slash' | 'cancel', t0 }
    cuts: null, // { t0, cells: [index…] }
    inputDelays: [],
    result: null,
    resultAt: 0,
  };
}

export function createGame(els) {
  const g = { round: 0, modeTitle: '', form: FORMS[0], ...freshRound() };

  function updateHud(now) {
    const fk = Math.max(0, g.fiberHp);
    setWidth(els.fkHpBar, fk / RULES.fiberHp);
    setText(els.fkHpText, `HP ${fk} / ${RULES.fiberHp}`);
    setWidth(els.hydraHpBar, g.hydraHp / RULES.hydraHp);
    setText(els.hydraHpText, `HP ${g.hydraHp} / ${RULES.hydraHp}`);
    setText(els.respawnText, `RESPAWN ×${g.thrown}`);
    const left = g.phase === 'fight' ? Math.max(0, RULES.roundMs - (now - g.startAt)) : g.phase === 'ready' ? RULES.roundMs : 0;
    setText(els.timer, `${(left / 1000).toFixed(1)} s`);
  }

  function showReady() {
    if (!els.overlay) return;
    els.overlay.className = 'boss-overlay is-ready';
    els.overlay.dataset.result = '';
    els.overlay.innerHTML = `
      <div class="bo-title">ROUND ${g.round + 1}<span class="bo-mode"> · ${g.modeTitle}</span></div>
      <div class="bo-rules">
        <div>Frame &gt; <b>${RULES.jankMs} ms</b> = <b class="r">HIT</b> (damage = its ms).</div>
        <div>Every other frame = <b class="g">1 damage</b> to the Hydra.</div>
      </div>
      <div class="bo-rule">${RANK_RULE}</div>
      <div class="bo-start blink">type to start · ↑ jump</div>`;
  }

  function reset() {
    Object.assign(g, freshRound());
    if (els.hydra) els.hydra.className = `boss-hydra ${g.form.cls}`;
    if (els.arena) els.arena.style.transform = '';
    setText(els.hydraName, g.form.name);
    updateHud(performance.now());
    showReady();
  }

  function end(now, outcome) {
    g.phase = 'result';
    g.resultAt = now;
    const rank = rankOf({ hits: g.hits, ko: g.ko });
    const dur = Math.max(1, now - g.startAt);
    g.result = {
      round: g.round + 1,
      mode: g.modeTitle,
      form: g.form.name,
      outcome,
      rank,
      worstFrameMs: Math.round(g.worst),
      hits: g.hits,
      damage: g.damage,
      dodges: g.dodges,
      thrownAway: g.thrown,
      commits: g.commits,
      slices: g.slices,
      frames: g.frames,
      onTimeFrames: g.onTime,
      avgFps: Math.round((g.frames / dur) * 1000),
      fiberHp: Math.max(0, g.fiberHp),
      hydraHp: g.hydraHp,
      inputDelays: g.inputDelays.slice(),
      durationMs: Math.round(dur),
    };
    if (els.hydra) {
      if (rank === 'S') els.hydra.classList.add('is-collapsed');
      else if (rank === 'A' || rank === 'B') els.hydra.classList.add('is-retreat');
    }
    play(rank === 'S' ? 'fanfare' : rank === 'C' ? 'lose' : 'rank');
    if (rank === 'C') setTimeout(() => play('laugh'), 1300);
    renderResult();
  }

  function renderResult() {
    const r = g.result;
    if (!els.overlay) return;
    const title = { S: 'PERFECT', A: 'GREAT!', B: 'CLEAR', C: 'GAME OVER' }[r.rank];
    const outcome = r.outcome === 'KO' ? 'K.O.' : r.outcome;
    const line = els.resultLine ? els.resultLine(r) : '';
    els.overlay.className = `boss-overlay is-result tier-${r.rank}`;
    els.overlay.dataset.result = JSON.stringify(r);
    els.overlay.innerHTML = `
      <div class="bo-res">
        <div>
          <div class="bo-title">${title}</div>
          <div class="bo-sub">${outcome} · round ${r.round}</div>
          <div class="bo-grid">
            <span>worst frame</span><b>${r.worstFrameMs} ms</b>
            <span>hits</span><b>${r.hits}</b>
            <span>thrown away</span><b>${r.thrownAway}</b>
            <span>commits</span><b>${r.commits}</b>
            <span>avg fps</span><b>${r.avgFps}</b>
          </div>
        </div>
        <div class="bo-rank rank-${r.rank}"><span>RANK</span>${r.rank}</div>
      </div>
      ${r.rank === 'C' ? '<div class="bo-continue">CONTINUE? <b class="bo-count">10</b></div>' : ''}
      ${line ? `<div class="bo-line">${line}</div>` : ''}
      <div class="bo-rule">${RANK_RULE}</div>`;
  }

  function jump() {
    if (g.fkY > 0.5 || g.ko || g.phase === 'result') return false;
    g.fkVy = JUMP_V;
    return true;
  }

  function addFloater(f) {
    g.floaters.push(f);
    if (g.floaters.length > 8) g.floaters.shift();
  }

  return {
    state: g,
    rules: RULES,
    setRound(index, modeTitle) {
      g.round = index;
      g.modeTitle = modeTitle;
      g.form = FORMS[index % FORMS.length];
      reset();
    },
    reset,
    onKey(t) {
      if (g.phase !== 'ready') return;
      g.phase = 'fight';
      g.startAt = t;
      g.lastHydraFloat = t;
      g.nextFire = t + 400;
      if (els.overlay) {
        els.overlay.className = 'boss-overlay';
        els.overlay.innerHTML = '';
      }
    },
    // React started a render attempt of the list: Fiber-kun raises his sword.
    onAttempt(t) {
      if (g.phase === 'result') return;
      g.swing = { kind: 'windup', t0: t };
    },
    // The attempt committed: the slash lands. The cut marks are the cells this commit matched.
    onCommit(t, q) {
      if (g.phase === 'fight' && t >= g.startAt) g.commits++;
      if (g.phase === 'result') return;
      g.swing = { kind: 'slash', t0: t };
      const cells = [];
      if (q) {
        for (let i = 0; i < CELL_COUNT; i++) if (SHAPE[i] !== 0 && NAMES[i].includes(q)) cells.push(i);
      }
      const step = Math.max(1, Math.floor(cells.length / 80));
      g.cuts = { t0: t, cells: cells.filter((_, k) => k % step === 0) };
    },
    // A render attempt was thrown away and React restarted from the root (B2, B6).
    onDiscard(t) {
      if (g.phase !== 'result') g.swing = { kind: 'cancel', t0: t };
      g.respawns.push({ t0: t });
      play('respawn');
      if (g.phase === 'fight' && t >= g.startAt) g.thrown++;
    },
    onSliceEnd(t) {
      if (g.phase === 'fight' && t >= g.startAt) g.slices++;
    },
    // ↑ key. `delay` = when we handled it minus when the browser created the event.
    manualJump(delay, now) {
      jump();
      const ms = Math.round(delay);
      if (g.phase === 'fight') g.inputDelays.push(ms);
      g.lastInput = { ms, t: now };
      if (ms > RULES.jankMs) {
        addFloater({ text: `input delay: ${ms} ms`, x: FK.x + FK.size / 2 + 20, y: ARENA.groundY - FK.size - 260, t0: now, color: '#ffd166', size: 40, life: 1600 });
      }
    },

    // Called once per rAF with this frame's timestamp and the previous one.
    frame(now, prev) {
      const dt = now - prev;
      const long = dt > RULES.jankMs;

      if (g.phase === 'fight') {
        g.worst = Math.max(g.worst, dt);
        g.frames++;
        if (long) {
          // The rule: every long frame is a hit, for its real length.
          const dmg = Math.round(dt);
          g.fiberHp -= dmg;
          g.damage += dmg;
          g.hits++;
          g.fkHitAt = now;
          g.fkVy = 0;
          g.fkY = 0;
          g.shake = Math.min(34, 8 + dmg / 8);
          g.shakeAt = now;
          g.hitLog.push({ text: `-${dmg}ms JANK!`, t0: now });
          if (g.hitLog.length > 4) g.hitLog.shift();
          play('hit');
        } else {
          g.onTime++;
          g.hydraHp = Math.max(0, RULES.hydraHp - g.onTime);
          g.pendingHydraDmg++;
        }
        if (g.pendingHydraDmg && now - g.lastHydraFloat > 400) {
          const [hx, hy] = headPos(Math.floor(now / 400));
          addFloater({ text: `-${g.pendingHydraDmg}`, x: hx + 30, y: hy + 70, t0: now, color: '#7dffc8', size: 44, slash: true });
          g.pendingHydraDmg = 0;
          g.lastHydraFloat = now;
        }
        // Decor: fireballs. Fiber-kun jumps over them, but only frames can move him.
        while (g.nextFire <= now) {
          g.fireballs.push({ t0: g.nextFire, head: g.fireIndex++ });
          g.nextFire += FIRE_EVERY_MS;
        }
      }

      // Jump physics. A long frame moves nothing: during it, no jump can happen.
      const step = Math.min(dt, MAX_PHYS_STEP) / 1000;
      if (!long && (g.fkY > 0 || g.fkVy > 0)) {
        g.fkVy -= GRAVITY * step;
        g.fkY = Math.max(0, g.fkY + g.fkVy * step);
        if (g.fkY === 0) g.fkVy = 0;
      }
      // Auto-dodge: jump when a fireball is about to arrive.
      for (const fb of g.fireballs) {
        const arriveIn = fb.t0 + FIRE_FLIGHT_MS - now;
        if (arriveIn < 230 && arriveIn > 0 && !long) jump();
        if (arriveIn <= 0 && !fb.done) {
          fb.done = true;
          if (g.fkY > 40 && g.phase === 'fight') {
            g.dodges++;
            addFloater({ text: 'DODGE', x: FK.x + FK.size / 2, y: ARENA.groundY - FK.size - 40, t0: now, color: '#4cc9f0', size: 40 });
            play('dodge');
          }
        }
      }
      g.fireballs = g.fireballs.filter((fb) => now - fb.t0 < FIRE_FLIGHT_MS + 200);

      if (g.phase === 'fight') {
        if (g.fiberHp <= 0) {
          g.ko = true;
          end(now, 'KO');
        } else if (g.hydraHp <= 0) end(now, 'WIN');
        else if (now >= g.startAt + RULES.roundMs) end(now, 'TIME UP');
      }

      // GAME OVER countdown, from real time.
      if (g.phase === 'result' && g.result?.rank === 'C' && els.overlay) {
        const n = Math.max(0, 10 - Math.floor((now - g.resultAt) / 1000));
        const el = els.overlay.querySelector('.bo-count');
        if (el && el.textContent !== String(n)) el.textContent = String(n);
      }

      // Screen shake: moves the whole arena (one transform, no layout).
      if (els.arena) {
        const age = now - g.shakeAt;
        if (g.shake && age < 360) {
          const k = g.shake * (1 - age / 360);
          els.arena.style.transform = `translate(${Math.round(Math.sin(age / 18) * k)}px, ${Math.round(Math.cos(age / 23) * k * 0.6)}px)`;
        } else if (els.arena.style.transform) {
          els.arena.style.transform = '';
          g.shake = 0;
        }
      }
      updateHud(now);
    },

    draw(ctx, now) {
      ctx.clearRect(0, 0, ARENA.w, ARENA.h);
      ctx.imageSmoothingEnabled = false;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Ornaments sit on the heads; they leave with the Hydra when it collapses or retreats.
      if (g.phase !== 'result' || g.result?.rank === 'C') drawOrnaments(ctx, g.form.ornament);

      // Fireballs (decor), flying from a head toward Fiber-kun.
      for (const fb of g.fireballs) {
        const p = (now - fb.t0) / FIRE_FLIGHT_MS;
        if (p < 0 || p > 1.25) continue;
        const [hx, hy] = headPos(fb.head);
        const tx = FK.x + FK.size / 2;
        const ty = ARENA.groundY - 60;
        const x = hx + (tx - hx) * p;
        const y = hy + (ty - hy) * Math.min(1, p) - Math.sin(Math.min(1, p) * Math.PI) * 50;
        ctx.fillStyle = '#ff9f1c';
        ctx.fillRect(Math.round(x) - 16, Math.round(y) - 16, 32, 32);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(Math.round(x) - 9, Math.round(y) - 9, 18, 18);
      }

      // Cut marks: where the last commit's slash landed (the cells it matched).
      if (g.cuts && now - g.cuts.t0 < 900) {
        const a = 1 - (now - g.cuts.t0) / 900;
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ffffff';
        for (const i of g.cuts.cells) {
          const [cx, cy] = cellPos(i);
          for (let k = -2; k <= 2; k++) ctx.fillRect(cx + k * 3 - 2, cy - k * 3 - 2, 4, 4);
        }
        ctx.globalAlpha = 1;
      }

      // Hydra laughs on GAME OVER.
      if (g.phase === 'result' && g.result?.rank === 'C') {
        ctx.font = '44px DotGothic16';
        ctx.fillStyle = '#ff5d73';
        for (let i = 0; i < 3; i++) {
          const [hx, hy] = headPos(i);
          ctx.fillText('HA!', hx + 20, hy - 70 - Math.abs(Math.sin(now / 160 + i)) * 20);
        }
      }

      drawHero(ctx, now);

      // Respawn at root: one light column and one label, for the latest real thrown-away render.
      g.respawns = g.respawns.filter((r) => now - r.t0 < 900);
      if (g.respawns.length) {
        const r = g.respawns[g.respawns.length - 1];
        const a = 1 - (now - r.t0) / 900;
        ctx.globalAlpha = a * 0.7;
        ctx.fillStyle = '#9af5ea';
        ctx.fillRect(FK.x + FK.size / 2 - 30, 200, 60, ARENA.groundY - 200);
        ctx.globalAlpha = a;
        ctx.font = '36px DotGothic16';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#05071a';
        ctx.fillText('RESPAWN AT ROOT', 23, 233);
        ctx.fillStyle = '#9af5ea';
        ctx.fillText('RESPAWN AT ROOT', 20, 230);
        ctx.textAlign = 'center';
        ctx.globalAlpha = 1;
      }

      // Hit log: the last four hits, newest at the bottom, each fading after 1.2 s.
      g.hitLog = g.hitLog.filter((h) => now - h.t0 < 1200);
      ctx.font = '52px DotGothic16';
      ctx.textAlign = 'left';
      g.hitLog.forEach((h, i) => {
        const age = (now - h.t0) / 1200;
        ctx.globalAlpha = 1 - age * age;
        const y = 270 + (i + 4 - g.hitLog.length) * 60;
        const pop = age < 0.08 ? 10 : 0;
        ctx.fillStyle = '#05071a';
        ctx.fillText(h.text, 474 - pop, y + 4);
        ctx.fillStyle = '#ff5d73';
        ctx.fillText(h.text, 470 - pop, y);
      });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';

      // Floating numbers
      g.floaters = g.floaters.filter((f) => now - f.t0 < (f.life || 900));
      for (const f of g.floaters) {
        const age = (now - f.t0) / (f.life || 900);
        ctx.globalAlpha = 1 - age * age;
        if (f.slash) {
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 5; i++) ctx.fillRect(f.x - 40 + i * 16, f.y + 40 + 40 - i * 16, 12, 12);
        }
        ctx.font = `${f.size}px DotGothic16`;
        const y = f.y - age * 50;
        ctx.fillStyle = '#05071a';
        ctx.fillText(f.text, f.x + 4, y + 4);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, y);
        ctx.globalAlpha = 1;
      }
    },
  };

  function drawHero(ctx, now) {
    const result = g.phase === 'result' ? g.result : null;
    const down = result && result.rank === 'C';
    if (down) {
      // Lying on the ground, eyes closed, sword dropped.
      const img = spriteCanvas(FIBER_KUN.rest[0], PALETTE, FK.scale);
      ctx.save();
      ctx.translate(FK.x + FK.size / 2, ARENA.groundY - FK.size / 2 + 40);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(img, -FK.size / 2, -FK.size / 2);
      ctx.restore();
      drawSword(ctx, FK.x + FK.size + 40, ARENA.groundY - 8, 0.05, false);
      return;
    }
    const hurt = now - g.fkHitAt < 220;
    const frame = down ? FIBER_KUN.rest[0] : g.fkY > 0 ? FIBER_KUN.walk[0] : FIBER_KUN.idle[Math.floor(now / 300) % 2];
    const img = spriteCanvas(frame, hurt ? HURT_PALETTE : PALETTE, FK.scale);
    const x = FK.x - (hurt ? 14 : 0);
    const y = ARENA.groundY - img.height - Math.round(g.fkY);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    const sw = Math.max(60, 170 - g.fkY / 3);
    ctx.fillRect(FK.x + FK.size / 2 - sw / 2, ARENA.groundY - 6, sw, 12);
    ctx.drawImage(img, x, y);

    // Sword: rest, wind-up while React renders, slash on commit, cancel on a thrown-away render.
    const hand = [x + FK.size - 30, y + FK.size * 0.62];
    let angle = 0.7;
    let trail = null;
    let cancelled = false;
    const s = g.swing;
    if (down) {
      drawSword(ctx, FK.x + FK.size + 20, ARENA.groundY - 8, 0.05, false);
      return;
    }
    if (result && result.rank === 'S') angle = -Math.PI / 2;
    else if (s) {
      const age = now - s.t0;
      if (s.kind === 'windup') angle = 0.7 + (-2.3 - 0.7) * Math.min(1, age / 120);
      else if (s.kind === 'slash' && age < 520) {
        const p = Math.min(1, age / 180);
        angle = -2.3 + (1.0 + 2.3) * p;
        if (p < 1 || age < 320) trail = { from: -2.3, to: angle, a: age < 320 ? 1 - age / 320 : 1 };
      } else if (s.kind === 'cancel' && age < 400) {
        angle = -2.3 + (0.7 + 2.3) * Math.min(1, age / 300);
        cancelled = true;
      }
    }
    if (trail) {
      ctx.globalAlpha = trail.a;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(hand[0], hand[1], 150, trail.from, trail.to);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    drawSword(ctx, hand[0], hand[1], angle, cancelled);
    if (cancelled) {
      ctx.strokeStyle = '#ff5d73';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(hand[0] + 40, hand[1] - 120);
      ctx.lineTo(hand[0] + 100, hand[1] - 60);
      ctx.moveTo(hand[0] + 100, hand[1] - 120);
      ctx.lineTo(hand[0] + 40, hand[1] - 60);
      ctx.stroke();
    }
    if (result && result.rank === 'S') {
      ctx.fillStyle = '#ffd166';
      for (let i = 0; i < 6; i++) {
        const a = now / 300 + (i * Math.PI) / 3;
        ctx.fillRect(Math.round(hand[0] + Math.cos(a) * 60) - 6, Math.round(hand[1] - 150 + Math.sin(a) * 30) - 6, 12, 12);
      }
    }
  }
}

function drawSword(ctx, x, y, angle, cancelled) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  ctx.fillStyle = '#120c2c';
  ctx.fillRect(4, -9, 128, 18);
  ctx.fillStyle = cancelled ? '#ff9fb2' : '#e8ecff';
  ctx.fillRect(8, -5, 120, 10);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-4, -20, 12, 40);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-28, -6, 24, 12);
  ctx.restore();
}

function drawOrnaments(ctx, kind) {
  if (!kind) return;
  for (let i = 0; i < 3; i++) {
    const [hx, hy] = headPos(i);
    if (kind === 'horns') {
      ctx.fillStyle = '#d8f3ff';
      for (const dx of [-30, 18]) {
        for (let k = 0; k < 5; k++) ctx.fillRect(hx + dx + k * 2, hy - 46 - k * 8, 14 - k * 2, 8);
      }
    } else if (kind === 'crown') {
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(hx - 30, hy - 50, 60, 12);
      for (let k = 0; k < 3; k++) ctx.fillRect(hx - 30 + k * 24, hy - 68, 12, 18);
    }
  }
}

function setWidth(el, frac) {
  if (!el) return;
  const w = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  if (el.style.width !== w) el.style.width = w;
}

function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}
