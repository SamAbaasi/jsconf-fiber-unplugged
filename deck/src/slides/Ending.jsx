import { AnimatedSprite } from '../ui/Sprite.jsx';
import { FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import { LINES } from '../content/lines.js';
import '../styles/story.css';

// 仲間募集: party-recruit ending. DRAFT: Saman decides whether to use it.
// Links and QR are placeholders on purpose: Saman fills them in.
export function Ending() {
  return (
    <div className="end-slide">
      <div className="end-draft">DRAFT · Saman decides whether to use this slide</div>
      <div className="end-board">
        <div className="end-title" lang="ja">
          仲間募集
        </div>
        <div className="end-sub">{LINES.endRecruit.text}</div>
        <div className="end-body">
          <div className="end-hero">
            <AnimatedSprite frames={FIBER_KUN.idle} palette={PALETTE} scale={12} fps={2.5} />
          </div>
          <div className="end-info">
            <div className="end-name">Saman Abbasi</div>
            <div className="end-link">LINK 1 · (placeholder)</div>
            <div className="end-link">LINK 2 · (placeholder)</div>
            <div className="end-link">slides + CLAIMS.md · (placeholder)</div>
          </div>
          <div className="end-qr">
            QR
            <br />
            placeholder
          </div>
        </div>
      </div>
    </div>
  );
}
