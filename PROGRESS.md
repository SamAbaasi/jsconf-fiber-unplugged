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
