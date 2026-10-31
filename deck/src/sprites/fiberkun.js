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
  r: '#c23a50', // necktie (previous life)
  c: '#8a5a2b', // briefcase
  C: '#5c3a1a', // briefcase shade
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

// Portrait faces for the dialogue box. Only the eye and mouth rows change.
function face(rows) {
  const out = BODY.slice();
  out.splice(8, rows.length, ...rows);
  return [...out, ...FEET.stand];
}
const shocked = face([
  '..kbwwwbbbwwwbk.',
  '..kbwkwbbbwkwbk.',
  '..kbpbbkkkbbpbk.',
  '..kdbbbkkkbbbdk.',
]);
const smug = face([
  '..kbkkkbbbkkkbk.',
  '..kbwwkbbbwwkbk.',
  '..kbpbbbbbbkkbk.',
  '..kdbbbkkkkbbdk.',
]);
const sleeping = face(['..kbbbbbbbbbbbk.', '..kbkkkbbbkkkbk.']);

export const FIBER_KUN = { idle: [idle0, idle1], walk: [walk0, walk1], rest: [rest] };

export const FACES = { normal: idle0, shocked, smug, sleeping };

// Previous life: the same character as a tired salaryman. No headband yet, tired eyes
// with dark bags, a white collar and a necktie.
function setRow(rows, y, from, chars) {
  rows[y] = rows[y].slice(0, from) + chars + rows[y].slice(from + chars.length);
}
const office = BODY.slice();
office[6] = '..kbbbbbbbbbbbk.';
office[7] = '..kbbbbbbbbbbbk.';
office[8] = '..kbkkkbbbkkkbk.';
office[9] = '..kbwwkbbbwwkbk.';
office[10] = '..kbddbbbbbddbk.';
office[11] = '..kdbbbbbbbbbdk.'; // no mouth: so the tie below reads as a tie
office[12] = '...kdbbrrrbbddk.';
office[13] = '....kdddrddddk..';
const OFFICE_FEET = ['....kfkrk.kfk...', '....kkkkk.kkk...'];
export const SALARYMAN = [[...office, ...OFFICE_FEET], [...squash(office), ...OFFICE_FEET]];
// A briefcase, held next to him.
export const BRIEFCASE = [
  '..kkkk..',
  '..k..k..',
  'kkkkkkkk',
  'kccccccK',
  'kcCyycck',
  'kcccccck',
  'kCCCCCCk',
  'kkkkkkkk',
].map((r) => r.replace(/K/g, 'k'));

for (const [name, frames] of Object.entries({ ...FIBER_KUN, faces: Object.values(FACES), salaryman: SALARYMAN })) {
  for (const f of frames) {
    if (f.length !== 16 || f.some((r) => r.length !== 16)) throw new Error(`Fiber-kun frame "${name}" is not 16×16`);
  }
}
