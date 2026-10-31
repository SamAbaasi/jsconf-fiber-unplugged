import { Window } from '../ui/Window.jsx';
import { AnimatedSprite } from '../ui/Sprite.jsx';
import { FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import '../styles/status.css';

// Real FiberNode fields (ReactFiber.js#L134-L173 at v19.3.1), for the CartIcon fiber
// from the story: <Header> renders <Logo/>, <Nav/>, <CartIcon/>; CartIcon renders <Badge/>.
const GROUPS = [
  {
    step: 1,
    name: 'IDENTITY',
    rows: [
      ['tag', '0  FunctionComponent'],
      ['type', 'CartIcon'],
      ['key', 'null'],
      ['stateNode', 'null'],
    ],
  },
  {
    step: 2,
    name: 'LINKS',
    rows: [
      ['return', 'Header'],
      ['child', 'Badge'],
      ['sibling', 'null'],
      ['index', '2'],
    ],
  },
  {
    step: 3,
    name: 'TWIN',
    rows: [['alternate', '⇄ the other copy']],
  },
  {
    step: 4,
    name: 'WORK',
    rows: [
      ['memoizedState', 'Hook { 3 } → next'],
      ['pendingProps', '{ }'],
      ['lanes', '0b…0010  SyncLane'],
      ['childLanes', '0b…0000'],
      ['flags', 'PerformedWork'],
    ],
  },
];

function TreeLinks({ step }) {
  // Positions (box centers) in a 640×470 box. Boxes are 156×56.
  const n = {
    Header: [330, 52],
    Logo: [88, 210],
    Nav: [258, 210],
    CartIcon: [428, 210],
    Badge: [428, 380],
  };
  const box = (name, hl) => {
    const [x, y] = n[name];
    return (
      <g key={name}>
        <rect x={x - 78} y={y - 28} width="156" height="56" rx="6" className={hl ? 'tl-node is-me' : 'tl-node'} />
        <text x={x} y={y + 9} textAnchor="middle" className="tl-text">
          {name}
        </text>
      </g>
    );
  };
  const show = step >= 2;
  return (
    <svg className="tree-links" width="640" height="470" viewBox="0 0 640 470">
      <defs>
        {['child', 'sibling', 'return'].map((k) => (
          <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" className={`tl-head tl-${k}`} />
          </marker>
        ))}
      </defs>
      {/* Header's own links, drawn faint */}
      <path d="M270 80 L110 182" className="tl-edge tl-faint" />
      <path d="M166 210 L180 210" className="tl-edge tl-faint" />
      <path d="M336 210 L350 210" className="tl-edge tl-faint" />
      {show && (
        <g className="fade-in">
          <path d="M428 238 L428 346" className="tl-edge tl-child" markerEnd="url(#arrow-child)" />
          <path d="M400 182 L350 86" className="tl-edge tl-return" markerEnd="url(#arrow-return)" />
          <path d="M506 210 L572 210" className="tl-edge tl-sibling" markerEnd="url(#arrow-sibling)" />
          <text x="582" y="218" className="tl-null">null</text>
          <text x="444" y="300" className="tl-label tl-child">child</text>
          <text x="392" y="122" className="tl-label tl-return">return</text>
          <text x="500" y="176" className="tl-label tl-sibling">sibling</text>
        </g>
      )}
      {Object.keys(n).map((k) => box(k, k === 'CartIcon'))}
    </svg>
  );
}

function Twins() {
  return (
    <div className="twins fade-in">
      <div className="twin">
        <div className="twin-cap">current</div>
        <div className="twin-box">CartIcon</div>
        <div className="twin-sub">on screen now</div>
      </div>
      <div className="twin-arrows">⇄</div>
      <div className="twin">
        <div className="twin-cap">work-in-progress</div>
        <div className="twin-box is-wip">CartIcon</div>
        <div className="twin-sub">being built</div>
      </div>
    </div>
  );
}

export function Status({ step }) {
  return (
    <div className="status-slide">
      <Window title="STATUS" className="status-win pop-in">
        <div className="status-head">
          <div className="status-portrait">
            <AnimatedSprite frames={FIBER_KUN.idle} palette={PALETTE} scale={11} fps={2} />
          </div>
          <div>
            <div className="status-name">Fiber-kun</div>
            <div className="status-class">Class: FiberNode · Lv. 19.3.1</div>
            <div className="status-class">Job: one unit of work</div>
          </div>
        </div>
        <div className="status-groups">
          {GROUPS.map((g) => {
            const known = step >= g.step;
            return (
              <div key={g.name} className={`status-group ${step === g.step ? 'is-now' : ''} ${known ? '' : 'is-unknown'}`}>
                <div className="status-group-name">{g.name}</div>
                {g.rows.map(([k, v]) => (
                  <div key={k} className="status-row">
                    <span className="status-key">{k}</span>
                    <span className="status-val">{known ? v : '???'}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Window>

      <div className="status-side">
        {step >= 2 && step < 3 && <TreeLinks step={step} />}
        {step === 3 && <Twins />}
        {step >= 4 && (
          <div className="status-side-note fade-in">
            <div>
              <b className="rank-s-text">lanes</b>: work waiting <i>here</i>
            </div>
            <div>
              <b className="rank-d-text">childLanes</b>: work waiting <i>below</i>
            </div>
          </div>
        )}
        {step < 2 && <TreeLinks step={step} />}
      </div>

      <div className="slide-caption">
        {step >= 5 ? (
          <span className="fade-in">A stack frame that React controls. Just a plain object.</span>
        ) : (
          <span>&nbsp;</span>
        )}
      </div>
      <div className="src-ref">react-reconciler/src/ReactFiber.js#L134 · v19.3.1</div>
    </div>
  );
}
