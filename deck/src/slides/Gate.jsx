import { LINES } from '../content/lines.js';
import { GATE_RANKS, gateRank } from '../demo/gates.js';
import '../styles/story.css';

// The Gate = the main thread (CLAIMS L1, L2, L3). One corridor; one traveller at a time.
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

function RankCard() {
  const ms = globalThis.__truckFrozenMs;
  const truck = typeof ms === 'number' ? gateRank(ms) : null;
  return (
    <div className="gt-ranks pop-in">
      <div className="gt-ranks-title">GATE RANKS</div>
      <div className="gt-ranks-sub">danger rank of a task (our ranks · only S = spec)</div>
      {GATE_RANKS.map((r) => (
        <div key={r.rank} className={`gt-rank-row ${truck && truck.rank === r.rank ? 'is-truck' : ''}`}>
          <span className={`gate-rank rank-${r.rank}`}>{r.rank}</span>
          <span>{r.rule}</span>
        </div>
      ))}
      <div className="gt-truck">
        {truck ? (
          <>
            the truck (measured in the cold open): <b>{ms.toLocaleString('en-US')} ms</b> → <span className={`gate-rank rank-${truck.rank}`}>{truck.rank}</span>
          </>
        ) : (
          <>the truck: not measured in this session yet (play the cold open)</>
        )}
      </div>
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
      {step >= 2 && <RankCard />}
      <div className="gt-src">source: MDN (main thread, long task) · CLAIMS L1 L2 L3</div>
    </div>
  );
}
