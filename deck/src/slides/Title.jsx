import { AnimatedSprite } from '../ui/Sprite.jsx';
import { Starfield } from '../ui/Starfield.jsx';
import { FIBER_KUN, PALETTE } from '../sprites/fiberkun.js';
import { SCALES } from '../sprites/scale.js';
import '../styles/title.css';

export function Title({ step }) {
  return (
    <div className="title-slide">
      <Starfield />
      <div className="title-ground" />
      <div className="title-tag">JSConf JP 2026 · Track A</div>

      <h1 className="title-ln" lang="ja">
        <span>「転生したら</span>
        <span>
          React<span className="title-no">の</span>Fiber
        </span>
        <span>だった件」</span>
      </h1>
      <div className="title-en">That Time I Got Reincarnated as a Fiber in React’s Render Loop</div>

      <div className="title-hero">
        {step >= 1 && (
          <div className="title-bubble pop-in" lang="ja">
            こんにちは!
          </div>
        )}
        <AnimatedSprite frames={FIBER_KUN.idle} palette={PALETTE} scale={SCALES.title} fps={2.5} />
        <div className="title-shadow" />
      </div>

      <footer className="title-band">
        <div className="title-official">React Fiber Unplugged: How the Internal Scheduler Shapes React</div>
        <div className="title-author">Saman Abbasi · 2026.11.22 · Tokyo</div>
      </footer>
    </div>
  );
}
