import { useEffect } from 'react';
import { AnimatedSprite } from './Sprite.jsx';
import { FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import { play } from '../audio/sfx.js';
import '../styles/story.css';

// Full-screen LEVEL UP moment at the end of a floor. The skill card shows the real
// name of the mechanism. Its CLAIMS.md rows are in the speaker notes and the appendix.
export function LevelUp({ from, to, skill, real, effect, stamp, claims = [], preview }) {
  useEffect(() => {
    if (!preview) play('fanfare');
  }, [preview]);
  return (
    <div className="lv-screen">
      <div className="lv-rays" />
      <div className="lv-title pop-in">LEVEL UP!</div>
      <div className="lv-levels">
        Lv {from} <span className="lv-arrow">→</span> <b>Lv {to}</b>
      </div>
      <div className="lv-body">
        <div className="lv-hero">
          <AnimatedSprite frames={FIBER_KUN.idle} palette={PALETTE} scale={8} fps={3} paused={preview} />
        </div>
        <div className="lv-card pop-in">
          <div className="lv-card-tag">NEW SKILL</div>
          <div className="lv-card-name">
            {skill}
            {stamp && (
              <span className="lv-stamp" lang="ja">
                {stamp}
              </span>
            )}
          </div>
          {effect && <div className="lv-card-effect">{effect}</div>}
          <div className="lv-card-real">
            real name: <code>{real}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
