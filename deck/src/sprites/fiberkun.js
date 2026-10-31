// Fiber-kun: an original 16×16 pixel character, drawn as code for this talk.
// A small fiber "node" with a thread (the fiber strand) on its head and a hero headband.
// One character per pixel; "." is transparent.

export const PALETTE = {
  k: '#120c2c', // outline, pupils
  b: '#2ec4b6', // body
  d: '#1a8f86', // body shade
  l: '#9af5ea', // highlight
  w: '#ffffff', // eye white
  h: '#ff5d73', // headband
  H: '#b8344b', // headband tail
  y: '#ffd166', // thread
  o: '#ff9f1c', // thread tip (a tiny node)
  p: '#ff9fb2', // cheeks
  f: '#3b2a6b', // feet
};

const BODY = [
  '..........oo....',
  '..........oo....',
  '.........y......',
  '.....kkkkykk....',
  '....kllbbbbbkk..',
  '...klbbbbbbbbbk.',
  '..khhhhhhhhhhhHk',
  '..kbbbbbbbbbbbkH',
  '..kbwwkbbbwwkbk.',
  '..kbwwkbbbwwkbk.',
  '..kbpbbbkkbbpbk.',
  '..kdbbbbbbbbbdk.',
  '...kdbbbbbbbddk.',
  '....kddddddddk..',
];

const FEET = {
  stand: ['....kfk...kfk...', '....kkk...kkk...'],
  stepA: ['...kfk.....kfk..', '...kkk.....kkk..'],
  stepB: ['.....kfk.kfk....', '.....kkk.kkk....'],
  sit: ['...kffk..kffk...', '................'],
};

const EYES_CLOSED = ['..kbbbbbbbbbbbk.', '..kbkkkbbbkkkbk.'];

function wiggleThread(rows) {
  const out = rows.slice();
  out[0] = '.........oo.....';
  out[1] = '.........oo.....';
  out[2] = '..........y.....';
  return out;
}

function squash(rows) {
  // Push the head down one pixel and drop the bottom shade row: a small "bob".
  return ['................', ...rows.slice(0, 13)];
}

const idle0 = [...BODY, ...FEET.stand];
const idle1 = [...squash(wiggleThread(BODY)), ...FEET.stand];
const walk0 = [...BODY, ...FEET.stepA];
const walk1 = [...squash(wiggleThread(BODY)), ...FEET.stepB];
const restBody = BODY.slice();
restBody.splice(8, 2, ...EYES_CLOSED);
const rest = [...squash(restBody), ...FEET.sit];

export const FIBER_KUN = { idle: [idle0, idle1], walk: [walk0, walk1], rest: [rest] };

for (const [name, frames] of Object.entries(FIBER_KUN)) {
  for (const f of frames) {
    if (f.length !== 16 || f.some((r) => r.length !== 16)) throw new Error(`Fiber-kun frame "${name}" is not 16×16`);
  }
}
