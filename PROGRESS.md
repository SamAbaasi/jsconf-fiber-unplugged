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

## Phase 2.5: make it fun (2026-10-31)

**Changed**
- **Dialogue box**: pixel frame, Fiber-kun portrait with 4 faces (normal / shocked / smug / sleeping), typewriter text. A click while typing finishes the line. Used for the cold open, the truck, and as the Yield narrator.
- **Cold open** (2 slides before the title): black → 「目が覚めたら…」 → truck scene. The truck's impact runs a **real** `flushSync` render of 5,000 components. "FROZEN FRAME N ms" and the truck label show the measured frame gap (150–217 ms in my runs) → *(Saman)* "Wait… I'm a plain JavaScript object?"
- **STATUS**: full-screen window, 7 fields at 44 px, then SKILLS: 《Yield》 外れスキル? "Effect: stop working." → tooltip "Only for: Transition · Retry · Idle" (A4) → sealed 封印 《Yield · 25 ms》 `enableThrottledScheduling = false` (A3).
- **Yield**: full-screen skill card → code at 48 px → bigger tree walk, narrated in the dialogue box (the narration names the real `workInProgress` fiber) → full-screen "YIELD = PAUSE".
- **Boss fight is a real fight**: JANK HYDRA (the 10,000 real cell fibers, now shaded, with eyes and teeth), HP bars, fireballs every 300 ms, hits resolved by **real frame length**, "-169ms JANK!" + shake, DODGE, RESPAWN AT ROOT on real thrown-away renders, a result screen and rank from fixed rules. All of this runs in the rAF monitor loop, outside React.
- **Patch notes** slide: the four on-stage corrections, as a game patch note.
- **Sound**: 8-bit SFX synthesized with WebAudio (blip, unlock, hit, dodge, respawn, rank, lose). **M** toggles it; off by default; shown in the corner and in the presenter view.
- **Text size**: every visible text is ≥ 28 px (code ≥ 32 px), except the boss timeline legend (24 px, allowed). Every slide except the boss is ≤ 40 words.
- New: `JOKES.md`, `JP_REVIEW.md`, `deck/src/content/lines.js` (all lines, marked saman/draft), `deck/scripts/check-claims.mjs`.

**Measured** (headless Chromium, cloud container, no GPU, production build, auto-type: 13 keystrokes). Two runs:

| Round | Result | Avg FPS in round | Worst frame | Hits (damage) | Thrown away | 5 ms slices | Rank |
|---|---|---|---|---|---|---|---|
| 1 · no transition | K.O. / K.O. | 16 / 11 | 143 / 202 ms | 4 (547) / 3 (523) | 0 / 0 | 1 / 1 | C / B |
| 2 · useTransition | WIN / WIN | 60 / 60 | 32 / 31 ms | 0 / 0 | 9 / 9 | 215 / 213 | S / S |
| 3 · useDeferredValue | WIN / WIN | 60 / 60 | 29 / 33 ms | 0 / 0 | 9 / 9 | 214 / 216 | S / S |

**Difference vs. Phase 2:**
- Worst frames are in the same range as before (sync 134–188 → 143–202 ms; transition 32–34 → 31–39 ms; deferred 27–36 → 25–33 ms). I can't see a cost from the game layer in these numbers, but the run-to-run noise is about ±10 ms.
- The Phase 2 "thrown away 17–18" for round 3 was **cumulative** (it included round 2's 9). Per round, it is 9.
- While the screen recorder runs, rounds 2–3 get slower (worst frame 45–62 ms, rank A, once TIME UP with 1 hit). The game showed that truthfully.

**Claims**: none added or dropped. Three IDs in the brief did not match CLAIMS.md: VIP pass = **C2** (not C5), Header = **H3** (not H2), the 4th correction = **C10**/A4 (not B3). I used the correct IDs.

## Phase 2.6: polish the game (2026-10-31)

**Fixed**
1. **Rank luck:** every frame > 50 ms during a round is now a hit, for its real length. A K.O. caps the rank at C. The rule is shown before each round.
2. **Longer fights:** auto-type covers five words (~6 s); a round lasts up to 8 s. Round 2/3 WIN at ~6.0 s.
3. **Truck scene:** the truck is hidden until it drives in; the road dashes sit above the dialogue box.
4. **A visible freeze:** the impact runs a real `flushSync` render of 5,000 components (~300 µs each). Measured frozen frame: 1,183–1,367 ms (target ~1.5 s; the number shown is the measured one). The fps counter is labelled "(last 1 s)" and drops and recovers truthfully.
5. **Hero:** Fiber-kun is 192 px (was ~110). JANK numbers are a fixed 4-line hit log, so they no longer overlap.
6. **Patch notes:** a 5th entry, **Part 1 line 100** "pause … then resume" → restart from root (new CLAIMS row **B6**). The brief said "B3, Part 2", but Part 2 lines 124/128 describe pause/resume vs abort correctly; the error is in Part 1. B3 is the "Default doesn't interrupt" rule.

**New**
- **A:** Tehran at night (generic mountains and buildings), an original generic engineer avatar (short dark hair, blue hoodie, laptop: placeholders for Saman to approve), "I was a frontend engineer in Tehran…", BONK! (cartoon), white flash → Fiber-kun.
- **B:** rAF jump physics (no frames → no movement); auto-jump over decor fireballs; **↑** jumps (handled on window in capture phase, so the slide doesn't change) and shows `input delay` when > 50 ms (75–133 ms in Round 1 runs; once 12 ms when the key landed between long frames).
- **C:** sword: render attempt → wind-up, commit → slash + cut marks on the matched body cells, thrown-away render → cancelled slash + RESPAWN AT ROOT.
- **D:** same workload in all rounds ("same work: 10,000 fibers × 12 µs" in the top bar); three looks: JANK HYDRA / FROST (horns) / SHADOW (crowns).
- **E:** result screens per rank: PERFECT (gold, fanfare, raised sword, the Hydra collapses), GREAT!, CLEAR, GAME OVER (grey, Fiber-kun down, CONTINUE? countdown, the Hydra laughs). The READY/result panel now covers the instrument column, so the arena stays visible.

**Rank stability** (headless Chromium, cloud container, no GPU, production build; runs without the screen recorder):

| Round | Runs | Ranks | Notes |
|---|---|---|---|
| 1 · no transition | 8 | **C ×8** | always TIME UP, ~30 hits, worst 159–201 ms, ~4,100 damage of 5,000 HP (no K.O. here) |
| 2 · useTransition | 12 | **S ×11, A ×1** | 0 hits in 11 runs; the A was one 51 ms frame |
| 3 · useDeferredValue | 12 | **S ×8, A ×3, B ×1** | the misses were single 59–91 ms frames |

Runs = the 5-run `--stability` test + 3 walk-through runs (round 1) / 3 walk-through + 4 fresh-page runs (rounds 2–3). A fresh page did not help round 3 (S ×3, A ×1), so it is not garbage from earlier rounds. The long frames are probably commits repainting thousands of cells without a GPU. With the screen recorder running, rounds 2–3 drop to A or B with TIME UP (~40 fps); the recordings show that truthfully.
