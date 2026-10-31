import { makeSprite } from './draw.js';

// A generic goblin: small, big pointy ears, a wooden club. Original, drawn as code. Faces right.
export const GOBLIN_PALETTE = {
  k: '#1a120a',
  g: '#a8c44a', // skin
  G: '#6f8f22', // skin shade
  y: '#ffd166', // eyes
  w: '#ffffff', // tooth
  c: '#7a4e2a', // tunic
  C: '#4f3018', // club
};

function goblin(step) {
  return makeSprite(16, 16, ({ rect, px }) => {
    rect(5, 4, 7, 5, 'g'); // head
    rect(5, 7, 7, 2, 'G');
    px(2, 1, 'g'); // left ear, pointing up and out
    px(3, 2, 'g');
    rect(3, 3, 2, 1, 'g');
    px(4, 4, 'g');
    px(12, 2, 'g'); // right ear
    px(12, 3, 'g');
    px(8, 5, 'y');
    px(10, 5, 'y');
    rect(7, 7, 4, 1, 'k'); // grin
    px(8, 7, 'w');
    px(10, 7, 'w');
    rect(5, 9, 7, 4, 'c'); // tunic
    rect(4, 9, 1, 3, 'g'); // arm
    rect(12, 9, 1, 2, 'g'); // arm holding the club
    rect(13, 5, 2, 5, 'C'); // club
    px(13, 4, 'C');
    rect(5, 13, 2, 2 - (step ? 1 : 0), 'G'); // legs
    rect(9, 13, 2, 1 + (step ? 1 : 0), 'G');
  });
}

export const GOBLIN = [goblin(0), goblin(1)];
