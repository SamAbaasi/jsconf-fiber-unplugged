import { useEffect } from 'react';
import { play } from './sfx.js';

// Plays a sound when a slide reaches a given step: useStepSound(step, { 4: 'unlock' }).
export function useStepSound(step, map, preview = false) {
  useEffect(() => {
    if (!preview && map[step]) play(map[step]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, preview]);
}
