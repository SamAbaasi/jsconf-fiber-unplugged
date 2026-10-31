import { memo, useLayoutEffect } from 'react';
import { CELL_COUNT, NAMES, BASE_CLASS, HIT_CLASS } from './dragon.js';
import { burnCell } from './work.js';
import { record } from '../instrument/eventLog.js';

// One grid cell = one fiber, with a few µs of real work.
function Cell({ i, q }) {
  burnCell();
  const hit = q !== '' && NAMES[i].includes(q);
  return <i className={hit ? HIT_CLASS[i] : BASE_CLASS[i]} />;
}

// The dragon: 10,000 cells. It re-renders only when the query changes (memo).
// Each time its function runs, a render attempt has started; its layout effect means
// that attempt committed. `seq` = the keystroke this query came from.
export const DragonList = memo(function DragonList({ query, seq }) {
  record('render:attempt', { q: query, seq, task: globalThis.__fiberCurrentTask ?? null });
  useLayoutEffect(() => {
    record('render:commit', { q: query, seq });
  }, [query, seq]);

  const cells = new Array(CELL_COUNT);
  for (let i = 0; i < CELL_COUNT; i++) cells[i] = <Cell key={i} i={i} q={query} />;
  return <div className="dragon-grid">{cells}</div>;
});

// Commits together with the input's text. Its layout effect marks the moment the
// keystroke's text is in the DOM; the next animation frame is the first one that shows it.
export function TextProbe({ seq }) {
  useLayoutEffect(() => {
    if (seq > 0) record('text:commit', { seq });
  }, [seq]);
  return null;
}
