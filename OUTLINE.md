# Slide outline: React Fiber Unplugged (Phase 1 draft, for approval)

**Saman Abbasi** · JSConf JP 2026 · Sun 22 Nov 2026, 15:50–16:20, Track A · 30 min
Refs like `[A4]` point to rows in [CLAIMS.md](CLAIMS.md). ★ = live React demo. ✎ = "When I wrote Part N, I got this wrong" moment.

Design rules for every slide:
- One idea per slide. Big code (≥ 28 px). One short English line at the bottom of the screen, so people can read along.
- Only original pixel art and CSS/SVG UI. No logos, no known characters, no AI illustrations.
- Fonts bundled locally under SIL OFL: **DotGothic16** (Japanese + Latin pixel feel) for the UI, plus a monospace for code. Phase 2 checks glyph coverage for the title.
- Same color for each rank everywhere: S gold, A red, B blue, D green, E gray.

---

## Act 0: Opening (0:00–2:30)

| # | Time | Slide | Visual / [CLICK] steps | Key line (spoken) | Refs |
|---|---|---|---|---|---|
| 1 | 0:00 | **Title** | Light-novel cover: 「転生したらReactのFiberだった件」, English subtitle, official title, my name. Fiber-kun walks in (idle animation). | "こんにちは。I'm Saman." | — |
| 2 | 0:20 | **Who am I** | STATUS window for me: Class *Staff Frontend Engineer*, Guild *MTN Irancell*, Home *Tehran*, Skill *"How React Works" ×9*. | One sentence on the series. | — |
| 3 | 1:00 | **Prologue** | Pixel city skyline: Tehran at night with a small CRT and a 16-bit game pad (original drawing) → [CLICK] → the screen wipes to a pixel Tokyo street → [CLICK] this stage. | "I grew up in Tehran playing Sega. Today I stand on a stage in Tokyo. This is my isekai." Warm, about 45 s. | — |
| 4 | 2:00 | **Quest** | Quest card: "Learn how the scheduler decides. Find out why some fixes work and others don't." | The abstract in one line. | — |

## Act 1: The old world (2:30–5:30)

| # | Time | Slide | Visual / [CLICK] steps | Key line | Refs |
|---|---|---|---|---|---|
| 5 | 2:30 | **Kingdom of the Call Stack** | A stack of frames grows ↓, `workLoopSync` code on the side, FPS meter going red. [CLICK] highlight `while (workInProgress !== null)`: no exit. | "Once it starts, it cannot stop." | A1 |
| 6 | 4:00 | **Truck-kun** ★ | A small live input + a 100 ms sync render. Type → letters appear late. An original pixel truck crosses the screen on each freeze. | "One long task. The browser can't paint. Your keystroke waits." | A1, A4 |
| 7 | 4:50 | **Potion of debounce** | [CLICK] add debounce: the freeze comes later, but still the same size. Timeline bar: same 100 ms block, moved to the right. | "Debounce only moves the hit." | I1 |

## Act 2: Reincarnation (5:30–13:30)

| # | Time | Slide | Visual / [CLICK] steps | Key line | Refs |
|---|---|---|---|---|---|
| 8 | 5:30 | **Reincarnation** | Fade to white → Fiber-kun wakes up → "SYSTEM: You have become a Fiber." | "A fiber is a stack frame that React controls." | A8 |
| 9 | 6:00 | **STATUS window** | JRPG window with real fields: `type`, `key`, `return`, `child`, `sibling`, `alternate`, `lanes`, `childLanes`, `memoizedState`. Each [CLICK] lights up one group (identity → links → twin → lanes). | "Just a plain object. So React can stop and come back." | A8 |
| 10 | 7:00 | **Tree walk** | Animated walk on an 8-node tree: down `child`, across `sibling`, up `return`. Each [CLICK] = one `performUnitOfWork`. | "One fiber = one unit of work." | A7 |
| 11 | 7:30 | **The childLanes trail** ✎3 | Cart click: the trail lights up from CartIcon to the root. Header stays gray: "bailout, children cloned". Then a correction card: **Part 9 said Header runs. Only CartIcon runs.** | "When I wrote Part 9, I got this wrong." | H1, H2, H3 |
| 12 | 8:00 | **SKILL UNLOCKED: Yield** | "NEW SKILL" popup. The loop code gains `&& !shouldYield()`. A stamina bar (5 ms) drains per fiber; when it is empty, Fiber-kun sits down and the browser paints. | "Work 5 ms. Give the browser a turn. Continue from the same fiber." | A2, B1, C4 |
| 13 | 9:00 | **shouldYieldToHost** | Real code, 10 lines. Two conditions light up: `needsPaint`, `elapsed ≥ 5 ms`. Note: "5 ms per browser task". Side note: "Code exists for a 25 ms version; it is switched off." | | C5, A3 |
| 14 | 9:30 | **The catch** ✎4 | Big card: "Clicks are **not** sliced." Three lanes go through `renderRootSync`; only transitions get the stamina bar. Correction card for Part 1 "~5 ms per task". | "Time slicing is not for your click. It is for the work you mark as not urgent." | A4, C10 |
| 15 | 10:15 | **Yield ≠ Interrupt** | Split screen. Left, "Yield": pause, same tree continues. Right, "Interrupt": the half-built tree breaks into pixels (`prepareFreshStack`), and React starts again from the root. | "Yield is a pause. Interrupt is a restart." | B1, B2 |
| 16 | 11:00 | **The Scheduler Guild** | Quest board = min-heap. Quests sorted by deadline; UserBlocking 250 ms, Normal 5 s, Idle never. [CLICK] pop the top quest. | "The Scheduler picks the quest with the earliest deadline." | C9 |
| 17 | 12:00 | **The messenger** | Event loop ring: task → MessageChannel message → paint → next message. Comment from the source: "because of the 4ms setTimeout clamping". | "A new task every slice, so the browser can paint in between." | C6, C7, C8 |
| 18 | 12:45 | **Two layers** | Two floors. Upper floor, "Lanes": *what* and *how* (sliced or not). Lower floor, "Scheduler": *when*. Sync work skips the lower floor and takes the microtask stairs. | "Your click never enters the Scheduler queue." | C1, C2, C3 |

## Act 3: Ranks (13:30–17:00)

| # | Time | Slide | Visual / [CLICK] steps | Key line | Refs |
|---|---|---|---|---|---|
| 19 | 13:30 | **Ranks = Lanes** | Guild rank card, one row per [CLICK]: **S** Sync (click, key, input) · **A** InputContinuous (scroll, move) · **B** Default (timers, fetch, first render) · **D** Transition · **E** Idle. Rank C is blank. Bit values in small text (2, 8, 32, 256…). | "Lower bit, higher rank." | D1, D2, D4 |
| 20 | 14:45 | **Who gets a stamina bar?** | Only D and E have one. S/A/B have "∞ — must finish". | | A4 |
| 21 | 15:15 | **Who may cut in line?** | A D render is running. [CLICK] an S quest arrives → D breaks and restarts. [CLICK] an A quest → same. [CLICK] a B quest → it waits; D finishes first. | "Not every update can interrupt. Default waits for a transition." | B3 |
| 22 | 16:00 | **Tokyo aside** | Pixel Yamanote-style loop (original drawing, no logos): a local train waits at a station, an express passes. Station = yield point. | "The local waits at the station so the express can pass." One line, then move on. | — |
| 23 | 16:30 | **Starvation guard** | A D quest's timer goes 0 → 5 s → "EXPIRED" → its stamina bar disappears. | "A transition cannot wait forever. After 5 seconds it stops yielding." | A5 |

## Act 4: Boss fight (17:00–24:00)

The boss is **"The 10,000-Row Hydra"**: a real React list with 10,000 cheap rows (cheap rows on purpose, see I5/A6). An FPS meter and a live **scheduler timeline** sit at the top; the timeline is drawn from real Scheduler events via the `scheduler` alias (J2). A mode switch: `sync | useTransition | useDeferredValue`.

| # | Time | Slide | Visual / [CLICK] steps | Key line | Refs |
|---|---|---|---|---|---|
| 24 | 17:00 | **Boss intro** | Battle screen: the Hydra's HP bar = 10,000 rows. The party (input, spinner, Fiber-kun) is animated with CSS so you can see when it freezes. | | — |
| 25 | 17:30 | **Round 1: sync** ★ | I type in the search box. Everything freezes: the sprites stop, FPS goes red, the timeline shows one long block, no slices. | "One S-rank render. 10,000 rows. No stamina bar." | A1, A4 |
| 26 | 19:00 | **Round 1 replay** | The same moment, slowed down step by step: event → microtask → `workLoopSync` → commit → effects before paint. | | C2, G2 |
| 27 | 20:00 | **Round 2: useTransition** ★ | Switch mode. Typing stays smooth; the timeline shows ~5 ms green slices, and each keystroke shows a gold S block cutting in, then a "RESTART" marker. `isPending` dims the list. | "The input is S rank. The list is D rank." | A4, B2, E3, E4 |
| 28 | 21:00 | **The wrong spell** ✎1 | Part 9 code on screen with two red marks: `query` (old snapshot) and `filter()` (runs now). [CLICK] a run of the bad version: still janky. [CLICK] the right version: transition only on `setQuery`, filter during render. | "When I wrote Part 9, I got this wrong. The callback runs right now. Only the render waits." | E1, E2 |
| 29 | 22:00 | **isPending** | Small detail card: `isPending = true` is itself an S-rank update. | | E3 |
| 30 | 22:30 | **Round 3: useDeferredValue** ★ | Mode 3. The list gets `query` as a prop; we don't own the setter. Two-row diagram: urgent render (old value) → deferred render (new value). [CLICK] an `initialValue` note. | "When you don't own the setter." | F1, F3, F4 |
| 31 | 23:30 | **Inside a transition?** | One line: inside a transition, `useDeferredValue` doesn't defer again. | | F2 |

## Act 5: Cursed items (24:00–27:00)

An inventory screen; each item shows "CURSED" and has a one-line reason. One [CLICK] per item.

| # | Time | Item | Why | Refs |
|---|---|---|---|---|
| 32 | 24:00 | **Potion of debounce** | Fixed delay on every device; still one blocking piece when it fires. Fine for network, not for CPU work. | I1 |
| 33 | 24:30 | **Scroll of setTimeout(0)** | Makes it B rank, not D. Still not sliced. | I2 |
| 34 | 25:00 | **Heavy bag inside startTransition** | The callback runs now. | I3 |
| 35 | 25:30 | **"useEffect is always after paint"** ✎2 | After an S-rank render, effects run before paint. Correction card for Part 9. | G2 |
| 36 | 26:00 | **Amulet of flushSync** | Leaves the transition, forces S rank, runs now. | I4 |
| 37 | 26:20 | **One giant component** | React yields between fibers, never inside one. | A6, I5 |
| 38 | 26:40 | **memo on everything** | A fine item, cursed when it's on everything. It doesn't change the lane. | I6 |

## Act 6: Rank S (27:00–30:00)

| # | Time | Slide | Visual | Key line | Refs |
|---|---|---|---|---|---|
| 39 | 27:00 | **Three takeaways** | 1) Lanes decide *what* and *if it is sliced*; the Scheduler decides *when*. 2) Only non-urgent work is sliced, and React yields between fibers. 3) Mark the heavy render as non-urgent, not the event handler. | | A4, C1, E2 |
| 40 | 28:15 | **See it yourself** | Performance panel → "Scheduler ⚛" and "Components ⚛" tracks (dev/profiling builds). Screenshot taken on my laptop. | | J1 |
| 41 | 28:45 | **RANK UP: S** | Fiber-kun rank-up animation. QR codes: playable deck + LinkedIn. "I'm open to Staff Frontend roles; let's talk at the afterparty." | | — |
| 42 | 29:30 | **ありがとうございました** | End card, with credits and "all art original, made for this talk". | | — |

---

## Proposed changes to the planned structure (because of the verification)

1. **New slide 14, "Clicks are not sliced."** This is the biggest correction of the common mental model, so it gets its own beat (A4).
2. **New slide 21, "Who may cut in line?"** Default does not interrupt a transition (B3). It is verified, surprising, and easy to show with ranks.
3. **Slide 11 moves the Header correction early**, next to `childLanes`, so the boss fight is not overloaded with corrections.
4. **Rank C is blank on purpose.** Retry/Gesture lanes are out of scope; I'll say one sentence about it if asked.
5. **Cursed items gains two new items**, `setTimeout(0)` and "one giant component", both from verified behavior (A4, A6).
6. **"Why not requestIdleCallback" is dropped as a claim** (C8). Only the source comment about the 4 ms clamp stays.

## Phase 2 prototype scope (after approval)

Title (1) → STATUS window (9) → Yield skill animation (12) → live boss fight round 1 + 2 (25, 27) with the real FPS meter and the live scheduler timeline. Includes the presenter window, 1920×1080 scaling, keyboard/clicker navigation, offline build, and a check that the Vite `scheduler` alias works.
