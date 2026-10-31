# Progress notes

## Phase 1: verification, CLAIMS.md, outline (2026-10-30)

**Done**
- Pinned **React 19.3.1 / scheduler 0.28.0** (npm `latest`). Read the source at tag `v19.3.1` (commit `61aa00df`).
- Wrote [CLAIMS.md](CLAIMS.md): about 60 claims, each with a file + line link at the tag and a status.
- Built [verification/](verification/): an esbuild + headless Chromium harness that runs the real npm production build with `scheduler` aliased to a recording wrapper. Every "E" mark in CLAIMS.md comes from `verification/results.json`.
- Wrote the [OUTLINE.md](OUTLINE.md) slide outline (42 slides), changed where the verification required it.

**Main findings**
- The live loop is `workLoopConcurrentByScheduler` (`!shouldYield()`). The 25 ms/5 ms time-based loop exists but is behind `enableThrottledScheduling = false`.
- **Only Transition, Retry, Idle, Offscreen and Deferred lanes are time-sliced.** Click, mousemove and timer updates render in one block, even in `createRoot`. Measured: 213 ms single task from a timer; 5 ms slices from a transition.
- SyncLane goes through a microtask and never enters the Scheduler queue. Default and Transition both map to Scheduler `Normal`.
- A click interrupts a transition and the transition restarts from the root (measured: 288 rows thrown away). **A Default update does not interrupt a transition** (measured).
- All four Part 9/Part 1 errors you listed are confirmed. I found three more in the articles: Part 7 (memo with no props), Part 2 ("a different part of the tree first") and Part 6 (when `childLanes` is marked). Those are fixed in CLAIMS.md only, with no stage time.
- Performance Tracks: confirmed in dev/profiling builds, and absent in production.

**Not verified / limits**
- "Why not requestIdleCallback": the source says nothing about it, and I found no primary React-team source. The claim is dropped.
- I have not looked at the Performance Tracks visually in a headed Chrome yet (only intercepted the calls).
- All timings come from headless Chromium in a cloud container, not from your stage laptop.
- The earlier `source-material/CLAIMS.draft.md` was mostly right. It missed the "Default does not interrupt a transition" rule and the per-browser-task 5 ms detail, and its note on Part 2 was slightly off (Part 2 does mention abort).

**Next:** waiting for approval of CLAIMS.md + OUTLINE.md before Phase 2.

## Phase 2: prototype scene (2026-10-31)

**Built** (`deck/`, Vite 8.3.5 + React 19.3.1, one offline HTML file):
- Deck engine: 1920×1080 stage scaled to any screen; arrows / PageUp / PageDown / Space; one click = one step; URL keeps the position; B = black screen.
- Presenter window (P): current slide, next step, notes with the current step highlighted, timer with plan/ahead/behind. Synced by postMessage (works from `file://`) plus BroadcastChannel.
- Slide 1, **Title**: 「転生したらReactのFiberだった件」 cover; Fiber-kun says こんにちは on click.
- Slide 2, **STATUS window**: real FiberNode fields for `CartIcon`, revealed group by group, with the child / sibling / return diagram and the alternate twin.
- Slide 3, **Skill unlocked: Yield**: popup → old vs new loop → animated tree walk in 5 ms slices → browser turn → resume from the same fiber → commit. The walk order is computed by simulating React's begin/complete rules, not typed by hand.
- Slide 4, **Boss fight (live)**: a real React app inside the slide, 10,000 cell components × ~12 µs (calibrated). Click 1/2/3 = sync / useTransition / useDeferredValue. A live FPS meter, the game world on canvas, and a **live timeline from the real `scheduler` package** (aliased wrapper) with a 120 ms zoom lane showing each 5 ms slice.
- Fiber-kun: an original 16×16 sprite drawn as code (idle, walk, rest). Fonts are bundled (OFL). No network: a CSP blocks it and `npm run check` verifies it.

**Measured** (headless Chromium in the cloud container, production build, 13 auto-typed keystrokes):

| Mode | FPS while typing | Worst frame | Renders thrown away |
|---|---|---|---|
| Sync | 20–49 | 134–188 ms | 0 (each key = one ~124 ms sync render, no Scheduler task) |
| useTransition | 60 | 32–34 ms | 9 |
| useDeferredValue | 61 | 27–36 ms | 17–18 |

**Known limits / not done yet**
- The ~30 ms worst frame in transition modes is likely the commit (commits never yield) repainting thousands of cells, in a container with no GPU. It needs measuring on the stage laptop. If it is too high there, I can reduce the DOM cost (for example, draw the grid on a canvas from a layout effect).
- The headless numbers are not stage numbers. `[` / `]` adjust the work per cell on stage.
- Not built yet (Phase 3): the other ~38 slides, SCRIPT.md, the PDF and MP4 fallback, RUNBOOK.md.
