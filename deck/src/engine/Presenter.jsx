import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { slides } from '../slides/index.js';
import { Stage } from './Stage.jsx';
import { SlideView } from './SlideView.jsx';
import { fromHash, next } from './nav.js';
import { keyToAction } from './keys.js';
import { addPeer, listen, send } from './sync.js';
import '../styles/presenter.css';

const TALK_SECONDS = 30 * 60;

function fmt(totalSeconds) {
  const sign = totalSeconds < 0 ? '-' : '';
  const s = Math.abs(Math.round(totalSeconds));
  return `${sign}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function parseTime(mmss) {
  const [m, s] = String(mmss || '0:00').split(':').map(Number);
  return m * 60 + (s || 0);
}

// Splits notes into lines and tags each with the step it belongs to:
// lines before the first [CLICK] are step 0, the line with the k-th [CLICK] starts step k.
function notesByStep(notes) {
  let step = 0;
  return (notes || '').split('\n').map((text) => {
    if (text.includes('[CLICK]')) step++;
    return { text, step };
  });
}

function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Presenter() {
  const [pos, setPos] = useState(() => fromHash(slides));
  const [connected, setConnected] = useState(false);
  const [timer, setTimer] = useState({ running: false, startedAt: 0, banked: 0 });
  const now = useClock();

  useEffect(() => {
    if (window.opener) addPeer(window.opener);
    const stop = listen((msg) => {
      if (msg.type === 'state') {
        setConnected(true);
        setPos({ slide: msg.slide, step: msg.step });
      }
    });
    send({ type: 'hello' });
    return stop;
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 't' || e.key === 'T') {
        setTimer((t) =>
          t.running
            ? { running: false, startedAt: 0, banked: t.banked + (Date.now() - t.startedAt) }
            : { running: true, startedAt: Date.now(), banked: t.banked },
        );
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        setTimer({ running: false, startedAt: 0, banked: 0 });
        return;
      }
      const action = keyToAction(e);
      if (!action || action === 'presenter' || action === 'fullscreen' || action === 'blur') return;
      e.preventDefault();
      send({ type: 'nav', action });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const elapsed = (timer.banked + (timer.running ? now - timer.startedAt : 0)) / 1000;
  const slide = slides[pos.slide];
  const nextPos = next(slides, pos);
  const isLast = nextPos === pos;
  const target = parseTime(slide.time);
  const drift = elapsed - target; // > 0 means behind plan
  const nextSlide = slides[nextPos.slide];
  const notes = notesByStep(slide.notes);
  const notesRef = useRef(null);
  useLayoutEffect(() => {
    notesRef.current?.querySelector('.is-now')?.scrollIntoView({ block: 'center' });
  }, [pos.slide, pos.step]);

  return (
    <div className="presenter">
      <header className="p-bar">
        <div className={`p-timer ${timer.running ? '' : 'is-paused'}`} title="t: start/pause · r: reset">
          {fmt(elapsed)}
          <span className="p-small"> / {fmt(TALK_SECONDS)}</span>
        </div>
        <div className="p-remaining">left {fmt(TALK_SECONDS - elapsed)}</div>
        <div className={`p-drift ${elapsed === 0 ? '' : Math.abs(drift) < 20 ? 'ok' : drift > 0 ? 'behind' : 'ahead'}`}>
          plan {slide.time}
          {elapsed > 0 && (drift > 0 ? ` · ${fmt(drift)} behind` : ` · ${fmt(-drift)} ahead`)}
        </div>
        <div className="p-pos">
          slide {pos.slide + 1}/{slides.length} · step {pos.step}/{slide.steps}
        </div>
        <div className="p-clock">{new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div className={`p-link ${connected ? 'ok' : 'bad'}`}>{connected ? '● linked' : '○ not linked'}</div>
      </header>

      <main className="p-main">
        <section className="p-current">
          <div className="p-label">NOW · {slide.title}</div>
          <div className="p-frame p-frame-big">
            <Stage>
              <SlideView key={`cur-${slide.id}`} slide={slide} step={pos.step} preview />
            </Stage>
          </div>
        </section>
        <section className="p-side">
          <div className="p-label">
            NEXT · {isLast ? 'end' : nextPos.slide === pos.slide ? `same slide, step ${nextPos.step}` : nextSlide.title}
          </div>
          <div className="p-frame p-frame-small">
            {!isLast && (
              <Stage>
                <SlideView key={`next-${nextSlide.id}`} slide={nextSlide} step={nextPos.step} preview />
              </Stage>
            )}
          </div>
          <div className="p-label">NOTES</div>
          <div className="p-notes" ref={notesRef}>
            {notes.map((line, i) => (
              <p key={i} className={line.step === pos.step ? 'is-now' : line.step < pos.step ? 'is-past' : ''}>
                {line.text}
              </p>
            ))}
          </div>
        </section>
      </main>
      <footer className="p-help">
        → / PageDown next · ← / PageUp back · B black screen · T timer start/pause · R reset timer
      </footer>
    </div>
  );
}
