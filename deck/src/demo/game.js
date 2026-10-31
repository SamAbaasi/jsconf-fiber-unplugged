// The boss fight as a game. Every outcome comes from real events, nothing is random:
//   GOBLIN = one keystroke = one urgent update (setText, SyncLane: D2). It appears when the
//            input event happens and is resolved on the first animation frame after the
//            commit that puts that keystroke's text in the DOM. Latency = that frame's time
//            − event.timeStamp. Latency > 50 ms → it bites for the latency in ms.
//   DRAGON = the heavy list, one fiber per cell (setQuery / deferred query). Its HP = the
//            keystrokes of this round the list has not rendered yet. Each real list commit is
//            a slash that lands; the final commit (the one that shows the last keystroke)
//            kills it.
// The round's result is decided by the bites only (never by HP luck): more than
// RULES.questFailBites bites = QUEST FAILED, even if the dragon went down.
// Hit effects (flash, spark, number, knockback) are drawn at the point of contact.
// All of this runs in the monitor's rAF loop, outside React.
import { FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import { GOBLIN, GOBLIN_PALETTE } from '../sprites/goblin.js';
import { drawSword } from '../sprites/sword.js';
import { spriteCanvas } from '../ui/Sprite.jsx';
import { makeDragon, DESIGN, DRAGON_POINTS, DEFAULT_CELLS } from './dragon.js';
import { SCALES, bbox, reportBox } from '../sprites/scale.js';
import { analyzePhases } from './phases.js';
import { play } from '../audio/sfx.js';

export const RULES = {
  jankMs: 50, // a keystroke whose text needs longer than this to appear bites
  questFailBites: 5, // more bites than this = QUEST FAILED (rank C)
  idleEndMs: 1000, // manual typing: the round ends after 1 s without a keystroke
  maxRoundMs: 20000, // safety net only
};

// Rank, decided only by real numbers. Shown on screen and in the notes.
export function rankOf({ bites, worst }) {
  if (bites === 0 && worst <= 100) return 'S';
  if (bites <= 2 && worst <= 150) return 'A';
  if (bites <= RULES.questFailBites) return 'B';
  return 'C';
}
export const RANK_RULE = 'S: 0 bites, no frame > 100 ms · A: ≤ 2 bites, ≤ 150 ms · B: ≤ 5 bites · C: more bites = QUEST FAILED';

// Same boss, same workload, three looks.
export const FORMS = [
  { name: 'JANK DRAGON', cls: 'form-1', crown: false },
  { name: 'JANK DRAGON · FROST', cls: 'form-2', crown: false },
  { name: 'JANK DRAGON · SHADOW', cls: 'form-3', crown: true },
];

// Proportions come from the scale bible (sprites/scale.js; checked by scripts/check-scale.mjs).
export const ARENA = { w: 1150, h: SCALES.boss.arenaH, groundY: 690 };
const DRAGON_H = SCALES.boss.dragonH; // the dragon's drawn height
const DESIGN_PX = DRAGON_H / DESIGN.rows; // one design-grid cell on screen
const DRAGON_W = Math.round(DESIGN.cols * DESIGN_PX);
export const DRAGON_BOX = { x: ARENA.w - DRAGON_W - 16, y: ARENA.groundY - DRAGON_H, w: DRAGON_W, h: DRAGON_H };
const HERO_SCALE = SCALES.boss.hero;
const HERO = { homeX: 270, scale: HERO_SCALE, size: 16 * HERO_SCALE, dash: 160 };
const SWORD = 1.05; // sword scale, matched to the hero size
const REACH = 148; // slash arc radius = blade tip (142 px × SWORD)
const GOBLIN_SCALE = SCALES.boss.goblin;
const GOBLIN_SLOTS = [150, 56, -38];
const DASH_MS = 90;
const SLASH_MS = 80;
const RETURN_MS = 150;
// Contact: the moment the blade tip passes the dragon's chest. With the dash above, the hand is
// at (598, 617) and the chest at (683, 496): angle −0.96 rad, reached 41% into the slash.
const IMPACT_AT = DASH_MS + Math.round(SLASH_MS * 0.41);
const HURT_PALETTE = Object.fromEntries(Object.entries(PALETTE).map(([k]) => [k, k === 'k' ? '#5a0a1a' : '#ff5d73']));
const WHITE_GOBLIN = Object.fromEntries(Object.entries(GOBLIN_PALETTE).map(([k]) => [k, '#ffffff']));

// A small log of landed hits, so tests can find the frames where contact happens.
const hitLog = (globalThis.__fiberHits = globalThis.__fiberHits || []);
function logHit(type, t) {
  hitLog.push({ type, t });
  if (hitLog.length > 500) hitLog.shift();
}

const toArena = ([gx, gy]) => [DRAGON_BOX.x + gx * DESIGN_PX, DRAGON_BOX.y + gy * DESIGN_PX];
const CHEST = toArena(DRAGON_POINTS.chest);
const HEAD = toArena(DRAGON_POINTS.head);
// Screen size of one grid cell of a dragon with d.cols columns.
export const cellPx = (d) => DRAGON_W / d.cols;
const cellPos = (d, i) => {
  const c = cellPx(d);
  return [DRAGON_BOX.x + ((i % d.cols) + 0.5) * c, DRAGON_BOX.y + (Math.floor(i / d.cols) + 0.5) * c];
};

// White silhouette of the dragon, for the hit flash (one per cell count).
const silhouettes = new Map();
function dragonSilhouette(d) {
  if (silhouettes.has(d)) return silhouettes.get(d);
  const c = document.createElement('canvas');
  c.width = DRAGON_W;
  c.height = DRAGON_H;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  const px = cellPx(d);
  for (let i = 0; i < d.cells; i++) {
    if (d.shape[i]) g.fillRect(Math.floor((i % d.cols) * px), Math.floor(Math.floor(i / d.cols) * px), Math.ceil(px), Math.ceil(px));
  }
  silhouettes.set(d, c);
  return c;
}

function freshRound() {
  return {
    phase: 'ready', // ready → fight → finishing → result
    startAt: 0,
    firstSeq: 0,
    lastKeySeq: 0,
    lastKeyAt: 0,
    typingTotal: 0, // auto-type announces how many keystrokes it will send
    typingEndSeq: 0, // …and which one is the last
    listSeq: 0,
    dragonHp: 0,
    dragonMax: 0,
    dragonHpScheduled: 0,
    goblins: [],
    goblinCount: 0,
    bites: 0,
    biteDamage: 0,
    latencies: [],
    worst: 0,
    frames: 0,
    thrown: 0,
    commits: 0,
    impacts: [], // dragon hits waiting for their contact frame
    sparks: [],
    floaters: [],
    headLog: [], // numbers above Fiber-kun's head (bites, input delay)
    action: null, // { kind: 'dash' | 'goblin' | 'respawn', t0 }
    attempting: false,
    flashUntil: 0,
    kbUntil: 0,
    shake: 0,
    shakeAt: 0,
    fkY: 0,
    fkVy: 0,
    fkHitAt: -1e9,
    finishAt: 0,
    finalScheduled: false,
    inputDelays: [],
    result: null,
    resultAt: 0,
  };
}

export function createGame(els) {
  const g = { round: 0, modeTitle: '', form: FORMS[0], dragon: makeDragon(DEFAULT_CELLS), ...freshRound() };

  const keysInRound = () => (g.lastKeySeq ? g.lastKeySeq - g.firstSeq + 1 : 0);
  const renderedInRound = () => (g.listSeq >= g.firstSeq && g.firstSeq ? g.listSeq - g.firstSeq + 1 : 0);

  function updateHud() {
    // The village: it falls after more than questFailBites bites. Only bites change it.
    const left = Math.max(0, RULES.questFailBites + 1 - g.bites);
    setWidth(els.fkHpBar, left / (RULES.questFailBites + 1));
    setText(els.fkHpText, g.bites > RULES.questFailBites ? 'village: FALLEN' : `village: ${left} bites left`);
    const max = Math.max(1, g.dragonMax);
    setWidth(els.hydraHpBar, g.phase === 'ready' ? 1 : g.dragonHp / max);
    setText(els.hydraHpText, g.phase === 'ready' ? 'HP = keys not rendered' : `HP ${g.dragonHp} / ${g.dragonMax} keys`);
    setText(els.respawnText, `goblins ${g.goblinCount} · bites ${g.bites}`);
    const t = g.phase === 'ready' ? 0 : (g.phase === 'fight' ? performance.now() : g.finishAt || g.resultAt) - g.startAt;
    setText(els.timer, `${(Math.max(0, t) / 1000).toFixed(1)} s`);
  }

  function showReady() {
    if (!els.overlay) return;
    els.overlay.className = 'boss-overlay is-ready';
    els.overlay.dataset.result = '';
    els.overlay.innerHTML = `
      <div class="bo-title">ROUND ${g.round + 1}<span class="bo-mode"> · ${g.modeTitle}</span></div>
      <div class="bo-rules">
        <div><b class="g">GOBLIN</b> = one keystroke · SyncLane. Its text must show within <b>${RULES.jankMs} ms</b>, or it <b class="r">bites</b>.</div>
        <div><b class="g">DRAGON</b> = the ${g.dragon.cells.toLocaleString('en-US')}-fiber list. Each commit is a hit; the final commit wins.</div>
        <div>More than <b>${RULES.questFailBites} bites</b>: the village falls · <b class="r">QUEST FAILED</b>.</div>
      </div>
      <div class="bo-rule">${RANK_RULE}</div>
      <div class="bo-start blink">type to start · ↑ jump</div>`;
  }

  function reset() {
    Object.assign(g, freshRound());
    if (els.hydra) els.hydra.className = `boss-hydra ${g.form.cls}`;
    if (els.dragonKb) els.dragonKb.style.transform = '';
    if (els.arena) els.arena.style.transform = '';
    setText(els.hydraName, g.form.name);
    updateHud();
    showReady();
  }

  function finish(now, outcome) {
    if (g.phase !== 'fight') return;
    g.phase = 'finishing';
    g.finishAt = now;
    g.outcome = outcome;
    if (outcome === 'WIN' && els.hydra) els.hydra.classList.add('is-collapsed');
  }

  function end(now) {
    g.phase = 'result';
    g.resultAt = now;
    const rank = rankOf({ bites: g.bites, worst: g.worst });
    // Deterministic outcome: the bites decide. The dragon may be down and the quest still failed.
    const questFailed = g.bites > RULES.questFailBites;
    const dur = Math.max(1, g.finishAt - g.startAt);
    const lat = g.latencies;
    g.result = {
      round: g.round + 1,
      mode: g.modeTitle,
      form: g.form.name,
      outcome: g.outcome,
      dragonDown: g.outcome === 'WIN',
      questFailed,
      rank,
      goblins: g.goblinCount,
      bites: g.bites,
      biteDamage: g.biteDamage,
      worstLatencyMs: lat.length ? Math.round(Math.max(...lat)) : 0,
      medianLatencyMs: lat.length ? Math.round([...lat].sort((a, b) => a - b)[Math.floor(lat.length / 2)]) : 0,
      worstFrameMs: Math.round(g.worst),
      thrownAway: g.thrown,
      commits: g.commits,
      frames: g.frames,
      avgFps: Math.round((g.frames / dur) * 1000),
      dragonHp: g.dragonHp,
      cells: g.dragon.cells,
      phases: analyzePhases(g.startAt, g.finishAt + 200),
      inputDelays: g.inputDelays.slice(),
      durationMs: Math.round(dur),
    };
    if (els.hydra) {
      // A dragon that really went down stays down (S/C) or retreats (A/B).
      // Only a dragon that was never killed (TIME UP) stands and laughs.
      if (rank === 'A' || rank === 'B') els.hydra.classList.replace('is-collapsed', 'is-retreat');
    }
    play(rank === 'S' ? 'fanfare' : rank === 'C' ? 'lose' : 'rank');
    if (g.outcome !== 'WIN') setTimeout(() => play('laugh'), 1300);
    renderResult();
  }

  function renderResult() {
    const r = g.result;
    if (!els.overlay) return;
    const title = r.questFailed ? 'QUEST FAILED' : { S: 'PERFECT', A: 'GREAT!', B: 'CLEAR', C: 'QUEST FAILED' }[r.rank];
    // The subtitle names the real cause of the rank.
    const outcome = r.questFailed
      ? r.dragonDown
        ? `DRAGON DOWN… but the village fell (${r.bites} bites)`
        : `the village fell (${r.bites} bites)`
      : r.dragonDown
        ? 'DRAGON DOWN'
        : r.outcome;
    const ph = r.phases?.worst;
    const phaseLine = ph
      ? `<div class="bo-phase">worst frame ${ph.duration} ms = render ${ph.render} · commit ${ph.commit} · style/layout/paint ${ph.styleLayoutPaint} · canvas ${ph.canvas} · other ${ph.other}</div>`
      : '';
    const line = els.resultLine ? els.resultLine(r) : '';
    els.overlay.className = `boss-overlay is-result tier-${r.rank}`;
    els.overlay.dataset.result = JSON.stringify(r);
    els.overlay.innerHTML = `
      <div class="bo-res">
        <div>
          <div class="bo-title">${title}</div>
          <div class="bo-sub">${outcome} · round ${r.round}</div>
          <div class="bo-grid">
            <span>bites</span><b>${r.bites} / ${r.goblins}</b>
            <span>worst key</span><b>${r.worstLatencyMs} ms</b>
            <span>worst frame</span><b>${r.worstFrameMs} ms</b>
            <span>thrown away</span><b>${r.thrownAway}</b>
            <span>commits</span><b>${r.commits}</b>
          </div>
        </div>
        <div class="bo-rank rank-${r.rank}"><span>RANK</span>${r.rank}</div>
      </div>
      ${phaseLine}
      ${line ? `<div class="bo-line">${line}</div>` : ''}
      <div class="bo-rule">${RANK_RULE}</div>`;
  }

  function heroX(now) {
    const a = g.action;
    if (!a || a.kind !== 'dash') return HERO.homeX;
    const t = now - a.t0;
    if (t < DASH_MS) return HERO.homeX + HERO.dash * (t / DASH_MS);
    if (t < DASH_MS + SLASH_MS) return HERO.homeX + HERO.dash;
    if (t < DASH_MS + SLASH_MS + RETURN_MS) return HERO.homeX + HERO.dash * (1 - (t - DASH_MS - SLASH_MS) / RETURN_MS);
    return HERO.homeX;
  }
  const headPoint = (now) => [heroX(now) + HERO.size / 2, ARENA.groundY - HERO.size - g.fkY - 40];

  function headText(text, color, now) {
    g.headLog.push({ text, color, t0: now });
    if (g.headLog.length > 2) g.headLog.shift();
  }

  function dragonHpFor(seq) {
    // HP = keystrokes of this round the list has not rendered yet.
    const total = g.typingTotal || keysInRound();
    const rendered = seq >= g.firstSeq ? seq - g.firstSeq + 1 : 0;
    return Math.max(0, total - rendered);
  }

  function isFinal(seq) {
    return g.typingEndSeq ? seq >= g.typingEndSeq : false;
  }

  function scheduleDragonHit(now, seq, final) {
    if (g.finalScheduled) return;
    if (final) g.finalScheduled = true;
    let hp = dragonHpFor(seq);
    if (!final) hp = Math.max(1, hp); // only the final commit can kill it
    const dmg = Math.max(0, g.dragonHpScheduled - hp);
    g.dragonHpScheduled = hp;
    g.action = { kind: 'dash', t0: now };
    g.impacts.push({ at: now + IMPACT_AT, hp, dmg, final });
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
    // Calibration may change the number of cells; the dragon keeps its size on screen.
    setCells(cells) {
      g.dragon = makeDragon(cells);
      if (g.phase === 'ready') showReady();
    },
    dragonBox: DRAGON_BOX,
    onTypingStart(total) {
      if (g.phase === 'ready') g.typingTotal = total;
    },
    onTypingEnd(seq) {
      g.typingEndSeq = seq;
      // React may have committed the last keystroke before this event was recorded
      // (discrete events can flush before the dispatch returns). Then that commit was the final one.
      if (g.phase === 'fight' && g.listSeq >= seq && !g.finalScheduled) scheduleDragonHit(performance.now(), g.listSeq, true);
    },
    // A keystroke: one urgent update. A goblin appears.
    onKey(e) {
      if (g.phase === 'ready') {
        g.phase = 'fight';
        g.startAt = e.t;
        g.firstSeq = e.seq;
        g.dragonMax = g.typingTotal || 1;
        g.dragonHp = g.dragonMax;
        g.dragonHpScheduled = g.dragonMax;
        if (els.overlay) {
          els.overlay.className = 'boss-overlay';
          els.overlay.innerHTML = '';
        }
      }
      if (g.phase !== 'fight') return;
      g.lastKeySeq = e.seq;
      g.lastKeyAt = e.t;
      g.goblinCount++;
      if (!g.typingTotal) g.dragonMax = Math.max(g.dragonMax, keysInRound());
      g.goblins.push({ seq: e.seq, ts: e.ts, state: 'wait', committedAt: 0, t0: 0, born: e.t });
    },
    // The keystroke's text is in the DOM. Its goblin is resolved on the next frame.
    onTextCommit(e) {
      for (const gb of g.goblins) if (gb.state === 'wait' && gb.seq <= e.seq && !gb.committedAt) gb.committedAt = e.t;
    },
    // React started rendering the list: Fiber-kun takes his stance against the dragon.
    onAttempt() {
      if (g.phase === 'fight') g.attempting = true;
    },
    // The list committed: a dash and a slash that lands on the dragon.
    onCommit(e) {
      g.attempting = false;
      if (g.phase !== 'fight' || e.t < g.startAt) return;
      if (e.cells && e.cells !== g.dragon.cells) return; // a cell-count change, not a keystroke
      g.commits++;
      g.listSeq = Math.max(g.listSeq, e.seq);
      g.cuts = { t0: performance.now(), q: e.q };
      scheduleDragonHit(performance.now(), e.seq, isFinal(e.seq));
    },
    // A render attempt was thrown away; React restarts from the root (B2, B6).
    onDiscard(t) {
      if (g.phase !== 'fight' || t < g.startAt) return;
      g.thrown++;
      g.action = { kind: 'respawn', t0: performance.now() };
      play('respawn');
    },
    onSliceEnd() {},
    // ↑ key. `delay` = when we handled it minus when the browser created the event.
    manualJump(delay, now) {
      if (g.fkY < 0.5 && g.phase !== 'result') g.fkVy = 1500;
      const ms = Math.round(delay);
      if (g.phase === 'fight') g.inputDelays.push(ms);
      if (ms > RULES.jankMs) headText(`input delay: ${ms} ms`, '#ffd166', now);
    },

    frame(now, prev) {
      const dt = now - prev;
      if (g.phase === 'fight') {
        g.worst = Math.max(g.worst, dt);
        g.frames++;
      }

      // Goblins: resolve the ones whose text was committed before this frame.
      for (const gb of g.goblins) {
        if (gb.state === 'wait' && gb.committedAt && now > gb.committedAt) {
          const latency = now - gb.ts;
          g.latencies.push(latency);
          gb.latency = Math.round(latency);
          gb.t0 = now;
          if (latency > RULES.jankMs) {
            gb.state = 'bite';
            g.bites++;
          } else {
            gb.state = 'dying';
            g.action = { kind: 'goblin', t0: now };
          }
        }
        // The bite lands 120 ms into the lunge: damage and number at the contact frame.
        if (gb.state === 'bite' && !gb.bitten && now - gb.t0 >= 120) {
          gb.bitten = true;
          g.biteDamage += gb.latency;
          g.fkHitAt = now;
          g.shake = Math.min(26, 6 + gb.latency / 10);
          g.shakeAt = now;
          headText(`-${gb.latency}ms BITE!`, '#ff5d73', now);
          play('hit');
        }
        // After biting, Fiber-kun turns and cuts it down.
        if (gb.state === 'bite' && now - gb.t0 >= 320) {
          gb.state = 'dying';
          gb.t0 = now;
          g.action = { kind: 'goblin', t0: now };
        }
        if (gb.state === 'dying' && !gb.cut && now - gb.t0 >= 70) {
          gb.cut = true;
          logHit('goblin', now);
          const x = GOBLIN_SLOTS[0] + 48;
          g.sparks.push({ x, y: ARENA.groundY - 60, t0: now });
          play('dodge');
        }
        if (gb.state === 'dying' && now - gb.t0 >= 320) gb.state = 'dead';
      }
      g.goblins = g.goblins.filter((gb) => gb.state !== 'dead');

      // Dragon hits land at their contact frame: flash, knockback, spark, number, HP.
      for (const imp of g.impacts) {
        if (imp.done || now < imp.at) continue;
        imp.done = true;
        logHit(imp.final ? 'dragon-final' : 'dragon', now);
        g.dragonHp = imp.hp;
        g.flashUntil = now + 90;
        g.kbUntil = now + 130;
        g.shake = 8;
        g.shakeAt = now;
        g.sparks.push({ x: CHEST[0], y: CHEST[1], t0: now, big: true });
        if (imp.dmg > 0 || imp.final) g.floaters.push({ text: imp.final ? 'FINISH!' : `-${imp.dmg}`, x: CHEST[0] + 40, y: CHEST[1] - 90, t0: now, color: imp.final ? '#ffd166' : '#7dffc8', size: imp.final ? 72 : 52 });
        play('hit');
        if (imp.final) finish(now, 'WIN');
      }
      g.impacts = g.impacts.filter((imp) => !imp.done);

      if (g.phase === 'fight') {
        // Manual typing: no announced end, so the round ends after 1 s without keys,
        // once the list shows the last keystroke. That last commit is the final blow.
        if (!g.typingEndSeq && g.lastKeyAt && now - g.lastKeyAt > RULES.idleEndMs && g.listSeq >= g.lastKeySeq && !g.impacts.length) {
          g.typingEndSeq = g.lastKeySeq;
          scheduleDragonHit(now, g.lastKeySeq, true);
        }
        if (now - g.startAt > RULES.maxRoundMs) finish(now, 'TIME UP');
      }
      if (g.phase === 'finishing' && now - g.finishAt > 900) end(now);

      // Jump physics (manual ↑ only). A long frame moves nothing.
      const step = Math.min(dt, 34) / 1000;
      if (dt <= RULES.jankMs && (g.fkY > 0 || g.fkVy > 0)) {
        g.fkVy -= 4200 * step;
        g.fkY = Math.max(0, g.fkY + g.fkVy * step);
        if (g.fkY === 0) g.fkVy = 0;
      }

      // Knockback on the dragon and screen shake: transforms only, no layout.
      if (els.dragonKb) {
        const kb = now < g.kbUntil ? 'translateX(20px)' : '';
        if (els.dragonKb.style.transform !== kb) els.dragonKb.style.transform = kb;
      }
      if (els.arena) {
        const age = now - g.shakeAt;
        if (g.shake && age < 300) {
          const k = g.shake * (1 - age / 300);
          els.arena.style.transform = `translate(${Math.round(Math.sin(age / 18) * k)}px, ${Math.round(Math.cos(age / 23) * k * 0.6)}px)`;
        } else if (els.arena.style.transform) {
          els.arena.style.transform = '';
          g.shake = 0;
        }
      }
      updateHud();
    },

    draw(ctx, now) {
      ctx.clearRect(0, 0, ARENA.w, ARENA.h);
      ctx.imageSmoothingEnabled = false;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (g.form.crown && g.phase !== 'result' && g.phase !== 'finishing') {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(HEAD[0] - 20, HEAD[1] - 52, 52, 12);
        for (let k = 0; k < 3; k++) ctx.fillRect(HEAD[0] - 20 + k * 20, HEAD[1] - 68, 12, 16);
      }

      // Hit flash: the dragon's silhouette in white, at the contact frame.
      if (now < g.flashUntil) {
        ctx.globalAlpha = 0.75;
        ctx.drawImage(dragonSilhouette(g.dragon), DRAGON_BOX.x + 20, DRAGON_BOX.y);
        ctx.globalAlpha = 1;
      }
      // Cut marks: the cells the last commit matched.
      if (g.cuts && g.cuts.q && now - g.cuts.t0 < 700 && now - g.cuts.t0 > IMPACT_AT) {
        ctx.globalAlpha = 1 - (now - g.cuts.t0) / 700;
        ctx.fillStyle = '#ffffff';
        let n = 0;
        const d = g.dragon;
        for (let i = 0; i < d.cells && n < 90; i += 7) {
          if (d.shape[i] && d.names[i].includes(g.cuts.q)) {
            const [cx, cy] = cellPos(d, i);
            for (let k = -2; k <= 2; k++) ctx.fillRect(cx + k * 3 - 2, cy - k * 3 - 2, 4, 4);
            n++;
          }
        }
        ctx.globalAlpha = 1;
      }

      // A dragon that was never killed (TIME UP) laughs.
      if (g.phase === 'result' && g.result && !g.result.dragonDown) {
        ctx.font = '48px DotGothic16';
        ctx.fillStyle = '#ff5d73';
        ctx.fillText('HA! HA!', HEAD[0] + 40, HEAD[1] - 70 - Math.abs(Math.sin(now / 160)) * 16);
      }

      drawGoblins(ctx, now);
      drawHero(ctx, now);

      // Sparks at contact points.
      g.sparks = g.sparks.filter((s) => now - s.t0 < 220);
      for (const s of g.sparks) {
        const p = (now - s.t0) / 220;
        ctx.fillStyle = p < 0.4 ? '#ffffff' : '#ffd166';
        const r0 = (s.big ? 20 : 12) + p * (s.big ? 70 : 40);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.3;
          ctx.fillRect(Math.round(s.x + Math.cos(a) * r0) - 6, Math.round(s.y + Math.sin(a) * r0) - 6, 12, 12);
        }
      }

      // Numbers above Fiber-kun's head (beside him while he is in the air), below the HUD,
      // never on his face. At most two lines.
      g.headLog = g.headLog.filter((h) => now - h.t0 < 1300);
      const airborne = g.fkY > 20;
      const hx = heroX(now) + HERO.size / 2 + (airborne ? 380 : 0);
      const hy = ARENA.groundY - HERO.size - 52;
      ctx.font = '44px DotGothic16';
      g.headLog.slice(-2).forEach((h, i, list) => {
        const age = (now - h.t0) / 1300;
        ctx.globalAlpha = 1 - age * age;
        const y = hy - (list.length - 1 - i) * 50;
        ctx.fillStyle = '#05071a';
        ctx.fillText(h.text, hx + 4, y + 4);
        ctx.fillStyle = h.color;
        ctx.fillText(h.text, hx, y);
      });
      ctx.globalAlpha = 1;

      // Numbers at dragon impact points.
      g.floaters = g.floaters.filter((f) => now - f.t0 < 900);
      for (const f of g.floaters) {
        const age = (now - f.t0) / 900;
        ctx.globalAlpha = 1 - age * age;
        ctx.font = `${f.size}px DotGothic16`;
        ctx.fillStyle = '#05071a';
        ctx.fillText(f.text, f.x + 4, f.y - age * 40 + 4);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y - age * 40);
      }
      ctx.globalAlpha = 1;
    },
  };

  function drawGoblins(ctx, now) {
    // Waiting goblins stand in their slots; the first one is in sword range.
    let slot = 0;
    for (const gb of g.goblins) {
      const frame = GOBLIN[Math.floor(now / 160) % 2];
      let x = GOBLIN_SLOTS[Math.min(slot, GOBLIN_SLOTS.length - 1)];
      let palette = GOBLIN_PALETTE;
      let alpha = 1;
      if (gb.state === 'wait' || gb.state === 'bite') slot++;
      if (gb.state === 'bite') {
        const p = Math.min(1, (now - gb.t0) / 120);
        x += Math.sin(p * Math.PI * 0.5) * 56; // lunge into Fiber-kun
      }
      if (gb.state === 'dying') {
        const t = now - gb.t0;
        if (t < 70) palette = GOBLIN_PALETTE;
        else if (t < 160) palette = WHITE_GOBLIN; // hit flash at the contact frame
        else alpha = 1 - (t - 160) / 160;
        x = GOBLIN_SLOTS[0] - Math.max(0, t - 70) * 0.25; // small knockback
      }
      if (alpha <= 0) continue;
      const img = spriteCanvas(frame, palette, GOBLIN_SCALE);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.drawImage(img, Math.round(x), ARENA.groundY - img.height);
      const gbb = bbox(GOBLIN[0]);
      reportBox('boss', 'goblin', { x: x + gbb.x * GOBLIN_SCALE, y: ARENA.groundY - img.height + gbb.y * GOBLIN_SCALE, w: gbb.w * GOBLIN_SCALE, h: gbb.h * GOBLIN_SCALE });
      ctx.globalAlpha = 1;
      if (gb.state === 'dying' && now - gb.t0 > 160) {
        ctx.fillStyle = '#d8dcff';
        const p = (now - gb.t0 - 160) / 160;
        for (let i = 0; i < 6; i++) ctx.fillRect(x + 48 + Math.cos(i) * p * 50 - 6, ARENA.groundY - 48 + Math.sin(i) * p * 40 - 6, 12, 12);
      }
    }
  }

  function drawHero(ctx, now) {
    const x = heroX(now);
    const y = ARENA.groundY - HERO.size - Math.round(g.fkY);
    const result = g.phase === 'result' ? g.result : null;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 40, ARENA.groundY - 6, HERO.size - 80, 12);

    if (result && result.questFailed) {
      const img = spriteCanvas(FIBER_KUN.rest[0], PALETTE, HERO.scale);
      ctx.save();
      ctx.translate(x + HERO.size / 2, ARENA.groundY - HERO.size / 2 + 50);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(img, -HERO.size / 2, -HERO.size / 2);
      ctx.restore();
      drawSword(ctx, x + HERO.size + 20, ARENA.groundY - 8, 0.05, { scale: SWORD });
      return;
    }

    const a = g.action;
    const t = a ? now - a.t0 : Infinity;
    const facingLeft = a && a.kind === 'goblin' && t < 260;
    const hurt = now - g.fkHitAt < 200;
    const frame = g.fkY > 0 ? FIBER_KUN.walk[0] : FIBER_KUN.idle[Math.floor(now / 300) % 2];
    const img = spriteCanvas(frame, hurt ? HURT_PALETTE : PALETTE, HERO.scale);
    const hb = bbox(FIBER_KUN.idle[0]);
    reportBox('boss', 'hero', { x: x + hb.x * HERO.scale, y: y + hb.y * HERO.scale, w: hb.w * HERO.scale, h: hb.h * HERO.scale });
    const blink = a && a.kind === 'respawn' && t < 420 && Math.floor(t / 60) % 2 === 0;

    // Respawn at root: a light column and a label above the head.
    if (a && a.kind === 'respawn' && t < 700) {
      ctx.globalAlpha = 0.6 * (1 - t / 700);
      ctx.fillStyle = '#9af5ea';
      ctx.fillRect(x + HERO.size / 2 - 32, 0, 64, ARENA.groundY);
      ctx.globalAlpha = 1;
      const [hx] = headPoint(now);
      ctx.font = '40px DotGothic16';
      ctx.fillStyle = '#05071a';
      ctx.fillText('RESPAWN AT ROOT', hx + 3, 403);
      ctx.fillStyle = '#9af5ea';
      ctx.fillText('RESPAWN AT ROOT', hx, 400);
    }

    ctx.save();
    if (blink) ctx.globalAlpha = 0.35;
    if (facingLeft) {
      ctx.translate(x + HERO.size, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
    } else {
      ctx.drawImage(img, x, y);
    }
    ctx.restore();

    // Sword
    const front = facingLeft ? x + 24 : x + HERO.size - 24;
    const handY = y + HERO.size * 0.62;
    let angle = 0.7;
    let trail = null;
    if (result && result.rank === 'S') angle = -Math.PI / 2;
    else if (a && a.kind === 'dash' && t < DASH_MS + SLASH_MS + RETURN_MS) {
      if (t < DASH_MS) angle = -2.3;
      else if (t < DASH_MS + SLASH_MS) {
        const p = (t - DASH_MS) / SLASH_MS;
        angle = -2.3 + 3.3 * p;
        trail = { from: -2.3, to: angle };
      } else angle = 1.0;
    } else if (a && a.kind === 'goblin' && t < 260) {
      const p = Math.min(1, t / 140);
      angle = -2.3 + 3.3 * p;
      if (t < 200) trail = { from: -2.3, to: angle };
    } else if (g.attempting && g.phase === 'fight') {
      angle = -1.3 + Math.sin(now / 90) * 0.08; // stance while React renders the list
    }
    if (trail) {
      ctx.save();
      ctx.translate(front, handY);
      if (facingLeft) ctx.scale(-1, 1);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(0, 0, REACH, trail.from, trail.to);
      ctx.stroke();
      ctx.restore();
    }
    drawSword(ctx, front, handY, angle, { scale: SWORD, flip: facingLeft });
    if (result && result.rank === 'S') {
      ctx.fillStyle = '#ffd166';
      for (let i = 0; i < 6; i++) {
        const k = now / 300 + (i * Math.PI) / 3;
        ctx.fillRect(Math.round(front + Math.cos(k) * 56) - 6, Math.round(handY - 170 + Math.sin(k) * 28) - 6, 12, 12);
      }
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
