import { useEffect, useRef, useState, useTransition, useDeferredValue } from 'react';
import { HydraList } from '../demo/HydraList.jsx';
import { calibrate, settings, setMicrosPerCell } from '../demo/work.js';
import { startMonitor } from '../demo/monitor.js';
import { record } from '../instrument/eventLog.js';
import { isTyping } from '../engine/keys.js';
import '../styles/boss.css';

const MODES = [
  {
    key: 'sync',
    rank: 'S',
    title: 'Round 1 · no transition',
    code: ['onChange(e) {', '  setText(e.target.value);', '  setQuery(e.target.value);  // S rank', '}'],
  },
  {
    key: 'transition',
    rank: 'D',
    title: 'Round 2 · useTransition',
    code: ['onChange(e) {', '  setText(e.target.value);            // S rank', '  startTransition(() =>', '    setQuery(e.target.value));       // D rank', '}'],
  },
  {
    key: 'deferred',
    rank: 'D',
    title: "Round 3 · useDeferredValue",
    code: ['onChange(e) { setText(e.target.value); }', '', 'const q = useDeferredValue(text);', '<HydraList query={q} />'],
  },
];

// Auto-type: "tokyo", clear it, then "fiber". About 2 seconds of steady typing.
const TYPING_SCRIPT = (() => {
  const steps = [];
  for (const word of ['tokyo', 'fiber']) {
    for (let i = 1; i <= word.length; i++) steps.push(word.slice(0, i));
    if (word === 'tokyo') steps.push('tokyo', 'tokyo', '');
  }
  return steps;
})();

function typeInto(input, value) {
  // Same path as a real keystroke: a native "input" event, which React treats
  // as a discrete event (SyncLane).
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
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

  const refs = {
    world: useRef(null),
    timeline: useRef(null),
    fpsGraph: useRef(null),
    fps: useRef(null),
    worst: useRef(null),
    slices: useRef(null),
    committed: useRef(null),
    discarded: useRef(null),
    lastRender: useRef(null),
  };
  const inputRef = useRef(null);
  const typingTimer = useRef(0);

  useEffect(() => {
    const els = Object.fromEntries(Object.entries(refs).map(([k, r]) => [k, r.current]));
    return startMonitor(els);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coming back from deferred mode: make the list query match the input again.
  useEffect(() => {
    if (mode.key !== 'deferred') setQuery(inputRef.current?.value ?? '');
  }, [mode.key]);

  const onChange = (e) => {
    const v = e.target.value;
    record('key', { v });
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
    typeInto(input, '');
    typingTimer.current = setInterval(() => {
      typeInto(input, TYPING_SCRIPT[i++]);
      if (i >= TYPING_SCRIPT.length) stopTyping();
    }, 110);
  };

  const clear = () => {
    stopTyping();
    typeInto(inputRef.current, '');
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
      else if (e.key === ']') h.changeWork(2);
      else if (e.key === '[') h.changeWork(-2);
      else if (e.key === 'i' || e.key === 'I') inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => {
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
              <span className="boss-mode-n">{i + 1}</span> {m.title}
            </div>
          ))}
        </div>
      </header>

      <canvas ref={refs.world} className="boss-world pixelated" width={1000} height={250} />

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
        <div className={`boss-pending ${pending ? 'is-on' : ''}`}>{pending ? '⏳ pending' : ''}</div>
      </div>

      <div className={`boss-hydra ${pending ? 'is-pending' : ''}`}>
        <HydraList query={listQuery} microsPerCell={micros} />
      </div>

      <div className="win boss-fps" style={{ position: 'absolute' }}>
        <div className="win-title">FPS</div>
        <div className="boss-fps-num" ref={refs.fps}>
          60
        </div>
        <canvas ref={refs.fpsGraph} className="boss-fps-graph" width={480} height={110} />
        <div className="boss-fps-worst">
          worst frame (3 s): <b ref={refs.worst}>–</b>
        </div>
      </div>

      <div className="win boss-timeline" style={{ position: 'absolute' }}>
        <div className="win-title">LIVE · real scheduler events</div>
        <canvas ref={refs.timeline} width={760} height={300} />
        <div className="boss-legend">
          <span className="lg lg-s">sync render (no task)</span>
          <span className="lg lg-d">Normal task slice</span>
          <span className="lg lg-x">thrown away</span>
          <span className="lg lg-r">blocked frame</span>
        </div>
      </div>

      <div className="win boss-code" style={{ position: 'absolute' }}>
        <div className="win-title">CODE</div>
        <pre className="boss-code-pre">{mode.code.join('\n')}</pre>
        <div className="boss-stats">
          <span>committed <b ref={refs.committed}>0</b></span>
          <span>thrown away <b ref={refs.discarded}>0</b></span>
          <span>slices (3 s) <b ref={refs.slices}>0</b></span>
          <span>last render <b ref={refs.lastRender}>–</b></span>
        </div>
      </div>

    </div>
  );
}
