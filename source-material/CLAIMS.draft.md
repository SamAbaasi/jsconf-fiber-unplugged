# CLAIMS.md — React Fiber Unplugged (JSConf JP 2026)

**Pinned version:** React **19.3.1** (npm `latest`, checked 2026-10-30), react-dom 19.3.1, scheduler 0.28.0.
**Source:** `facebook/react` tag `v19.3.1` (commit `61aa00df`). Links below point to that tag.
**Published-build cross-check:** the npm production builds (`scheduler.production.js`, `react-dom-client.production.js`) match the source findings marked ✅B.

Legend: ✅ verified · ✏️ corrected (my article was wrong or imprecise) · ➕ new finding worth saying on stage · ⚠️ say carefully

Base URL: `https://github.com/facebook/react/blob/v19.3.1/packages/`

---

## A. The work loop

| # | Claim for the talk | Status | Evidence |
|---|---|---|---|
| A1 | Old/blocking path: `workLoopSync` is a plain `while (workInProgress !== null) performUnitOfWork(...)` with no exit. | ✅ | `react-reconciler/src/ReactFiberWorkLoop.js#L2772` |
| A2 | Concurrent path in stable React: `while (workInProgress !== null && !shouldYield())`. | ✅B | `ReactFiberWorkLoop.js#L3073` (`workLoopConcurrentByScheduler`); prod build line 12703 |
| A3 | ➕ A second loop exists: `workLoopConcurrent(nonIdle)` yields after **25 ms** for transitions (to cap animations at ~30 fps) and 5 ms for idle. It is **behind `enableThrottledScheduling = false`** — not used in stable 19.3.1. | ✅ ⚠️ | `ReactFiberWorkLoop.js#L3056`, call site `#L3014`; flag `shared/ReactFeatureFlags.js#L76` |
| A4 | ➕ **Time slicing only applies to non-blocking lanes.** If the lanes include Sync, InputContinuous, Default or Gesture, React renders with `renderRootSync` → `workLoopSync`, even for concurrent roots. Only Transition / Retry / Idle / Offscreen / Deferred work is time-sliced. | ✅ | `ReactFiberWorkLoop.js#L1168` (`shouldTimeSlice`), `react-reconciler/src/ReactFiberLane.js#L684` (`includesBlockingLane`) |
| A5 | ➕ Starvation guard: a transition that waits longer than **5000 ms** expires and is then rendered without time slicing. (Sync-class lanes: 250 ms.) | ✅ | `ReactFiberLane.js` `computeExpirationTime`; `shared/ReactFeatureFlags.js#L147-L149`; `includesExpiredLane` in `shouldTimeSlice` |

## B. Yield vs interrupt

| # | Claim | Status | Evidence |
|---|---|---|---|
| B1 | **Yield**: when `shouldYield()` returns true, the loop stops; `workInProgress` keeps its position; the next slice continues from the same fiber. | ✅ | `ReactFiberWorkLoop.js#L2787` comment: "Otherwise we'll continue where we left off." |
| B2 | **Interrupt**: if the next render has different lanes (e.g. a keystroke's SyncLane arrives during a transition), React throws away the work-in-progress stack (`prepareFreshStack`) and the transition later **restarts from the root**. | ✅ | `ReactFiberWorkLoop.js#L2787` (concurrent) and `#L2635` (sync): `if (workInProgressRoot !== root \|\| workInProgressRootRenderLanes !== lanes)` |
| B3 | ✏️ Part 2 says "pause and resume from that fiber". True for **yield**, not for **interrupt**. The talk must separate the two. | ✏️ | B1 + B2 |

## C. The Scheduler package

| # | Claim | Status | Evidence |
|---|---|---|---|
| C1 | Default slice = **5 ms** (`frameYieldMs`). | ✅B | `scheduler/src/SchedulerFeatureFlags.js#L11`; prod build `frameInterval = 5` |
| C2 | `shouldYieldToHost`: yield if `needsPaint` (a commit asked for paint) **or** ≥ 5 ms elapsed since the task slice started. | ✅B | `scheduler/src/forks/Scheduler.js#L459` |
| C3 | Host loop uses **MessageChannel** in browsers; comment: preferred "because of the 4ms setTimeout clamping". `setImmediate` in Node/jsdom; `setTimeout` as last fallback. No `requestIdleCallback`. | ✅B | `Scheduler.js#L533-L560` |
| C4 | Tasks live in a **min-heap** priority queue ordered by expiration time. | ✅ | `scheduler/src/SchedulerMinHeap.js`, `Scheduler.js` `push(taskQueue, ...)` |
| C5 | ✏️ Two layers, not one: **lanes** (reconciler) decide *what*; **Scheduler priorities** decide *when a task runs*. SyncLane work **never enters the Scheduler queue** — it is flushed in a **microtask**. | ✅ | `react-reconciler/src/ReactFiberRootScheduler.js#L443-L456` (sync → `callbackNode = null`), `scheduleMicrotask` usage `#L667` |
| C6 | Lane → Scheduler priority: Discrete/Continuous → `UserBlocking`; Default **and Transitions** → `Normal`; Idle → `Idle`. (Transitions and default updates get the *same* Scheduler priority; the difference is lanes + time slicing.) | ✅ ➕ | `ReactFiberRootScheduler.js#L481-L497` |

## D. Lanes and events

| # | Claim | Status | Evidence |
|---|---|---|---|
| D1 | Lanes are a **31-bit bitmask**. SyncLane = `0b…10` (2), InputContinuous = 8, Default = 32, 14 Transition lanes, 4 Retry lanes, Idle, Offscreen, Deferred. | ✅ | `ReactFiberLane.js#L47-L120` (`TotalLanes = 31`) |
| D2 | Event → priority: `click`, `keydown`, `input`, `change`… → **Discrete = SyncLane**; `mousemove`, `scroll`, `pointermove`… → **Continuous**; others → Default. | ✅ | `react-dom-bindings/src/events/ReactDOMEventListener.js#L312`; `react-reconciler/src/ReactEventPriorities.js#L25` |
| D3 | ➕ Sync, InputContinuous and Default are grouped as `SyncUpdateLanes` and picked together as "highest priority" (unified sync batching). | ✅ ⚠️ | `ReactFiberLane.js#L56`, `getHighestPriorityLanes` |

## E. useTransition / startTransition

| # | Claim | Status | Evidence |
|---|---|---|---|
| E1 | ✏️ The callback passed to `startTransition` **runs synchronously, right now, inside the event handler**. Only the *resulting render* gets a transition lane. Heavy computation inside the callback still blocks. | ✅ | `react-reconciler/src/ReactFiberHooks.js#L3165` (`const returnValue = callback();`) |
| E2 | ✏️ Part 9's `startTransition(() => setResults(filter(query)))` is wrong twice: `query` is the stale render snapshot, and `filter` runs synchronously in the handler. **Correct pattern:** keep the input state urgent, put the *query used for results* in a transition, and do the filtering **during render** of the results component. | ✏️ | E1 + Part 6 snapshot model |
| E3 | Transition renders are time-sliced and interruptible (A4 + B2); `isPending` is true while the transition is in flight. | ✅ | A4, B2 |

## F. useDeferredValue

| # | Claim | Status | Evidence |
|---|---|---|---|
| F1 | During an **urgent** render, `useDeferredValue(value)` returns the **previous** value and schedules a second render on a **deferred transition lane** (Transition lanes 11–14). In that second render it returns the new value. | ✅ | `ReactFiberHooks.js#L3056` (`updateDeferredValueImpl`), `requestDeferredLane` in `ReactFiberWorkLoop.js#L884`; `ReactFiberLane.js#L91` |
| F2 | ➕ If the render is **already non-urgent** (e.g. inside a transition), it does **not** defer — it returns the new value immediately. | ✅ | `ReactFiberHooks.js` `shouldDeferValue = !includesOnlyNonUrgentLanes(renderLanes) && !isRenderingDeferredWork()` |
| F3 | Optional `initialValue` argument exists (used on mount). | ✅ | `mountDeferredValueImpl(hook, value, initialValue)` |

## G. Effects timing

| # | Claim | Status | Evidence |
|---|---|---|---|
| G1 | `useLayoutEffect` runs synchronously in commit, before paint. | ✅ | `ReactFiberCommitWork.js` `commitLayoutEffects` |
| G2 | ✏️ After a **discrete** update (click, keydown), passive effects (`useEffect`) are flushed **synchronously at the end of the current task — before paint**. Otherwise they run in a later Scheduler task (Normal priority, after paint). Part 9's "useEffect runs after paint via MessageChannel" is wrong for the Add-to-Cart click. | ✏️ | `ReactFiberWorkLoop.js#L4316-L4328` (`includesSyncLane(pendingEffectsLanes)` → `flushPendingEffects()`) |

## H. Bailouts

| # | Claim | Status | Evidence |
|---|---|---|---|
| H1 | When a component's own state changes, ancestors get `childLanes` marked. An ancestor with no own update and unchanged props (`oldProps === newProps`) **bails out without calling its function** and clones its children; React descends only along the `childLanes` path. | ✅ | `react-reconciler/src/ReactFiberBeginWork.js#L3826` (`bailoutOnAlreadyFinishedWork`), `cloneChildFibers` |
| H2 | ✏️ Part 9 says Header's function runs on the cart click. If the state lives in CartIcon, **only CartIcon's function runs**; Header bails out. (Header runs only if the state lives in Header.) | ✏️ | H1 |

## I. Tooling

| # | Claim | Status | Evidence |
|---|---|---|---|
| I1 | React Performance Tracks (Scheduler + Components tracks in Chrome DevTools Performance panel) are enabled in the source (`enableComponentPerformanceTrack = true`) and emit in **development and profiling builds**. | ✅ ⚠️ | `shared/ReactFeatureFlags.js#L248`; `react-reconciler/src/ReactFiberPerformanceTrack.js`. Confirm visually in Chrome before using on stage. |

---

## Corrections to say on stage (honest moments)

1. **Part 9, startTransition example** — E1/E2. *"When I wrote Part 9, I got this wrong."*
2. **Part 9, useEffect after a click** — G2.
3. **Part 9, Header re-renders** — H2.
4. **Part 2, pause vs restart** — B3.

## Strongest new material for the talk

- **A4:** "Time slicing is not for your clicks. Only transitions (and idle/retry work) are sliced. A plain `setState` in a click renders all at once."
- **C5/C6:** "There are two schedulers: lanes decide *what*, the Scheduler package decides *when*. Your keystroke never even enters the Scheduler queue — it runs in a microtask."
- **A3:** "There's already code in React that slows transitions' yielding to 25 ms to cap animations at 30 fps — but it's behind a flag that is off."
- **A5:** "A transition can't starve forever: after 5 seconds it expires and React stops slicing it."
- **F2:** "useDeferredValue inside a transition does nothing extra."

## Still to verify before the slides are final

- Exact lane line numbers if the slide shows the bitmask (D1 range is approximate).
- Performance Tracks screenshots in the actual Chrome version I'll present with (I1).
- Demo behaviour on my laptop: measure real slice lengths with the instrumented scheduler.
