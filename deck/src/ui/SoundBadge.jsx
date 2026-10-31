import { useEffect, useState } from 'react';

// Shows the sound state for 2.5 s after it changes. While sound is on, a small
// note stays in the corner so the speaker can see it from the stage.
export function SoundBadge({ on }) {
  const [flash, setFlash] = useState(false);
  const [first, setFirst] = useState(true);
  useEffect(() => {
    if (first) {
      setFirst(false);
      return;
    }
    setFlash(true);
    const id = setTimeout(() => setFlash(false), 2500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  if (flash) return <div className="sound-badge is-flash">{on ? '♪ SOUND ON' : '♪ SOUND OFF'}</div>;
  if (on) return <div className="sound-badge">♪</div>;
  return null;
}
