# STORYBOARD: React Fiber Unplugged (Phase 3a)

**Saman Abbasi** · JSConf JP 2026 · Sun 22 Nov 2026, 15:50–16:20, Track A (30 min slot)
**Plan: 25:30 of content + 4:30 buffer** (stage setup, a slow demo, one question).

> **The story (one spine):** A tired frontend developer from Tehran is hit by a truck called LONG TASK and wakes up in another world: a fantasy Japan. A glowing torii is a dungeon Gate. The dungeon is the browser's main thread. Floor by floor he levels up (each skill = one verified React mechanism), reaches the boss room, and ends with a bestiary and a party-recruit screen.
> This is Saman's real story: he came from Tehran to Tokyo for this talk.

How to read this file:
- **IDs** like `A4` are rows in [CLAIMS.md](CLAIMS.md). Every fact on screen and every stage line uses only these rows.
- **Stage lines**: `(Saman)` = Saman's own words, never changed by Claude. `DRAFT` = Claude's draft in simple English (B1 level), for Saman to edit.
- **Built** = built in Phase 3a. **Placeholder** = a slide with this storyboard text only, built in a later phase.
- Every number on screen is either a CLAIMS row or a live measurement from the deck itself.

---

## Metaphors (6 in the whole talk, no more)

Each one shows its real name on screen at least once.

| # | Metaphor | Real name (shown on screen) | IDs |
|---|---|---|---|
| 1 | **The dungeon** = one narrow corridor; each **Gate** = one browser task; a **LONG TASK** truck / S-rank Gate = a task of 50 ms or more | "Dungeon = main thread · Gate = task · S = long task (≥ 50 ms)" | L1, L2, L3 |
| 2 | **Fiber-kun** = one fiber; his **STATUS** window = its real fields; his **twin** = `alternate` | "Fiber-kun = FiberNode (a plain JS object)" | A8 |
| 3 | **《Yield》**, the "dud skill" = stop after 5 ms, give the browser a turn, continue from the same fiber | "《Yield》 = shouldYield()" | A2, B1, C4, C5 |
| 4 | **Guild quest board** = the lanes. 31 slots; **emergency quest** = SyncLane (never posted on the board); **expedition** = a Transition (can pause) | "Quest board = lanes (31-bit mask)" | D1, D2, C2, A4 |
| 5 | **RESPAWN AT ROOT** = an interrupt: the half-built tree is thrown away | "Respawn = interrupt · prepareFreshStack" | B2, B3, B6 |
| 6 | **The boss room**: **Goblin** = one keystroke; **Dragon** = the heavy list render | "Goblin = keystroke · SyncLane" / "Dragon = 10,000-fiber render · Transition" | D2, C2, A4, E4, F1 |

Genre words that are **not** extra metaphors (they are framing): LEVEL UP, skill card, [SYSTEM] window, E–S ranks, 図鑑 bestiary, 仲間募集.

---

## Minute plan

| Start | Scene | Length | Status |
|---|---|---|---|
| 0:00 | Cold open: Tehran → truck → Japan → torii Gate | 1:45 | **Built** |
| 1:45 | Title | 0:30 | **Built** |
| 2:15 | The Gate = the main thread | 1:15 | **Built** |
| 3:30 | Floor 1 · Lv1 STATUS | 2:30 | **Built** |
| 6:00 | Floor 2 · Lv2 《Yield》 外れスキル | 3:30 | **Built** |
| 9:30 | Floor 3 · Lv3 Guild quest board (lanes) | 3:00 | Placeholder |
| 12:30 | Floor 4 · Lv4 Respawn (interrupt) | 2:00 | Placeholder |
| 14:30 | Floor 5 · Lv5 Expeditions (transition / deferred) | 2:30 | Placeholder |
| 17:00 | Boss room (live) | 5:00 | **Built** |
| 22:00 | Patch Notes v1.1 | 1:45 | Built (Phase 2.5) |
| 23:45 | 図鑑 bestiary (recap) | 1:15 | **Built** |
| 25:00 | 仲間募集 ending (DRAFT, optional) | 0:30 | **Built** |
| 25:30 | end of content · 4:30 buffer | | |

---

## Scenes

### 0:00 · Cold open (1:45) · Built

| Step | Audience sees | The ONE idea | IDs | Stage line |
|---|---|---|---|---|
| 0 | **Tehran at night.** Pixel skyline: the Alborz mountains with snow, a generic tall TV-tower silhouette (Milad Tower shape, no logo), city lights, a blue street sign "TEHRAN". Fiber-kun's previous life: a tired frontend developer, laptop under his arm, a coffee cup, dark bags under his eyes. No headband. | This is where I come from. | — | (Saman) "I was a frontend engineer in Tehran…" |
| 1 | **Horn.** A truck with "LONG TASK" on its side drives in fast (0.45 s). Impact, and the page **really freezes** (~1.2 s of synchronous React work). Then the measured frozen time appears, and the fps counter honestly drops to about 1. A [SYSTEM] line: "LONG TASK · N ms · Gate rank S (≥ 50 ms)". | A long task stops everything: no frames, no input. | A1, A4, I4, L1 | DRAFT: "One long task. Everything stops. No frames. No input." |
| 2 | **White flash → another world: a fantasy Japan.** Mt Fuji silhouette, cherry blossoms, a glowing torii. Fiber-kun wakes up, reborn: headband and a sword. | The isekai moment. | — | (Saman) 「目が覚めたら…」 (When I woke up…) |
| 3 | Fiber-kun looks at himself. | He is a fiber now. | A8 | (Saman) "Wait… I'm a plain JavaScript object?" |
| 4 | **[SYSTEM] window:** "You have been reborn as a FiberNode. Lv 1." / "A Gate has opened: MAIN THREAD." The torii glows brighter. | The dungeon is waiting. → title | A8, L2 | DRAFT: "And then a Gate opened." |

### 1:45 · Title (0:30) · Built

| Step | Audience sees | The ONE idea | IDs | Stage line |
|---|---|---|---|---|
| 0 | Light-novel cover 「転生したらReactのFiberだった件」, the official title, name, date. Fiber-kun close-up (×12), standing in front of the torii. | Title. | — | — |
| 1 | Fiber-kun: 「こんにちは!」 | Hello. | — | (Saman) "こんにちは! I'm Saman. I really came from Tehran to Tokyo for this talk." (the second sentence is DRAFT) |

### 2:15 · The Gate = the main thread (1:15) · Built

| Step | Audience sees | The ONE idea | IDs | Stage line |
|---|---|---|---|---|
| 0 | **One narrow corridor.** Four kinds of travellers queue at one Gate: JS (React render + commit), style/layout, paint, input. Only one can pass at a time. Label: "Dungeon = main thread". | The browser has one main thread for JS, layout, paint and input. | L2 | DRAFT: "Inside the Gate there is only one corridor. JavaScript, layout, paint and your click all walk through it. One at a time." |
| 1 | A monster (a long task) gets stuck in the corridor. Input and paint wait behind it, with a waiting timer. | A long task blocks input and paint. | L1, L2 | DRAFT: "If a monster gets stuck here, nobody else can pass. Not your click. Not the next frame." |
| 2 | **Gate rank card.** E ≤ 5 ms · D ≤ 10 · C ≤ 16.7 · B ≤ 33 · A < 50 · **S ≥ 50 ms = Long Task**. Small text: "our ranks · S = spec". The truck from the cold open is entered with its **measured** time → rank S. | Each task is a Gate; S rank is the official 50 ms long-task line. | L1, L3, C4 | DRAFT: "Every task is a Gate. We give them ranks. Only S is official: 50 milliseconds is a long task. The truck was S rank." |

### 3:30 · Floor 1 · Lv1 STATUS (2:30) · Built

| Step | Audience sees | The ONE idea | IDs | Stage line |
|---|---|---|---|---|
| 0 | STATUS window: Fiber-kun, "Lv 1", `type: CartIcon`, other fields `???`. | A fiber is a plain object with fields. | A8 | DRAFT: "SYSTEM: you are a fiber now. Here is my status window." |
| 1 | `return`, `child`, `sibling` fill in; a small tree shows the links. | Fibers link into a tree React can walk step by step. | A7, A8 | DRAFT: "return is my parent. child is my first child. sibling is the next one." |
| 2 | `alternate`: two Fiber-kuns, "current" and "work-in-progress". | Every fiber has a twin: one on screen, one being built. | A8 | DRAFT: "alternate. My twin. One copy is on screen, one is being built." |
| 3 | `lanes` / `childLanes`. | Lanes say where work is waiting. | A8, H1 | DRAFT: "lanes is work waiting here. childLanes is work waiting below me." |
| 4 | **LEVEL UP! Lv1 → Lv2.** Full-screen moment with SFX. Skill card: **《Yield》**, red stamp 外れスキル?, effect "stop working", real name `shouldYield()`, IDs in small text. | He gets a skill that looks useless. | A2, B1 | (Saman) "Effect: stop working." DRAFT: "My only skill… stop working. A useless skill?" |

### 6:00 · Floor 2 · Lv2 《Yield》 外れスキル (3:30) · Built

| Step | Audience sees | The ONE idea | IDs | Stage line |
|---|---|---|---|---|
| 0 | Skill card 《Yield》 "…really?" | Set up the joke. | — | DRAFT: "My skill: stop working. …Really?" |
| 1 | Old loop vs new loop: `workLoopSync` has no exit; the concurrent loop checks `!shouldYield()` before every fiber. | One check before every fiber. | A1, A2 | DRAFT: "Old loop: no exit. New loop: one check before every fiber." |
| 2 | Fiber-kun walks the tree, one fiber per unit of work, with a 5 ms stamina bar (Gate rank E). | Work 5 ms. | A2, A7, C4 | DRAFT: "One fiber at a time. This bar is my 5 ms." |
| 3 | The bar is empty → he stops; the browser paints; a MessageChannel message starts the next task. | Yield = give the browser a turn. | C5, C6, C7 | DRAFT: "The browser's turn. It paints. I wait." |
| 4 | Next slice starts at the **same** fiber. | Yield resumes; nothing is lost. | B1 | DRAFT: "New task. Same fiber. Nothing lost." |
| 5 | Last slice, then commit (commit never stops). | Commit is not sliced. | G1 | DRAFT: "Done. Now commit. Commit never stops." |
| 6 | Summary: "YIELD = PAUSE. Same fiber. Same tree. Nothing lost. But only for work React may pause." | Yield = pause. | B1, A4 | DRAFT: "Yield = pause. Same fiber, same tree. But only for work React may pause." |
| 7 | **Why "dud"?** Two layers: lanes decide *what*, the Scheduler decides *when*. A click is SyncLane: it runs in a microtask and never enters the Scheduler queue, so it never gets 《Yield》. | Yield only works for work React may pause. | C1, C2, A4 | DRAFT: "So why is it a dud skill? A click never meets the Scheduler. It runs in a microtask, with no yield." |
| 8 | **LEVEL UP! Lv2 → Lv3.** New skill: **Guild card** (lanes). IDs in small text. | Next floor: who decides what is urgent? | D1 | DRAFT: "To use my skill, I need to know which quests are urgent." |

### 9:30 · Floor 3 · Lv3 Guild quest board = lanes (3:00) · Placeholder

| Step | Audience sees | The ONE idea | IDs | Stage line |
|---|---|---|---|---|
| 0 | A guild quest board with **31 slots** = the 31-bit lane mask. Lower slot = higher priority. Real names under the slots: Sync 2, InputContinuous 8, Default 32, Transition 256…, Idle 2²⁸. | Lanes are a 31-bit mask. | D1 | DRAFT: "This board has 31 slots. One bit each. Lower bit, more urgent." |
| 1 | Events post quests: click/keydown → Sync, scroll/mousemove → InputContinuous, setTimeout/fetch → Default. | The event type picks the lane. | D2 | DRAFT: "The event decides the rank. A click is urgent. A timer is not." |
| 2 | **Emergency quest**: SyncLane is never posted on the board. It runs at once in a microtask. Real name shown: "Emergency quest = SyncLane · microtask". | Sync work skips the Scheduler queue. | C2 | DRAFT: "An emergency quest never goes on the board. It runs right now, in a microtask." |
| 3 | **Expeditions** (Transition lanes) can pause: 5 ms, give the browser a turn (needsPaint or 5 ms), continue. | Only non-blocking lanes are sliced. | A4, C5, C6 | DRAFT: "Expeditions can stop and rest. Emergency quests cannot." |
| 4 | LEVEL UP Lv3 → Lv4: **Respawn**. | | B2 | |

### 12:30 · Floor 4 · Lv4 Respawn = interrupt (2:00) · Placeholder

| Step | Audience sees | The ONE idea | IDs | Stage line |
|---|---|---|---|---|
| 0 | Fiber-kun is halfway through a transition render. A keystroke (SyncLane) arrives. | | B2 | |
| 1 | The half-built tree breaks into pixels: **RESPAWN AT ROOT** (`prepareFreshStack`). The keystroke commits first, then the transition starts again from the root. | Interrupt = throw away and restart. Yield ≠ interrupt. | B2, B1, B6 | DRAFT: "Yield is a pause. Interrupt is a restart from the root." |
| 2 | Not every update interrupts: a Default update waits for the transition. | Only higher priority interrupts. | B3 | DRAFT: "A timer cannot stop an expedition. It waits." |
| 3 | LEVEL UP Lv4 → Lv5. | | | |

### 14:30 · Floor 5 · Lv5 Expeditions: transition / deferred (2:30) · Placeholder

| Step | Audience sees | The ONE idea | IDs | Stage line |
|---|---|---|---|---|
| 0 | `startTransition(() => setQuery(v))`: the callback runs **now**; only the render it schedules waits. | The callback is not deferred. | E1, E2 | DRAFT: "startTransition runs the callback now. Only the render waits." |
| 1 | `useDeferredValue`: urgent render with the old value, then a deferred render with the new one. Inside a transition it does not defer again. | Two renders: urgent first, heavy later. | F1, F2 | DRAFT: "First the old value, fast. Then the new value, later." |
| 2 | Expedition timer: after 5 s a waiting transition expires and stops yielding. | Starvation guard. | A5 | DRAFT: "An expedition cannot wait forever. After 5 seconds, it stops resting." |
| 3 | LEVEL UP Lv5: the boss room door. | | | |

### 17:00 · Boss room (5:00, live) · Built

Same workload every round: "same work: N fibers × X µs" stays on screen. Rules on screen: a **goblin** = one keystroke (SyncLane); it bites if its text needs more than 50 ms to appear (measured from `event.timeStamp` to the first frame after its commit). The **dragon** = the heavy list render; each real list commit is a slash that lands; the final commit (the one that shows the last keystroke) kills it. Rank: S 0 bites, no frame > 100 ms · A ≤ 2 bites, ≤ 150 ms · B ≤ 5 bites · C more.

| Step | Audience sees | The ONE idea | IDs | Stage line |
|---|---|---|---|---|
| 0 | **Round 1, no transition.** Auto-type. Goblins pile up and bite. One manual ↑ jump shows the input delay. The list does render, so the dragon goes down, but more than 5 bites → **"DRAGON DOWN… but the village fell. QUEST FAILED."** Rank C. | Everything in one sync render: correct result, too late for the user. | A1, A4, D2, C2, L1 | DRAFT: "The dragon is down. But the user left a long time ago." |
| 1 | **Round 2, useTransition.** Between 5 ms slices, Fiber-kun turns and cuts each goblin. A real thrown-away render shows RESPAWN AT ROOT. The dragon dies on the final commit → PERFECT / S when earned. | Urgent text first; the heavy list in slices; interrupts restart. | A2, A4, B1, B2, C1, C4, C5, E4 | DRAFT: "The input is S rank. The list is an expedition. 《Yield》 won this fight." |
| 2 | **Round 3, useDeferredValue.** Same result, other API. | When you don't own the setter. | F1, F4 | DRAFT: "Same fight, but I don't own the setter." |

If round 2 is A instead of S: DRAFT: "A, not S. One key was late. These numbers are real, so the game does not lie for me."

### 22:00 · Patch Notes v1.1 (1:45) · Built (Phase 2.5)

Five corrections to Saman's own articles, one per click: startTransition callback runs now (E1, E2), useEffect after a click runs before paint (G2), only CartIcon runs (H2, H3), 5 ms is per browser task and only for non-urgent work (C5, C10, A4), a keystroke restarts the render from the root (B1, B2, B6).
(Saman) "When I wrote Part 9, I got this wrong. Here is what the source actually does."

### 23:45 · 図鑑 bestiary (1:15) · Built

One screen, one line per entry, ≥ 32 px, made to be photographed. Each line: the game name → the React name → the CLAIMS IDs.

| Entry | Real name | IDs |
|---|---|---|
| LONG TASK truck / S-rank Gate | a main-thread task of 50 ms or more | L1 |
| Dungeon / Gate | the main thread / one task | L2, L3 |
| Fiber-kun | a FiberNode: a plain JS object | A8 |
| Twin | `alternate`: current ↔ work-in-progress | A8 |
| 《Yield》 | `shouldYield()`: stop after 5 ms, resume the same fiber | A2, B1, C4 |
| Quest board | 31 lanes, lower bit = more urgent | D1 |
| Emergency quest | SyncLane: microtask, no Scheduler queue | C2 |
| Expedition | Transition lane: sliced, can be interrupted | A4, E4 |
| RESPAWN AT ROOT | interrupt: `prepareFreshStack`, restart from the root | B2 |
| Goblin | one keystroke (SyncLane) | D2 |
| Dragon | the heavy list render in a transition | A4, E4, F1 |

DRAFT: "This is the whole talk on one page. Take a photo."

### 25:00 · 仲間募集 ending (0:30) · Built, DRAFT

"仲間募集 · Looking for my next guild". Saman Abbasi, link placeholders, a QR placeholder box. **DRAFT: Saman decides whether to use this slide.**
DRAFT: "Thank you. ありがとうございました." (Japanese not added to the deck until Saman approves it.)

---

## Notes on the brief

- The brief's Floor 3 line says "SyncLane … (C5: never enters the Scheduler queue, runs in a microtask)". That is row **C2** in CLAIMS.md; C5 is `shouldYieldToHost` (needsPaint or 5 ms). The storyboard uses C2 for the emergency quest and keeps C5 for "expeditions rest".
- The long-task quote in the brief is from the **MDN Glossary** page, not the `PerformanceLongTaskTiming` page (which says "50 milliseconds or more"). The W3C spec says "exceeds 50ms". See L1.
- D1 lane line numbers are now exact: `#L41-L110` (was `#L41-L112`), with one link per lane.
- The black "目が覚めたら…" opening slide is gone: Saman's line now plays at the moment Fiber-kun wakes up in the other world (cold open step 2).
