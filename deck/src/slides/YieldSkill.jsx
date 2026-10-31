import { Window } from '../ui/Window.jsx';
import { Sprite } from '../ui/Sprite.jsx';
import { Dialogue } from '../ui/Dialogue.jsx';
import { useStepClock } from '../ui/useStepClock.js';
import { useStepSound } from '../audio/useStepSound.js';
import { FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import { LINES } from '../content/lines.js';
import { LevelUp } from '../ui/LevelUp.jsx';
import { EDGES, POS, SLICE_MS, stateAt, stepDuration } from './yieldScript.js';
import '../styles/yield.css';

// Step 0: the skill card. Same skill as on the STATUS window, now up close.
function SkillCard() {
  return (
    <div className="yc">
      <div className="yc-label">SKILL</div>
      <div className="yc-name pop-in">《Yield》</div>
      <div className="yc-effect">{LINES.statusSkillEffect.text}</div>
      <div className="yc-stamp" lang="ja">
        外れスキル?
      </div>
      <div className="yc-really">{LINES.yCardReally.text}</div>
      <div className="yc-hero">
        <Sprite frame={FIBER_KUN.idle[0]} palette={PALETTE} scale={12} />
      </div>
    </div>
  );
}

function CodeCompare() {
  return (
    <div className="ycode fade-in">
      <Window title="OLD WORLD" className="ycode-win">
        <pre>{'while (workInProgress !== null) {\n  performUnitOfWork(workInProgress);\n}'}</pre>
      </Window>
      <Window title="WITH 《Yield》" className="ycode-win is-new">
        <pre>
          {'while (workInProgress !== null '}
          <mark>{'&& !shouldYield()'}</mark>
          {') {\n  performUnitOfWork(workInProgress);\n}'}
        </pre>
      </Window>
      <div className="ycode-note">one check, before every fiber</div>
    </div>
  );
}

const SEG_PX_PER_MS = 56;
const SEG_W = { paint: 170, 'other tasks': 230 };

function Walk({ step, preview }) {
  const elapsed = useStepClock(step, stepDuration(step), preview);
  const s = stateAt(step, elapsed);
  const [fx0, fy0] = POS[s.fkFrom];
  const [fx1, fy1] = POS[s.fkAt];
  const fx = fx0 + (fx1 - fx0) * s.fkT;
  const fy = fy0 + (fy1 - fy0) * s.fkT;
  const left = Math.max(0, SLICE_MS - s.used);
  const frame =
    s.pose === 'rest' ? FIBER_KUN.rest[0] : s.pose === 'walk' ? FIBER_KUN.walk[Math.floor(elapsed / 150) % 2] : FIBER_KUN.idle[0];
  const line = s.narr ? LINES[s.narr.key] : null;

  return (
    <div className="yw">
      <div className="win yw-tree">
        <svg width="1760" height="500" viewBox="0 0 1760 500" className="yw-svg">
          {EDGES.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={POS[a][0]} y1={POS[a][1] + 32} x2={POS[b][0]} y2={POS[b][1] - 32} className="yw-edge" />
          ))}
          {Object.entries(POS).map(([name, [x, y]]) => {
            const w = name.startsWith('Row') ? 160 : 196;
            const cls = s.committed
              ? 'is-committed'
              : s.completed.has(name)
                ? 'is-done'
                : s.wip === name
                  ? 'is-wip'
                  : s.begun.has(name)
                    ? 'is-begun'
                    : '';
            return (
              <g key={name} className={`yw-node ${cls}`}>
                <rect x={x - w / 2} y={y - 32} width={w} height="64" rx="6" />
                <text x={x} y={y + 12} textAnchor="middle">
                  {name}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="yw-fk" style={{ left: fx + 30 - 48, top: fy + 26 - 32 - 96 }}>
          <Sprite frame={frame} palette={PALETTE} scale={6} />
        </div>
        <div className="yw-slice">
          <div className="yw-slice-label">5 ms</div>
          <div className="yw-bar">
            <div className="yw-bar-fill" style={{ width: `${(left / SLICE_MS) * 100}%` }} />
          </div>
        </div>
        {s.shouldYield && <div className="yw-yield pop-in">shouldYield() → true</div>}
      </div>

      <div className="win yw-thread">
        <div className="yw-segs">
          {s.segs.map((seg, i) => {
            if (seg.kind === 'react')
              return (
                <div key={i} className="yw-seg is-react" style={{ width: Math.max(4, seg.ms * SEG_PX_PER_MS) }}>
                  {seg.ms > 2.5 ? 'React' : ''}
                </div>
              );
            if (seg.kind === 'commit')
              return (
                <div key={i} className="yw-seg is-commit" style={{ width: 170 * seg.grow }}>
                  {seg.grow > 0.6 ? 'commit' : ''}
                </div>
              );
            return (
              <div key={i} className="yw-seg is-browser" style={{ width: (SEG_W[seg.label] || 170) * seg.grow }}>
                {seg.grow > 0.6 ? seg.label : ''}
              </div>
            );
          })}
        </div>
      </div>

      {line && <Dialogue line={line} vars={{ wip: s.narr.wip }} preview={preview} />}
    </div>
  );
}

function Summary() {
  return (
    <div className="ys">
      <div className="ys-big pop-in">YIELD = PAUSE</div>
      <div className="ys-line">{LINES.ySummary.text}</div>
      <div className="ys-catch">{LINES.ySummaryCatch.text}</div>
    </div>
  );
}

// Step 7: why is it a "dud"? Two layers (C1); a click is SyncLane and skips the Scheduler (C2),
// so it never gets 《Yield》: only non-blocking lanes are sliced (A4).
function WhyDud() {
  return (
    <div className="yd-slide">
      <div className="yd-title">{LINES.dudTitle.text}</div>
      <div className="yd-floor yd-upper">
        <div className="yd-floor-name">Lanes · the reconciler</div>
        <div className="yd-floor-job">decide WHAT to render, and if it may be sliced</div>
      </div>
      <div className="yd-floor yd-lower">
        <div className="yd-floor-name">Scheduler</div>
        <div className="yd-floor-job">decides WHEN · 5 ms slices · 《Yield》 lives here</div>
      </div>
      <div className="yd-click pop-in">
        click / key = SyncLane → <b>microtask</b> → render now
        <div className="yd-skip">never enters the Scheduler queue · no 《Yield》</div>
      </div>
      <div className="yd-line fade-in">{LINES.dudLine.text}</div>
      <div className="yd-ids">CLAIMS C1 · C2 · A4</div>
    </div>
  );
}

export function YieldSkill({ step, preview }) {
  if (step >= 8)
    return <LevelUp from={2} to={3} skill="Guild card" effect="read the quest board: who is urgent?" real="lanes (31-bit mask)" claims={['D1']} preview={preview} />;
  if (step === 7) return <WhyDud />;
  useStepSound(step, { 0: 'unlock' }, preview);
  if (step === 0) return <SkillCard />;
  if (step === 1) return <CodeCompare />;
  if (step === 6) return <Summary />;
  return <Walk step={step} preview={preview} />;
}
