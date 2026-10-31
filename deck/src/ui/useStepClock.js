import { useEffect, useState } from 'react';

// Milliseconds since `step` last changed, ticking with rAF until `duration`.
// In a preview, it jumps straight to the end so the presenter sees the end state.
export function useStepClock(step, duration, preview = false) {
  const [elapsed, setElapsed] = useState(preview ? duration : 0);
  useEffect(() => {
    if (preview || duration <= 0) {
      setElapsed(duration);
      return;
    }
    setElapsed(0);
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const e = Math.min(duration, now - start);
      setElapsed(e);
      if (e < duration) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [step, duration, preview]);
  return elapsed;
}
