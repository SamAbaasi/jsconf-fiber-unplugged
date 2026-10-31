import { Window } from '../ui/Window.jsx';
import { Sprite, AnimatedSprite } from '../ui/Sprite.jsx';
import { useStepClock } from '../ui/useStepClock.js';
import { FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import { EDGES, POS, SLICE_MS, stateAt, stepDuration } from './yieldScript.js';
import '../styles/yield.css';

function SkillPopup() {
  return (
    <div className="skill-popup-wrap">
      <Window title="SYSTEM" className="skill-popup pop-in">
        <div className="skill-new">NEW SKILL UNLOCKED</div>
        <div className="skill-name">《 Yield 》</div>
        <div className="skill-desc">Stop between fibers. Let the browser paint. Continue later.</div>
      </Window>
      <div className="skill-hero">
        <AnimatedSprite frames={FIBER_KUN.idle} palette={PALETTE} scale={14} fps={3} />
      </div>
    </div>
  );
}

function CodeCompare() {
  return (
    <div className="yield-code fade-in">
      <Window title="OLD WORLD" className="yield-code-win">
        <pre>
          {'function workLoopSync() {\n  while (workInProgress !== null) {\n    performUnitOfWork(workInProgress);\n  }\n}'}
        </pre>
        <div className="yield-code-note">no exit until the whole tree is done</div>
      </Window>
      <Window title="NEW SKILL" className="yield-code-win is-new">
        <pre>
          {'function workLoopConcurrentByScheduler() {\n  while (workInProgress !== null '}
          <mark>{'&&\n         !shouldYield()'}</mark>
          {') {\n    performUnitOfWork(workInProgress);\n  }\n}'}
        </pre>
        <div className="yield-code-note">checks the clock before every fiber</div>
      </Window>
      <div className="src-ref">react-reconciler/src/ReactFiberWorkLoop.js#L2772 · #L3073 · v19.3.1</div>
    </div>
  );
}

const SEG_PX_PER_MS = 44;
const SEG_W = { paint: 130, 'other tasks': 150 };

function Walk({ step, preview }) {
  const elapsed = useStepClock(step, stepDuration(step), preview);
  const s = stateAt(step, elapsed);
  const [fx0, fy0] = POS[s.fkFrom];
  const [fx1, fy1] = POS[s.fkAt];
  const fx = fx0 + (fx1 - fx0) * s.fkT;
  const fy = fy0 + (fy1 - fy0) * s.fkT;
  const left = Math.max(0, SLICE_MS - s.used);
  const frame = s.pose === 'rest' ? FIBER_KUN.rest[0] : s.pose === 'walk' ? FIBER_KUN.walk[Math.floor(elapsed / 150) % 2] : FIBER_KUN.idle[0];

  return (
    <div className="yield-walk">
      <Window title="FIBER TREE" className="yw-tree">
        <svg width="920" height="520" viewBox="0 0 920 520" className="yw-svg">
          {EDGES.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={POS[a][0]} y1={POS[a][1] + 25} x2={POS[b][0]} y2={POS[b][1] - 25} className="yw-edge" />
          ))}
          {Object.entries(POS).map(([name, [x, y]]) => {
            const w = name.startsWith('Row') ? 92 : 116;
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
                <rect x={x - w / 2} y={y - 25} width={w} height="50" rx="6" />
                <text x={x} y={y + 8} textAnchor="middle">
                  {name}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="yw-fk" style={{ left: fx + 36 - 32, top: fy + 30 - 25 - 64 }}>
          <Sprite frame={frame} palette={PALETTE} scale={4} />
        </div>
        <div className="yw-legend">
          <span className="yw-l is-wip">workInProgress</span>
          <span className="yw-l is-begun">begun</span>
          <span className="yw-l is-done">completed</span>
        </div>
      </Window>

      <Window title="workInProgress" className="yw-wip">
        <div className="yw-wip-name">{s.wip ?? 'null'}</div>
      </Window>

      <Window title="TIME SLICE · 5 ms" className="yw-slice">
        <div className="yw-bar">
          <div className="yw-bar-fill" style={{ width: `${(left / SLICE_MS) * 100}%` }} />
        </div>
        <div className={`yw-bar-num ${left <= 0.001 ? 'is-empty' : ''}`}>{left.toFixed(1)} ms left</div>
      </Window>

      <Window title="LOOP" className="yw-loop">
        <pre>
          {'while (workInProgress !== null &&\n       !shouldYield()) {\n  performUnitOfWork(workInProgress);\n}'}
        </pre>
        <div className={`yw-should ${s.shouldYield ? 'is-true' : ''}`}>shouldYield() → {s.shouldYield ? 'true' : 'false'}</div>
        {s.message && <div className="yw-msg pop-in">✉ MessageChannel</div>}
      </Window>

      <Window title="MAIN THREAD · diagram" className="yw-thread">
        <div className="yw-segs">
          {s.segs.map((seg, i) => {
            if (seg.kind === 'react')
              return (
                <div key={i} className="yw-seg is-react" style={{ width: Math.max(4, seg.ms * SEG_PX_PER_MS) }}>
                  {seg.ms > 2 ? 'React' : ''}
                </div>
              );
            if (seg.kind === 'commit')
              return (
                <div key={i} className="yw-seg is-commit" style={{ width: 110 * seg.grow }}>
                  {seg.grow > 0.6 ? 'commit' : ''}
                </div>
              );
            return (
              <div key={i} className="yw-seg is-browser" style={{ width: (SEG_W[seg.label] || 120) * seg.grow }}>
                {seg.grow > 0.6 ? seg.label : ''}
              </div>
            );
          })}
        </div>
        <div className="yw-scale">one green block = one 5 ms slice</div>
      </Window>

      <div className="slide-caption yw-caption">{s.msg || ' '}</div>
    </div>
  );
}

function Summary() {
  return (
    <div className="yield-summary">
      <Window title="SKILL INFO" className="ys-win pop-in">
        <div className="ys-line">
          <b>Yield</b> = pause. Same fiber, same tree. Nothing is lost.
        </div>
        <div className="ys-line ys-small">5 ms per browser task · the browser can paint in between</div>
        <div className="ys-line ys-small ys-warn">Only for work React may pause. Which work? Next chapter.</div>
      </Window>
      <div className="src-ref">scheduler/src/SchedulerFeatureFlags.js#L11 (frameYieldMs = 5) · v19.3.1</div>
    </div>
  );
}

export function YieldSkill({ step, preview }) {
  if (step === 0) return <SkillPopup />;
  if (step === 1) return <CodeCompare />;
  if (step >= 6) return <Summary />;
  return <Walk step={step} preview={preview} />;
}
