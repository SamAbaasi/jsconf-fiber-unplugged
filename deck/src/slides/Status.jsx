import { AnimatedSprite, Sprite } from '../ui/Sprite.jsx';
import { FACES, FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import { LINES } from '../content/lines.js';
import { useStepSound } from '../audio/useStepSound.js';
import '../styles/status.css';

// Real FiberNode fields (A8: ReactFiber.js#L134-L173 at v19.3.1) for the CartIcon fiber:
// <Header> renders <Logo/> <Nav/> <CartIcon/>; CartIcon renders <Badge/>.
const FIELDS = [
  { k: 'type', v: 'CartIcon', step: 0 },
  { k: 'return', v: 'Header', step: 1 },
  { k: 'child', v: 'Badge', step: 1 },
  { k: 'sibling', v: 'null', step: 1 },
  { k: 'alternate', v: '⇄ twin', step: 2 },
  { k: 'lanes', v: 'SyncLane', step: 3 },
  { k: 'childLanes', v: '0', step: 3 },
];

function TreeLinks() {
  const n = { Header: [400, 60], Logo: [110, 250], Nav: [330, 250], CartIcon: [560, 250], Badge: [560, 440] };
  return (
    <svg className="st-tree fade-in" width="760" height="500" viewBox="0 0 760 500">
      <defs>
        {['child', 'sibling', 'return'].map((k) => (
          <marker key={k} id={`st-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" className={`st-${k}`} />
          </marker>
        ))}
      </defs>
      <path d="M330 92 L140 214" className="st-edge st-faint" />
      <path d="M530 214 L440 96" className="st-edge st-return" markerEnd="url(#st-return)" />
      <path d="M560 288 L560 396" className="st-edge st-child" markerEnd="url(#st-child)" />
      <path d="M660 250 L716 250" className="st-edge st-sibling" markerEnd="url(#st-sibling)" />
      <text x="500" y="150" className="st-label st-return">return</text>
      <text x="580" y="350" className="st-label st-child">child</text>
      <text x="606" y="214" className="st-label st-sibling">sibling</text>
      {Object.entries(n).map(([name, [x, y]]) => (
        <g key={name}>
          <rect x={x - 100} y={y - 34} width="200" height="68" rx="6" className={name === 'CartIcon' ? 'st-node is-me' : 'st-node'} />
          <text x={x} y={y + 12} textAnchor="middle" className="st-node-text">
            {name}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Twin() {
  return (
    <div className="st-twin fade-in">
      <div className="st-twin-col">
        <Sprite frame={FIBER_KUN.idle[0]} palette={PALETTE} scale={13} />
        <div>current</div>
      </div>
      <div className="st-twin-arrow">⇄</div>
      <div className="st-twin-col is-ghost">
        <Sprite frame={FIBER_KUN.idle[0]} palette={PALETTE} scale={13} flip />
        <div>work-in-progress</div>
      </div>
      <div className="st-twin-cap">{LINES.statusTwin.text}</div>
    </div>
  );
}

function Lanes() {
  return (
    <div className="st-lanes fade-in">
      <div>
        <code className="st-k">lanes</code> = work waiting <b>here</b>
      </div>
      <div>
        <code className="st-k">childLanes</code> = work waiting <b>below</b>
      </div>
    </div>
  );
}

function Skills({ step }) {
  return (
    <div className="st-skills">
      <div className="st-skills-title">SKILLS</div>
      <div className="st-skill pop-in">
        <div className="st-skill-name">
          《Yield》
          <span className="st-stamp" lang="ja">
            外れスキル?
          </span>
        </div>
        <div className="st-skill-effect">{LINES.statusSkillEffect.text}</div>
        {step >= 5 && (
          <div className="st-tooltip fade-in">
            <div>{LINES.statusSkillWhen.text}</div>
            <div className="st-tooltip-not">{LINES.statusSkillNot.text}</div>
          </div>
        )}
      </div>
      {step >= 6 && (
        <div className="st-skill is-sealed pop-in">
          <div className="st-skill-name">
            <span className="st-seal" lang="ja">
              封印
            </span>
            《Yield · 25 ms》
          </div>
          <code className="st-flag">enableThrottledScheduling = false</code>
        </div>
      )}
    </div>
  );
}

export function Status({ step, preview }) {
  useStepSound(step, { 4: 'unlock', 6: 'unlock' }, preview);
  const face = step >= 4 && step < 6 ? FACES.shocked : step >= 6 ? FACES.smug : null;
  return (
    <div className="st-slide">
      <div className="win st-win pop-in">
        <div className="win-title">STATUS</div>
        <div className="st-left">
          <div className="st-head">
            <div className="st-portrait">
              {face ? <Sprite frame={face} palette={PALETTE} scale={12} /> : <AnimatedSprite frames={FIBER_KUN.idle} palette={PALETTE} scale={12} fps={2} />}
            </div>
            <div>
              <div className="st-name">Fiber-kun</div>
              <div className="st-class">Lv 19.3.1</div>
            </div>
          </div>
          <div className="st-fields">
            {FIELDS.map((f) => (
              <div key={f.k} className={`st-row ${step === f.step ? 'is-now' : ''} ${step >= f.step ? '' : 'is-unknown'}`}>
                <code className="st-k">{f.k}</code>
                <code className="st-v">{step >= f.step ? f.v : '???'}</code>
              </div>
            ))}
          </div>
        </div>
        <div className="st-right">
          {step === 1 && <TreeLinks />}
          {step === 2 && <Twin />}
          {step === 3 && <Lanes />}
          {step >= 4 && <Skills step={step} />}
        </div>
      </div>
    </div>
  );
}
