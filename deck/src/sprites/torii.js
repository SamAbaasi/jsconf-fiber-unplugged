import { makeSprite } from './draw.js';

// A generic torii gate (original pixel drawing): a top beam with upturned ends, a second
// beam, a small blank plaque and two pillars on dark bases. In the story it is the
// dungeon Gate. 26×30 including the outline.
export const TORII_PALETTE = {
  k: '#1a0d12', // outline
  t: '#2b1b24', // black top of the beam and the pillar bases
  r: '#e8442e', // vermilion
  R: '#a52a1c', // shade
  p: '#ffd166', // plaque
};

export const TORII = makeSprite(26, 30, ({ rect, px }) => {
  px(1, 1, 't'); // upturned ends of the top beam
  px(24, 1, 't');
  rect(1, 2, 24, 2, 't'); // top beam (black top)
  rect(2, 4, 22, 2, 'r');
  rect(2, 5, 22, 1, 'R');
  rect(11, 6, 4, 2, 'r'); // centre strut
  rect(10, 7, 6, 3, 'p'); // plaque (blank)
  rect(3, 10, 20, 2, 'r'); // second beam
  rect(3, 11, 20, 1, 'R');
  for (const x of [5, 18]) {
    rect(x, 6, 3, 20, 'r'); // pillars
    rect(x + 2, 6, 1, 20, 'R');
    rect(x - 1, 26, 5, 3, 't'); // bases
  }
});
