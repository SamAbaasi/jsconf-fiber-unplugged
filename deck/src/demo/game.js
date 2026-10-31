// The boss fight as a game. Every outcome comes from real events, nothing is random:
//   GOBLIN = one keystroke = one urgent update (setText, SyncLane: D2). It appears when the
//            input event happens and is resolved on the first animation frame after the
//            commit that puts that keystroke's text in the DOM. Latency = that frame's time
//            − event.timeStamp. Latency > 50 ms → it reaches the VILLAGE (your UI) and bites:
//            one window goes dark. More than RULES.questFailBites bites → the village falls.
//   DRAGON = the heavy list, one fiber per cell (setQuery / deferred query). Its HP = the
//            keystrokes of this round the list has not rendered yet. Each real list commit is
//            a slash that lands; the final commit (the one that shows the last keystroke)
//            kills it.
// The round's result is decided by the bites only (never by HP luck): more than
// RULES.questFailBites bites = QUEST FAILED, even if the dragon went down.
// The end of a round must be readable with the sound off and without reading:
//   QUEST FAILED: the dragon falls, the village burns, goblins dance on the roofs, Fiber-kun
//                 kneels with a broken sword, the arena turns grey.
//   PERFECT:      the dragon falls, every window is lit, Fiber-kun raises his sword, fireworks.
// All of this runs in the monitor's rAF loop, outside React.
import { FIBER_KUN, FACES, PALETTE } from '../sprites/fiberkun.js';
import { GOBLIN, GOBLIN_PALETTE } from '../sprites/goblin.js';
import { drawSword } from '../sprites/sword.js';
import { spriteCanvas } from '../ui/Sprite.jsx';
import { makeDragon, DESIGN, DESIGN_PX, DRAGON_PX, DRAGON_POINTS, DEFAULT_CELLS } from './dragon.js';
import { SCALES, bbox, reportBox } from '../sprites/scale.js';
import { analyzePhases } from './phases.js';
import { eventLog } from '../instrument/eventLog.js';
import { play } from '../audio/sfx.js';

export const RULES = {
  jankMs: 50, // a keystroke whose text needs longer than this to appear bites
  questFailBites: 5, // more bites than this = QUEST FAILED (rank C)
  idleEndMs: 1000, // manual typing: the round ends after 1 s without a keystroke
  maxRoundMs: 20000, // safety net only
};

// Rank, decided only by real numbers. In the speaker notes; the audience sees the scene.
export function rankOf({ bites, worst }) {
  if (bites === 0 && worst <= 100) return 'S';
  if (bites <= 2 && worst <= 150) return 'A';
  if (bites <= RULES.questFailBites) return 'B';
  return 'C';
}
export const RANK_RULE = 'S: 0 bites, no frame gap > 100 ms · A: ≤ 2 bites, ≤ 150 ms · B: ≤ 5 bites · C: more bites = QUEST FAILED';

// Same boss, same workload, three looks.
export const FORMS = [
  { name: 'JANK DRAGON', cls: 'form-1' },
  { name: 'JANK DRAGON · FROST', cls: 'form-2' },
  { name: 'JANK DRAGON · NIGHT', cls: 'form-3' },
];

// Proportions come from the scale bible (sprites/scale.js; checked by scripts/check-scale.mjs).
// Fiber-kun, the goblins and the dragon are all drawn on the same ×12 pixel grid.
export const ARENA = { w: 1150, h: SCALES.boss.arenaH, groundY: 690 };
const DRAGON_W = DRAGON_PX.w;
const DRAGON_H = DRAGON_PX.h;
// Right edge 24 px inside the arena (5 px border), so the 12 px knockback never clips the tail.
export const DRAGON_BOX = { x: ARENA.w - 5 - DRAGON_W - 24, y: ARENA.groundY - DRAGON_H, w: DRAGON_W, h: DRAGON_H };
const HERO_SCALE = SCALES.boss.hero;
const HERO_SIZE = 16 * HERO_SCALE;
const SWORD = 1.05; // sword scale, matched to the hero size
const REACH = 148; // slash arc radius = blade tip (142 px × SWORD)
const HERO_HOME = 360;
// Dash so the blade tip passes the dragon's chest at the contact frame (computed, not tuned).
const CHEST = [DRAGON_BOX.x + DRAGON_POINTS.chest[0] * DESIGN_PX, DRAGON_BOX.y + DRAGON_POINTS.chest[1] * DESIGN_PX];
const HEAD = [DRAGON_BOX.x + DRAGON_POINTS.head[0] * DESIGN_PX, DRAGON_BOX.y + DRAGON_POINTS.head[1] * DESIGN_PX];
const HAND_Y = ARENA.groundY - HERO_SIZE + HERO_SIZE * 0.62;
const HAND_X = CHEST[0] - Math.sqrt(REACH ** 2 - (HAND_Y - CHEST[1]) ** 2);
const CONTACT_ANGLE = Math.atan2(CHEST[1] - HAND_Y, CHEST[0] - HAND_X);
const HERO = { homeX: HERO_HOME, scale: HERO_SCALE, size: HERO_SIZE, dash: Math.round(HAND_X - (HERO_HOME + HERO_SIZE - 24)) };
const GOBLIN_SCALE = SCALES.boss.goblin;
const GOBLIN_W = 8 * GOBLIN_SCALE;
const GOBLIN_SLOTS = [252, 196]; // waiting goblins, between the village and Fiber-kun
const DASH_MS = 90;
const SLASH_MS = 80;
const RETURN_MS = 150;
// Contact: the moment the slash (from −2.3 to +1.0 rad) passes the chest angle.
const IMPACT_AT = DASH_MS + Math.round(SLASH_MS * ((CONTACT_ANGLE + 2.3) / 3.3));
const WHITE_GOBLIN = Object.fromEntries(Object.entries(GOBLIN_PALETTE).map(([k]) => [k, '#ffffff']));

// The village = your UI. Three houses on the ×12 grid, two windows each: six windows,
// one per allowed bite. The sixth bite (more than questFailBites) makes it fall.
const PX = 12;
const HOUSES = [12, 92, 172].map((x) => ({ x, w: 6 * PX }));
const WINDOWS = HOUSES.length * 2;
const HOUSE_TOP = ARENA.groundY - 5 * PX; // wall top
const ROOF_TOP = HOUSE_TOP - 3 * PX;
const windowRect = (i) => {
  const h = HOUSES[i % HOUSES.length];
  const k = Math.floor(i / HOUSES.length);
  return { x: h.x + (k ? 4 : 1) * PX, y: HOUSE_TOP + PX, w: PX, h: 2 * PX };
};

// A small log of landed hits, so tests can find the frames where contact happens.
const hitLog = (globalThis.__fiberHits = globalThis.__fiberHits || []);
function logHit(type, t) {
  hitLog.push({ type, t });
  if (hitLog.length > 500) hitLog.shift();
}

// Screen position of a dragon cell's centre.
const cellPos = (d, i) => [DRAGON_BOX.x + ((i % d.cols) + 0.5) * d.cellPx, DRAGON_BOX.y + (Math.floor(i / d.cols) + 0.5) * d.cellPx];

// White silhouette of the dragon, for the hit flash (one per cell count).
const silhouettes = new Map();
function dragonSilhouette(d) {
  if (silhouettes.has(d)) return silhouettes.get(d);
  const c = document.createElement('canvas');
  c.width = DRAGON_W;
  c.height = DRAGON_H;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  for (let i = 0; i < d.cells; i++) {
    if (d.shape[i]) g.fillRect((i % d.cols) * d.cellPx, Math.floor(i / d.cols) * d.cellPx, d.cellPx, d.cellPx);
  }
  silhouettes.set(d, c);
  return c;
}

// Every round's trace (for the REPLAY step): raw events + frame times, by round index.
export const traces = (globalThis.__roundTraces ||= {});
function captureTrace(t0, t1) {
  const ev = [];
  const end = eventLog.n;
  for (let i = Math.max(0, end - eventLog.size); i < end; i++) {
    const e = eventLog.buf[i % eventLog.size];
    if (e && e.t >= t0 && e.t <= t1) ev.push(e);
  }
  return ev;
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
    darkWindows: 0, // windows gone dark = bites that reached the village
    latencies: [],
    worstKey: 0, // only grows during a round
    worst: 0,
    frames: 0,
    frameTimes: [],
    thrown: 0,
    commits: 0,
    impacts: [], // dragon hits waiting for their contact frame
    sparks: [],
    floaters: [],
    headLog: [],
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

  function updateHud() {
    const max = Math.max(1, g.dragonMax);
    setWidth(els.hydraHpBar, g.phase === 'ready' ? 1 : g.dragonHp / max);
    setText(els.hydraHpText, g.phase === 'ready' ? 'HP = keys not on screen' : `HP ${g.dragonHp} / ${g.dragonMax}`);
    const t = g.phase === 'ready' ? 0 : (g.phase === 'fight' ? performance.now() : g.finishAt || g.resultAt) - g.startAt;
    setText(els.timer, `${(Math.max(0, t) / 1000).toFixed(1)} s`);
    setText(els.worstKey, g.latencies.length ? `${Math.round(g.worstKey)} ms` : '–');
    if (els.worstKey) els.worstKey.dataset.level = !g.latencies.length ? 'none' : g.worstKey > RULES.jankMs ? 'bad' : 'good';
  }

  function showReady() {
    if (!els.overlay) return;
    els.overlay.className = 'boss-overlay is-ready';
    els.overlay.dataset.result = '';
    els.overlay.innerHTML = `
      <div class="bo-title">ROUND ${g.round + 1}</div>
      <div class="bo-mode">${g.modeTitle}</div>
      <div class="bo-rules">
        <div><b class="g">GOBLIN</b> = 1 keystroke</div>
        <div>late &gt; ${RULES.jankMs} ms → it <b class="r">bites your UI</b></div>
        <div><b class="g">DRAGON</b> = the big list</div>
      </div>
      <div class="bo-start blink">type to start</div>`;
  }

  function reset() {
    Object.assign(g, freshRound());
    if (els.hydra) {
      // Snap back without the fall transition (otherwise the legs sink into the grass).
      els.hydra.style.transition = 'none';
      els.hydra.className = `boss-hydra ${g.form.cls}`;
      void els.hydra.offsetWidth;
      els.hydra.style.transition = '';
    }
    if (els.dragonKb) els.dragonKb.style.transform = '';
    if (els.arena) {
      els.arena.style.transform = '';
      els.arena.classList.remove('is-grey');
    }
    setText(els.hydraName, g.form.name);
    updateHud();
    showReady();
  }

  function finish(now, outcome) {
    if (g.phase !== 'fight') return;
    g.phase = 'finishing';
    g.finishAt = now;
    g.outcome = outcome;
    // The dragon falls whenever the list really showed the last keystroke (it did render).
    if (outcome === 'WIN' && els.hydra) els.hydra.classList.add('is-collapsed');
  }

  function end(now) {
    g.phase = 'result';
    g.resultAt = now;
    const rank = rankOf({ bites: g.bites, worst: g.worst });
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
      typingMs: g.lastKeyAt ? Math.round(g.lastKeyAt - g.startAt) : 0,
    };
    traces[g.round] = {
      round: g.round + 1,
      mode: g.modeTitle,
      t0: g.startAt,
      t1: g.finishAt,
      events: captureTrace(g.startAt - 100, g.finishAt + 300),
      frames: g.frameTimes.slice(),
      result: g.result,
    };
    els.onTrace?.(g.round);
    if (els.hydra && (rank === 'A' || rank === 'B')) els.hydra.classList.replace('is-collapsed', 'is-retreat');
    if (els.arena && questFailed) els.arena.classList.add('is-grey');
    play(rank === 'S' ? 'fanfare' : questFailed ? 'lose' : 'rank');
    if (g.outcome !== 'WIN') setTimeout(() => play('laugh'), 1300);
    renderResult();
  }

  // The audience sees one number: the worst keystroke. The rest is in data-result (and notes).
  function renderResult() {
    const r = g.result;
    if (!els.overlay) return;
    const title = r.questFailed ? 'QUEST FAILED' : { S: 'PERFECT', A: 'GREAT!', B: 'CLEAR', C: 'QUEST FAILED' }[r.rank];
    const sub = r.questFailed ? (r.dragonDown ? 'dragon down… but the village fell' : 'the village fell') : r.dragonDown ? 'dragon down · village safe' : r.outcome;
    const line = els.resultLine ? els.resultLine(r) : '';
    els.overlay.className = `boss-overlay is-result tier-${r.questFailed ? 'C' : r.rank}`;
    els.overlay.dataset.result = JSON.stringify(r);
    els.overlay.innerHTML = `
      <div class="bo-res">
        <div>
          <div class="bo-title">${title}</div>
          <div class="bo-sub">${sub}</div>
        </div>
        <div class="bo-rank rank-${r.rank}"><span>RANK</span>${r.rank}</div>
      </div>
      <div class="bo-key"><span>worst key</span><b class="${r.worstLatencyMs > RULES.jankMs ? 'bad' : 'good'}">${r.worstLatencyMs} ms</b></div>
      ${line ? `<div class="bo-line">${line}</div>` : ''}`;
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
    dragonBox: DRAGON_BOX,
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
        g.frameTimes.push(now);
      }

      // Goblins: resolve the ones whose text was committed before this frame.
      for (const gb of g.goblins) {
        if (gb.state === 'wait' && gb.committedAt && now > gb.committedAt) {
          const latency = now - gb.ts;
          g.latencies.push(latency);
          g.worstKey = Math.max(g.worstKey, latency);
          gb.latency = Math.round(latency);
          gb.t0 = now;
          if (latency > RULES.jankMs) {
            gb.state = 'bite';
            gb.window = g.bites; // which window it will darken
            g.bites++;
          } else {
            gb.state = 'dying';
            g.action = { kind: 'goblin', t0: now };
          }
        }
        // The goblin runs into the village; at contact a window goes dark.
        if (gb.state === 'bite' && !gb.bitten && now - gb.t0 >= 160) {
          gb.bitten = true;
          g.biteDamage += gb.latency;
          g.darkWindows = Math.min(WINDOWS, g.darkWindows + 1);
          const w = windowRect(Math.min(gb.window, WINDOWS - 1));
          g.sparks.push({ x: w.x + PX / 2, y: w.y + PX, t0: now, smoke: true });
          g.shake = Math.min(14, 4 + gb.latency / 30);
          g.shakeAt = now;
          headText(`BITE! ${gb.latency} ms late`, '#ff5d73', now);
          play('hit');
        }
        // After biting, it climbs onto a roof and stays there (one per house), or vanishes.
        if (gb.state === 'bite' && now - gb.t0 >= 360) {
          const onRoofs = g.goblins.filter((x) => x.state === 'roof').length;
          if (onRoofs < HOUSES.length) {
            gb.state = 'roof';
            gb.house = onRoofs;
          } else {
            gb.state = 'dying';
            gb.t0 = now;
            gb.quiet = true;
          }
        }
        if (gb.state === 'dying' && !gb.cut && !gb.quiet && now - gb.t0 >= 70) {
          gb.cut = true;
          logHit('goblin', now);
          g.sparks.push({ x: GOBLIN_SLOTS[0] + GOBLIN_W / 2, y: ARENA.groundY - 48, t0: now });
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
        g.flashUntil = now + 50; // about 3 frames, half strength: a flash, not a strobe
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
        const kb = now < g.kbUntil ? 'translateX(12px)' : '';
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
      const r = g.phase === 'result' ? g.result : null;

      // Hit flash: the dragon's silhouette in white, at the contact frame.
      if (now < g.flashUntil) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(dragonSilhouette(g.dragon), DRAGON_BOX.x + 12, DRAGON_BOX.y);
        ctx.globalAlpha = 1;
      }
      // Cut marks: the cells the last commit matched.
      if (g.cuts && g.cuts.q && now - g.cuts.t0 < 700 && now - g.cuts.t0 > IMPACT_AT && !r) {
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
      if (r && !r.dragonDown) {
        ctx.font = '48px DotGothic16';
        ctx.fillStyle = '#ff5d73';
        ctx.fillText('HA! HA!', HEAD[0] + 40, HEAD[1] - 70 - Math.abs(Math.sin(now / 160)) * 16);
      }

      drawVillage(ctx, now);
      drawGoblins(ctx, now);
      drawVillageFire(ctx, now);
      drawHero(ctx, now);

      // Sparks and smoke at contact points.
      g.sparks = g.sparks.filter((s) => now - s.t0 < (s.smoke ? 500 : 220));
      for (const s of g.sparks) {
        if (s.smoke) {
          const p = (now - s.t0) / 500;
          ctx.fillStyle = `rgba(90, 80, 110, ${0.8 * (1 - p)})`;
          for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(s.x - 12 + i * 6 + Math.sin(i + now / 90) * 4), Math.round(s.y - 20 - p * 60 - i * 10), 12, 12);
          continue;
        }
        const p = (now - s.t0) / 220;
        ctx.fillStyle = p < 0.4 ? '#ffffff' : '#ffd166';
        const r0 = (s.big ? 20 : 12) + p * (s.big ? 70 : 40);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.3;
          ctx.fillRect(Math.round(s.x + Math.cos(a) * r0) - 6, Math.round(s.y + Math.sin(a) * r0) - 6, 12, 12);
        }
      }

      // Bite numbers: over the village, where the goblins bite. Never on Fiber-kun or the dragon.
      g.headLog = g.headLog.filter((h) => now - h.t0 < 1300);
      ctx.font = '40px DotGothic16';
      g.headLog.slice(-2).forEach((h, i, list) => {
        const age = (now - h.t0) / 1300;
        ctx.globalAlpha = 1 - age * age;
        const y = ROOF_TOP - 130 - (list.length - 1 - i) * 46;
        ctx.fillStyle = '#05071a';
        ctx.fillText(h.text, 172, y + 4);
        ctx.fillStyle = h.color;
        ctx.fillText(h.text, 168, y);
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

      if (r) drawEnding(ctx, now, r);
    },
  };

  // ---------- the village (your UI) ----------
  function drawVillage(ctx, now) {
    const fallen = g.bites > RULES.questFailBites;
    for (let h = 0; h < HOUSES.length; h++) {
      const { x, w } = HOUSES[h];
      // roof: three stepped rows on the 12 px grid
      ctx.fillStyle = '#8a3a3a';
      ctx.fillRect(x + 2 * PX, ROOF_TOP, 2 * PX, PX);
      ctx.fillRect(x + PX, ROOF_TOP + PX, 4 * PX, PX);
      ctx.fillRect(x, ROOF_TOP + 2 * PX, w, PX);
      // walls and door
      ctx.fillStyle = '#c9a27a';
      ctx.fillRect(x, HOUSE_TOP, w, ARENA.groundY - HOUSE_TOP);
      ctx.fillStyle = '#5c3a2e';
      ctx.fillRect(x + 2.5 * PX, HOUSE_TOP + 3 * PX, PX, 2 * PX);
    }
    for (let i = 0; i < WINDOWS; i++) {
      const wr = windowRect(i);
      ctx.fillStyle = i < g.darkWindows ? '#1a1430' : '#ffd166';
      ctx.fillRect(wr.x, wr.y, wr.w, wr.h);
    }
    // Label, once: what the village stands for (on the grass, never covered).
    ctx.font = '32px DotGothic16';
    ctx.fillStyle = '#05071a';
    ctx.fillText('your UI', 128, ARENA.groundY + 34 + 3);
    ctx.fillStyle = fallen ? '#ff5d73' : '#ffffff';
    ctx.fillText('your UI', 126, ARENA.groundY + 34);
  }

  // The village falls: fire on every roof, from the moment it falls until the round is reset.
  // Drawn after the goblins, so the dancing goblins never hide it.
  function drawVillageFire(ctx, now) {
    if (g.bites > RULES.questFailBites) {
      for (let h = 0; h < HOUSES.length; h++) {
        const { x } = HOUSES[h];
        for (let k = 0; k < 4; k++) {
          const flick = Math.floor(now / 90 + k * 1.7 + h) % 3;
          ctx.fillStyle = flick === 0 ? '#ffd166' : flick === 1 ? '#ff9f1c' : '#ff5d73';
          ctx.fillRect(x + 6 + k * 16, ROOF_TOP + PX - flick * 8, PX, 2 * PX + flick * 8);
          ctx.fillRect(x + 12 + k * 14, HOUSE_TOP - flick * 6, PX, PX);
        }
      }
    }
  }

  function drawGoblins(ctx, now) {
    let slot = 0;
    for (const gb of g.goblins) {
      const frame = GOBLIN[Math.floor(now / 160) % 2];
      let x = GOBLIN_SLOTS[Math.min(slot, GOBLIN_SLOTS.length - 1)];
      let y = ARENA.groundY - GOBLIN_W;
      let palette = GOBLIN_PALETTE;
      let alpha = 1;
      if (gb.state === 'wait') slot++;
      if (gb.state === 'bite') {
        // Run into the village: from its slot to the window it darkens.
        const w = windowRect(Math.min(gb.window, WINDOWS - 1));
        const p = Math.min(1, (now - gb.t0) / 160);
        x = GOBLIN_SLOTS[0] + (w.x - GOBLIN_W / 2 - GOBLIN_SLOTS[0]) * p;
      }
      if (gb.state === 'roof') {
        // Dancing on a roof.
        const h = HOUSES[gb.house];
        x = h.x + (h.w - GOBLIN_W) / 2;
        y = ROOF_TOP - GOBLIN_W - Math.abs(Math.sin(now / 140 + gb.house)) * 14;
      }
      if (gb.state === 'dying') {
        const t = now - gb.t0;
        if (gb.quiet) alpha = 1 - t / 320;
        else if (t >= 70 && t < 160) palette = WHITE_GOBLIN; // hit flash at the contact frame
        else if (t >= 160) alpha = 1 - (t - 160) / 160;
        if (!gb.quiet) x = GOBLIN_SLOTS[0] - Math.max(0, t - 70) * 0.25; // small knockback
      }
      if (alpha <= 0) continue;
      const img = spriteCanvas(frame, palette, GOBLIN_SCALE);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.drawImage(img, Math.round(x), Math.round(y));
      ctx.globalAlpha = 1;
      const gbb = bbox(GOBLIN[0]);
      if (gb.state === 'wait') reportBox('boss', 'goblin', { x, y: y + gbb.y * GOBLIN_SCALE, w: gbb.w * GOBLIN_SCALE, h: gbb.h * GOBLIN_SCALE });
    }
  }

  function drawHero(ctx, now) {
    const x = heroX(now);
    const y = ARENA.groundY - HERO.size - Math.round(g.fkY);
    const result = g.phase === 'result' ? g.result : null;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 32, ARENA.groundY - 6, HERO.size - 64, 12);

    if (result && result.questFailed) {
      // Kneels, eyes closed. The sword is broken: the hilt in front, the blade on the ground.
      const img = spriteCanvas(FIBER_KUN.rest[0], PALETTE, HERO.scale);
      ctx.drawImage(img, x, ARENA.groundY - img.height);
      drawBrokenSword(ctx, x + HERO.size - 8, ARENA.groundY - 40);
      return;
    }

    const a = g.action;
    const t = a ? now - a.t0 : Infinity;
    const facingLeft = a && a.kind === 'goblin' && t < 260;
    const frame = g.fkY > 0 ? FIBER_KUN.walk[0] : result && result.rank === 'S' ? FACES.smug : FIBER_KUN.idle[Math.floor(now / 300) % 2];
    const img = spriteCanvas(frame, PALETTE, HERO.scale);
    const hb = bbox(FIBER_KUN.idle[0]);
    reportBox('boss', 'hero', { x: x + hb.x * HERO.scale, y: y + hb.y * HERO.scale, w: hb.w * HERO.scale, h: hb.h * HERO.scale });
    const blink = a && a.kind === 'respawn' && t < 420 && Math.floor(t / 60) % 2 === 0;

    // Respawn at root: a light column and a label.
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
    let angle = 0.3; // at rest: blade forward and a little down, above the ground
    let trail = null;
    if (result && result.rank === 'S') angle = -Math.PI / 2;
    else if (result) angle = -0.8;
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
  }

  // ---------- end-of-round scene, readable without text or sound ----------
  function drawEnding(ctx, now, r) {
    const age = now - g.resultAt;
    if (r.rank === 'S' && !r.questFailed) {
      // Fireworks: fixed positions, a new burst every 450 ms.
      const spots = [
        [260, 200, '#ffd166'],
        [560, 140, '#34e0a1'],
        [860, 190, '#ff9fb2'],
        [420, 260, '#4cc9f0'],
        [720, 250, '#ffd166'],
      ];
      for (let k = 0; k < spots.length; k++) {
        const t = (age + k * 180) % 900;
        if (t > 600) continue;
        const [fx, fy, col] = spots[k];
        const p = t / 600;
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = col;
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          ctx.fillRect(Math.round(fx + Math.cos(ang) * p * 110) - 6, Math.round(fy + Math.sin(ang) * p * 110) - 6, 12, 12);
        }
        ctx.globalAlpha = 1;
      }
    }
    const title = r.questFailed ? 'QUEST FAILED' : { S: 'PERFECT', A: 'GREAT!', B: 'CLEAR', C: 'QUEST FAILED' }[r.rank];
    const color = r.questFailed ? '#ff5d73' : r.rank === 'S' ? '#ffd166' : '#ffffff';
    const pop = Math.min(1, age / 250);
    ctx.font = `${Math.round(110 * (0.7 + 0.3 * pop))}px DotGothic16`;
    ctx.fillStyle = '#05071a';
    ctx.fillText(title, ARENA.w / 2 + 6, 236 + 6);
    ctx.fillStyle = color;
    ctx.fillText(title, ARENA.w / 2, 236);
  }
}

function drawBrokenSword(ctx, x, y) {
  // hilt with a short broken blade, and the rest of the blade lying on the ground
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(x - 24, y - 6, 24, 12);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(x, y - 18, 12, 36);
  ctx.fillStyle = '#120c2c';
  ctx.fillRect(x + 12, y - 8, 40, 16);
  ctx.fillStyle = '#e8ecff';
  ctx.fillRect(x + 12, y - 4, 36, 8);
  ctx.fillStyle = '#120c2c';
  ctx.fillRect(x + 80, ARENA.groundY - 14, 92, 14);
  ctx.fillStyle = '#e8ecff';
  ctx.fillRect(x + 84, ARENA.groundY - 10, 84, 8);
}

function setWidth(el, frac) {
  if (!el) return;
  const w = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  if (el.style.width !== w) el.style.width = w;
}

function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}
