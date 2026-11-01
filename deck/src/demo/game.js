// The boss fight as a game. Every outcome comes from real events, nothing is random:
//   GOBLIN = one keystroke = one urgent update (setText, SyncLane: D2). It appears when the
//            input event happens and is resolved on the first animation frame after the
//            commit that puts that keystroke's text in the DOM. Latency = that frame's time
//            − event.timeStamp. Latency > 50 ms → it reaches the VILLAGE (your UI) and bites:
//            one window goes dark and smoke rises.
// A ROUND = a fixed number of keys (RULES.roundKeys), the same for auto-type and typing by hand,
// shown as "keys 3 / 12". A pause never ends a round; the presenter may end it early (Enter or
// the clicker) after at least RULES.minKeys keys. The village falls when, with at least minKeys
// keys resolved, the bites reach RULES.failRatio of them; once fallen it stays fallen.
//   DRAGON = the heavy list, one fiber per cell (setQuery / deferred query). Its HP = the
//            keystrokes of this round the list has not rendered yet. Each real list commit is
//            a slash that lands; the final commit (the one that shows the last keystroke)
//            kills it.
// The round's result is decided by the bite RATIO (never by how many keys were typed, never by
// HP luck): village fallen = QUEST FAILED, even if the dragon went down.
// The end of a round must be readable with the sound off and without reading:
//   QUEST FAILED: the dragon falls, the village burns, goblins dance on the roofs, Fiber-kun
//                 kneels with a broken sword, the arena turns grey.
//   PERFECT:      the dragon falls, every window is lit, Fiber-kun raises his sword, fireworks.
// All of this runs in the monitor's rAF loop, outside React.
import { FIBER_KUN, FACES, PALETTE } from '../sprites/fiberkun.js';
import { PACK, PACK_META, packCanvas, packBox } from '../sprites/pack.js';
import { spriteCanvas } from '../ui/Sprite.jsx';
import { makeDragon, poseCanvas, ART_PX, DRAGON_PX, DRAGON_POINTS, BASELINE_ROW, DEFAULT_CELLS } from './dragon.js';
import { SCALES, bbox, reportBox } from '../sprites/scale.js';
import { analyzePhases } from './phases.js';
import { eventLog } from '../instrument/eventLog.js';
import { play } from '../audio/sfx.js';

export const RULES = {
  jankMs: 50, // a keystroke whose text needs longer than this to appear bites
  roundKeys: 12, // keys per round, auto-type and by hand
  minKeys: 3, // the round can be ended early (Enter / clicker) after this many keys
  failRatio: 0.5, // the village falls when bites >= 50% of the keys resolved (after minKeys)
  maxRoundMs: 30000, // safety net only
};

// INP label for the worst key (CLAIMS L5): ≤ 200 ms good, ≤ 500 ms needs improvement, else poor.
// The worst key is measured like an interaction: event.timeStamp → the first frame that shows it.
// In a failed round the label is never green: the text stays true, the colour is neutral (and a
// failed round with a worst key ≤ 200 ms means the work is too light: recalibrate, RUNBOOK).
export function inpLabel(ms, failed = false) {
  if (ms <= 200) return { text: 'INP: good', level: failed ? 'neutral' : 'good' };
  if (ms <= 500) return { text: 'INP: needs improvement', level: 'warn' };
  return { text: 'INP: poor', level: 'bad' };
}

// Rank, decided only by real numbers. In the speaker notes; the audience sees the scene.
export function rankOf({ bites, keys, worstKey, fallen }) {
  if (fallen) return 'C';
  if (bites === 0) return 'S';
  // A: at most 1 bite or 10% of the keys (whichever is larger), worst key ≤ 100 ms. The "1 bite"
  // part was added after the 2× test: in a short round (Enter after 5–7 keys) one key at 51 ms
  // was already more than 10%.
  if (bites <= Math.max(1, Math.floor(keys * 0.1)) && worstKey <= 100) return 'A';
  return 'B';
}
export const RANK_RULE = 'S: 0 bites · A: at most 1 bite (or 10% of keys, if more) and worst key ≤ 100 ms · B: fewer than 50% bite · C: ≥ 50% bite (after 3 keys) = QUEST FAILED';

// Same boss, same workload, three looks.
export const FORMS = [
  { name: 'JANK DRAGON', cls: 'form-1' },
  { name: 'JANK DRAGON · FROST', cls: 'form-2' },
  { name: 'JANK DRAGON · NIGHT', cls: 'form-3' },
];

// Proportions come from the scale bible (sprites/scale.js; checked by scripts/check-scale.mjs).
// Everything is Saman's pixel pack (or Fiber-kun) on the same ×12 grid. Full-width arena:
//   castle (your UI) at the left · goblins between the castle and Fiber-kun · Fiber-kun ·
//   an empty gap · the dragon, right-aligned. Nothing stands between Fiber-kun and the dragon.
const PX = 12;
export const ARENA = { w: 1860, h: SCALES.boss.arenaH, groundY: 690 };
const DRAGON_W = DRAGON_PX.w;
const DRAGON_H = DRAGON_PX.h;
// Right edge 24 px inside the arena (5 px border), so the 12 px knockback never clips the tail.
// The art uses columns 3…58 of its 66; the feet (BASELINE_ROW) stand on the ground.
const SHAPE_W = 59 * ART_PX;
export const DRAGON_BOX = { x: ARENA.w - 5 - SHAPE_W - 24, y: ARENA.groundY - (BASELINE_ROW + 1) * ART_PX, w: DRAGON_W, h: DRAGON_H };
const HERO_SCALE = SCALES.boss.hero;
const HERO_SIZE = 16 * HERO_SCALE;
const HERO_HOME = 640; // Fiber-kun's left edge (same in every round)
// His right hand on the 16×16 sprite (column 12, row 10): the sword's hilt goes there.
const HAND = { col: 12, row: 10 };
const SWORD_META = PACK_META.sword;
// The slash crescent reaches this far right of the hand (slash_arc's right edge − its centre).
const SLASH_REACH = (packBox('slash_arc').x + packBox('slash_arc').w - SWORD_META.slash_arc.anchor_centre[0]) * PX;
// Dash so the crescent reaches the dragon's chest at the contact frame (computed, not tuned).
const CHEST = [DRAGON_BOX.x + DRAGON_POINTS.chest[0] * ART_PX, DRAGON_BOX.y + DRAGON_POINTS.chest[1] * ART_PX];
const HEAD = [DRAGON_BOX.x + DRAGON_POINTS.head[0] * ART_PX, DRAGON_BOX.y + DRAGON_POINTS.head[1] * ART_PX];
const HERO = { homeX: HERO_HOME, scale: HERO_SCALE, size: HERO_SIZE, dash: Math.round(CHEST[0] - SLASH_REACH - (HAND.col + 0.5) * PX - HERO_HOME) };
const GOBLIN_SCALE = SCALES.boss.goblin;
const GOBLIN_W = PACK.goblin_walk1.w * GOBLIN_SCALE; // 168
const GOBLIN_H = PACK.goblin_walk1.h * GOBLIN_SCALE; // 180
// The castle: castle_* sprites (34 × 35) at ×12, bottom on the ground. Stone starts at row 11;
// the rows above are for the flames.
const CASTLE = { x: 20, y: ARENA.groundY - PACK.castle_intact.h * PX, w: PACK.castle_intact.w * PX, stoneTop: ARENA.groundY - 24 * PX };
// Waiting goblins: between the castle and Fiber-kun (more than three overlap on the last spot).
const GOBLIN_SLOTS = [HERO_HOME - GOBLIN_W + 12, HERO_HOME - GOBLIN_W - 36, HERO_HOME - GOBLIN_W - 84];
// Late goblins bite the castle here (left edge of the goblin), then dance in front of it.
const BITE_SPOTS = [CASTLE.x + 230, CASTLE.x + 130, CASTLE.x + 30];
const DANCE_SPOTS = [CASTLE.x + 40, CASTLE.x + 200];
// Never more than this many goblins drawn at once (the rest still count; they are just not drawn).
const MAX_GOBLINS_SHOWN = 3; // Saman: three, not more
// VISUALS ONLY are slowed down by this factor, so a hand-typed round can be followed: the dash
// and slash, the goblin hit and death, goblins running to the castle, the BITE text, the final hit.
// Nothing measured depends on these: latency is still event.timeStamp → the first frame after the
// text commit, and bites / ranks use the same rules.
const VIS = 1.5;
const DASH_MS = Math.round(90 * VIS);
const SLASH_MS = Math.round(80 * VIS);
const RETURN_MS = Math.round(150 * VIS);
const GOBLIN_RUN_MS = Math.round(160 * VIS); // from its spot to the castle (then it bites)
const GOBLIN_STAY_MS = Math.round(360 * VIS); // after this it dances in front of the castle
const GOBLIN_CUT_MS = Math.round(70 * VIS); // the sword reaches it (goblin_hit)
const GOBLIN_FADE_AT = Math.round(160 * VIS); // then it fades out…
const GOBLIN_GONE_MS = Math.round(320 * VIS); // …and is gone
const GOBLIN_SLASH_MS = Math.round(260 * VIS); // Fiber-kun's turn-and-cut
const BITE_TEXT_MS = 1500; // "BITE! N ms late" stays this long
const FLOATER_MS = Math.round(900 * VIS); // -N / FINISH! at the dragon
// After the final hit lands (on screen): the dragon falls, then a pause, then the result card.
const RESULT_AFTER_MS = 900 + 800;
// The round's MEASURED end: this long after the final list commit, as in c9f824e (where it was
// the contact time of a dash: 90 + 80 / 2 ms). It does not wait for the animation queue below.
const MEASURE_END_MS = 130;
// Contact: the middle of the slash, when the crescent is at the chest.
const IMPACT_AT = DASH_MS + Math.round(SLASH_MS / 2);
// Where smoke rises when the castle burns (the flames of castle_burning).
const SMOKE_SPOTS = [CASTLE.x + 4 * PX, CASTLE.x + 13 * PX, CASTLE.x + 21 * PX, CASTLE.x + 29 * PX];

// A small log of landed hits, so tests can find the frames where contact happens.
const hitLog = (globalThis.__fiberHits = globalThis.__fiberHits || []);
function logHit(type, t) {
  hitLog.push({ type, t });
  if (hitLog.length > 500) hitLog.shift();
}

const FALL_MS = Math.round(700 * VIS);
const ICE_HOLD = 400; // the frozen ice beam is held this long…
const ICE_SHATTER = 300; // …then it shatters
// Rounds 2–3: ice shards fly at this speed, so shards from consecutive slices stay apart.
const SHARD_SPEED = 2.4; // px per ms
const SHARD_GAP_MS = 24; // at most one shard per this many ms (slices in the same frame = one shard)
const HURT_MS = Math.round(160 * VIS); // the hurt pose after each hit
const formIndex = (form) => Math.max(0, FORMS.indexOf(form));

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
    roundKeys: RULES.roundKeys, // smaller if the presenter ends the round early
    resolved: 0, // keys whose text is on screen (resolved goblins)
    fallen: false, // the village fell (sticky until the reset)
    notice: null, // a short message, e.g. type more
    listSeq: 0,
    dragonHp: 0,
    dragonMax: 0,
    dragonHpScheduled: 0,
    goblins: [],
    goblinCount: 0,
    bites: 0,
    biteDamage: 0,
    latencies: [],
    worstKey: 0, // only grows during a round
    worst: 0,
    frames: 0,
    frameTimes: [],
    thrown: 0,
    commits: 0,
    queue: [], // Fiber-kun's actions waiting to play (visual only): { kind: 'dash' | 'goblin', … }
    finishPendingAt: 0, // the measured end of the round (final commit + MEASURE_END_MS)
    respawnAt: -1e9, // the last thrown-away render (RESPAWN AT ROOT)
    sparks: [],
    floaters: [],
    headLog: [],
    action: null, // the action playing now: { kind: 'dash' | 'goblin', t0, … }
    attempting: false,
    hurtUntil: 0,
    kbUntil: 0,
    shake: 0,
    shakeAt: 0,
    fkY: 0,
    fkVy: 0,
    fkHitAt: -1e9,
    finishAt: 0,
    finalScheduled: false,
    fallAt: 0, // when the dragon started to fall
    breath: null, // { t0, ms }: the last long task (round 1: the ice beam)
    gaps: [], // long frames waiting for their long-task entry
    puffs: [], // { t0 }: real Scheduler slices (rounds 2–3: ice shards)
    inputDelays: [],
    result: null,
    resultAt: 0,
  };
}

// Real long tasks (≥ 50 ms, L1), from the Long Tasks API: { start, ms }, the last few only.
const longTasks = [];
let longTasksSupported = false;
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) longTasks.push({ start: e.startTime, ms: e.duration });
    if (longTasks.length > 20) longTasks.splice(0, longTasks.length - 20);
  }).observe({ type: 'longtask' });
  longTasksSupported = true;
} catch {
  longTasksSupported = false;
}

// Draw every sprite and text the game uses once, off-screen, when the slide opens. Otherwise
// the first frame that needs them (round 2: the frost poses, the 《Yield》 shield and its label)
// pays for building them, and that frame shows up in the replay as a long frame that is our own
// drawing, not React.
function prewarmDrawing() {
  for (let f = 0; f < FORMS.length; f++) for (const pose of ['breath', 'hurt', 'kneel', 'defeated']) poseCanvas(pose, f);
  for (const n of Object.keys(PACK)) {
    if (n.startsWith('dragon_')) continue;
    packCanvas(n, n.startsWith('goblin_') ? { scale: GOBLIN_SCALE } : {});
    if (n.startsWith('sword_') || n === 'slash_arc') packCanvas(n, { flip: true });
  }
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  for (const size of [32, 40, 44, 48, 52, 72]) {
    ctx.font = `${size}px DotGothic16`;
    ctx.fillText('《Yield》 BITE! 0123456789 ms late frozen FINISH! TOO LATE RESPAWN AT ROOT -', 0, 32);
  }
}

export function createGame(els) {
  (document.fonts?.ready ?? Promise.resolve()).then(prewarmDrawing);
  const g = { round: 0, modeTitle: '', form: FORMS[0], dragon: makeDragon(DEFAULT_CELLS), ...freshRound() };

  const keysInRound = () => (g.lastKeySeq ? g.lastKeySeq - g.firstSeq + 1 : 0);
  const keyIndex = (seq) => seq - g.firstSeq + 1;

  function updateHud() {
    const ready = g.phase === 'ready';
    if (els.arena && els.arena.classList.contains('is-ready') !== ready) els.arena.classList.toggle('is-ready', ready);
    const max = Math.max(1, g.dragonMax);
    setWidth(els.hydraHpBar, g.phase === 'ready' ? 1 : g.dragonHp / max);
    setText(els.hydraHpText, `keys ${keysInRound()} / ${g.roundKeys} · HP ${g.phase === 'ready' ? g.roundKeys : g.dragonHp}`);
    const t = g.phase === 'ready' ? 0 : (g.phase === 'fight' ? performance.now() : g.finishAt || g.resultAt) - g.startAt;
    setText(els.timer, `${(Math.max(0, t) / 1000).toFixed(1)} s`);
    setText(els.worstKey, g.latencies.length ? `${Math.round(g.worstKey)} ms` : '–');
    if (els.worstKey) els.worstKey.dataset.level = !g.latencies.length ? 'none' : g.worstKey > RULES.jankMs ? 'bad' : 'good';
    const inp = g.latencies.length ? inpLabel(Math.round(g.worstKey), g.fallen) : null;
    setText(els.inp, inp ? inp.text : '');
    if (els.inp) els.inp.dataset.level = inp ? inp.level : 'none';
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
        <div>late &gt; ${RULES.jankMs} ms → it <b class="r" style="white-space:nowrap">bites your UI</b></div>
        <div><b class="g">DRAGON</b> = the big list</div>
        <div>${RULES.roundKeys} keys · half late → <b class="r">QUEST FAILED</b></div>
      </div>
      <div class="bo-start blink">type to start</div>`;
  }

  function reset() {
    Object.assign(g, freshRound());
    if (els.hydra) {
      // Snap back without the fall transition (otherwise the legs sink into the grass).
      els.hydra.className = `boss-hydra no-anim ${g.form.cls}`;
      void els.hydra.offsetWidth;
      els.hydra.classList.remove('no-anim');
    }
    if (els.dragonKb) els.dragonKb.style.transform = '';
    if (els.arena) {
      els.arena.style.transform = '';
      els.arena.classList.remove('is-grey', 'is-result');
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
    // The dragon falls when the final hit lands on screen (see the action queue in frame()).
  }

  function end(now) {
    g.phase = 'result';
    g.resultAt = now;
    const rank = rankOf({ bites: g.bites, keys: Math.max(1, g.resolved), worstKey: g.worstKey, fallen: g.fallen });
    const questFailed = g.fallen;
    const dur = Math.max(1, g.finishAt - g.startAt);
    const lat = g.latencies;
    g.result = {
      round: g.round + 1,
      mode: g.modeTitle,
      form: g.form.name,
      // A failed round is FAILED everywhere, even when the dragon went down (dragonDown says that).
      outcome: questFailed ? 'FAILED' : g.outcome,
      dragonDown: g.outcome === 'WIN',
      questFailed,
      rank,
      goblins: g.goblinCount,
      keys: keysInRound(),
      roundKeys: g.roundKeys,
      bites: g.bites,
      biteRatio: Math.round((g.bites / Math.max(1, g.resolved)) * 100) / 100,
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
    g.headLog = [];
    if (els.arena) {
      els.arena.classList.add('is-result');
      if (questFailed) els.arena.classList.add('is-grey');
    }
    play(rank === 'S' ? 'fanfare' : questFailed ? 'lose' : 'rank');
    if (g.outcome !== 'WIN') setTimeout(() => play('laugh'), 1300);
    renderResult();
    els.onEnd?.();
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
      <div class="bo-key"><span>worst key</span><b class="${r.worstLatencyMs > RULES.jankMs ? 'bad' : 'good'}">${r.worstLatencyMs} ms</b><i class="inp-${inpLabel(r.worstLatencyMs, r.questFailed).level}">${inpLabel(r.worstLatencyMs, r.questFailed).text}</i></div>
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
    const total = g.roundKeys;
    const rendered = seq >= g.firstSeq ? seq - g.firstSeq + 1 : 0;
    return Math.max(0, total - rendered);
  }

  // The final key of the round: the roundKeys-th key (or the last one, if ended early).
  function isFinal(seq) {
    return g.firstSeq > 0 && keyIndex(seq) >= g.roundKeys;
  }

  function scheduleDragonHit(now, seq, final) {
    if (g.finalScheduled) return;
    if (final) {
      g.finalScheduled = true;
      g.finishPendingAt = now + MEASURE_END_MS; // the measured end does not wait for the animation
    }
    let hp = dragonHpFor(seq);
    if (!final) hp = Math.max(1, hp); // only the final commit can kill it
    const dmg = Math.max(0, g.dragonHpScheduled - hp);
    g.dragonHpScheduled = hp;
    queueAction({ kind: 'dash', hp, dmg, final });
  }

  // Add an action for Fiber-kun, or merge it into a waiting one of the same kind.
  function queueAction(act) {
    const waiting = g.queue.find((q) => q.kind === act.kind);
    if (!waiting) {
      g.queue.push(act);
      return;
    }
    if (act.kind === 'goblin') waiting.gbs.push(...act.gbs);
    else {
      waiting.hp = act.hp;
      waiting.dmg += act.dmg;
      waiting.final = waiting.final || act.final;
    }
  }

  return {
    state: g,
    // All of the round's keys are in (the rest of the round is the list catching up).
    roundFull: () => g.phase === 'fight' && keysInRound() >= g.roundKeys,
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
    onTypingStart() {},
    onTypingEnd() {},
    // Enter or the clicker during a fight: end the round now (at least RULES.minKeys keys).
    // Returns true if the click was used by the game (so the deck does not move on).
    endEarly(now = performance.now()) {
      if (g.phase === 'ready') return false;
      if (g.phase !== 'fight') return g.phase === 'finishing';
      const n = keysInRound();
      if (n < RULES.minKeys) {
        g.notice = { text: `type more (${n} / ${RULES.minKeys} keys)`, t0: now };
        return true;
      }
      if (g.roundKeys !== n) {
        g.roundKeys = n;
        g.dragonMax = n;
        g.dragonHp = Math.min(g.dragonHp, n);
        g.dragonHpScheduled = Math.min(g.dragonHpScheduled, n);
      }
      // If the list already shows the last key, that commit was the final one.
      if (g.listSeq >= g.lastKeySeq && !g.finalScheduled) scheduleDragonHit(now, g.listSeq, true);
      return true;
    },
    // A keystroke: one urgent update. A goblin appears.
    onKey(e) {
      if (g.phase === 'ready') {
        g.phase = 'fight';
        g.startAt = e.t;
        g.firstSeq = e.seq;
        g.roundKeys = RULES.roundKeys;
        g.dragonMax = g.roundKeys;
        g.dragonHp = g.dragonMax;
        g.dragonHpScheduled = g.dragonMax;
        if (els.overlay) {
          els.overlay.className = 'boss-overlay';
          els.overlay.innerHTML = '';
        }
      }
      if (g.phase !== 'fight') return;
      if (keyIndex(e.seq) > g.roundKeys) return; // the round is full: extra keys are not counted
      g.lastKeySeq = e.seq;
      g.lastKeyAt = e.t;
      g.goblinCount++;
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
      g.respawnAt = performance.now();
      play('respawn');
    },
    // A real Scheduler slice of the list render ended (rounds 2–3): one ice shard.
    onSliceEnd(t) {
      if (g.phase !== 'fight' || t < g.startAt) return;
      const now = performance.now();
      const last = g.puffs[g.puffs.length - 1];
      if (last && now - last.t0 < SHARD_GAP_MS) return; // slices in the same frame: one visible shard
      g.puffs.push({ t0: now });
      if (g.puffs.length > 40) g.puffs.shift();
    },
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
        // Dragon ice beam = a real LONG TASK (one task ≥ 50 ms, L1) inside a long frame: the heavy
        // render blocked the main thread. A frame that is late only because the browser rendered
        // late between short slices (seen under screen capture) is not a long task: no beam.
        // Long-task entries arrive a little after the frame, so the gap waits for its task
        // (up to 500 ms). Without the Long Tasks API, the frame gap alone is used.
        // Visual only: bites decide the result.
        if (dt >= RULES.jankMs) g.gaps.push({ from: prev, to: now });
      }
      for (const gap of g.gaps) {
        const task = longTasksSupported ? longTasks.find((t) => t.start < gap.to && t.start + t.ms > gap.from) : { ms: gap.to - gap.from };
        if (task) {
          g.breath = { t0: now, ms: Math.round(task.ms) };
          g.fkHitAt = now; // he flinches (visual only)
          gap.done = true;
        } else if (now - gap.to > 500) gap.done = true;
      }
      if (g.gaps.length) g.gaps = g.gaps.filter((gap) => !gap.done);

      // Goblins: resolve the ones whose text was committed before this frame.
      for (const gb of g.goblins) {
        if (gb.state === 'wait' && gb.committedAt && now > gb.committedAt) {
          const latency = now - gb.ts;
          g.latencies.push(latency);
          g.worstKey = Math.max(g.worstKey, latency);
          gb.latency = Math.round(latency);
          gb.t0 = now;
          g.resolved++;
          const late = latency > RULES.jankMs;
          if (late) {
            gb.state = 'bite';
            gb.window = g.bites; // which window it will darken
            g.bites++;
          }
          // The village falls once the bite ratio is reached (with enough keys to judge).
          if (!g.fallen && g.resolved >= RULES.minKeys && g.bites / g.resolved >= RULES.failRatio) g.fallen = true;
          if (!late) {
            // On time: Fiber-kun will cut it. It waits for its turn in the action queue (visual
            // only; its latency is already measured above).
            gb.state = 'queued';
            queueAction({ kind: 'goblin', gbs: [gb] });
          }
        }
        // The goblin runs to the castle; at contact it bites (smoke, the castle cracks).
        if (gb.state === 'bite' && !gb.bitten && now - gb.t0 >= GOBLIN_RUN_MS) {
          gb.bitten = true;
          g.biteDamage += gb.latency;
          g.sparks.push({ x: BITE_SPOTS[gb.window % BITE_SPOTS.length] + GOBLIN_W / 2, y: ARENA.groundY - GOBLIN_H, t0: now, smoke: true });
          g.shake = Math.min(14, 4 + gb.latency / 30);
          g.shakeAt = now;
          headText(`BITE! ${gb.latency} ms late`, '#ff5d73', now);
          play('hit');
        }
        // After biting, it stays and dances on the ground in front of the castle (two at most,
        // never on the flames), or vanishes.
        if (gb.state === 'bite' && now - gb.t0 >= GOBLIN_STAY_MS) {
          const onRoofs = g.goblins.filter((x) => x.state === 'roof').length;
          if (onRoofs < DANCE_SPOTS.length) {
            gb.state = 'roof';
            gb.house = onRoofs;
          } else {
            gb.state = 'dying';
            gb.t0 = now;
            gb.quiet = true;
          }
        }
        if (gb.state === 'dying' && !gb.cut && !gb.quiet && now - gb.t0 >= GOBLIN_CUT_MS) {
          gb.cut = true;
          logHit('goblin', now);
          play('dodge');
        }
        if (gb.state === 'dying' && now - gb.t0 >= GOBLIN_GONE_MS) gb.state = 'dead';
      }
      g.goblins = g.goblins.filter((gb) => gb.state !== 'dead');

      // The measured end of the round: the final list commit + MEASURE_END_MS (same as c9f824e).
      if (g.phase === 'fight' && g.finishPendingAt && now >= g.finishPendingAt) finish(now, 'WIN');

      // Fiber-kun's actions play one after another, each in full, so fast typing stays readable.
      // Waiting actions of the same kind merge (one slash cuts every goblin waiting; one dash
      // carries the latest list commit), so the picture is never more than about one action behind.
      const cur = g.action;
      const curDone = !cur || now - cur.t0 >= (cur.kind === 'dash' ? DASH_MS + SLASH_MS + RETURN_MS : GOBLIN_SLASH_MS);
      if (curDone && g.queue.length) {
        const next = g.queue.shift();
        next.t0 = now;
        g.action = next;
        if (next.kind === 'goblin') {
          for (const gb of next.gbs) {
            gb.state = 'dying';
            gb.t0 = now;
          }
        }
      }
      // A dash's slash lands at its contact frame: hurt pose, knockback, number, HP.
      const act = g.action;
      if (act && act.kind === 'dash' && !act.hit && now - act.t0 >= IMPACT_AT) {
        act.hit = true;
        logHit(act.final ? 'dragon-final' : 'dragon', now);
        g.dragonHp = act.hp;
        g.hurtUntil = now + HURT_MS; // the hurt pose
        g.kbUntil = now + Math.round(130 * VIS);
        g.shake = 8;
        g.shakeAt = now;
        const late = act.final && g.fallen;
        if (act.dmg > 0 || act.final)
          // above the dragon's shoulder, right of its horns (not on its neck or chest)
          g.floaters.push({ text: act.final ? (late ? 'TOO LATE' : 'FINISH!') : `-${act.dmg}`, x: DRAGON_BOX.x + 21 * ART_PX, y: DRAGON_BOX.y + 20, t0: now, color: act.final ? (late ? '#a3a9c2' : '#ffd166') : '#7dffc8', size: act.final ? 72 : 52 });
        play('hit');
        if (act.final) {
          // The dragon falls (it did render the last key). The village already fell: it only kneels.
          g.fallAt = now;
          g.fallPose = g.fallen ? 'kneel' : 'defeated';
          if (els.hydra) els.hydra.classList.add('is-collapsed'); // the canvas draws the fallen pose
        }
      }

      if (g.phase === 'fight') {
        // A pause never ends a round. Only the key count, Enter/clicker, or the safety net do.
        if (now - g.startAt > RULES.maxRoundMs) finish(now, 'TIME UP');
      }
      // The result card: after the final hit has landed on screen and the pause after it (a round
      // that did not end with the dragon's fall: after the pause from its end).
      if (g.phase === 'finishing' && now - (g.outcome === 'WIN' ? g.fallAt || Infinity : g.finishAt) > RESULT_AFTER_MS) end(now);

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

      // The fallen dragon (drawn here once it is down; the DOM grid is hidden then): hurt first,
      // then kneeling (QUEST FAILED) or lying flat (victory).
      if (g.fallAt) {
        const pose = now - g.fallAt < FALL_MS / 2 ? 'hurt' : g.fallPose;
        if (r && r.questFailed) ctx.filter = 'grayscale(0.9) brightness(0.8)';
        ctx.drawImage(poseCanvas(pose, formIndex(g.form)), DRAGON_BOX.x, DRAGON_BOX.y);
        ctx.filter = 'none';
      }
      // A dragon that was never killed (TIME UP) laughs.
      if (r && !r.dragonDown) {
        ctx.font = '48px DotGothic16';
        ctx.fillStyle = '#ff5d73';
        ctx.fillText('HA! HA!', HEAD[0] + 40, HEAD[1] - 70 - Math.abs(Math.sin(now / 160)) * 16);
      }

      // Breath: while it lasts the canvas draws the dragon with its head down toward Fiber-kun,
      // and the DOM grid is hidden. Round 1: a frozen ICE beam (drawn whole on the first frame
      // after the long frame). Rounds 2–3: ice shards, one per real slice, on the 《Yield》 shield.
      const iceAge = g.breath ? now - g.breath.t0 : Infinity;
      const ice = iceAge < ICE_HOLD + ICE_SHATTER;
      g.puffs = g.puffs.filter((p) => (now - p.t0) * SHARD_SPEED < 420);
      const puffing = g.puffs.length > 0;
      const breathing = !g.fallAt && (ice || puffing);
      // The ice beam keeps the breath pose (the beam starts at its mouth); otherwise a hit shows the
      // hurt pose for a moment, and no shards leave the mouth meanwhile.
      const hurt = !g.fallAt && !ice && now < g.hurtUntil;
      if (els.hydra && !g.fallAt) els.hydra.classList.toggle('is-breathing', breathing || hurt);
      if (hurt) ctx.drawImage(poseCanvas('hurt', formIndex(g.form)), DRAGON_BOX.x, DRAGON_BOX.y);
      else if (breathing) ctx.drawImage(poseCanvas('breath', formIndex(g.form)), DRAGON_BOX.x, DRAGON_BOX.y);
      if (!g.fallAt && puffing && !hurt) drawPuffs(ctx, now);
      drawVillage(ctx, now);
      drawGoblins(ctx, now);
      drawHero(ctx, now);
      if (!g.fallAt && ice) drawIce(ctx, now, g.breath, iceAge);

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

      // Bite number: only the latest one, rising above the castle (never a stack in a corner,
      // never on Fiber-kun or the dragon).
      g.headLog = g.headLog.filter((h) => now - h.t0 < BITE_TEXT_MS);
      const h = g.headLog[g.headLog.length - 1];
      if (h) {
        const age = (now - h.t0) / BITE_TEXT_MS;
        ctx.globalAlpha = 1 - age * age;
        ctx.font = '44px DotGothic16';
        const bx = CASTLE.x + CASTLE.w / 2 + 40;
        const by = CASTLE.stoneTop - 13 * PX - 40 - Math.round(age * 30);
        ctx.fillStyle = '#05071a';
        ctx.fillText(h.text, bx + 4, by + 4);
        ctx.fillStyle = h.color;
        ctx.fillText(h.text, bx, by);
      }
      ctx.globalAlpha = 1;

      // Numbers at dragon impact points.
      g.floaters = g.floaters.filter((f) => now - f.t0 < FLOATER_MS);
      for (const f of g.floaters) {
        const age = (now - f.t0) / FLOATER_MS;
        ctx.globalAlpha = 1 - age * age;
        ctx.font = `${f.size}px DotGothic16`;
        ctx.fillStyle = '#05071a';
        ctx.fillText(f.text, f.x + 4, f.y - age * 40 + 4);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y - age * 40);
      }
      ctx.globalAlpha = 1;

      if (g.notice && now - g.notice.t0 < 1500) {
        ctx.font = '48px DotGothic16';
        ctx.fillStyle = '#05071a';
        ctx.fillText(g.notice.text, ARENA.w / 2 + 4, 330 + 4);
        ctx.fillStyle = '#ffd166';
        ctx.fillText(g.notice.text, ARENA.w / 2, 330);
      }
      if (r) drawEnding(ctx, now, r);
      // The cave mouth (arena_frame) over everything: the boss room opens onto the village.
      ctx.drawImage(packCanvas('arena_frame'), 0, 0);
    },
  };

  // ---------- the village (your UI): the castle ----------
  // castle_intact → castle_cracked (after the first bite) → castle_burning (fallen; two flame
  // frames). The flag on the left tower is the health bar: "your UI".
  function drawVillage(ctx, now) {
    const fallen = g.fallen;
    // The flag = the castle's health bar. It empties as keys bite and is empty exactly when the
    // castle falls (bite ratio ≥ failRatio, after minKeys keys).
    const health = fallen ? 0 : Math.max(0, 1 - g.bites / Math.max(g.resolved, RULES.minKeys) / RULES.failRatio);
    const poleX = CASTLE.x + 4 * PX; // left tower (columns 1–7)
    const poleTop = CASTLE.stoneTop - 13 * PX;
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(poleX, poleTop, PX / 2, CASTLE.stoneTop - poleTop);
    const flagX = poleX + PX / 2;
    const flagW = 13 * PX;
    const wave = fallen ? 0 : (Math.floor(now / 250) % 2) * 4;
    ctx.fillStyle = '#120c2c'; // outline / empty part
    ctx.fillRect(flagX, poleTop + wave, flagW, 4 * PX);
    ctx.fillStyle = fallen ? '#5a5a66' : health > 0.5 ? '#34e0a1' : '#ffd166';
    ctx.fillRect(flagX + 3, poleTop + wave + 3, Math.round((flagW - 6) * health), 4 * PX - 6);
    ctx.font = '32px DotGothic16';
    ctx.fillStyle = health > 0.35 ? '#120c2c' : '#c9cdf5';
    ctx.fillText('your UI', flagX + flagW / 2, poleTop + wave + 2 * PX);
    const name = fallen ? (Math.floor(now / 150) % 2 ? 'castle_burning_f2' : 'castle_burning') : g.bites > 0 ? 'castle_cracked' : 'castle_intact';
    ctx.drawImage(packCanvas(name), CASTLE.x, CASTLE.y);
    const cb = packBox('castle_intact');
    reportBox('boss', 'castle', { x: CASTLE.x + cb.x * PX, y: CASTLE.y + cb.y * PX, w: cb.w * PX, h: cb.h * PX });
  }

  // Goblins: three at most on screen. The ones still in play (waiting, running to bite, being
  // cut) first; the ones that got in dance in front of the castle with what room is left.
  function drawGoblins(ctx, now) {
    const active = g.goblins.filter((gb) => gb.state !== 'roof');
    const dancers = g.goblins.filter((gb) => gb.state === 'roof');
    const list = [...active, ...dancers].slice(0, MAX_GOBLINS_SHOWN);
    let slot = 0;
    const step = Math.floor(now / 160) % 2;
    for (const gb of list) {
      let name = step ? 'goblin_walk2' : 'goblin_walk1';
      let x = GOBLIN_SLOTS[Math.min(slot, GOBLIN_SLOTS.length - 1)];
      let y = ARENA.groundY - GOBLIN_H;
      let alpha = 1;
      if (gb.state === 'wait' || gb.state === 'queued') {
        gb.x = x;
        slot++;
      }
      if (gb.state === 'bite') {
        // Run to the castle, then bite it.
        const from = gb.x ?? GOBLIN_SLOTS[0];
        const to = BITE_SPOTS[gb.window % BITE_SPOTS.length];
        const p = Math.min(1, (now - gb.t0) / GOBLIN_RUN_MS);
        x = from + (to - from) * p;
        if (p >= 1) name = 'goblin_bite';
      }
      if (gb.state === 'roof') {
        // Dancing on the ground in front of the castle (never on the flames).
        name = 'goblin_dance';
        x = DANCE_SPOTS[gb.house];
        y = ARENA.groundY - GOBLIN_H - Math.abs(Math.sin(now / 140 + gb.house)) * 14;
      }
      if (gb.state === 'dying') {
        const t = now - gb.t0;
        x = gb.x ?? GOBLIN_SLOTS[0];
        if (gb.quiet) alpha = 1 - t / GOBLIN_GONE_MS;
        else {
          if (t >= GOBLIN_CUT_MS) name = 'goblin_hit'; // cut at the contact frame
          if (t >= GOBLIN_FADE_AT) alpha = 1 - (t - GOBLIN_FADE_AT) / (GOBLIN_GONE_MS - GOBLIN_FADE_AT);
          x -= (Math.max(0, t - GOBLIN_CUT_MS) * 0.25) / VIS; // small knockback (away from Fiber-kun, to the left)
        }
      }
      if (alpha <= 0) continue;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.drawImage(packCanvas(name, { scale: GOBLIN_SCALE }), Math.round(x), Math.round(y));
      ctx.globalAlpha = 1;
      const gbb = packBox('goblin_walk1');
      if (alpha === 1) reportBox('boss', 'goblin', { x, y: y + gbb.y * GOBLIN_SCALE, w: gbb.w * GOBLIN_SCALE, h: gbb.h * GOBLIN_SCALE });
    }
  }

  // A pack sprite placed so that its anchor pixel sits on (x, y). Flipped: mirrored around it.
  function drawAnchored(ctx, name, anchor, x, y, flip = false, alpha = 1) {
    const img = packCanvas(name, { flip });
    const ax = flip ? PACK[name].w - 1 - anchor[0] : anchor[0];
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round(x - (ax + 0.5) * PX), Math.round(y - (anchor[1] + 0.5) * PX));
    ctx.globalAlpha = 1;
  }

  function drawHero(ctx, now) {
    const x = heroX(now);
    const y = ARENA.groundY - HERO.size - Math.round(g.fkY);
    const result = g.phase === 'result' ? g.result : null;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 32, ARENA.groundY - 6, HERO.size - 64, 12);

    if (result && result.questFailed) {
      // Defeated: kneels with the head down, gloom lines above, tears; his sword dropped.
      const img = spriteCanvas(FIBER_KUN.rest[0], PALETTE, HERO.scale);
      ctx.drawImage(img, x, ARENA.groundY - img.height + PX);
      ctx.fillStyle = '#4b4f9e';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 36 + i * 36, ARENA.groundY - img.height - 60 + (i % 2) * 12, PX, 48);
      ctx.fillStyle = '#9af5ea';
      const drop = (now / 6) % 60;
      ctx.fillRect(x + 4 * PX, ARENA.groundY - 8 * PX + drop, PX / 2, PX);
      ctx.fillRect(x + 11 * PX, ARENA.groundY - 8 * PX + ((drop + 30) % 60), PX / 2, PX);
      // his sword lies on the ground next to him
      const ss = packCanvas('sword_strike');
      ctx.drawImage(ss, x + HERO.size - 2 * PX, ARENA.groundY - ss.height + 2 * PX);
      return;
    }

    const a = g.action;
    const t = a ? now - a.t0 : Infinity;
    // He faces the dragon (right); he turns left to cut a goblin (goblins are on the castle side).
    const facingLeft = !!(a && a.kind === 'goblin' && t < GOBLIN_SLASH_MS);
    const singed = now - g.fkHitAt < 300 && !result; // flinch while the dragon's ice hits him
    const frame = g.fkY > 0 ? FIBER_KUN.walk[0] : singed ? FACES.shocked : result && result.rank === 'S' ? FACES.smug : FIBER_KUN.idle[Math.floor(now / 300) % 2];
    const img = spriteCanvas(frame, PALETTE, HERO.scale);
    const hb = bbox(FIBER_KUN.idle[0]);
    reportBox('boss', 'hero', { x: x + hb.x * HERO.scale, y: y + hb.y * HERO.scale, w: hb.w * HERO.scale, h: hb.h * HERO.scale });
    const rt = now - g.respawnAt;
    const blink = rt < 420 && Math.floor(rt / 60) % 2 === 0;

    // Respawn at root: a light column and a label.
    if (rt < 700) {
      ctx.globalAlpha = 0.6 * (1 - rt / 700);
      ctx.fillStyle = '#9af5ea';
      ctx.fillRect(x + HERO.size / 2 - 32, 0, 64, ARENA.groundY);
      ctx.globalAlpha = 1;
      const [hx] = headPoint(now);
      ctx.font = '40px DotGothic16';
      ctx.fillStyle = '#05071a';
      ctx.fillText('RESPAWN AT ROOT', hx + 3, 463);
      ctx.fillStyle = '#9af5ea';
      ctx.fillText('RESPAWN AT ROOT', hx, 460);
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

    // The pixel sword (sword_ready / sword_up / sword_strike), hilt on his hand, and the pixel
    // slash crescent (slash_arc) centred on the hand while he strikes.
    const hand = handPoint(x, y, facingLeft);
    let sword = 'sword_ready';
    let slash = 0; // crescent opacity
    if (result && result.rank === 'S') sword = 'sword_up';
    else if (result) sword = 'sword_ready';
    else if (a && a.kind === 'dash' && t < DASH_MS + SLASH_MS + RETURN_MS) {
      if (t < DASH_MS) sword = 'sword_up';
      else if (t < DASH_MS + SLASH_MS) {
        sword = 'sword_strike';
        slash = 1;
      } else sword = 'sword_strike';
    } else if (a && a.kind === 'goblin' && t < GOBLIN_SLASH_MS) {
      if (t < 50 * VIS) sword = 'sword_up';
      else {
        sword = 'sword_strike';
        if (t < 170 * VIS) slash = 1 - (t - 50 * VIS) / (120 * VIS);
      }
    } else if (g.attempting && g.phase === 'fight') sword = 'sword_up'; // stance while React renders the list
    drawAnchored(ctx, sword, SWORD_META[sword].anchor_hilt, hand[0], hand[1], facingLeft);
    if (slash > 0) drawAnchored(ctx, 'slash_arc', SWORD_META.slash_arc.anchor_centre, hand[0], hand[1], facingLeft, slash);
  }

  // His sword hand on screen (the sprite is mirrored when he faces left).
  function handPoint(x, y, facingLeft) {
    const col = facingLeft ? 15 - HAND.col : HAND.col;
    return [x + (col + 0.5) * PX, y + (HAND.row + 0.5) * PX];
  }

  // ---------- the dragon's breath ----------
  // From the breath pose's mouth (the pack's anchor) to Fiber-kun's body, wherever he is.
  function breathLine(now) {
    const mx = DRAGON_BOX.x + (DRAGON_POINTS.mouth[0] + 0.5) * ART_PX;
    const my = DRAGON_BOX.y + (DRAGON_POINTS.mouth[1] + 0.5) * ART_PX;
    // Aimed at his body and it stops at his front edge: it never passes over his head toward the
    // castle. It follows him if he is dashing.
    const tx = heroX(now) + HERO.size - 3 * PX;
    const ty = ARENA.groundY - HERO.size * 0.45;
    const len = Math.hypot(tx - mx, ty - my);
    return { mx, my, tx, ty, len, ux: (tx - mx) / len, uy: (ty - my) / len };
  }

  // Round 1: nothing can move during the freeze, so the whole breath appears at once on the first
  // frame after it, frozen: a crystal cone of ice from the mouth to Fiber-kun (as tall as he is at
  // the end), frost on him, the measured time. Held 400 ms, then it shatters.
  function drawIce(ctx, now, b, age) {
    const L = breathLine(now);
    const half = (d) => PX + (d / L.len) * (HERO.size * 0.3); // half-width: about his body at the end
    const cells = [];
    const minX = Math.min(L.mx, L.tx) - PX;
    const maxX = Math.max(L.mx, L.tx) + PX;
    const minY = Math.min(L.my, L.ty) - HERO.size;
    const maxY = Math.max(L.my, L.ty) + HERO.size;
    for (let gy = Math.floor(minY / PX) * PX; gy < maxY; gy += PX) {
      for (let gx = Math.floor(minX / PX) * PX; gx < maxX; gx += PX) {
        const cx = gx + PX / 2 - L.mx;
        const cy = gy + PX / 2 - L.my;
        const d = cx * L.ux + cy * L.uy; // along the beam
        const k = -cx * L.uy + cy * L.ux; // across
        if (d < 0 || d > L.len || Math.abs(k) > half(d)) continue;
        cells.push({ gx, gy, d, k, w: half(d) });
      }
    }
    const shatter = age > ICE_HOLD ? (age - ICE_HOLD) / ICE_SHATTER : 0;
    for (const c of cells) {
      const core = Math.abs(c.k) < c.w * 0.3;
      const facet = ((c.gx + c.gy) / PX) % 5 === 0;
      ctx.fillStyle = core ? '#ffffff' : facet ? '#e8fbff' : Math.abs(c.k) > c.w * 0.75 ? '#5fc9e8' : '#aef0ff';
      if (!shatter) {
        ctx.globalAlpha = 0.92;
        ctx.fillRect(c.gx, c.gy, PX, PX);
      } else if (((c.gx * 7 + c.gy * 13) / PX) % 4 === 0) {
        // shards: every 4th block flies off in its own direction (fixed per block), then falls
        const h = ((c.gx * 31 + c.gy * 17) / PX) % 8;
        const ang = (h / 8) * Math.PI * 2;
        const sx = c.gx + Math.cos(ang) * shatter * 110;
        const sy = c.gy + Math.sin(ang) * shatter * 70 + shatter * shatter * 90;
        ctx.globalAlpha = 1 - shatter;
        ctx.fillRect(Math.round(sx / PX) * PX, Math.round(sy / PX) * PX, PX, PX);
      }
    }
    ctx.globalAlpha = 1;
    if (!shatter) {
      // frost on Fiber-kun
      const hx = heroX(now);
      const hy = ARENA.groundY - HERO.size;
      ctx.fillStyle = 'rgba(174, 240, 255, 0.45)';
      ctx.fillRect(hx + PX, hy + 3 * PX, HERO.size - 2 * PX, HERO.size - 4 * PX);
      ctx.fillStyle = '#ffffff';
      for (const [ox, oy] of [[2, 4], [12, 5], [4, 13], [13, 12], [8, 3]]) ctx.fillRect(hx + ox * PX, hy + oy * PX, PX, PX);
      ctx.font = '40px DotGothic16';
      ctx.fillStyle = '#05071a';
      // the label sits above the start of the beam, clear of the BITE lines on the left
      ctx.fillText(`${b.ms} ms frozen`, L.mx - 160 + 3, L.my - 90 + 3);
      ctx.fillStyle = '#aef0ff';
      ctx.fillText(`${b.ms} ms frozen`, L.mx - 160, L.my - 90);
    }
  }

  // Rounds 2–3: the same ice breath, broken into small shards: one shard per real slice, from the
  // mouth to the 《Yield》 shield in front of Fiber-kun. The gaps between shards are the yields.
  function drawPuffs(ctx, now) {
    const L = breathLine(now);
    // the 《Yield》 shield (shield_yield, a ⏸ on it), held in front of Fiber-kun
    const sh = packCanvas('shield_yield');
    const shX = heroX(now) + HERO.size - 2 * PX;
    const shY = ARENA.groundY - HERO.size + 3 * PX;
    const stop = Math.max(0, (L.mx - (shX + sh.width)) / Math.max(1, L.mx - L.tx)) * L.len;
    for (const p of g.puffs) {
      const d = (now - p.t0) * SHARD_SPEED;
      if (d > stop) continue;
      const cx = L.mx + L.ux * d;
      const cy = L.my + L.uy * d;
      // one small ice shard (a pixel diamond); shards from separate slices stay apart
      for (const [i, j] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
        ctx.fillStyle = i === 0 && j === 0 ? '#ffffff' : j === 0 ? '#aef0ff' : '#5fc9e8';
        ctx.fillRect(Math.round((cx + i * PX) / PX) * PX, Math.round((cy + j * PX) / PX) * PX, PX, PX);
      }
    }
    ctx.drawImage(sh, shX, shY);
    ctx.font = '32px DotGothic16';
    ctx.fillStyle = '#05071a';
    ctx.fillText('《Yield》', shX + sh.width / 2 + 3, shY - 24 + 3);
    ctx.fillStyle = '#34e0a1';
    ctx.fillText('《Yield》', shX + sh.width / 2, shY - 24);
  }


  // ---------- end-of-round scene, readable without text or sound ----------
  function drawEnding(ctx, now, r) {
    const age = now - g.resultAt;
    if (r.questFailed) {
      // The sky over the village turns red; thick smoke rises from the burning houses.
      const grad = ctx.createLinearGradient(0, 0, 0, ARENA.groundY);
      grad.addColorStop(0, 'rgba(200, 40, 30, 0.35)');
      grad.addColorStop(1, 'rgba(255, 120, 40, 0.15)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, ARENA.w, ARENA.groundY);
      for (let h = 0; h < SMOKE_SPOTS.length; h++) {
        for (let k = 0; k < 7; k++) {
          const t = ((now / 18 + k * 60 + h * 37) % 420) / 420;
          ctx.fillStyle = `rgba(40, 32, 48, ${0.7 * (1 - t)})`;
          const sx = SMOKE_SPOTS[h] - 12 + Math.sin(t * 6 + h) * 18 + t * 60;
          ctx.fillRect(Math.round(sx / PX) * PX, Math.round((CASTLE.y - t * 260) / PX) * PX, 2 * PX, 2 * PX);
        }
      }
    }
    if (r.rank === 'S' && !r.questFailed) {
      // Fireworks: fixed positions, a new burst every 450 ms.
      const spots = [
        [200, 170, '#ffd166'],
        [380, 110, '#34e0a1'],
        [1240, 140, '#ff9fb2'],
        [1400, 240, '#4cc9f0'],
        [1600, 120, '#ffd166'],
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
    // The title is on the result card (centre of the sky); the scene says the rest.
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
