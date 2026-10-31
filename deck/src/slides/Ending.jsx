import { useEffect } from 'react';
import { Sprite } from '../ui/Sprite.jsx';
import { FIBER_KUN, FACES, PALETTE } from '../sprites/fiberkun.js';
import { LINES } from '../content/lines.js';
import { QR_PATH, QR_MODULES } from '../content/qr.generated.js';
import { play } from '../audio/sfx.js';
import '../styles/story.css';

// Ending: Fiber-kun wants to join your party. A well-known JRPG line, as text only
// (our own dialogue box, our own font, no game graphics). Step 0: the question, the ▶ cursor
// blinks on はい. Step 1 (clicker): はい is chosen, Fiber-kun jumps, a jingle plays.
// The QR code is generated at build time (scripts/gen-qr.mjs) and inlined as SVG.
const LINKS = ['linkedin.com/in/samabaasi', 'github.com/samabaasi', 'dev.to/samabaasi', 'medium.com/@samabaasi'];

function Qr() {
  const q = 4; // quiet zone, in modules
  const size = QR_MODULES + q * 2;
  return (
    <svg className="end-qr" viewBox={`${-q} ${-q} ${size} ${size}`} width={320} height={320} shapeRendering="crispEdges" aria-label="QR code: LinkedIn">
      <rect x={-q} y={-q} width={size} height={size} fill="#ffffff" />
      <path d={QR_PATH} fill="#000000" />
    </svg>
  );
}

export function Ending({ step, preview }) {
  const yes = step >= 1;
  useEffect(() => {
    if (yes && !preview) play('fanfare');
  }, [yes, preview]);
  return (
    <div className="end-slide">
      <div className="end-msg">
        <div className="end-msg-ja" lang="ja">
          {LINES.endJoin.text}
        </div>
        <div className="end-msg-en">{LINES.endJoin.sub}</div>
      </div>
      <div className={`end-hero ${yes ? 'is-yes' : ''}`}>
        <Sprite frame={yes ? FACES.smug : FIBER_KUN.idle[0]} palette={PALETTE} scale={12} />
      </div>
      <div className="end-choice">
        <div className="end-q" lang="ja">
          {LINES.endAsk.text}
        </div>
        <div className="end-opts" lang="ja">
          <span className={`end-opt ${yes ? 'is-chosen' : ''}`}>
            <span className="end-cursor">▶</span>
            {LINES.endYes.text}
          </span>
          <span className="end-opt">{LINES.endNo.text}</span>
        </div>
      </div>
      <div className="end-card">
        <div className="end-name">Saman Abbasi</div>
        {LINKS.map((l) => (
          <div key={l} className="end-link">
            {l}
          </div>
        ))}
      </div>
      <Qr />
    </div>
  );
}
