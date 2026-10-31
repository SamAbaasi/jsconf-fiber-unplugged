import { memo, useLayoutEffect } from 'react';
import { burnCell } from './work.js';
import { record } from '../instrument/eventLog.js';

// One grid cell = one fiber, with a few µs of real work.
function Cell({ i, q, d }) {
  burnCell();
  const hit = q !== '' && d.names[i].includes(q);
  return <i className={hit ? d.hitClass[i] : d.baseClass[i]} />;
}

// The last child of the grid. When it renders, the render phase has reached the end of the
// list; the time from here to the layout effect below is (mostly) the commit. Used only to
// split a long frame into render / commit (Phase 3a, section 7). It renders nothing.
function RenderTail({ q, seq }) {
  record('render:tail', { q, seq });
  return null;
}

// The dragon: one cell per fiber (dragon.cells of them). It re-renders only when the query
// or the cell count changes (memo). Each time its function runs, a render attempt has started;
// its layout effect means that attempt committed. `seq` = the keystroke this query came from.
export const DragonList = memo(function DragonList({ dragon, query, seq }) {
  record('render:attempt', { q: query, seq, task: globalThis.__fiberCurrentTask ?? null });
  useLayoutEffect(() => {
    record('render:commit', { q: query, seq, cells: dragon.cells });
  }, [query, seq, dragon]);

  const n = dragon.cells;
  const cells = new Array(n + 1);
  for (let i = 0; i < n; i++) cells[i] = <Cell key={i} i={i} q={query} d={dragon} />;
  cells[n] = <RenderTail key="tail" q={query} seq={seq} />;
  return (
    <div className="dragon-grid" style={{ gridTemplateColumns: `repeat(${dragon.cols}, 4px)`, width: dragon.cols * 4, height: dragon.rows * 4 }}>
      {cells}
    </div>
  );
});

// Commits together with the input's text. Its layout effect marks the moment the
// keystroke's text is in the DOM; the next animation frame is the first one that shows it.
export function TextProbe({ seq }) {
  useLayoutEffect(() => {
    if (seq > 0) record('text:commit', { seq });
  }, [seq]);
  return null;
}
