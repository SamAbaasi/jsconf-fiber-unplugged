import { useEffect, useMemo, useRef, useState, useTransition, useDeferredValue } from 'react';
import { flushSync } from 'react-dom';
import { setNextInterceptor } from '../engine/interceptors.js';
import { DragonList, TextProbe } from '../demo/DragonList.jsx';
import { calibrate, settings, setMicrosPerCell } from '../demo/work.js';
import { startMonitor } from '../demo/monitor.js';
import { createGame, ARENA, DRAGON_BOX, traces } from '../demo/game.js';

const REPLAY_LINES = ['replaySync', 'replayTransition', 'replayDeferred'];
import { makeDragon, dragonCss, CELL_LEVELS, DEFAULT_CELLS } from '../demo/dragon.js';
const DRAGON_CSS = dragonCss();
import { startPhaseObserver } from '../demo/phases.js';
import { drawReplay } from '../demo/replay.js';
import { runCalibration, showChecklist } from '../demo/calibration.js';
import { record } from '../instrument/eventLog.js';
import { isTyping } from '../engine/keys.js';
import { LINES } from '../content/lines.js';
import '../styles/boss.css';

const MODES = [
  { key: 'sync', title: 'no transition', code: ['setText(v); setQuery(v);', '// both SyncLane'] },
  { key: 'transition', title: 'useTransition', code: ['setText(v); startTransition(() => setQuery(v));', ''] },
  { key: 'deferred', title: 'useDeferredValue', code: ['setText(v); q = useDeferredValue(text);', ''] },
];

// Auto-type: the round's 12 keys (same as typing by hand): two words, each followed by two holds
// and a clear. 16 steps × 180 ms ≈ 2.9 s, well under 4.5 s on purpose: a Scheduler task alive for
// more than 5 s times out and React renders it without slicing (CLAIMS C11). The holds let
// pending work finish between words.
const TYPE_EVERY_MS = 180;
const TYPING_SCRIPT = (() => {
  const steps = [];
  for (const word of ['tokyo', 'fiber']) {
    for (let i = 1; i <= word.length; i++) steps.push(word.slice(0, i));
    steps.push(null, null, ''); // hold (no event), hold, clear
  }
  return steps;
})();
const TYPING_KEYS = TYPING_SCRIPT.filter((v) => v !== null).length;

// Work per cell: from ?work=N if given (set by the calibration), else the default.
function initialWork() {
  calibrate();
  const fromUrl = Number(new URLSearchParams(location.search).get('work'));
  if (fromUrl > 0) setMicrosPerCell(fromUrl);
  return settings.microsPerCell;
}

// Number of cells (DOM size): from ?cells=N if given (set by the calibration), else 12,144.
function initialCells() {
  const fromUrl = Number(new URLSearchParams(location.search).get('cells'));
  return CELL_LEVELS.includes(fromUrl) ? fromUrl : DEFAULT_CELLS;
}

function typeInto(input, value) {
  // Same path as a real keystroke: a native "input" event, which React treats
  // as a discrete event (SyncLane, D2).
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

// The line under the result. Only shown when the real result matches it.
function resultLine(r, modeKey) {
  if ((r.rank === 'S' || r.rank === 'A') && modeKey !== 'sync') return LINES.resultWinYield.text;
  if (r.questFailed && r.dragonDown) return LINES.questFailedLine.text;
  if (r.rank === 'C' && modeKey === 'sync') return LINES.resultLoseSync.text;
  return '';
}

// Steps: round 1, replay 1, round 2, replay 2, round 3, replay 3.
const roundOf = (step) => Math.min(MODES.length - 1, Math.floor(step / 2));
const isReplayStep = (step) => step % 2 === 1;

export function BossFight({ step }) {
  // Calibration can drive the three modes itself; otherwise the slide step decides.
  const [modeOverride, setModeOverride] = useState(null);
  const mode = MODES[modeOverride ?? roundOf(step)];
  const replay = modeOverride === null && isReplayStep(step);
  const [traceVersion, setTraceVersion] = useState(0);
  const replayRef = useRef(null);
  const [micros, setMicros] = useState(initialWork);
  const [cells, setCells] = useState(initialCells);
  const dragon = useMemo(() => makeDragon(cells), [cells]);

  const [text, setText] = useState({ v: '', seq: 0 });
  const [query, setQuery] = useState({ v: '', seq: 0 });
  const [isPending, startTransition] = useTransition();
  // Only fed while in deferred mode; otherwise it holds null and never defers.
  const deferredText = useDeferredValue(mode.key === 'deferred' ? text : null);

  const names = ['arena', 'world', 'fx', 'hydra', 'dragonKb', 'hydraName', 'timer', 'overlay', 'calib', 'hydraHpBar', 'hydraHpText', 'fps', 'worstKey', 'inp'];
  const refs = Object.fromEntries(names.map((n) => [n, useRef(null)]));
  const inputRef = useRef(null);
  const typingTimer = useRef(0);
  const gameRef = useRef(null);
  const seqRef = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const calibRef = useRef(null);
  const cellsRef = useRef(cells);
  cellsRef.current = cells;

  useEffect(() => {
    startPhaseObserver();
    const els = Object.fromEntries(names.map((n) => [n, refs[n].current]));
    els.resultLine = (r) => resultLine(r, modeRef.current.key);
    els.onTrace = () => setTraceVersion((v) => v + 1);
    // A round ended: the search box lets go of the keyboard, so A / R / the clicker work again.
    els.onEnd = () => inputRef.current?.blur();
    const game = createGame(els);
    gameRef.current = game;
    const stop = startMonitor(els, game);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    gameRef.current?.setCells(cells);
  }, [cells]);

  // Warm-up: one untimed render of the whole list before every round (JIT and style caches are
  // cold otherwise: we measured first keys of 274 ms and 525 ms). seq 0 = not a keystroke, so the
  // game ignores these renders; they happen while the round is still in its READY state.
  const warmUp = () => {
    if (modeRef.current.key === 'deferred') {
      flushSync(() => setText({ v: 'zq', seq: 0 }));
      flushSync(() => setText({ v: '', seq: 0 }));
    } else {
      flushSync(() => setQuery({ v: 'zq', seq: 0 }));
      flushSync(() => setQuery({ v: '', seq: 0 }));
    }
  };
  const warmTimer = useRef(0);
  const newRound = () => {
    gameRef.current?.reset();
    clearTimeout(warmTimer.current);
    warmTimer.current = setTimeout(warmUp, 60);
  };

  // New round whenever the mode changes. The search box and the list start empty (see below).
  useEffect(() => {
    gameRef.current?.setRound(MODES.indexOf(mode), mode.title);
    clearTimeout(warmTimer.current);
    warmTimer.current = setTimeout(warmUp, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Any step opens (round or replay): the search box lets go of the keyboard (otherwise A types
  // "a"), any auto-type stops, and the search text AND the list query go back to empty, so every
  // round starts from the same state (same list, same work). seq 0 = not a keystroke. The replay
  // steps draw from their recorded traces, which this does not touch.
  useEffect(() => {
    inputRef.current?.blur();
    stopTyping();
    clearInterval(autoTypeWait.current);
    clearTimeout(autoTypeWait.current);
    setText({ v: '', seq: 0 });
    setQuery({ v: '', seq: 0 });
  }, [step, modeOverride]);

  // The clicker (next) during a fight ends the round early instead of changing the slide.
  useEffect(() => {
    if (replay) return undefined;
    return setNextInterceptor(() => gameRef.current?.endEarly() === true);
  }, [replay]);

  const clearing = useRef(false);
  const onChange = (e) => {
    const v = e.target.value;
    const next = { v, seq: ++seqRef.current };
    // A keystroke = one goblin. Clearing the box with C is not a keystroke of the round.
    if (!clearing.current) record('key', { v, seq: next.seq, ts: e.nativeEvent.timeStamp });
    if (mode.key === 'sync') {
      setText(next);
      setQuery(next);
    } else if (mode.key === 'transition') {
      setText(next);
      startTransition(() => setQuery(next));
    } else {
      setText(next);
    }
  };

  const stopTyping = () => {
    clearInterval(typingTimer.current);
    typingTimer.current = 0;
  };
  // A after a finished round: a new round, then auto-type (after the warm-up). While the round is
  // still finishing, wait for its result first (the result is never thrown away).
  const autoTypeWait = useRef(0);
  const autoType = () => {
    clearInterval(autoTypeWait.current);
    const game = gameRef.current;
    const phase = game?.state.phase;
    if (phase === 'finishing' || phase === 'result' || game?.roundFull()) {
      const t0 = performance.now();
      autoTypeWait.current = setInterval(() => {
        const ph = gameRef.current?.state.phase;
        if ((ph === 'finishing' || ph === 'fight') && performance.now() - t0 < 30000) return;
        clearInterval(autoTypeWait.current);
        newRound();
        autoTypeWait.current = setTimeout(startAutoType, 600);
      }, 50);
      return;
    }
    startAutoType();
  };
  const startAutoType = () => {
    stopTyping();
    const input = inputRef.current;
    let i = 0;
    record('typing:start', { total: TYPING_KEYS });
    typingTimer.current = setInterval(() => {
      const v = TYPING_SCRIPT[i++];
      if (v !== null) typeInto(input, v);
      if (i >= TYPING_SCRIPT.length) {
        stopTyping();
        record('typing:end', { seq: seqRef.current });
      }
    }, TYPE_EVERY_MS);
  };
  const clear = () => {
    stopTyping();
    clearing.current = true;
    typeInto(inputRef.current, '');
    clearing.current = false;
  };
  const changeWork = (delta) => {
    setMicrosPerCell(settings.microsPerCell + delta);
    setMicros(settings.microsPerCell);
  };

  // Keyboard shortcuts. Registered once; they call the latest handlers through a ref.
  const handlers = useRef(null);
  handlers.current = {
    newRound,
    autoType,
    clear,
    changeWork,
    calibrationKey() {
      const c = calibRef.current;
      if (c?.running) return c.cancel();
      if (!c?.armed) {
        calibRef.current = { armed: true };
        showChecklist(refs.calib.current, settings.microsPerCell, cellsRef.current);
        return;
      }
      calibRef.current = runCalibration({
        panel: refs.calib.current,
        game: () => gameRef.current,
        setMode: (i) => setModeOverride(i),
        autoType: () => handlers.current.autoType(),
        getWork: () => settings.microsPerCell,
        setWork: (us) => {
          setMicrosPerCell(us);
          setMicros(settings.microsPerCell);
        },
        getCells: () => cellsRef.current,
        setCells: (n) => setCells(n),
        modes: MODES,
        onDone: () => setModeOverride(null),
      });
    },
    cancelCalibration() {
      const c = calibRef.current;
      if (c?.running) c.cancel();
      if (refs.calib.current) refs.calib.current.className = 'boss-calib';
      calibRef.current = null;
    },
  };
  useEffect(() => {
    const onKey = (e) => {
      const h = handlers.current;
      // Escape always lets go of the search box (and cancels a calibration).
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        h.cancelCalibration();
        return;
      }
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'a' || e.key === 'A') h.autoType();
      else if (e.key === 'c' || e.key === 'C') h.clear();
      else if (e.key === 'r' || e.key === 'R') h.newRound();
      else if (e.key === 'Enter') gameRef.current?.endEarly();
      else if (e.key === ']') h.changeWork(2);
      else if (e.key === '[') h.changeWork(-2);
      else if (e.key === 'i' || e.key === 'I') inputRef.current?.focus();
      else if (e.key === 'k' || e.key === 'K') h.calibrationKey();
    };
    // ↑ = jump. Handled on window in the capture phase, before the deck sees it, so it never
    // changes the slide and the input keeps its focus. Input delay = handling time − event time.
    const onJump = (e) => {
      if (e.key !== 'ArrowUp' || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      const now = performance.now();
      gameRef.current?.manualJump(now - e.timeStamp, now);
    };
    window.addEventListener('keydown', onJump, { capture: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onJump, { capture: true });
      window.removeEventListener('keydown', onKey);
      clearInterval(typingTimer.current);
      clearInterval(autoTypeWait.current);
      clearTimeout(autoTypeWait.current);
      calibRef.current?.cancel?.();
    };
  }, []);

  // REPLAY: draw the finished round's real timeline (static; drawn once per change).
  useEffect(() => {
    if (!replay || !replayRef.current) return;
    const i = roundOf(step);
    const summary = drawReplay(replayRef.current, traces[i], LINES[REPLAY_LINES[i]].text);
    replayRef.current.dataset.summary = summary ? JSON.stringify(summary) : '';
  }, [replay, step, traceVersion]);

  const listQuery = mode.key === 'deferred' ? (deferredText ?? query) : query;
  const pending = mode.key === 'transition' ? isPending : mode.key === 'deferred' ? deferredText !== null && deferredText !== text : false;

  return (
    <div className={`boss mode-${mode.key}`}>
      <header className="boss-top">
        <div className="boss-title">BOSS ROOM</div>
        <div className="boss-code-line">
          {mode.code[0]} <span className="c">{mode.code[1]}</span>
        </div>
        <div className="boss-same">
          same work: {dragon.cells.toLocaleString('en-US')} fibers × {micros} µs
        </div>
      </header>

      <style>{DRAGON_CSS}</style>
      <div className="boss-arena" ref={refs.arena}>
        <canvas ref={refs.world} className="boss-layer pixelated" width={ARENA.w} height={ARENA.h} />
        <div className="boss-hydra" ref={refs.hydra} style={{ left: DRAGON_BOX.x, top: DRAGON_BOX.y, width: DRAGON_BOX.w, height: DRAGON_BOX.h }}>
          <div className="dragon-kb" ref={refs.dragonKb}>
            <div className={`dragon-scale ${pending ? 'is-pending' : ''}`}>
              <DragonList dragon={dragon} query={listQuery.v} seq={listQuery.seq} />
            </div>
          </div>
        </div>
        <div className="boss-timer" ref={refs.timer} />
        <canvas ref={refs.fx} className="boss-layer boss-fx pixelated" width={ARENA.w} height={ARENA.h} />

        <div className="hud hud-boss">
          <div className="hud-name" ref={refs.hydraName}>
            JANK DRAGON
          </div>
          <div className="hud-bar">
            <div className="hud-fill is-boss" ref={refs.hydraHpBar} />
          </div>
          <div className="hud-num" ref={refs.hydraHpText} />
        </div>
      </div>

      <div className="win boss-input">
        <label className="boss-input-label" htmlFor="boss-search">
          ⚔ search
        </label>
        <input
          id="boss-search"
          ref={inputRef}
          className="boss-input-field"
          value={text.v}
          onChange={onChange}
          onKeyDown={(e) => {
            // Enter ends the round early (at least 3 keys); it is not a keystroke of the round.
            if (e.key === 'Enter') {
              e.preventDefault();
              gameRef.current?.endEarly();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.currentTarget.blur();
            } else if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey && !e.altKey && (gameRef.current?.state.phase !== 'fight' || gameRef.current?.roundFull())) {
              // Before the first key, or once all of the round's keys are in: A means auto-type
              // (a new round after this one's result), never the letter "a".
              e.preventDefault();
              e.currentTarget.blur();
              handlers.current.autoType();
            }
          }}
          autoComplete="off"
          spellCheck={false}
          placeholder="type here…"
        />
        <TextProbe seq={text.seq} />
        <div className="boss-hits">
          hits <b>{dragon.countHits(listQuery.v)}</b>
        </div>
        <div className={`boss-pending ${pending ? 'is-on' : ''}`}>{pending ? 'pending…' : ''}</div>
      </div>

      {/* Bottom row, next to the search box: two big numbers. The code is one line in the header. */}
      <div className="win boss-big boss-big-fps" style={{ position: 'absolute' }}>
        <div className="boss-big-side">
          <div className="boss-big-label">FPS</div>
        </div>
        <div className="boss-big-num boss-fps-num" ref={refs.fps}>
          60
        </div>
      </div>
      <div className="win boss-big boss-big-key" style={{ position: 'absolute' }}>
        <div className="boss-big-side">
          <div className="boss-big-label">worst key</div>
          <div className="boss-inp" ref={refs.inp} />
        </div>
        <div className="boss-big-num boss-key-num" ref={refs.worstKey}>
          –
        </div>
      </div>

      {/* READY and RESULT cards sit in the sky between the castle and the dragon. */}
      <div className="boss-overlay" ref={refs.overlay} />
      {/* REPLAY: the real timeline of the round that just ended, full screen. */}
      {replay && (
        <div className="boss-replay">
          <div className="boss-replay-title">
            REPLAY · ROUND {roundOf(step) + 1} · {mode.title}
          </div>
          <canvas ref={replayRef} className="boss-replay-canvas" width={1840} height={840} />
        </div>
      )}
      {/* Calibration (K): written by demo/calibration.js, outside React. */}
      <div className="boss-calib" ref={refs.calib} />
    </div>
  );
}
