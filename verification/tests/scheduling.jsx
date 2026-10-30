import { useState, useEffect, useTransition, useDeferredValue, startTransition, memo } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
const L = []; const log = (s) => L.push(s);
const busy = (ms) => { const e = performance.now() + ms; while (performance.now() < e); };
const tick = () => new Promise(r => setTimeout(r, 0));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const slog = globalThis.__schedLog;
const results = {};

// ---------- Test 1: lanes → sync / sliced ----------
let setN1, rowRenders = 0;
function Row({ i }) { rowRenders++; busy(0.02); return <li>{i}</li>; }
function List1() {
  const [n, setN] = useState(0); setN1 = setN;
  const rows = []; for (let i = 0; i < (n ? 2000 : 1); i++) rows.push(<Row key={i} i={i + n} />);
  return <ul>{rows}</ul>;
}
async function test1() {
  const c = document.createElement('div'); document.body.appendChild(c);
  const root = createRoot(c); flushSync(() => root.render(<List1 />)); await sleep(20);
  const run = async (label, fn) => {
    slog.length = 0; rowRenders = 0;
    fn(); await sleep(400);
    const yields = slog.filter(e => e.ev === 'yield').length;
    const sched = slog.filter(e => e.ev === 'schedule').map(e => e.pri);
    const runs = slog.filter(e => e.ev === 'run').map(e => e.t);
    const ends = slog.filter(e => e.ev === 'yield' || e.ev === 'end').map(e => e.t);
    const durs = runs.map((t, i) => +(ends[i] - t).toFixed(1));
    results[label] = { schedulerTasks: sched, continuations: yields, sliceDurationsMs: durs.slice(0, 6), maxSliceMs: Math.max(0, ...durs), rowRenders };
  };
  // A: discrete (click) → SyncLane
  const btn = document.createElement('button'); document.body.appendChild(btn);
  btn.onclick = null;
  await run('A_click_setState', () => { btn.addEventListener('click', () => setN1(1), {once: true}); btn.click(); });
  flushSync(() => setN1(0)); await sleep(20);
  // B: default lane (setTimeout, no event)
  await run('B_default_setTimeout', () => setTimeout(() => setN1(2), 0));
  flushSync(() => setN1(0)); await sleep(20);
  // C: transition
  await run('C_startTransition', () => startTransition(() => setN1(3)));
  flushSync(() => setN1(0)); await sleep(20);
  // D: continuous (mousemove event)
  await run('D_mousemove', () => { btn.addEventListener('mousemove', () => setN1(4), {once: true}); btn.dispatchEvent(new MouseEvent('mousemove', {bubbles: true})); });
  root.unmount();
}

// ---------- Test 2: interrupt & restart ----------
let setQ2, setU2, rowsByQ = {};
function Row2({ q, i }) { rowsByQ[q] = (rowsByQ[q] || 0) + 1; busy(0.02); return <li>{q}{i}</li>; }
function App2() {
  const [q, setQ] = useState('x'); const [u, setU] = useState(0); setQ2 = setQ; setU2 = setU;
  const rows = []; if (q !== 'x') for (let i = 0; i < 1500; i++) rows.push(<Row2 key={i} q={q} i={i} />);
  return <div><b>{u}</b><ul>{rows}</ul></div>;
}
async function test2() {
  const c = document.createElement('div'); document.body.appendChild(c);
  const root = createRoot(c); flushSync(() => root.render(<App2 />)); await sleep(20);
  // 2a: pure yield, no interruption
  rowsByQ = {}; startTransition(() => setQ2('a')); await sleep(400);
  results.T2a_transition_no_interrupt = { rowsRenderedFor_a: rowsByQ.a, expected: 1500 };
  // 2b: click (SyncLane, different state) arrives mid-transition
  rowsByQ = {}; slog.length = 0;
  startTransition(() => setQ2('b'));
  await new Promise(r => { const iv = setInterval(() => { if ((rowsByQ.b||0) > 200) { clearInterval(iv); r(); } }, 0); });
  const before = rowsByQ.b;
  const btn = document.createElement('button'); document.body.appendChild(btn);
  btn.addEventListener('click', () => setU2(u => u + 1), {once: true}); btn.click();
  await sleep(500);
  results.T2b_click_interrupts_transition = { rowsRenderedBeforeClick: before, totalRowsRenderedFor_b: rowsByQ.b, restarted: rowsByQ.b > 1500 };
  // 2c: Default-lane update (setTimeout) arrives mid-transition
  rowsByQ = {};
  startTransition(() => setQ2('c'));
  await new Promise(r => { const iv = setInterval(() => { if ((rowsByQ.c||0) > 200) { clearInterval(iv); r(); } }, 0); });
  const before2 = rowsByQ.c;
  setU2(u => u + 1); // called from a timer → DefaultLane
  await sleep(500);
  // 3000 = transition finished (1500) + Default re-render of rows (1500). An interrupt would give ~1500+rowsRenderedBefore.
  // See interrupt-order.jsx for the commit order, which settles it.
  results.T2c_default_update_mid_transition = { rowsRenderedBefore: before2, totalRowsRenderedFor_c: rowsByQ.c, interruptedTransition: rowsByQ.c === 1500 + before2 };
  root.unmount();
}

// ---------- Test 3: startTransition callback is synchronous ----------
function test3() {
  const order = [];
  order.push('before'); startTransition(() => { order.push('inside callback'); }); order.push('after');
  results.T3_startTransition_callback_sync = order.join(' → ');
}

// ---------- Test 4: passive effect timing ----------
let setE;
function Eff() { const [v, setV] = useState(0); setE = setV; useEffect(() => { if (v) L4.push('effect v=' + v); }, [v]); return <i>{v}</i>; }
const L4 = [];
async function test4() {
  const c = document.createElement('div'); document.body.appendChild(c);
  const root = createRoot(c); flushSync(() => root.render(<Eff />)); await sleep(20);
  const btn = document.createElement('button'); document.body.appendChild(btn);
  // click
  L4.length = 0;
  btn.addEventListener('click', () => { setE(1); queueMicrotask(() => L4.push('my microtask (queued after setState)')); setTimeout(() => L4.push('my setTimeout 0'), 0); }, {once: true});
  btn.click(); await sleep(50);
  results.T4a_click = L4.slice();
  // transition
  L4.length = 0;
  btn.addEventListener('click', () => { startTransition(() => setE(2)); queueMicrotask(() => L4.push('my microtask')); setTimeout(() => L4.push('my setTimeout 0'), 0); }, {once: true});
  btn.click(); await sleep(50);
  results.T4b_click_with_transition = L4.slice();
  // default (timer)
  L4.length = 0;
  setTimeout(() => { setE(3); queueMicrotask(() => L4.push('my microtask')); setTimeout(() => L4.push('my setTimeout 0'), 0); }, 0);
  await sleep(50);
  results.T4c_default_timer = L4.slice();
  root.unmount();
}

// ---------- Test 5: childLanes bailout ----------
const ran = [];
let clickCart;
function CartIcon() { ran.push('CartIcon'); const [c, setC] = useState(0); clickCart = () => setC(x => x + 1); return <span>{c}</span>; }
function Header() { ran.push('Header'); return <header><CartIcon /></header>; }
function Results() { ran.push('Results'); return <main />; }
function Page() { ran.push('Page'); return <div><Header /><Results /></div>; }
async function test5() {
  const c = document.createElement('div'); document.body.appendChild(c);
  const root = createRoot(c); flushSync(() => root.render(<Page />)); await sleep(20);
  ran.length = 0;
  const btn = document.createElement('button'); document.body.appendChild(btn);
  btn.addEventListener('click', () => clickCart(), {once: true}); btn.click(); await sleep(20);
  results.T5_functions_run_on_cart_click = ran.slice();
  root.unmount();
}

// ---------- Test 6: useDeferredValue ----------
const dv = []; let setT6;
function DV() { const [t, setT] = useState('a'); setT6 = setT; const d = useDeferredValue(t); dv.push(`t=${t} deferred=${d}`); return null; }
let setT6b;
function DVinit() { const [t, setT] = useState('a'); setT6b = setT; const d = useDeferredValue(t, 'INITIAL'); dv.push(`mount/update: t=${t} deferred=${d}`); return null; }
async function test6() {
  const c = document.createElement('div'); document.body.appendChild(c);
  const root = createRoot(c); flushSync(() => root.render(<DV />)); await sleep(20);
  dv.length = 0;
  const btn = document.createElement('button'); document.body.appendChild(btn);
  btn.addEventListener('click', () => setT6('b'), {once: true}); btn.click(); await sleep(50);
  results.T6a_urgent_update = dv.slice();
  dv.length = 0; startTransition(() => setT6('c')); await sleep(50);
  results.T6b_update_inside_transition = dv.slice();
  root.unmount();
  dv.length = 0;
  const c2 = document.createElement('div'); document.body.appendChild(c2);
  const root2 = createRoot(c2); root2.render(<DVinit />); await sleep(50);
  results.T6c_initialValue_on_mount = dv.slice();
  root2.unmount();
}

// ---------- Test 7: memo with no props ----------
const ran7 = []; let bump7;
const MemoList = memo(function ResultList() { ran7.push('ResultList'); return null; });
function Search() { const [q, setQ] = useState(0); bump7 = () => setQ(x => x + 1); ran7.push('Search'); return <div><MemoList /></div>; }
async function test7() {
  const c = document.createElement('div'); document.body.appendChild(c);
  const root = createRoot(c); flushSync(() => root.render(<Search />)); await sleep(20);
  ran7.length = 0; flushSync(() => bump7());
  results.T7_memo_noProps_child = ran7.slice();
  root.unmount();
}

(async () => {
  await test1(); await test2(); test3(); await test4(); await test5(); await test6(); await test7();
  window.__r = results; document.title = 'done';
})().catch(e => { window.__r = { error: String(e && e.stack || e) }; document.title = 'done'; });
