import { useCallback, useEffect, useRef, useState } from 'react';
import { slides } from '../slides/index.js';
import { Stage } from './Stage.jsx';
import { SlideView } from './SlideView.jsx';
import { clamp, fromHash, next, prev, samePos, toHash } from './nav.js';
import { keyToAction } from './keys.js';
import { addPeer, listen, send } from './sync.js';
import { interceptNext } from './interceptors.js';
import { isSoundOn, onSoundChange, toggleSound } from '../audio/sfx.js';
import { SoundBadge } from '../ui/SoundBadge.jsx';

export function Deck() {
  const [pos, setPos] = useState(() => fromHash(slides));
  const [blank, setBlank] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [sound, setSound] = useState(isSoundOn);
  useEffect(() => onSoundChange(setSound), []);
  const posRef = useRef(pos);
  posRef.current = pos;

  const act = useCallback((action, payload) => {
    switch (action) {
      case 'next':
        setBlank(false);
        if (interceptNext()) break;
        setPos((p) => next(slides, p));
        break;
      case 'sound':
        toggleSound();
        break;
      case 'prev':
        setBlank(false);
        setPos((p) => prev(slides, p));
        break;
      case 'first':
        setPos({ slide: 0, step: 0 });
        break;
      case 'last':
        setPos({ slide: slides.length - 1, step: slides[slides.length - 1].steps });
        break;
      case 'goto':
        setPos(clamp(slides, payload));
        break;
      case 'blank':
        setBlank((b) => !b);
        break;
      case 'blur':
        document.activeElement?.blur?.();
        break;
      case 'fullscreen':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
        break;
      case 'presenter': {
        const url = `${location.href.split('#')[0].split('?')[0]}?view=presenter${toHash(posRef.current)}`;
        addPeer(window.open(url, 'fiber-unplugged-presenter', 'width=1500,height=900'));
        break;
      }
      default:
        break;
    }
  }, []);

  // Keyboard and clicker.
  useEffect(() => {
    const onKey = (e) => {
      const action = keyToAction(e);
      if (!action) return;
      e.preventDefault();
      act(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act]);

  // Keep the URL hash and the presenter window in step with the deck.
  useEffect(() => {
    const hash = toHash(pos);
    if (location.hash !== hash) history.replaceState(null, '', hash);
    send({ type: 'state', ...pos, blank, sound });
  }, [pos, blank, sound]);

  useEffect(() => {
    const onHash = () => {
      const p = fromHash(slides);
      if (!samePos(p, posRef.current)) setPos(p);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(
    () =>
      listen((msg) => {
        if (msg.type === 'nav') act(msg.action, msg);
        if (msg.type === 'hello') send({ type: 'state', ...posRef.current, blank: false, sound: isSoundOn() });
      }),
    [act],
  );

  // Hide the mouse pointer after 2 s without movement.
  useEffect(() => {
    let timer = 0;
    const onMove = () => {
      setCursorHidden(false);
      clearTimeout(timer);
      timer = setTimeout(() => setCursorHidden(true), 2000);
    };
    window.addEventListener('mousemove', onMove);
    onMove();
    return () => {
      window.removeEventListener('mousemove', onMove);
      clearTimeout(timer);
    };
  }, []);

  const slide = slides[pos.slide];
  return (
    <div className={cursorHidden ? 'hide-cursor' : ''} style={{ height: '100%' }}>
      <Stage blank={blank}>
        <SlideView key={slide.id} slide={slide} step={pos.step} />
        <SoundBadge on={sound} />
      </Stage>
    </div>
  );
}
