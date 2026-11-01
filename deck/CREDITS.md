# Credits

## Boss dragon pixel art
- **Source:** Saman Abbasi's own boss-sprite pack (`assets-src/boss-sprites/`). It was drawn in code with Python/PIL, from the seeded scripts in `assets-src/boss-sprites/src/`. No AI image model was used.
- **Used in the deck:** only the dragon poses `dragon_idle`, `anticipation`, `breath`, `hurt`, `kneel` and `defeated`, plus the round 2/3 palette swaps (`palette_swaps.json`).
- **How it gets in:** `scripts/gen-sprites.py` turns the PNGs into `src/sprites/pack.generated.js`.
- **Scaling:** integer ×12, the same pixel grid as Fiber-kun and the goblins.
- **Not used:** the pack's goblins, castle, sword, slash arc, shield, ice cone and arena art. Saman chose to keep the deck's own versions; those files stay in `assets-src` as the source.

## Everything else
- **Fiber-kun, goblins, castle, truck, torii and Tehran:** drawn in code for this deck (`src/sprites/`, `src/demo/game.js`).
- **Fonts:** SIL OFL 1.1. See `LICENSES.md`.
