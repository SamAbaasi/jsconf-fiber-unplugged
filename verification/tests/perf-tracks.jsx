import { useState, startTransition } from 'react';
import { createRoot } from 'react-dom/client';
const seen = {};
console.timeStamp = function (label, s, e, track, group) { const k = `${group || '-'} / ${track || '-'}`; seen[k] = (seen[k] || 0) + 1; };
let set; function A() { const [v, s] = useState(0); set = s; return <p>{v}</p>; }
const root = createRoot(document.body.appendChild(document.createElement('div')));
root.render(<A />);
setTimeout(() => { const b = document.body.appendChild(document.createElement('button')); b.onclick = () => set(1); b.click();
  setTimeout(() => { startTransition(() => set(2));
    setTimeout(() => { window.__r = seen; document.title = 'done'; }, 200); }, 50); }, 50);
