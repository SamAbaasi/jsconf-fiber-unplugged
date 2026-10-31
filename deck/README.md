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

Boss-fight slide (live demo): **I** focus the input · **A** auto-type · **↑** jump · **C** clear · **R** restart the round · **[ ]** less/more work per cell.

## Slides so far (Phase 2.5)

1. Cold open: black screen, 「目が覚めたら…」
2. Truck-kun, **live**: Tehran at night, a frontend engineer → the truck's impact runs a real ~1.5 s `flushSync` render; the frozen frame is measured → white flash → Fiber-kun
3. Title
4. STATUS window: fields, twin, lanes, SKILLS (外れスキル?, 封印)
5. Skill: Yield: skill card → loop code → tree walk narrated in a dialogue box → summary
6. Boss fight, **live**: JANK HYDRA, three rounds (sync / useTransition / useDeferredValue)
7. Patch notes: the five corrections to my articles

On-screen lines live in `src/content/lines.js`, each marked `by: 'saman'` or `by: 'draft'`.

## The boss-fight game rules

Fixed in `src/demo/game.js` (`RULES`, `rankOf`) and shown on screen before every round:

- A round lasts up to 8 s from the first keystroke. **A** auto-types five words (~6 s).
- **Every** animation frame longer than **50 ms** is a hit ("the Hydra strikes whenever you freeze"). The damage is that frame's real length in ms. Fiber-kun has HP 5000.
- Every other frame deals 1 damage to the Hydra (HP 360, which is 6 s at 60 fps).
- K.O. at HP 0, WIN when the Hydra reaches 0, otherwise TIME UP.
- Rank: **S** 0 hits · **A** 1–2 · **B** 3–5 · **C** 6+ or K.O. Result screens: S = PERFECT (fanfare, raised sword, the Hydra collapses) · A = GREAT! · B = CLEAR · C = GAME OVER (grey, CONTINUE? countdown, the Hydra laughs).
- Sword: each **commit** of the list = a slash that lands (cut marks on the cells that commit matched). Each **thrown-away** render = a cancelled slash + "RESPAWN AT ROOT".
- **↑** = jump (also automatic over fireballs). Jumps are rAF physics: during a long frame nothing moves. The ↑ handler shows `input delay = performance.now() − event.timeStamp` when it is over 50 ms.
- Same workload every round (10,000 fibers × the same µs); only the Hydra's look changes (JANK HYDRA, FROST, SHADOW).

No randomness anywhere. All game effects run in the monitor's `requestAnimationFrame` loop, outside React.

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
  truck scene and the three rounds (`truck.webm`, `boss-rounds.webm`), and `-- --stability 5` to replay the three
  rounds five more times. Output goes to `.check/`.

The built page also carries a Content-Security-Policy with `connect-src 'none'`.
