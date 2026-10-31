# Deck: React Fiber Unplugged

A Vite + React 19.3.1 slide deck. It is one HTML file that runs **fully offline**, even from `file://`.

## Run

```bash
npm install          # once, while online
npm run build        # → dist/index.html (one file, fonts and code inlined)
```

Then either open `dist/index.html` directly in Chrome, or serve it locally:

```bash
npm run preview      # http://localhost:4173
```

`npm run dev` starts the dev server (development React build: slower, with React Performance Tracks).
**Present from the production build**, because demo timings in dev mode are not realistic.

## Keys

| Key | Action |
|---|---|
| → ↓ Space PageDown | next step (one click = one step) |
| ← ↑ PageUp | previous step |
| Home / End | first / last slide |
| B or . | black screen |
| F | fullscreen |
| P | open the presenter window (current + next slide, notes, timer) |
| M | sound on/off (8-bit SFX made with WebAudio; **off by default**) |

The presenter window controls the deck too. In it, **T** starts/pauses the timer and **R** resets it.
PageUp/PageDown (clicker) always work, even while the demo input has focus. **Esc** leaves the input.

A click while a dialogue line is still typing finishes the line (it does not move on).

Boss-fight slide (live demo): **I** focus the input · **A** auto-type · **C** clear · **R** restart the round · **[ ]** less/more work per cell.

## Slides so far (Phase 2.5)

1. Cold open: black screen, 「目が覚めたら…」
2. Truck-kun, **live**: the truck's impact runs a real `flushSync` render; the frozen frame is measured
3. Title
4. STATUS window: fields, twin, lanes, SKILLS (外れスキル?, 封印)
5. Skill: Yield: skill card → loop code → tree walk narrated in a dialogue box → summary
6. Boss fight, **live**: JANK HYDRA, three rounds (sync / useTransition / useDeferredValue)
7. Patch notes: the four corrections to my articles

On-screen lines live in `src/content/lines.js`, each marked `by: 'saman'` or `by: 'draft'`.

## The boss-fight game rules

Fixed in `src/demo/game.js` (`RULES`, `rankOf`) and shown on screen before every round:

- A round lasts 3 s from the first keystroke. The Hydra attacks every 300 ms (wall clock).
- An attack is resolved in the animation frame that contains its time. If that frame is **longer than 50 ms**, Fiber-kun is hit for the frame's real length in ms. Otherwise he dodges.
- Every frame that is not longer than 50 ms deals 1 damage to the Hydra (HP 120). Fiber-kun has HP 500.
- K.O. at HP 0, WIN when the Hydra reaches 0, otherwise TIME UP.
- Rank: **S** 0 hits and worst frame ≤ 50 ms · **A** ≤ 1 hit and worst ≤ 100 ms · **B** ≤ 3 hits · **C** more.
- "RESPAWN AT ROOT" and the RESPAWN counter appear only for a real thrown-away render (the list started a new render attempt before its last one committed).

No randomness anywhere. All game effects run in the monitor's `requestAnimationFrame` loop, outside React.

## How the live demo is measured

- `vite.config.js` aliases the bare import `scheduler` to `src/instrument/scheduler-wrapper.js`.
  react-dom's `require("scheduler")` gets the wrapper, which forwards every call to the real
  `scheduler@0.28.0` and records when each task starts, yields and ends. `shouldYield`, the 5 ms slice
  and the priorities are untouched.
- The demo list records when a render attempt starts (its function runs) and when it commits
  (its layout effect). If a new attempt starts before the last one committed, React threw the last one away.
- FPS, frames and the world animation run in one `requestAnimationFrame` loop, outside React.
  They freeze when the main thread is blocked, which is the point.
- Each of the 10,000 cells does about 12 µs of real arithmetic, calibrated at startup so the
  render costs about the same on any laptop.

## Checks

```bash
npm run build && npm run check
```

`npm run check` runs two scripts:

- `scripts/check-claims.mjs`: every claim ID used in the deck and in `JOKES.md` exists in `CLAIMS.md`;
  every on-screen line has an author; every Japanese string is listed in `JP_REVIEW.md`.
- `scripts/check-offline.mjs`: opens `dist/index.html` from `file://` in headless Chromium with **all network
  requests blocked**, walks every slide and step, audits font sizes (< 28 px) and words (> 40 outside the boss
  slide), tests that a click finishes a typing line, plays the three boss rounds and reads the result screens,
  and tests the presenter link. It fails on any request or console error. Add `-- --record` to also record the
  three rounds to `.check/boss-rounds.webm`. Output goes to `.check/`.

The built page also carries a Content-Security-Policy with `connect-src 'none'`.
