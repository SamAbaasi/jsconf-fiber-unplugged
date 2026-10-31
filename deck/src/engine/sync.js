// Messages between the audience window and the presenter window.
// Two transports, because neither works everywhere:
//   - postMessage to the opener / opened window (works from file://)
//   - BroadcastChannel (works when the presenter tab was opened by hand on http://)
// A message can arrive twice (once per transport), so each one carries an id.

const CHANNEL = 'fiber-unplugged-deck';
const sender = Math.random().toString(36).slice(2);
let counter = 0;

let channel = null;
try {
  channel = new BroadcastChannel(CHANNEL);
} catch {
  channel = null;
}

const peers = new Set();

export function addPeer(win) {
  if (win) peers.add(win);
}

export function send(msg) {
  const wrapped = { ...msg, __id: `${sender}:${counter++}`, __from: sender };
  try {
    channel?.postMessage(wrapped);
  } catch {}
  for (const win of peers) {
    if (win.closed) {
      peers.delete(win);
      continue;
    }
    try {
      win.postMessage({ __fiberDeck: wrapped }, '*');
    } catch {}
  }
}

export function listen(handler) {
  const seen = new Set();
  const deliver = (msg) => {
    if (!msg || msg.__from === sender || seen.has(msg.__id)) return;
    seen.add(msg.__id);
    if (seen.size > 200) seen.delete(seen.values().next().value);
    handler(msg);
  };
  const onChannel = (e) => deliver(e.data);
  const onWindow = (e) => {
    if (e.data && e.data.__fiberDeck) {
      if (e.source) peers.add(e.source);
      deliver(e.data.__fiberDeck);
    }
  };
  channel?.addEventListener('message', onChannel);
  window.addEventListener('message', onWindow);
  return () => {
    channel?.removeEventListener('message', onChannel);
    window.removeEventListener('message', onWindow);
  };
}
