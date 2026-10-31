// The boss fight as a game. Every outcome comes from real measurements:
//   - frame timings from requestAnimationFrame (the same frames the FPS meter counts)
//   - "thrown away" renders and render-task slices from the instrumented scheduler.
// Nothing is random. The rules are fixed below and shown on screen before each round.
// All of this runs in the monitor's rAF loop, outside React.
import { FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import { spriteCanvas } from '../ui/Sprite.jsx';
import { HEADS } from './hydra.js';
import { play } from '../audio/sfx.js';

export const RULES = {
  roundMs: 3000, // a round lasts 3 s from the first keystroke
  attackEveryMs: 300, // the Hydra attacks every 300 ms (wall clock)
  jankMs: 50, // a frame longer than this is a "long frame"
  fiberHp: 500, // Fiber-kun's HP; a hit costs the long frame's length in ms
  hydraHp: 120, // the Hydra's HP; each frame that is not long deals 1 damage
};

// Rank, decided only by real numbers. Shown on screen and in the notes.
export function rankOf({ hits, worst }) {
  if (hits === 0 && worst <= RULES.jankMs) return 'S';
  if (hits <= 1 && worst <= 100) return 'A';
  if (hits <= 3) return 'B';
  return 'C';
}
export const RANK_RULE = 'S: 0 hits, worst ≤ 50 ms · A: ≤ 1 hit, worst ≤ 100 ms · B: ≤ 3 hits · C: more';

// Arena geometry (stage px, inside the arena box).
export const ARENA = { w: 1150, h: 760, groundY: 690 };
export const HYDRA_BOX = { x: 255, y: 120, cell: 7 };
const FK = { x: 70, scale: 8 };
const TELEGRAPH_MS = 260;
// Fiber-kun flashes red when hit: same sprite, every pixel in red tones.
const HURT_PALETTE = Object.fromEntries(Object.entries(PALETTE).map(([k]) => [k, k === 'k' ? '#5a0a1a' : '#ff5d73']));

const headPos = (i) => {
  const [hx, hy] = HEADS[i % HEADS.length];
  return [HYDRA_BOX.x + hx * HYDRA_BOX.cell, HYDRA_BOX.y + hy * HYDRA_BOX.cell];
};

export function createGame(els) {
  const g = {
    round: 0,
    modeTitle: '',
    phase: 'ready', // ready → fight → result
    startAt: 0,
    nextAttack: 0,
    attackIndex: 0,
    fiberHp: RULES.fiberHp,
    hydraHp: RULES.hydraHp,
    hits: 0,
    damage: 0,
    dodges: 0,
    onTime: 0,
    frames: 0,
    worst: 0,
    thrown: 0,
    slices: 0,
    pendingHydraDmg: 0,
    lastHydraFloat: 0,
    shake: 0,
    shakeAt: 0,
    fkHitAt: -1e9,
    fkDodgeAt: -1e9,
    floaters: [],
    respawns: [],
    result: null,
  };

  function updateHud() {
    const fk = Math.max(0, g.fiberHp);
    setWidth(els.fkHpBar, fk / RULES.fiberHp);
    setText(els.fkHpText, `HP ${fk} / ${RULES.fiberHp}`);
    setWidth(els.hydraHpBar, g.hydraHp / RULES.hydraHp);
    setText(els.hydraHpText, `HP ${g.hydraHp} / ${RULES.hydraHp}`);
    setText(els.respawnText, `RESPAWN ×${g.thrown}`);
  }

  function showReady() {
    if (!els.overlay) return;
    els.overlay.className = 'boss-overlay is-ready';
    els.overlay.dataset.result = '';
    els.overlay.innerHTML = `
      <div class="bo-title">ROUND ${g.round + 1}<span class="bo-mode"> · ${g.modeTitle}</span></div>
      <div class="bo-rules">
        <div>Hydra attacks every <b>${RULES.attackEveryMs} ms</b>.</div>
        <div>Frame &gt; <b>${RULES.jankMs} ms</b> → <b class="r">HIT</b>: −frame ms</div>
        <div>Other frames → <b class="g">DODGE</b>, Hydra −1</div>
      </div>
      <div class="bo-start blink">type to start</div>`;
  }

  function reset() {
    Object.assign(g, {
      phase: 'ready',
      startAt: 0,
      nextAttack: 0,
      attackIndex: 0,
      fiberHp: RULES.fiberHp,
      hydraHp: RULES.hydraHp,
      hits: 0,
      damage: 0,
      dodges: 0,
      onTime: 0,
      frames: 0,
      worst: 0,
      thrown: 0,
      slices: 0,
      pendingHydraDmg: 0,
      shake: 0,
      floaters: [],
      respawns: [],
      result: null,
    });
    if (els.hydra) els.hydra.style.opacity = '';
    updateHud();
    showReady();
  }

  function end(now, outcome) {
    g.phase = 'result';
    const rank = rankOf({ hits: g.hits, worst: g.worst });
    g.result = {
      round: g.round + 1,
      mode: g.modeTitle,
      outcome,
      worstFrameMs: Math.round(g.worst),
      hits: g.hits,
      damage: g.damage,
      dodges: g.dodges,
      thrownAway: g.thrown,
      slices: g.slices,
      onTimeFrames: g.onTime,
      frames: g.frames,
      avgFps: Math.round((g.frames / Math.max(1, now - g.startAt)) * 1000),
      fiberHp: Math.max(0, g.fiberHp),
      hydraHp: g.hydraHp,
      rank,
      durationMs: Math.round(now - g.startAt),
    };
    if (outcome === 'WIN' && els.hydra) els.hydra.style.opacity = '0.25';
    play(outcome === 'WIN' ? 'rank' : 'lose');
    renderResult();
  }

  function renderResult() {
    const r = g.result;
    if (!els.overlay) return;
    const title = r.outcome === 'WIN' ? 'WIN!' : r.outcome === 'KO' ? 'K.O.' : 'TIME UP';
    const line = els.resultLine ? els.resultLine(r) : '';
    els.overlay.className = `boss-overlay is-result is-${r.outcome.toLowerCase().replace(' ', '-')}`;
    els.overlay.dataset.result = JSON.stringify(r);
    els.overlay.innerHTML = `
      <div class="bo-res">
        <div>
          <div class="bo-title">${title}</div>
          <div class="bo-grid">
            <span>worst frame</span><b>${r.worstFrameMs} ms</b>
            <span>hits</span><b>${r.hits}</b>
            <span>thrown away</span><b>${r.thrownAway}</b>
            <span>5 ms slices</span><b>${r.slices}</b>
          </div>
        </div>
        <div class="bo-rank rank-${r.rank}"><span>RANK</span>${r.rank}</div>
      </div>
      ${line ? `<div class="bo-line">${line}</div>` : ''}
      <div class="bo-rule">${RANK_RULE}</div>`;
  }

  return {
    state: g,
    rules: RULES,
    setRound(index, modeTitle) {
      g.round = index;
      g.modeTitle = modeTitle;
      reset();
    },
    reset,
    onKey(t) {
      if (g.phase !== 'ready') return;
      g.phase = 'fight';
      g.startAt = t;
      g.nextAttack = t + RULES.attackEveryMs;
      g.lastHydraFloat = t;
      if (els.overlay) {
        els.overlay.className = 'boss-overlay';
        els.overlay.innerHTML = '';
      }
    },
    // A render attempt was thrown away and React restarted from the root (B2).
    onDiscard(t) {
      g.respawns.push({ t0: t });
      play('respawn');
      if (g.phase === 'fight' && t >= g.startAt) {
        g.thrown++;
        updateHud();
      }
    },
    onSliceEnd(t) {
      if (g.phase === 'fight' && t >= g.startAt) g.slices++;
    },

    // Called once per rAF with this frame's timestamp and the previous one.
    frame(now, prev) {
      const dt = now - prev;
      if (g.phase === 'fight') {
        if (now > g.startAt) {
          g.worst = Math.max(g.worst, dt);
          g.frames++;
        }
        if (dt <= RULES.jankMs) {
          g.onTime++;
          g.hydraHp = Math.max(0, RULES.hydraHp - g.onTime);
          g.pendingHydraDmg++;
        }
        if (g.pendingHydraDmg && now - g.lastHydraFloat > 250) {
          const [hx, hy] = headPos(g.attackIndex + 1);
          g.floaters.push({ text: `-${g.pendingHydraDmg}`, x: hx + 40, y: hy + 80, t0: now, color: '#7dffc8', size: 44, slash: true });
          g.pendingHydraDmg = 0;
          g.lastHydraFloat = now;
        }
        // Resolve every attack whose time falls inside this frame (prev, now].
        while (g.nextAttack <= now && g.nextAttack <= g.startAt + RULES.roundMs) {
          if (dt > RULES.jankMs) {
            const dmg = Math.round(dt);
            g.fiberHp -= dmg;
            g.damage += dmg;
            g.hits++;
            g.fkHitAt = now;
            g.shake = Math.min(34, 8 + dmg / 8);
            g.shakeAt = now;
            g.floaters.push({ text: `-${dmg}ms JANK!`, x: 330, y: ARENA.groundY - 220 - (g.hits % 3) * 70, t0: now, color: '#ff5d73', size: 56 });
            play('hit');
          } else {
            g.dodges++;
            g.fkDodgeAt = now;
            g.floaters.push({ text: 'DODGE', x: FK.x + 64, y: ARENA.groundY - 170, t0: now, color: '#4cc9f0', size: 40 });
            play('dodge');
          }
          g.attackIndex++;
          g.nextAttack += RULES.attackEveryMs;
        }
        updateHud();
        if (g.fiberHp <= 0) end(now, 'KO');
        else if (g.hydraHp <= 0) end(now, 'WIN');
        else if (now >= g.startAt + RULES.roundMs) end(now, 'TIME UP');
      }

      // Screen shake: moves the whole arena (one transform, no layout).
      if (els.arena) {
        const age = now - g.shakeAt;
        if (g.shake && age < 360) {
          const k = g.shake * (1 - age / 360);
          const sx = Math.round(Math.sin(age / 18) * k);
          const sy = Math.round(Math.cos(age / 23) * k * 0.6);
          els.arena.style.transform = `translate(${sx}px, ${sy}px)`;
        } else if (els.arena.style.transform) {
          els.arena.style.transform = '';
          g.shake = 0;
        }
      }
    },

    draw(ctx, now) {
      ctx.clearRect(0, 0, ARENA.w, ARENA.h);
      ctx.imageSmoothingEnabled = false;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Incoming attack: a fireball from a head toward Fiber-kun.
      if (g.phase === 'fight') {
        const T = g.nextAttack;
        const p = 1 - (T - now) / TELEGRAPH_MS;
        if (p >= 0 && p <= 1) {
          const [hx, hy] = headPos(g.attackIndex);
          const tx = FK.x + 64;
          const ty = ARENA.groundY - 70;
          const x = hx + (tx - hx) * p;
          const y = hy + (ty - hy) * p - Math.sin(p * Math.PI) * 60;
          ctx.fillStyle = '#ff9f1c';
          ctx.fillRect(Math.round(x) - 14, Math.round(y) - 14, 28, 28);
          ctx.fillStyle = '#ffd166';
          ctx.fillRect(Math.round(x) - 8, Math.round(y) - 8, 16, 16);
        }
      }

      // Fiber-kun
      let frame = FIBER_KUN.idle[Math.floor(now / 300) % 2];
      let yOff = 0;
      if (g.phase === 'result' && g.result?.outcome === 'KO') frame = FIBER_KUN.rest[0];
      else if (now - g.fkDodgeAt < 260) {
        yOff = -Math.round(Math.sin(((now - g.fkDodgeAt) / 260) * Math.PI) * 60);
        frame = FIBER_KUN.walk[0];
      } else if (g.phase === 'result' && g.result?.outcome === 'WIN') {
        yOff = -Math.abs(Math.round(Math.sin(now / 120) * 18));
      }
      const hurt = now - g.fkHitAt < 220;
      const img = spriteCanvas(frame, hurt ? HURT_PALETTE : PALETTE, FK.scale);
      ctx.drawImage(img, FK.x - (hurt ? 10 : 0), ARENA.groundY - img.height + yOff);

      // Respawn at root: a light column and a label, only after a real thrown-away render.
      g.respawns = g.respawns.filter((r) => now - r.t0 < 900);
      if (g.respawns.length) {
        // One light column and one label, for the latest real thrown-away render.
        const r = g.respawns[g.respawns.length - 1];
        const a = 1 - (now - r.t0) / 900;
        ctx.globalAlpha = a * 0.8;
        ctx.fillStyle = '#9af5ea';
        ctx.fillRect(FK.x + 40, 210, 48, ARENA.groundY - 210);
        ctx.globalAlpha = a;
        ctx.font = '36px DotGothic16';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#05071a';
        ctx.fillText('RESPAWN AT ROOT', FK.x + 3, 253);
        ctx.fillStyle = '#9af5ea';
        ctx.fillText('RESPAWN AT ROOT', FK.x, 250);
        ctx.textAlign = 'center';
        ctx.globalAlpha = 1;
      }

      // Floating numbers
      g.floaters = g.floaters.filter((f) => now - f.t0 < 1000);
      for (const f of g.floaters) {
        const age = (now - f.t0) / 1000;
        ctx.globalAlpha = 1 - age;
        if (f.slash) {
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 5; i++) ctx.fillRect(f.x - 40 + i * 16, f.y + 40 + 40 - i * 16, 12, 12);
        }
        ctx.font = `${f.size}px DotGothic16`;
        ctx.fillStyle = '#05071a';
        ctx.fillText(f.text, f.x + 4, f.y - age * 70 + 4);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y - age * 70);
        ctx.globalAlpha = 1;
      }
    },
  };
}

function setWidth(el, frac) {
  if (!el) return;
  const w = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  if (el.style.width !== w) el.style.width = w;
}

function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}
