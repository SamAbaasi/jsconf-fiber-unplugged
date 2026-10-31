// A generic goblin: big pointy ears, yellow eyes, a grin, a brown tunic and a club.
// Original, drawn as code. 8×8 sprite pixels, drawn on the same ×12 grid as Fiber-kun in the
// boss arena (96 px). Faces left: it runs toward the village.
export const GOBLIN_PALETTE = {
  k: '#1a120a',
  g: '#a8c44a', // skin
  G: '#6f8f22', // skin shade, legs
  y: '#ffd166', // eyes
  c: '#7a4e2a', // tunic
  C: '#4f3018', // club
};

const TOP = ['g......g', 'gggggggg', 'gykggykg', 'ggkkkkgg', '.Gcccc.C', 'g.cccc.C', '..cccccC'];
export const GOBLIN = [
  [...TOP, '..G..G..'],
  [...TOP, '.G....G.'],
];
