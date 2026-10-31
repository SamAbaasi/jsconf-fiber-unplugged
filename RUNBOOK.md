# RUNBOOK

*Phase 3a: this file has the calibration section and the basics. The full pre-talk checklist and the fallback switch come in Phase 3.*

## Run the deck

```bash
cd deck
npm install
npm run build
```

Open `deck/dist/index.html` in Chrome (double-click works, no server needed). **F** = fullscreen, **P** = presenter window, **M** = sound.

## Calibration (do this on the presentation laptop, before the talk)

The boss room compares three rounds with **the same work**: N cells (fibers) × X µs of work per cell, the same for all three rounds and always shown in the top bar. What is right depends on the laptop and the screen, so measure it on the real setup once.

Why two numbers? On a slow machine the long frames in round 2 are not the render (that is sliced into 5 ms pieces): they are the **commit and the browser's style/layout/paint of the DOM** (each cell is one DOM node), which never yield. Fewer cells = a smaller DOM. The result screen shows the measured split of the worst frame: *render · commit · style/layout/paint · canvas · other*.

### Before you start

1. Laptop **on power** (charger plugged in).
2. **Battery saver / low-power mode OFF.** On macOS: System Settings → Battery → Low Power Mode → Never (at least while on power). On Windows: Settings → System → Power → Power mode → Best performance.
3. **Close other apps** (Slack, Docker, IDE, video calls, other browser windows).
4. **Connect the external monitor**, the same way you'll connect the projector (same resolution if you know it). Move the Chrome window to that monitor.
5. Open `deck/dist/index.html` in **Chrome** and go **fullscreen** (F11 on Windows / ⌃⌘F on macOS, or press **F** in the deck).

### Steps

1. Go to the boss room: type `#/9/0` at the end of the URL (or page through until "BOSS ROOM").
2. Press **K**. A checklist appears on the right. Check every line.
3. Press **K** again. Calibration starts. **Don't touch the keyboard or mouse.**
   - It plays rounds 1, 2, 3 five times (auto-type), about 2–3 minutes per setting.
   - It starts at 10,000 cells × 12 µs (or your `?work`/`?cells` values).
   - If round 2 is not rank **S** in at least 4 of 5 runs, it looks at round 2's measured worst frames:
     - mostly **commit + style/layout/paint** → the next smaller DOM: 10,000 → 6,400 → 3,600 → 1,600 cells, with more µs per cell so that cells × µs stays about the same;
     - mostly **render** → the next smaller DOM at the same µs (less render work too); at 1,600 cells, 2 µs less per cell (the same as the **[** key).
   - It stops at the first setting where round 2 is S in ≥ 4/5 **and** round 1 is still C in ≥ 4/5.
   - One setting for all three rounds, so the comparison stays fair.
4. When it's done, the chosen setting is shown big, for example **3,600 × 12 µs** (what it chose in a headless test at 4× CPU throttle), with a table of every run and the measured split of round 2's worst frame.
5. Reuse it: open the deck as `index.html?work=12&cells=3600#/1/0` (your values). Bookmark that URL. The top bar of the boss slide shows "same work: 3,600 fibers × 12 µs".

If the panel says **"No setting works on this machine"**, it shows the reason:
- *"round 2 is already S, but round 1 is C in only N/5"*: this machine is so fast that round 1 doesn't jank clearly even at the starting value. Try once more with more work: press **]** a few times (it shows the value in the top bar), then **K**, **K** again.
- *"even with 1,600 cells × N µs, round 2 is S in only N/5"*: the machine (or its screen setup) is too slow for a clean round 2. Check the list above (power, battery saver, other apps), then try again. If it still fails, use the recorded fallback video for that part.

**K** or **Esc** cancels a running calibration. **Esc** closes the panel when it's done.

### By hand

- **[** / **]**: less / more work per cell (2 µs steps). The value is in the top bar.
- **A**: auto-type one round. **R**: restart the round. **↑**: jump (shows the input delay when it's over 50 ms).

### What the numbers mean

- A **goblin** is one keystroke. Its latency is measured from the input event's `timeStamp` to the first animation frame after the commit that shows its text. Over 50 ms, it bites.
- The **dragon** is the list: one fiber (and one DOM node) per cell. Its HP is the number of keystrokes of this round the list hasn't rendered yet. Each real list commit is a hit; the final commit (the one that shows the last keystroke) kills it.
- Rank: **S** 0 bites and no frame over 100 ms · **A** ≤ 2 bites and no frame over 150 ms · **B** ≤ 5 bites · **C** more than 5 bites = **QUEST FAILED** ("DRAGON DOWN… but the village fell": the list did render, but the user waited too long). Only bites and frames decide it; there is no HP luck.
