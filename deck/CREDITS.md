# Credits

## Boss dragon pixel art
- **Source:** Saman Abbasi's own boss-sprite pack (`assets-src/boss-sprites/`). It was drawn in code with Python/PIL, from the seeded scripts in `assets-src/boss-sprites/src/`. No AI image model was used.
- **Used in the deck (boss room):** dragon poses and palette swaps, castle (intact / cracked / burning, 2 flame frames), goblins (walk ×2, bite, dance, hit), sword (ready / up / strike), slash arc, 《Yield》 shield, arena background (sky, moon, hills, grass) and the cave-mouth frame. The bestiary icon for the goblin also comes from the pack.
- **How it gets in:** `scripts/gen-sprites.py` turns the PNGs into `src/sprites/pack.generated.js`; `src/sprites/pack.js` draws them at integer ×12.
- **Not used:** the pack's ice cone (the deck draws its own ice beam on the same ×12 grid, aimed at Fiber-kun) and fire1/fire2 (the castle's burning frames already have flames).

## Everything else
- **Fiber-kun, truck, torii and Tehran:** drawn in code for this deck (`src/sprites/`).
- **Fonts:** SIL OFL 1.1. See `LICENSES.md`.
