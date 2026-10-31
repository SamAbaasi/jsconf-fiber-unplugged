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

Boss-fight slide (live demo): **I** focus the input · **A** auto-type · **↑** jump · **C** clear · **R** restart the round · **[ ]** less/more work per cell · **K** calibration.

## Slides so far (Phase 2.5)

Story spine and minute plan: [`STORYBOARD.md`](../STORYBOARD.md).

1. Cold open, **live**: Tehran at night → the LONG TASK truck (a real ~1.2 s `flushSync` render; the frozen frame is measured and given a Gate rank) → white flash → a fantasy Japan with a torii Gate → 目が覚めたら… → [SYSTEM] window
2. Title
3. The Gate = the main thread: one corridor, a stuck LONG TASK, Gate ranks (S = the 50 ms long-task line)
4. Floor 1 · Lv1 STATUS: fields, links, twin, lanes → LEVEL UP (《Yield》 外れスキル?)
5. Floor 2 · Lv2 《Yield》: skill card → loop code → tree walk → summary → why a dud → LEVEL UP
6. Floors 3–5: placeholders with storyboard text (quest board / respawn / expeditions)
7. Boss room, **live**: goblins (keystrokes) + JANK DRAGON (the list, 10,000 cells by default), three rounds (sync / useTransition / useDeferredValue)
8. Patch notes: the five corrections to my articles
9. 図鑑 bestiary (recap)
10. 仲間募集 ending (DRAFT)

On-screen lines live in `src/content/lines.js`, each marked `by: 'saman'` or `by: 'draft'`.

## The boss-fight game rules

Fixed in `src/demo/game.js` (`RULES`, `rankOf`) and shown on screen before every round:

- **Goblin** = one keystroke = one urgent update (`setText`, SyncLane). It appears with the input event and is resolved on the first animation frame after the commit that puts that keystroke's text in the DOM. Latency = that frame's time − `event.timeStamp`. **Over 50 ms, it bites** for that many ms (Fiber-kun HP 4000).
- **Dragon** = the list (one fiber per cell; 10,000 by default, `?cells=` / calibration can use 6,400, 3,600 or 1,600) (the transition / deferred query). HP = keystrokes of this round the list has not rendered yet. Each real list commit = Fiber-kun dashes in and the slash lands on its chest (flash, knockback, spark, number at the contact point). The **final** commit (the one that shows the last keystroke) kills it. No TIME UP in a winning round.
- Rank: **S** 0 bites, no frame > 100 ms · **A** ≤ 2 bites, ≤ 150 ms · **B** ≤ 5 bites · **C** more than 5 bites = QUEST FAILED ("DRAGON DOWN… but the village fell"). Result screens: PERFECT / GREAT! / CLEAR / QUEST FAILED. The result shows the measured split of the worst frame (render · commit · style/layout/paint · canvas · other).
- RESPAWN AT ROOT appears only for a real thrown-away render (the list started a new attempt before the last one committed).
- **A** auto-types five words (~6 s). **↑** jumps and shows `input delay = performance.now() − event.timeStamp` when it is over 50 ms.
- Same workload every round ("same work: 10,000 fibers × N µs"); only the dragon's look changes.
- **K** = calibration for the presentation laptop (see `RUNBOOK.md`); `?work=N` in the URL sets the work per cell.

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
