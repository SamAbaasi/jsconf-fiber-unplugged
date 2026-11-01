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

## Phase 2.7: goblins, dragon, calibration (2026-10-31)

**Fixes**
- **No TIME UP in a winning round:** the dragon dies on the **final real commit** of the round (the commit that shows the last keystroke). Rounds 2–3 end at ~6.2 s with "DRAGON DOWN".
- **Truck scene:** horn + entrance in 0.45 s (no dead air); the real freeze is now ~1.15–1.47 s (260 µs × 5,000 components, measured); the fps counter honestly reads ~1 right after.
- **Hero:** Fiber-kun 256 px, in the middle; the dragon (10,000 cells at 4 px) is 500×320.

**New**
- **Truck isekai:** no human. Fiber-kun's previous life is a tired salaryman (no headband, tired eyes, necktie, briefcase). The giant truck is 576 px tall (3×), with headlight beams. White flash → another world (an original field and castle) → Fiber-kun reborn with headband and sword → title.
- **Goblins + dragon** (replace the Hydra):
  - **Goblin** = one keystroke (urgent `setText`, SyncLane). It is resolved on the first frame after its text commit; latency = that frame − `event.timeStamp`; > 50 ms → it bites for that latency.
  - **Dragon** = the 10,000-fiber list; HP = keystrokes not rendered yet; each real list commit = a dash + slash that lands on its chest (white flash, knockback, spark, number at the contact point); the final commit kills it.
  - RESPAWN AT ROOT only on real thrown-away renders. Floating text sits above (or beside) Fiber-kun, never on his face. No hitstop.
- **Calibration (K)**, `?work=N`, and the calibration section in `RUNBOOK.md`. A headless test of K picked 12 µs in 2.6 min (R1 C×5, R2 S×5, R3 S×5).
- **Frame strip** (`deck/scripts/frame-strip.mjs`, CDP screencast, 8 fps): one dragon hit and one goblin kill, contact at 0 ms.
- **Test matrix** (`deck/scripts/test-conditions.mjs`).

**Test matrix at the default 12 µs** (5 runs × 3 rounds per condition; rank counts):

| Condition | Round 1 | Round 2 | Round 3 |
|---|---|---|---|
| a · normal headless 1920×1080 | C ×5 | **S ×5** | S ×5 |
| b · with video recording | C ×5 | **S ×5** | S ×5 |
| c · CPU 2× | C ×5 | **S ×4**, B ×1 | S ×5 |
| c · CPU 4× | C ×5 | B ×5 | B ×4, A ×1 |
| d · deviceScaleFactor 1 | C ×5 | S ×5 | S ×4, B ×1 |
| d · deviceScaleFactor 2 | C ×5 | S ×5 | S ×4, A ×1 |

Goal (R1 = C and R2 = S in ≥ 4/5 for a, b, c-2×) is met at 12 µs, so no tuning was needed. At 4×, round 2 has 0–1 bites but frames of 150–330 ms. Lower work does not fix it: at 6 µs R2 = A ×2, B ×3; at 2 µs R2 = B ×5. The long frames are not in the sliced render; my best guess is the commit (thousands of cell class changes + paint) and the canvas drawing, all 4× slower. On such a laptop the calibration would honestly report "no value works".

## Phase 3a: one story spine (2026-10-31)

**Story:** a tired frontend developer from Tehran, the LONG TASK truck, a fantasy Japan, a torii Gate, a dungeon = the main thread, five floors (one verified React mechanism each), the boss room, a bestiary and a party-recruit ending. Plan in [`STORYBOARD.md`](STORYBOARD.md): 25:30 of content + 4:30 buffer, 6 metaphors.

**Built:** STORYBOARD.md · cold open (Tehran → truck → Japan → torii → [SYSTEM]) · title · the Gate (main thread, gate ranks) · Floor 1 STATUS + LEVEL UP · Floor 2 《Yield》 + "why a dud" + LEVEL UP · Floors 3–5 placeholders · boss room rework · 図鑑 bestiary · 仲間募集 ending (DRAFT).

**New claims:** L1 (long task = 50 ms, MDN + W3C), L2 (one main thread, MDN), L3 (our gate ranks; only S is spec), L4 (Long Animation Frames), C11 (a Scheduler task past its 5 s timeout renders without slicing: found while measuring the 4× throttle case). D1 now has exact line links (#L41-L110).

**Scale bible:** `deck/src/sprites/scale.js` + `deck/scripts/check-scale.mjs` (runs before every build and in `npm run check`; fails the build on a bad ratio) + a second check in the browser that measures what the scenes really drew. `deck/.check/LINEUP.png` shows every sprite on one ruler.

**Boss room:** dragon 60% of the arena, Fiber-kun 25%, goblins 12.6%. Round 1 is decided by bites only: "DRAGON DOWN… but the village fell. QUEST FAILED." The result screen shows the measured split of the worst frame (render · commit · style/layout/paint · canvas · other). Calibration (K) tunes cells (10,000 / 6,400 / 3,600 / 1,600) and µs per cell; `?cells=N&work=N`.

**Independent review:** a separate agent (it saw only screenshots, LINEUP.png, the recordings and the checklist) wrote [`reviews/PHASE3A_REVIEW.md`](reviews/PHASE3A_REVIEW.md) (raw). Fixed: the Tehran "bomb + weapon" read (open glowing laptop, curled thread, no lit windows behind him), the sign (pixel font + Persian bitmap), the moon, truck and torii redrawn at ×8, Fuji visible, the boss glitches (flash, red hurt blob, BITE text on the dragon, crown, sword in the ground, sinking legs, clipped FPS tab), `// S` / `// D` → `// SyncLane` / `// Transition`, one meaning for Gate, floor labels, several drafts reworded. Not fixed (decisions for Saman or a later phase) are listed in the report to Saman.

**Final checks (build after the review fixes):** `check-claims` OK · `check-scale` OK · `check-offline --record` exit 0, 38 states, 0 console errors, 0 network requests, scale bible measured in the page OK (dragon 0.632 H, Fiber-kun 0.253 H, goblin 0.126 H, truck 2.375× / 4.875×, torii 3.625×), font audit: nothing under 28 px. Truck freeze measured 950 ms (983 ms while recording).

**Test matrix, 10,000 cells × 12 µs (5 runs × 3 rounds; rank counts):**

| Condition | Round 1 | Round 2 | Round 3 |
|---|---|---|---|
| a · normal 1920×1080 | C ×5 (QUEST FAILED 5/5) | **S ×5** | S ×5 |
| b · recording | C ×5 (5/5) | **S ×5** | S ×5 |
| c · CPU 2× | C ×5 (5/5) | **S ×5** | S ×2, B ×3 |
| c · CPU 4× | C ×5 (5/5) | A ×2, B ×3 | A ×1, B ×4 |
| d · DPR 1 | C ×5 (5/5) | S ×5 | S ×5 |
| d · DPR 2 | C ×5 (5/5) | S ×4, B ×1 | S ×5 |

**Calibrated for 4× (K, headless, 8.5 min):** 10,000 × 12 → R2 B×5 (render 182 ms: C11) · 6,400 × 12 → R2 S×3 A×2 · **3,600 × 12 → R1 C×5, R2 S×5, R3 S×5**. Re-test at 3,600 × 12: 4× → R1 C×4 B×1, R2 S×5, R3 S×3 A×2; normal speed → R1 C×2 B×3 (too smooth: this setting is only for a slow machine, which is why calibration runs on the stage laptop).

## Phase 3b (2026-10-31)

**Built:**
- **Boss room you can read without text or sound.**
  - Your UI is a small castle with six lit windows. Each real bite turns one window off; more than 5 bites and the towers burn.
  - QUEST FAILED: red smoky sky, burning castle, goblins on the battlements, the dragon only kneels with its head bowed (the list did render, but there is no victory picture; Saman chose this), "TOO LATE" instead of "FINISH!", Fiber-kun kneeling with gloom lines and a broken sword, grey arena.
  - PERFECT: the dragon lies flat with its head on the grass and eyes closed, all windows lit, fireworks, raised sword.
  - Fight view: the code is one line in the header; the right side shows only two big numbers (FPS, worst key; worst key never goes down).
  - A REPLAY step after each round shows the round's real timeline. Rounds type for 4.48 s (C11).
  - Goblin and dragon are on Fiber-kun's ×12 grid; the dragon keeps 10,000 seamless 6 px cells.
- **Gate ranks removed.** A Gate shows only its measured duration and turns red at ≥ 50 ms. L3 is retired; L1 now cites the W3C processing model.
- **Slide hygiene.** "Effect: pause work."; no claim IDs on slides (notes + a hidden `?appendix` slide); Patch Notes start with a row; the freeze shows only the frozen value and the lowest fps.
- **Floors 3–5 built** (quest board, respawn, expeditions), each with a LEVEL UP.
- **New ending (仲間にしますか？).** はい makes Fiber-kun jump with a jingle. Real links and a QR (LinkedIn), generated at build time as inline SVG; the check decodes it from a screenshot.

**Test matrix (10,000 cells × 12 µs, 4.48 s rounds; 5 runs × 3 rounds; rank counts):**

| Condition | Round 1 | Round 2 | Round 3 |
|---|---|---|---|
| a · normal | C ×5 (QUEST FAILED 5/5) | **S ×5** | S ×5 |
| b · recording | C ×5 | **S ×5** | S ×5 |
| c · CPU 2× | C ×5 | **S ×5** | S ×5 |
| c · CPU 4× | C ×5 | S ×3, A ×2 (first run) · A ×3, B ×2 (final build) | S ×1, A ×3, B ×1 · A ×3, B ×2 |
| d · DPR 1 | C ×5 | S ×5 | S ×5 |
| d · DPR 2 | C ×5 | S ×5 | S ×5 |

The a/b/c2/c4 rows are from the final boss code (confirmation run). The d rows are from the first Phase 3b run (same game logic). Calibrated 3,600 cells × 12 µs at 4×: R1 C ×5, R2 S ×5, R3 S ×5.

**Independent review:** [`reviews/PHASE3B_REVIEW.md`](reviews/PHASE3B_REVIEW.md) (raw). Its blocker (a lost round looked like a win) is fixed as above, plus most of its concrete items. Saman then asked for three more changes: no upside-down dragon, a bag + coffee instead of the laptop, and a castle instead of houses.

## Boss dragon from Saman's pixel pack (2026-10-31 / 11-01)
- **Decision:** Saman kept the deck's own style for the goblins, castle, sword and effects. Only the **dragon** comes from his pack (`deck/assets-src/boss-sprites`, drawn in code with PIL; see `deck/CREDITS.md`).
- **DOM grid:** the idle pose is the live list. It is 66×46 art pixels at ×12, with 2 × 2 cells per pixel, so **12,144 cells** (one fiber each).
  - Round 2/3 colours come from the pack's palette swaps.
  - Calibration levels: 12,144 / 6,831 / 4,345 / 3,036 cells.
  - Tried: 3,036 cells × 68 µs gave 53–64 ms frames in round 2, so 12,144 stays.
- **Work:** the default is **17 µs per cell**. Round 1's worst key is now 220–246 ms on the dev laptop; it was 128–158 ms.
  - Calibration (K) now also wants round 1's worst key (median of 5) **> 200 ms**, the INP "good" limit (CLAIMS L5, ⚠️ verify on web.dev; it is blocked here).
  - If round 1 is too fast, it adds µs in proportion. If that breaks round 2, it goes back to the last setting that passed.
- **Breath = ice in every round:**
  - **Round 1:** one beam from the breath pose's mouth to Fiber-kun's body. It stops at him (never over his head toward the castle) and follows him while he dashes. Frost on him, and "N ms frozen" above the mouth.
  - **Rounds 2/3:** small ice shards, one per real Scheduler slice, toward the 《Yield》 shield.
  - The beam needs a **real long task** (Long Tasks API, one task ≥ 50 ms, L1), not just a late frame. Under screen capture the headless browser sometimes renders late between short slices: a LoAF of 57 ms with 47 ms of short tasks and blocking 0. That showed a false "61 ms frozen" in round 2. Without capture, rounds 2/3 have no frame over 50 ms (3 runs each).
- **Poses on canvas (the grid is hidden meanwhile):**
  - Breath while the beam is held.
  - Hurt for 160 ms on a hit; it replaces the white flash.
  - QUEST FAILED: hurt, then kneel.
  - PERFECT: hurt, then defeated (flat, dizzy stars).
- **Layout:**
  - The arena is 1330 px wide (it was 1150).
  - The two big numbers are 505 px wide, at 130 px.
  - Fiber-kun stands just right of the castle.
  - The dragon is right-aligned, feet on the ground.
- **Goblins:**
  - At most 3 on screen. The others still count; they are only not drawn.
  - One goblin that got in dances in front of the gate. The fire is only on the two towers, so it never sits on a goblin's head.
- **FPS:** without capture, rounds 2/3 read 58–61 (green) the whole time. The 39–57 in the videos is capture overhead.
- **Scale bible:** dragon 492 px = 0.647 × arena H (allowed 0.55–0.65). LINEUP.png updated.
- **Frame strip:** `node scripts/round-strip.mjs` → `.check/round-strip.png`, 25% frames of each round. It captures at 25% and every 2nd frame to keep the overhead low.

## Full-width arena with the pixel pack (2026-11-01)
- Saman reversed his earlier choice: the boss room now uses his whole pack, full width (1860 × 760).
  - Background with the moon, and the cave frame on top.
  - Castle: intact → cracked → burning. The flag is the health bar.
  - Goblins: walk, bite, dance, and hit when cut.
  - Pixel sword (ready / up / strike) and slash_arc.
  - Round 3 uses the round 《Yield》 shield.
- **Bottom row:** search box, FPS, and worst key with an INP label. The dragon's HP box is at the top centre; the ready and result cards are in the sky.
- **Goblins:**
  - They stand between the castle and Fiber-kun, never between him and the dragon (Saman). He turns left to cut them.
  - At most 3 on screen (Saman). Dancers stay in front of the castle.
- **Text:**
  - "Your users felt every key." replaces the old QUEST FAILED line.
  - Only the latest BITE line, above the castle.
  - Hit numbers above the dragon's shoulder.
- **Tests (build 5d2d760, frozen copy):**

| | normal | 2× throttle |
|---|---|---|
| R1 | QUEST FAILED 80/80 | QUEST FAILED 80/80 |
| R2 | S 80/80 | S 79, A 1 |
| R3 | S 80/80 | S 78, A 1, **B 1** |
| total | 240/240 | 239/240 |

  - Round 1 worst key: median 255 ms (213–324) at normal speed, 297 ms (272–393) at 2×.
  - Auto-type a and c2, 5 runs each: R1 C 5/5, R2/R3 S 5/5.
  - check-offline: 52 states, no network, no errors.
  - **The one B:** R3 "slow" mode at 2× (one key every 1.2 s, 15 s rounds). One key was 113 ms late.
  - **Re-run of R2/R3 slow at 2×, 20 runs each:** 40/40 OK (39 S, 1 A at 53 ms).
    - In slow rounds the worst frame is long (median 85 ms, max 170 ms), but its split is mostly "other": 54 of 74 ms in the A case, against render 7 and commit 5.
    - So it is not React's render or commit. It is probably garbage collection or browser work in a long, mostly idle round on a throttled CPU.
    - A key that lands in such a frame is late. This happens only in the 15 s slow mode at 2×; never at normal speed.

## Small fixes: focus, replay labels, FAILED, INP colour (2026-11-01)
Art, story, text, slide order and timings unchanged.
1. **Focus:**
   - The search box blurs when a round or replay step opens and when a round ends. Esc always blurs it.
   - A before the first key starts auto-type even with the box focused, and never types "a".
   - A after a round, or right after the 12th key, waits for the result, then starts a new round and auto-types it.
   - So a round that starts with the letter "a" by hand is not possible (RUNBOOK).
2. **Replay labels:** a long-frame label is drawn only if it fits inside its bar and keeps 12 px from the previous label.
3. **Worst key's frame:** outlined and labelled "frame N ms · key M ms".
4. **Red frame in an S round of replay 2:**
   - It came 11–16 ms after the round's first key, in 4 of 10 talk-order runs (52–61 ms).
   - LoAF split: our rAF drawing (up to 46 ms) plus style/layout/paint, while it built the frost poses, the shield and the 《Yield》 text for the first time.
   - The fix pre-draws those when the slide opens: 0 of 10 runs after the fix.
   - Still possible: a rare frame where several 5 ms slices ran back to back before a paint (LoAF: no task ≥ 50 ms, blocking 0). This was 1 of 10 runs with the final build (65 ms, at 885 ms).
   - A speaker-notes line explains both.
5. **Outcome:** a failed round's `data-result.outcome` is "FAILED"; `dragonDown` still says whether the dragon fell.
6. **INP colour and calibration:**
   - A failed round never shows a green INP label: "INP: good" stays as text but turns grey.
   - Calibration aims round 1's median worst key at 230–320 ms (target 275, at most 8 settings).
   - Default work is 18 µs per cell; 19 µs gave 300–328 ms here.

**Test** (`scripts/test-fixes.mjs`, final build 65367fc, Chromium, 5 runs each):
- auto = A pressed with the box focused
- human = 12 keys, 180 ms apart
- A-after = A right after the 12th key, box still focused

| round | auto | human | A-after (and the round A starts) | worst key, min–max (median) |
|---|---|---|---|---|
| 1 | QUEST FAILED 5/5 | QUEST FAILED 5/5 | QUEST FAILED 5/5 (QUEST FAILED 5/5) | auto 216–261 (231) · human 228–254 (236) · A-after 226–250 (234) |
| 2 | S 5/5 | S 5/5 | S 5/5 (S 5/5) | 18–34 |
| 3 | S 5/5 | S 5/5 | S 5/5 (S 5/5) | 19–38 |

- Every check passed (45/45). Failed rounds with outcome "FAILED": 15/15.
- Zero cases of: green INP on a failed round, "a" typed by A, a 13th key, or focus left on the box after a round.
- **Round 1 band:**
  - Round 1's median worst key is inside 230–320 in every mode.
  - **3 of 15 single runs were below 230** (216, 226, 228), none ≤ 200.
  - The same machine gave 300–328 ms at 19 µs in the session before. Between sessions it varies by about ±15%, so the band is for the median, set by calibration on the stage laptop.
- **Round 2 in talk order (round 1 → replay → round 2, 10 runs):** S 10/10. One run had one 65 ms frame (no long task), the rest ≤ 45 ms.
- **check:** claims, scale and offline (52 states, no network, no errors) all OK.

## Empty search box, slower visuals, action queue (2026-11-01)
- **dbc29eb:**
  - Every step (round or replay) resets the search text and the list query to empty, and stops auto-type.
  - Visuals only are 1.5× slower. The BITE text stays 1.5 s. The result card comes 1.7 s after the final hit.
- **8b1efa5:** Fiber-kun's actions (a dash with its slash, or a goblin cut) play one after another, each in full.
  - Waiting actions merge, so fast typing never blurs the fight.
  - The round's measured end is again the final commit + 130 ms (as in c9f824e) and does not wait for the animation.
  - Latency, bites and ranks are unchanged.
- **Test** (`scripts/test-talk.mjs`, talk order round → replay ×3, Chromium, 5 passes each; hand = "tokyo ramens", 250 ms between keys):

| build | box empty at every step | R1 | R2 / R3 | frames > 50 ms in R2+R3 (hand / auto) | console errors |
|---|---|---|---|---|---|
| c9f824e (before) | auto 15/15, **hand 0/15** (the bug) | QUEST FAILED 10/10 | S 20/20 | 12 / 4 | 0 |
| dbc29eb | 30/30 | QUEST FAILED 10/10 | S 20/20 | 11 / 0 | 0 |
| **8b1efa5** | **30/30** | **QUEST FAILED 10/10** | **S 20/20** | **12 / 2** | **0** |

  - The hand-typed long frames in R2/R3 sit about 235 ms into the round, in every build, including c9f824e.
  - Cause: with 250 ms between keys, the first list render finishes before the second key, and its commit (~12,000 cells change colour) cannot be interrupted. That is real React work, not new.
- **Strips:** `.check/round2-hand-250ms.png` and `.check/round2-hand-100ms.png`.
  - In the 100 ms strip, made while capturing, one real long task (185 ms) shows the ice beam. The worst key was still 38 ms: rank S.
- **The cold-open truck scene:** unchanged since c996a9a. A frame-by-frame recording of 170460f and dbc29eb shows the same frames.
