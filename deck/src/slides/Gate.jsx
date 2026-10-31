import { LINES } from '../content/lines.js';
import { LONG_TASK_MS, isLongTask } from '../demo/gates.js';
import '../styles/story.css';

// The Gate = the main thread (CLAIMS L1, L2, L3; IDs in the notes only). One corridor; one traveller at a time.
const TRAVELLERS = [
  { k: 'js', label: 'JS' },
  { k: 'style', label: 'layout' },
  { k: 'paint', label: 'paint' },
  { k: 'input', label: 'your click' },
];

function Corridor({ stuck }) {
  return (
    <div className={`gt-corridor ${stuck ? 'is-stuck' : ''}`}>
      <div className="gt-wall gt-wall-top" />
      <div className="gt-wall gt-wall-bottom" />
      <div className="gt-gate-mark">GATE</div>
      <div className="gt-lane">
        {stuck && <div className="gt-monster pop-in">LONG TASK</div>}
        {TRAVELLERS.map((t, i) => (
          <div key={t.k} className={`gt-trav gt-${t.k}`} style={{ '--i': i }}>
            {t.label}
            {stuck && (t.k === 'input' || t.k === 'paint') && <span className="gt-wait">waiting…</span>}
          </div>
        ))}
      </div>
      <div className="gt-exit">→ screen</div>
    </div>
  );
}

// Step 2: a Gate shows only its real duration. Red at 50 ms or more = LONG TASK (spec).
function GateCard() {
  const ms = globalThis.__truckFrozenMs;
  const measured = typeof ms === 'number';
  const long = measured && isLongTask(ms);
  const scaleMax = Math.max(100, measured ? ms : 0);
  const pos = (v) => `${(Math.min(v, scaleMax) / scaleMax) * 100}%`;
  return (
    <div className="gt-card pop-in">
      <div className="gt-card-title">one task = one Gate</div>
      <div className={`gt-gate ${long ? 'is-long' : ''}`}>
        <div className="gt-gate-name">the truck</div>
        <div className="gt-gate-ms">{measured ? `${ms.toLocaleString('en-US')} ms` : '— ms'}</div>
        {long && <div className="gt-gate-tag">LONG TASK · spec</div>}
      </div>
      <div className="gt-bar">
        <div className={`gt-bar-fill ${long ? 'is-long' : ''}`} style={{ width: measured ? pos(ms) : 0 }} />
        <div className="gt-bar-line" style={{ left: pos(LONG_TASK_MS) }}>
          <span>50 ms</span>
        </div>
      </div>
      <div className="gt-card-note">{measured ? 'measured in the cold open' : 'play the cold open first: nothing measured yet'}</div>
    </div>
  );
}

export function Gate({ step }) {
  return (
    <div className="gt-slide">
      <div className="gt-head">
        <span className="gt-title">THE DUNGEON</span>
        <span className="gt-real">Dungeon = main thread · each task = one Gate</span>
      </div>
      {step < 2 && <Corridor stuck={step >= 1} />}
      {step < 2 && <div className="gt-caption fade-in">{step === 0 ? LINES.gateOne.text : LINES.gateStuck.text}</div>}
      {step >= 2 && <GateCard />}
      <div className="gt-src">sources: MDN (main thread), W3C Long Tasks</div>
    </div>
  );
}
