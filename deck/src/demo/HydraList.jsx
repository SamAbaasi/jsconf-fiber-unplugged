import { memo, useLayoutEffect } from 'react';
import { CELL_COUNT, NAMES, BASE_CLASS, HIT_CLASS } from './hydra.js';
import { burnCell } from './work.js';
import { record } from '../instrument/eventLog.js';

// One grid cell = one fiber, with about 12 µs of real work.
function Cell({ i, q }) {
  burnCell();
  const hit = q !== '' && NAMES[i].includes(q);
  return <i className={hit ? HIT_CLASS[i] : BASE_CLASS[i]} />;
}

// The list re-renders only when `query` changes (memo). Each time its function
// runs, a render attempt has started; its layout effect means that attempt committed.
// If a new attempt starts before the last one committed, React threw the last one away.
export const HydraList = memo(function HydraList({ query }) {
  record('render:attempt', { q: query, task: globalThis.__fiberCurrentTask ?? null });
  useLayoutEffect(() => {
    record('render:commit', { q: query });
  }, [query]);

  const cells = new Array(CELL_COUNT);
  for (let i = 0; i < CELL_COUNT; i++) cells[i] = <Cell key={i} i={i} q={query} />;
  return <div className="hydra-grid">{cells}</div>;
});
