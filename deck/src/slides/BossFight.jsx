import { useEffect, useRef, useState, useTransition, useDeferredValue } from 'react';
import { HydraList } from '../demo/HydraList.jsx';
import { calibrate, settings, setMicrosPerCell } from '../demo/work.js';
import { startMonitor } from '../demo/monitor.js';
import { createGame, ARENA } from '../demo/game.js';
import { CELL_COUNT, countHits } from '../demo/hydra.js';
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
    code: ['onChange(e) {', '  setText(e.target.value); // S', '}', 'q = useDeferredValue(text);', '<HydraList query={q} /> // D'],
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
  const mode = MODES[Math.min(step, MODES.length - 1)];
  const [micros, setMicros] = useState(() => {
    calibrate();
    return settings.microsPerCell;
  });
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  // Only fed while in deferred mode; otherwise it holds null and never defers.
  const deferredText = useDeferredValue(mode.key === 'deferred' ? text : null);

  const names = ['arena', 'world', 'fx', 'hydra', 'hydraName', 'timer', 'overlay', 'fkHpBar', 'fkHpText', 'hydraHpBar', 'hydraHpText', 'respawnText', 'timeline', 'fpsGraph', 'fps', 'worst'];
  const refs = Object.fromEntries(names.map((n) => [n, useRef(null)]));
  const inputRef = useRef(null);
  const typingTimer = useRef(0);
  const gameRef = useRef(null);
  const modeRef = useRef(mode.key);
  modeRef.current = mode.key;

  useEffect(() => {
    const els = Object.fromEntries(names.map((n) => [n, refs[n].current]));
    els.resultLine = (r) => resultLine(r, modeRef.current);
    const game = createGame(els);
    gameRef.current = game;
    const stop = startMonitor(els, game);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New round on every step; coming back from deferred mode, sync the list query again.
  useEffect(() => {
    gameRef.current?.setRound(step, mode.title);
    if (mode.key !== 'deferred') setQuery(inputRef.current?.value ?? '');
  }, [step, mode.key, mode.title]);

  const clearing = useRef(false);
  const onChange = (e) => {
    const v = e.target.value;
    // A keystroke starts a round; clearing the box with C does not.
    if (!clearing.current) record('key', { v });
    if (mode.key === 'sync') {
      setText(v);
      setQuery(v);
    } else if (mode.key === 'transition') {
      setText(v);
      startTransition(() => setQuery(v));
    } else {
      setText(v);
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
    typingTimer.current = setInterval(() => {
      const v = TYPING_SCRIPT[i++];
      if (v !== null) typeInto(input, v);
      if (i >= TYPING_SCRIPT.length) stopTyping();
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
  handlers.current = { autoType, clear, changeWork };
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
    };
  }, []);

  const listQuery = mode.key === 'deferred' ? (deferredText ?? query) : query;
  const pending =
    mode.key === 'transition' ? isPending : mode.key === 'deferred' ? deferredText !== null && deferredText !== text : false;

  return (
    <div className={`boss mode-${mode.key}`}>
      <header className="boss-top">
        <div className="boss-title">BOSS FIGHT</div>
        <div className="boss-modes">
          {MODES.map((m, i) => (
            <div key={m.key} className={`boss-mode rank-${m.rank} ${m.key === mode.key ? 'is-on' : ''}`}>
              {i + 1} · {m.title}
            </div>
          ))}
        </div>
        <div className="boss-same">
          same work: {CELL_COUNT.toLocaleString('en-US')} fibers × {micros} µs
        </div>
      </header>

      <div className="boss-arena" ref={refs.arena}>
        <canvas ref={refs.world} className="boss-layer pixelated" width={ARENA.w} height={ARENA.h} />
        <div className="boss-hydra" ref={refs.hydra}>
          <div className={pending ? 'is-pending' : ''}>
            <HydraList query={listQuery} />
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
            JANK HYDRA
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
          value={text}
          onChange={onChange}
          autoComplete="off"
          spellCheck={false}
          placeholder="type here…"
        />
        <div className="boss-hits">
          hits <b>{countHits(listQuery)}</b>
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
    </div>
  );
}
