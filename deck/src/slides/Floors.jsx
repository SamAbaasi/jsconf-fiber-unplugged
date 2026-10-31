import { Sprite } from '../ui/Sprite.jsx';
import { LevelUp } from '../ui/LevelUp.jsx';
import { FIBER_KUN, FACES, PALETTE } from '../sprites/fiberkun.js';
import { LINES } from '../content/lines.js';
import { useStepSound } from '../audio/useStepSound.js';
import '../styles/floors.css';

// Floors 3–5 (STORYBOARD.md). One idea per step. CLAIMS IDs are in the speaker notes only.

const Hero = ({ face = 'normal', scale = 8, flip }) => (
  <Sprite frame={face === 'normal' ? FIBER_KUN.idle[0] : FACES[face]} palette={PALETTE} scale={scale} flip={flip} />
);

function Head({ floor, title, real }) {
  return (
    <div className="fl-head">
      <span className="fl-title">{title}</span>
      <span className="fl-real">{real}</span>
    </div>
  );
}

// ---------------- Floor 3 · Lv3 · the quest board = lanes (D1, D2, C2, A4, C5, C6) ----------------
// Bit positions from ReactFiberLane.js (D1): SyncHydration 0, Sync 1, InputContinuousHydration 2,
// InputContinuous 3, DefaultHydration 4, Default 5, Gesture 6, TransitionHydration 7,
// Transition 8–21, Retry 22–25, SelectiveHydration 26, IdleHydration 27, Idle 28, Offscreen 29, Deferred 30.
const LANE_GROUPS = [
  { from: 1, to: 1, name: 'Sync', cls: 'is-sync' },
  { from: 3, to: 3, name: 'Continuous', cls: 'is-cont' },
  { from: 5, to: 5, name: 'Default', cls: 'is-def' },
  { from: 8, to: 21, name: 'Transition ×14', cls: 'is-tr' },
  { from: 28, to: 28, name: 'Idle', cls: 'is-idle' },
];
const groupOf = (bit) => LANE_GROUPS.find((g) => bit >= g.from && bit <= g.to);

function QuestBoard({ highlight = null, emptySync = false }) {
  return (
    <div className="qb">
      <div className="qb-board">
        {Array.from({ length: 31 }, (_, bit) => {
          const g = groupOf(bit);
          const hidden = emptySync && g && g.name === 'Sync';
          return <div key={bit} className={`qb-slot ${g ? g.cls : ''} ${highlight && g && g.name === highlight ? 'is-hl' : ''} ${hidden ? 'is-empty' : ''}`} />;
        })}
      </div>
      <div className="qb-axis">
        <span>bit 0 · most urgent</span>
        <span>bit 30 · least urgent</span>
      </div>
      <div className="qb-legend">
        {LANE_GROUPS.map((g) => (
          <span key={g.name} className={`qb-key ${g.cls}`}>
            {g.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Floor3({ step, preview }) {
  useStepSound(step, {}, preview);
  if (step >= 4)
    return <LevelUp from={3} to={4} skill="Respawn" effect="restart from the root" real="interrupt · prepareFreshStack" preview={preview} />;
  return (
    <div className="fl-slide">
      <Head title="THE QUEST BOARD" real="Quest board = lanes · 31 bits" />
      {step === 0 && (
        <>
          <QuestBoard />
          <div className="fl-line fade-in">{LINES.f3Board.text}</div>
        </>
      )}
      {step === 1 && (
        <div className="ev-grid fade-in">
          {[
            ['click · keydown · input', 'Sync', 'is-sync'],
            ['scroll · mousemove', 'Continuous', 'is-cont'],
            ['setTimeout · fetch', 'Default', 'is-def'],
          ].map(([ev, lane, cls]) => (
            <div key={lane} className="ev-row">
              <span className="ev-ev">{ev}</span>
              <span className="ev-arrow">→</span>
              <span className={`ev-lane ${cls}`}>{lane}</span>
            </div>
          ))}
          <div className="fl-line">{LINES.f3Events.text}</div>
        </div>
      )}
      {step === 2 && (
        <div className="em fade-in">
          <QuestBoard emptySync />
          <div className="em-path">
            <span className="em-scroll">EMERGENCY · SyncLane</span>
            <span className="ev-arrow">→</span>
            <span className="em-micro">microtask</span>
            <span className="ev-arrow">→</span>
            <span className="em-hero">
              <Hero face="shocked" scale={6} />
            </span>
          </div>
          <div className="fl-line">{LINES.f3Emergency.text}</div>
        </div>
      )}
      {step === 3 && (
        <div className="ex fade-in">
          <div className="ex-row">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="ex-seg">
                <span className="ex-work">5 ms</span>
                {i < 3 && <span className="ex-rest">browser</span>}
              </span>
            ))}
          </div>
          <div className="ex-caption">Expedition = Transition lane: walk 5 ms, rest, walk again</div>
          <div className="fl-line">{LINES.f3Expedition.text}</div>
        </div>
      )}
    </div>
  );
}

// ---------------- Floor 4 · Lv4 · Respawn = interrupt (B1, B2, B3, B6) ----------------
const TREE = ['App', 'Header', 'Results', 'Row 1', 'Row 2', 'Row 3', 'Row 4', 'Footer'];

function WipTree({ done, broken = false, label }) {
  return (
    <div className={`wt ${broken ? 'is-broken' : ''}`}>
      <div className="wt-label">{label}</div>
      <div className="wt-row">
        {TREE.map((n, i) => (
          <span key={n} className={`wt-node ${i < done ? 'is-done' : ''} ${i === done ? 'is-now' : ''}`} style={{ '--i': i }}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Floor4({ step, preview }) {
  useStepSound(step, { 1: 'respawn' }, preview);
  if (step >= 4)
    return <LevelUp from={4} to={5} skill="Expedition" effect="urgent first, heavy later" real="startTransition · useDeferredValue" preview={preview} />;
  return (
    <div className="fl-slide">
      <Head title="RESPAWN" real="Respawn = interrupt · prepareFreshStack" />
      {step === 0 && (
        <div className="fade-in">
          <WipTree done={4} label="a transition render, half done" />
          <div className="rs-key pop-in">⌨ a keystroke arrives · SyncLane</div>
          <div className="fl-line">{LINES.f4Arrive.text}</div>
        </div>
      )}
      {step === 1 && (
        <div className="fade-in">
          <WipTree done={4} broken label="thrown away" />
          <div className="rs-respawn pop-in">RESPAWN AT ROOT</div>
          <WipTree done={0} label="the keystroke commits first, then: from the root again" />
          <div className="fl-line">{LINES.f4Respawn.text}</div>
        </div>
      )}
      {step === 2 && (
        <div className="vs fade-in">
          <div className="vs-col">
            <div className="vs-title is-yield">YIELD = pause</div>
            <WipTree done={4} label="next slice starts at Row 2" />
            <div className="vs-note">same fiber · nothing lost</div>
          </div>
          <div className="vs-col">
            <div className="vs-title is-int">INTERRUPT = restart</div>
            <WipTree done={0} label="next render starts at App" />
            <div className="vs-note">from the root · work thrown away</div>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="fade-in">
          <WipTree done={5} label="a transition render" />
          <div className="rs-timer">⏲ setTimeout update · Default lane</div>
          <div className="rs-wait">waits · no respawn</div>
          <div className="fl-line">{LINES.f4Default.text}</div>
        </div>
      )}
    </div>
  );
}

// ---------------- Floor 5 · Lv5 · Expeditions: transition / deferred (E1, E2, F1, F2, A5, C9, C11) ----------------
export function Floor5({ step, preview }) {
  useStepSound(step, {}, preview);
  if (step >= 3)
    return <LevelUp from={5} to={6} skill="BOSS ROOM" effect="the door is open" real="the live demo" preview={preview} />;
  return (
    <div className="fl-slide">
      <Head title="EXPEDITIONS" real="Expedition = Transition lane" />
      {step === 0 && (
        <div className="st fade-in">
          <pre className="tx-code">{`startTransition(() => {\n  setQuery(v);\n});`}</pre>
          <div className="tx-rows">
            <div className="tx-row">
              <span className="tx-tag is-now">NOW</span> the callback runs, inside the event
            </div>
            <div className="tx-row">
              <span className="tx-tag is-later">LATER</span> the render it schedules · sliced
            </div>
          </div>
          <div className="fl-line">{LINES.f5Callback.text}</div>
        </div>
      )}
      {step === 1 && (
        <div className="dv fade-in">
          <pre className="tx-code">{`q = useDeferredValue(text);`}</pre>
          <div className="dv-renders">
            <div className="dv-r is-urgent">
              render 1 · urgent · <b>old q</b>
            </div>
            <div className="dv-r is-def">
              render 2 · deferred · <b>new q</b>
            </div>
          </div>
          <div className="dv-note">inside a transition: one render, no second step</div>
          <div className="fl-line">{LINES.f5Deferred.text}</div>
        </div>
      )}
      {step === 2 && (
        <div className="gd fade-in">
          <div className="gd-title">two 5-second guards</div>
          <div className="gd-row">
            <span className="gd-clock">5000 ms</span>
            <span>a Transition lane that waits too long expires → no slicing</span>
          </div>
          <div className="gd-row">
            <span className="gd-clock">5000 ms</span>
            <span>a Scheduler task alive too long times out → React renders it in one piece</span>
          </div>
          <div className="gd-quote">React’s own comment: “We only check `didTimeout` defensively…”</div>
          <div className="fl-line">{LINES.f5Guards.text}</div>
        </div>
      )}
    </div>
  );
}
