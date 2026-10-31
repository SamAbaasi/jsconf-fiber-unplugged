import { makeSprite } from './draw.js';

// An original, generic pixel box truck (cartoon, no brand), drawn at the same pixel size as
// Fiber-kun (×8 in world scenes): 80×40 sprite pixels = 640×320 px. The cargo box is left
// blank so the scene can paint a label on it.
export const TRUCK_PALETTE = {
  k: '#120c2c', // outline
  w: '#f4f1ff', // cargo box
  s: '#c9c3e8', // cargo shade
  r: '#ff5d73', // cab
  R: '#c23a50', // cab shade
  c: '#9af5ea', // window
  C: '#5fc9bd', // window shade
  g: '#8a90b5', // bumper, frame
  x: '#2a2440', // tyre
  h: '#a3a9c2', // hub
  y: '#ffd166', // headlight
  o: '#ff9f1c', // indicator
};

export const TRUCK = makeSprite(80, 40, ({ rect, px }) => {
  // cargo box
  rect(4, 1, 50, 23, 'w');
  rect(4, 20, 50, 4, 's');
  rect(4, 1, 50, 1, 's');
  // cab
  rect(55, 6, 18, 18, 'r');
  rect(73, 10, 4, 14, 'r');
  rect(55, 21, 22, 3, 'R');
  rect(58, 9, 12, 7, 'c'); // window
  rect(58, 14, 12, 2, 'C');
  rect(70, 6, 3, 4, 'r');
  px(73, 9, 'r');
  px(74, 10, 'r');
  rect(75, 17, 2, 3, 'y'); // headlight
  rect(73, 17, 2, 1, 'o');
  // chassis and bumper
  rect(3, 24, 76, 4, 'g');
  rect(77, 21, 2, 7, 'g');
  // wheels
  for (const cx of [12, 44, 66]) {
    rect(cx - 5, 27, 11, 9, 'x');
    rect(cx - 4, 26, 9, 11, 'x');
    rect(cx - 2, 30, 5, 3, 'h');
  }
});
// Inside of the cargo box, in sprite pixels, for the label.
export const TRUCK_LABEL_BOX = { x: 4, y: 1, w: 50, h: 19 };
