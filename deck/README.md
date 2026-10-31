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

The presenter window controls the deck too. In it, **T** starts/pauses the timer and **R** resets it.
PageUp/PageDown (clicker) always work, even while the demo input has focus. **Esc** leaves the input.

Boss-fight slide (live demo): **I** focus the input · **A** auto-type · **C** clear · **[ ]** less/more work per cell.

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

This opens `dist/index.html` from `file://` in headless Chromium with **all network requests blocked**,
walks every slide and step, runs the demo in all three modes, tests the presenter link, and fails on
any request or console error. Screenshots and numbers go to `.check/`. The built page also carries a
Content-Security-Policy with `connect-src 'none'`.
