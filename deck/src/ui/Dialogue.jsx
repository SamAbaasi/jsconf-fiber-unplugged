import { useEffect, useRef, useState } from 'react';
import { Sprite } from './Sprite.jsx';
import { FACES, PALETTE } from '../sprites/fiberkun.js';
import { setNextInterceptor } from '../engine/interceptors.js';
import { play } from '../audio/sfx.js';
import '../styles/dialogue.css';

const MS_PER_CHAR = { en: 28, ja: 90 };

// JRPG dialogue box: portrait, name plate, typewriter text.
// While a line is still typing, a click (next) finishes the line instead of moving on.
export function Dialogue({ line, vars, preview = false, className = '' }) {
  const text = fill(line.text, vars);
  const [shown, setShown] = useState(preview ? text.length : 0);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    if (preview) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const per = MS_PER_CHAR[line.lang === 'ja' ? 'ja' : 'en'];
    const start = performance.now();
    const id = setInterval(() => {
      const n = Math.min(text.length, Math.floor((performance.now() - start) / per) + 1);
      if (n !== shownRef.current && n % 2 === 0) play('blip');
      setShown(n);
      if (n >= text.length) clearInterval(id);
    }, per);
    const release = setNextInterceptor(() => {
      if (shownRef.current >= text.length) return false;
      clearInterval(id);
      setShown(text.length);
      return true;
    });
    return () => {
      clearInterval(id);
      release();
    };
  }, [text, line.lang, preview]);

  const done = shown >= text.length;
  return (
    <div className={`dlg ${line.face ? '' : 'no-face'} ${className}`}>
      {line.face && (
        <div className="dlg-face">
          <Sprite frame={FACES[line.face]} palette={PALETTE} scale={11} />
          {line.face === 'sleeping' && <span className="dlg-z">z z</span>}
        </div>
      )}
      <div className="dlg-name">{line.speaker}</div>
      <div className="dlg-body">
        <div className="dlg-text" lang={line.lang || 'en'}>
          {text.slice(0, shown)}
          <span className="dlg-ghost">{text.slice(shown)}</span>
        </div>
        {line.sub && done && <div className="dlg-sub">{line.sub}</div>}
      </div>
      {done && <div className="dlg-more blink">▼</div>}
    </div>
  );
}

export function fill(text, vars = {}) {
  return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}
