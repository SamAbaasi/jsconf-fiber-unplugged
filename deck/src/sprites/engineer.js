// An original, generic pixel "frontend engineer" (the speaker before the isekai).
// Simple traits only, for Saman to approve: short dark hair, blue hoodie, a laptop.
// No real-person likeness. 16×24.

export const ENGINEER_PALETTE = {
  k: '#120c2c', // outline
  h: '#2b1d14', // hair
  s: '#d9a273', // skin
  S: '#b07a50', // skin shade
  w: '#ffffff', // eye white
  b: '#4a6fd1', // hoodie
  B: '#34509c', // hoodie shade
  p: '#2a2a40', // trousers
  o: '#f4f1ff', // shoes
  l: '#a3a9c2', // laptop
  L: '#9af5ea', // laptop screen
  D: '#4cc9f0', // screen, second frame
  y: '#ffd166', // daze stars
};

const pad = (rows) => rows.map((r) => r.padEnd(16, '.').slice(0, 16));

const HEAD = [
  '.....kkkkkk.....',
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '...khhsssshhk...',
  '...kssssssssk...',
  '...kswksswksk...',
  '...kssssssssk...',
  '...ksssSSsssk...',
  '....kssssssk....',
];
const HEAD_DAZED = [
  '.y...kkkkkk...y.',
  '....khhhhhhk....',
  '...khhhhhhhhk...',
  '...khhsssshhk...',
  '...kssssssssk...',
  '...ksksssksk....',
  '...kssssssssk...',
  '...ksssSSsssk...',
  '....kssssssk....',
];
const BODY = (screen) => [
  '.....kbbbbk.....',
  '...kkbbbbbbkk...',
  '..kbbbbbbbbbbk..',
  '..kbbllllllbbk..',
  `..kbbl${screen}lbbk..`,
  `..kbbl${screen}lbbk..`,
  '..kbbllllllbbk..',
  '..kbbbbbbbbbbk..',
  '...kBBBBBBBBk...',
  '...kppppppppk...',
  '...kpppkkpppk...',
  '...kpppk.kppk...',
  '...koook.kook...',
  '...kkkkk.kkkk...',
  '................',
];

export const ENGINEER = {
  typing: [pad([...HEAD, ...BODY('LLLL')]), pad([...HEAD, ...BODY('LDLD')])],
  dazed: pad([...HEAD_DAZED, ...BODY('llll')]),
};

for (const f of [...ENGINEER.typing, ENGINEER.dazed]) {
  if (f.length !== 24) throw new Error('engineer frame must be 24 rows');
}
