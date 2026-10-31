import { useLayoutEffect, useRef, useState } from 'react';

export const STAGE_W = 1920;
export const STAGE_H = 1080;

// A fixed 1920×1080 surface, scaled to fit its parent and centered (letterboxed).
export function Stage({ children, blank = false, className = '' }) {
  const hostRef = useRef(null);
  const [box, setBox] = useState({ w: STAGE_W, h: STAGE_H });

  useLayoutEffect(() => {
    const host = hostRef.current;
    const measure = () => setBox({ w: host.clientWidth, h: host.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const scale = Math.min(box.w / STAGE_W, box.h / STAGE_H) || 1;
  const x = (box.w - STAGE_W * scale) / 2;
  const y = (box.h - STAGE_H * scale) / 2;

  return (
    <div className="stage-host" ref={hostRef}>
      <div
        className={`stage ${blank ? 'is-blank' : ''} ${className}`}
        style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
