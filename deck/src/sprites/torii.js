import { makeSprite } from './draw.js';

// A generic torii gate (original pixel drawing): a top beam with upturned ends, a second
// beam, a small blank plaque and two pillars on dark bases. In the story it is the entrance
// of the dungeon. Drawn at the same pixel size as Fiber-kun (×8): 52×58 = 416×464 px.
export const TORII_PALETTE = {
  k: '#1a0d12', // outline
  t: '#2b1b24', // black top of the beam and the pillar bases
  r: '#e8442e', // vermilion
  R: '#a52a1c', // shade
  p: '#ffd166', // plaque
};

export const TORII = makeSprite(52, 58, ({ rect }) => {
  rect(1, 1, 3, 2, 't'); // upturned ends of the top beam
  rect(48, 1, 3, 2, 't');
  rect(2, 3, 48, 3, 't'); // top beam (black top)
  rect(3, 6, 46, 4, 'r');
  rect(3, 9, 46, 1, 'R');
  rect(23, 10, 6, 4, 'r'); // centre strut
  rect(20, 12, 12, 6, 'p'); // plaque (blank)
  rect(5, 18, 42, 3, 'r'); // second beam
  rect(5, 20, 42, 1, 'R');
  for (const x of [10, 36]) {
    rect(x, 10, 6, 41, 'r'); // pillars
    rect(x + 4, 10, 2, 41, 'R');
    rect(x - 2, 51, 10, 6, 't'); // bases
  }
});
