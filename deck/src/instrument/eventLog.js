// A small ring buffer of timeline events, shared through globalThis.
// The scheduler wrapper writes Scheduler events here; the demo writes its own
// marks (keystrokes, render attempts, commits). Using globalThis keeps one buffer
// even if a bundler ends up with two copies of this module.

const SIZE = 16384;

function create() {
  return { size: SIZE, buf: new Array(SIZE), n: 0, enabled: true };
}

export const eventLog = globalThis.__fiberEventLog || (globalThis.__fiberEventLog = create());

const now = () => performance.now();

export function record(type, data) {
  if (!eventLog.enabled) return;
  eventLog.buf[eventLog.n % SIZE] = { type, t: now(), ...data };
  eventLog.n++;
}

// Calls fn(event) for every event recorded after index `from`. Returns the new index.
export function readSince(from, fn) {
  const end = eventLog.n;
  const start = Math.max(from, end - SIZE);
  for (let i = start; i < end; i++) fn(eventLog.buf[i % SIZE]);
  return end;
}
