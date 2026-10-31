import { useEffect, useMemo, useRef, useState, useTransition, useDeferredValue } from 'react';
import { DragonList, TextProbe } from '../demo/DragonList.jsx';
import { calibrate, settings, setMicrosPerCell } from '../demo/work.js';
import { startMonitor } from '../demo/monitor.js';
import { createGame, ARENA, DRAGON_BOX } from '../demo/game.js';
import { makeDragon, CELL_LEVELS, DEFAULT_CELLS } from '../demo/dragon.js';
import { startPhaseObserver } from '../demo/phases.js';
import { runCalibration, showChecklist } from '../demo/calibration.js';
import { record } from '../instrument/eventLog.js';
import { isTyping } from '../engine/keys.js';
import { LINES } from '../content/lines.js';
import '../styles/boss.css';

const MODES = [
  {
    key: 'sync',
    rank: 'S',
    title: 'no transition',
    code: ['onChange(e) {', '  const v = e.target.value;', '  setText(v);   // S', '  setQuery(v);  // S', '}'],
  },
  {
    key: 'transition',
    rank: 'D',
    title: 'useTransition',
    code: ['onChange(e) {', '  const v = e.target.value;', '  setText(v);   // S', '  startTransition(() =>', '    setQuery(v));  // D', '}'],
  },
  {
    key: 'deferred',
    rank: 'D',
    title: 'useDeferredValue',
    code: ['onChange(e) {', '  setText(e.target.value); // S', '}', 'q = useDeferredValue(text);', '<DragonList query={q} /> // D'],
  },
];

// Auto-type: five words, one letter every 150 ms, a short hold, then clear.
// About 6 seconds of steady typing, so each round has a real fight before the result.
const TYPE_EVERY_MS = 150;
const TYPING_SCRIPT = (() => {
  const steps = [];
  for (const word of ['tokyo', 'fiber', 'react', 'sushi', 'kyoto']) {
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

// Number of cells (DOM size): from ?cells=N if given (set by the calibration), else 10,000.
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
  if (r.rank === 'C' && modeKey === 'sync') return LINES.resultLoseSync.text;
  return '';
}

export function BossFight({ step }) {
  // Calibration can drive the three modes itself; otherwise the slide step decides.
  const [modeOverride, setModeOverride] = useState(null);
  const mode = MODES[modeOverride ?? Math.min(step, MODES.length - 1)];
  const [micros, setMicros] = useState(initialWork);
  const [cells, setCells] = useState(initialCells);
  const dragon = useMemo(() => makeDragon(cells), [cells]);
  const dragonScale = DRAGON_BOX.w / (dragon.cols * 4);
  const [text, setText] = useState({ v: '', seq: 0 });
  const [query, setQuery] = useState({ v: '', seq: 0 });
  const [isPending, startTransition] = useTransition();
  // Only fed while in deferred mode; otherwise it holds null and never defers.
  const deferredText = useDeferredValue(mode.key === 'deferred' ? text : null);

  const names = ['arena', 'world', 'fx', 'hydra', 'dragonKb', 'hydraName', 'timer', 'overlay', 'calib', 'fkHpBar', 'fkHpText', 'hydraHpBar', 'hydraHpText', 'respawnText', 'timeline', 'fpsGraph', 'fps', 'worst'];
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
    const game = createGame(els);
    gameRef.current = game;
    const stop = startMonitor(els, game);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    gameRef.current?.setCells(cells);
  }, [cells]);

  // New round whenever the mode changes; coming back from deferred mode, sync the list query.
  useEffect(() => {
    gameRef.current?.setRound(MODES.indexOf(mode), mode.title);
    if (mode.key !== 'deferred') setQuery(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
  const autoType = () => {
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
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const h = handlers.current;
      if (e.key === 'a' || e.key === 'A') h.autoType();
      else if (e.key === 'c' || e.key === 'C') h.clear();
      else if (e.key === 'r' || e.key === 'R') gameRef.current?.reset();
      else if (e.key === ']') h.changeWork(2);
      else if (e.key === '[') h.changeWork(-2);
      else if (e.key === 'i' || e.key === 'I') inputRef.current?.focus();
      else if (e.key === 'k' || e.key === 'K') h.calibrationKey();
      else if (e.key === 'Escape') h.cancelCalibration();
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
      calibRef.current?.cancel?.();
    };
  }, []);

  const listQuery = mode.key === 'deferred' ? (deferredText ?? query) : query;
  const pending = mode.key === 'transition' ? isPending : mode.key === 'deferred' ? deferredText !== null && deferredText !== text : false;

  return (
    <div className={`boss mode-${mode.key}`}>
      <header className="boss-top">
        <div className="boss-title">BOSS ROOM</div>
        <div className="boss-modes">
          {MODES.map((m, i) => (
            <div key={m.key} className={`boss-mode rank-${m.rank} ${m.key === mode.key ? 'is-on' : ''}`}>
              {i + 1} · {m.title}
            </div>
          ))}
        </div>
        <div className="boss-same">
          same work: {dragon.cells.toLocaleString('en-US')} fibers × {micros} µs
        </div>
      </header>

      <div className="boss-arena" ref={refs.arena}>
        <canvas ref={refs.world} className="boss-layer pixelated" width={ARENA.w} height={ARENA.h} />
        <div className="boss-hydra" ref={refs.hydra} style={{ left: DRAGON_BOX.x, top: DRAGON_BOX.y, width: DRAGON_BOX.w, height: DRAGON_BOX.h }}>
          <div className="dragon-kb" ref={refs.dragonKb}>
            <div className={`dragon-scale ${pending ? 'is-pending' : ''}`} style={{ transform: `scale(${dragonScale})` }}>
              <DragonList dragon={dragon} query={listQuery.v} seq={listQuery.seq} />
            </div>
          </div>
        </div>
        <div className="boss-timer" ref={refs.timer} />
        <canvas ref={refs.fx} className="boss-layer boss-fx pixelated" width={ARENA.w} height={ARENA.h} />

        <div className="hud hud-fk">
          <div className="hud-name">Fiber-kun</div>
          <div className="hud-bar">
            <div className="hud-fill is-fk" ref={refs.fkHpBar} />
          </div>
          <div className="hud-num" ref={refs.fkHpText} />
          <div className="hud-num hud-respawn" ref={refs.respawnText} />
        </div>
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

      <div className="win boss-fps" style={{ position: 'absolute' }}>
        <div className="win-title">FPS</div>
        <div className="boss-fps-num" ref={refs.fps}>
          60
        </div>
        <canvas ref={refs.fpsGraph} className="boss-fps-graph" width={400} height={110} />
        <div className="boss-fps-worst">
          worst frame <b ref={refs.worst}>–</b>
        </div>
      </div>

      <div className="win boss-timeline" style={{ position: 'absolute' }}>
        <div className="win-title">LIVE · real scheduler</div>
        <canvas ref={refs.timeline} width={650} height={316} />
        <div className="boss-legend">
          <span className="lg lg-s">sync</span>
          <span className="lg lg-d">slice</span>
          <span className="lg lg-x">thrown away</span>
          <span className="lg lg-r">long frame</span>
        </div>
      </div>

      <div className="win boss-code" style={{ position: 'absolute' }}>
        <div className="win-title">CODE</div>
        <pre className="boss-code-pre">{mode.code.join('\n')}</pre>
      </div>

      {/* READY and RESULT panels cover the instruments between rounds, so the arena stays visible. */}
      <div className="boss-overlay" ref={refs.overlay} />
      {/* Calibration (K): written by demo/calibration.js, outside React. */}
      <div className="boss-calib" ref={refs.calib} />
    </div>
  );
}
