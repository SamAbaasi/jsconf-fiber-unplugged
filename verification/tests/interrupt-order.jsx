import { useState, useLayoutEffect, startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
const busy = (ms) => { const e = performance.now() + ms; while (performance.now() < e); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let setQ, setU, n = 0; const commits = [];
function Row({ q }) { n++; busy(0.02); return <li>{q}</li>; }
function App() {
  const [q, sQ] = useState('x'); const [u, sU] = useState(0); setQ = sQ; setU = sU;
  useLayoutEffect(() => { commits.push(`commit q=${q} u=${u} (rowRenders so far=${n})`); });
  const rows = []; if (q !== 'x') for (let i = 0; i < 1500; i++) rows.push(<Row key={i} q={q} />);
  return <ul>{rows}</ul>;
}
const out = {};
(async () => {
  const c = document.createElement('div'); document.body.appendChild(c);
  const root = createRoot(c); flushSync(() => root.render(<App />)); await sleep(20);
  for (const [label, fire] of [
    ['default_update_mid_transition', () => setTimeout(() => setU(u => u + 1), 0)],
    ['click_mid_transition', () => { const b = document.createElement('button'); b.onclick = () => setU(u => u + 1); b.click(); }],
  ]) {
    commits.length = 0; n = 0;
    flushSync(() => setQ('x')); commits.length = 0; n = 0;
    startTransition(() => setQ(label));
    await new Promise(r => { const iv = setInterval(() => { if (n > 200) { clearInterval(iv); r(); } }, 0); });
    commits.push(`-- fire at rowRenders=${n}`); fire();
    await sleep(600); out[label] = commits.slice();
  }
  window.__r = out; document.title = 'done';
})();
