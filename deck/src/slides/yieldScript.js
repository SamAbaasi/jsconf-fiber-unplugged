// The Yield animation as data. The order of units comes from simulating React's
// real loop on a small tree: performUnitOfWork begins a fiber; if it has a child,
// that child is next; otherwise completeUnitOfWork completes fibers upward until it
// finds a sibling (ReactFiberWorkLoop.js#L3081 and #L3368 at v19.3.1).

export const TREE = {
  name: 'App',
  children: [
    { name: 'Header', children: [{ name: 'Logo' }, { name: 'Nav' }, { name: 'CartIcon', children: [{ name: 'Badge' }] }] },
    { name: 'Results', children: [{ name: 'Row 1' }, { name: 'Row 2' }, { name: 'Row 3' }, { name: 'Row 4' }] },
    { name: 'Footer' },
  ],
};

// Box centers in a 1760×500 SVG. Boxes are 196×64 (rows 160×64).
export const POS = {
  App: [833, 44],
  Header: [352, 180],
  Results: [1092, 180],
  Footer: [1565, 180],
  Logo: [122, 316],
  Nav: [352, 316],
  CartIcon: [582, 316],
  Badge: [582, 450],
  'Row 1': [814, 316],
  'Row 2': [999, 316],
  'Row 3': [1184, 316],
  'Row 4': [1369, 316],
};

function link(node, parent) {
  node.parent = parent;
  (node.children || []).forEach((c, i, all) => {
    c.sibling = all[i + 1] || null;
    link(c, node);
  });
}
link(TREE, null);

export const EDGES = [];
(function collect(node) {
  for (const c of node.children || []) {
    EDGES.push([node.name, c.name]);
    collect(c);
  }
})(TREE);

// units[i] = { begin, completes: [...], next }
export const UNITS = [];
{
  let wip = TREE;
  while (wip) {
    const unit = { begin: wip.name, completes: [], next: null };
    if (wip.children && wip.children.length) {
      wip = wip.children[0];
    } else {
      let n = wip;
      wip = null;
      while (n) {
        unit.completes.push(n.name);
        if (n.sibling) {
          wip = n.sibling;
          break;
        }
        n = n.parent;
      }
    }
    unit.next = wip ? wip.name : null;
    UNITS.push(unit);
  }
}

export const SLICE_MS = 5;
export const UNIT_COST_MS = 1.25; // diagram value: 4 fibers fill one 5 ms slice
const U = 750;
const unit = (i) => ({ type: 'unit', i, d: U });

// `narr` = which line from content/lines.js the dialogue box shows from that phase on.
const withNarr = (phase, narr) => ({ ...phase, narr });

export const STEP_PHASES = {
  2: [withNarr(unit(0), 'yWalk'), unit(1), unit(2), unit(3), { type: 'yield', d: 1400, narr: 'yStop' }],
  3: [
    { type: 'browser', label: 'paint', d: 900, narr: 'yBrowser' },
    { type: 'browser', label: 'other tasks', d: 900 },
    { type: 'message', d: 1400, narr: 'yResume' },
  ],
  4: [unit(4), unit(5), unit(6), unit(7), { type: 'yield', d: 1400, narr: 'yStop' }],
  5: [
    { type: 'browser', label: 'paint', d: 700, narr: 'yBrowser' },
    { type: 'message', d: 900, narr: 'yResume' },
    unit(8),
    unit(9),
    unit(10),
    unit(11),
    { type: 'done', d: 600, narr: 'yCommit' },
    { type: 'commit', d: 1000 },
    { type: 'browser', label: 'paint', d: 600 },
  ],
};

export function stepDuration(step) {
  return (STEP_PHASES[step] || []).reduce((s, p) => s + p.d, 0);
}

function initial() {
  return {
    wip: 'App',
    begun: new Set(),
    completed: new Set(),
    used: 0,
    shouldYield: false,
    segs: [],
    pose: 'idle',
    fkAt: 'App',
    fkFrom: 'App',
    fkT: 1,
    msg: '',
    message: false,
    committed: false,
    commitFlash: 0,
    narr: null, // { key, wip } — wip is captured when the line starts
  };
}

function apply(s, phase, f) {
  switch (phase.type) {
    case 'unit': {
      const u = UNITS[phase.i];
      if (!s.begun.has(u.begin)) {
        s.fkFrom = s.fkAt;
        s.begun.add(u.begin);
        const last = s.segs[s.segs.length - 1];
        if (!last || last.kind !== 'react' || last.closed) s.segs.push({ kind: 'react', ms: 0 });
      }
      s.wip = u.begin;
      s.fkAt = u.begin;
      s.fkT = Math.min(1, f / 0.35);
      s.pose = f < 0.35 ? 'walk' : 'idle';
      s.shouldYield = false;
      s.message = false;
      s.used += UNIT_COST_MS * f;
      s.segs[s.segs.length - 1].ms += UNIT_COST_MS * f;
      s.msg = `performUnitOfWork(${u.begin})`;
      if (f >= 0.65) {
        for (const c of u.completes) s.completed.add(c);
        s.wip = u.next;
        if (u.completes.length) s.msg = `complete: ${u.completes.join(' → ')}`;
      }
      break;
    }
    case 'yield':
      s.shouldYield = true;
      // Fiber-kun walks to the next fiber (workInProgress) and waits there.
      if (s.wip && s.fkAt !== s.wip) {
        s.fkFrom = s.fkAt;
        s.fkAt = s.wip;
      }
      s.fkT = Math.min(1, f / 0.4);
      s.pose = f < 0.4 ? 'walk' : 'rest';
      s.segs[s.segs.length - 1].closed = true;
      s.msg = `5 ms used → shouldYield() is true → stop. workInProgress stays on ${s.wip}.`;
      break;
    case 'browser': {
      const last = s.segs[s.segs.length - 1];
      if (!last || last.kind !== 'browser' || last.label !== phase.label || last.done) {
        if (last && last.kind === 'react') last.closed = true;
        s.segs.push({ kind: 'browser', label: phase.label, grow: 0 });
      }
      s.segs[s.segs.length - 1].grow = f;
      if (f >= 1) s.segs[s.segs.length - 1].done = true;
      s.pose = s.committed ? 'idle' : 'rest';
      s.msg = s.committed ? 'The browser paints the new UI.' : `The browser's turn: ${phase.label}. React waits.`;
      break;
    }
    case 'message':
      s.message = true;
      s.shouldYield = false;
      s.used = s.used * (1 - f);
      s.msg = `MessageChannel message → a new task → next slice. Continue from ${s.wip}.`;
      if (f >= 1) s.used = 0;
      break;
    case 'done':
      s.pose = 'idle';
      s.wip = null;
      s.segs[s.segs.length - 1].closed = true;
      s.msg = 'workInProgress is null → the render is finished.';
      break;
    case 'commit': {
      const last = s.segs[s.segs.length - 1];
      if (!last || last.kind !== 'commit') s.segs.push({ kind: 'commit', grow: 0 });
      s.segs[s.segs.length - 1].grow = f;
      s.committed = true;
      s.commitFlash = f;
      s.msg = 'Commit: write to the DOM. This part never yields.';
      break;
    }
    default:
      break;
  }
}

// State of the animation at `elapsed` ms into `step`.
export function stateAt(step, elapsed) {
  const s = initial();
  for (let k = 2; k <= Math.min(step, 5); k++) {
    let t = k < step ? Infinity : elapsed;
    for (const phase of STEP_PHASES[k]) {
      if (t <= 0) break;
      const f = Math.min(1, t / phase.d);
      if (phase.narr) s.narr = { key: phase.narr, wip: s.wip };
      apply(s, phase, f);
      t -= phase.d;
    }
  }
  return s;
}
