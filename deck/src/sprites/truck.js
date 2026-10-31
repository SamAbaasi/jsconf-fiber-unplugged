// An original, generic pixel box truck (cartoon, no brand). 32×16.
// The cargo box is left blank so the scene can paint a label on it.

export const TRUCK_PALETTE = {
  k: '#120c2c', // outline
  w: '#f4f1ff', // cargo box
  s: '#c9c3e8', // cargo shade
  r: '#ff5d73', // cab
  R: '#c23a50', // cab shade
  c: '#9af5ea', // window
  g: '#8a90b5', // bumper
  x: '#2a2440', // tyre
  h: '#a3a9c2', // hub
  y: '#ffd166', // headlight
};

const ROWS = [
  '..kkkkkkkkkkkkkkkkkkkk..........',
  '..kwwwwwwwwwwwwwwwwwwk..........',
  '..kwwwwwwwwwwwwwwwwwwkkkkkkk....',
  '..kwwwwwwwwwwwwwwwwwwkrrrrrrk...',
  '..kwwwwwwwwwwwwwwwwwwkrccccrrk..',
  '..kwwwwwwwwwwwwwwwwwwkrccccrrrk.',
  '..kwwwwwwwwwwwwwwwwwwkrrrrrrrrk.',
  '..kwwwwwwwwwwwwwwwwwwkrrrrrrryk.',
  '..ksssssssssssssssssskRRRRRRRRk.',
  '..kggggggggggggggggggggggggggggk',
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  '....kkkk..........kkkk...kkkk...',
  '...kxxxxk........kxxxxk.kxxxxk..',
  '...kxhhxk........kxhhxk.kxhhxk..',
  '...kxxxxk........kxxxxk.kxxxxk..',
  '....kkkk..........kkkk...kkkk...',
];

export const TRUCK = ROWS.map((r) => r.padEnd(32, '.').slice(0, 32));
// Inside of the cargo box, in sprite pixels, for the label.
export const TRUCK_LABEL_BOX = { x: 3, y: 1, w: 18, h: 7 };
