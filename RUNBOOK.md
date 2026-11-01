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
   - It starts at 12,144 cells × 18 µs (or your `?work`/`?cells` values).
   - If round 2 is not rank **S** in at least 4 of 5 runs, it looks at round 2's measured worst frames:
     - mostly **commit + style/layout/paint** → the next smaller DOM: 12,144 → 6,831 → 4,345 → 3,036 cells (6 / 8 / 10 / 12 px cells over the same ×12 dragon art), with more µs per cell so that cells × µs stays about the same;
     - mostly **render** → the next smaller DOM at the same µs (less render work too); at 3,036 cells, 2 µs less per cell (the same as the **[** key).
   - If round 2 is S but round 1's worst key (median of 5) is outside **230–320 ms**, or round 1 is not C in ≥ 4/5, it changes the µs per cell in proportion, aiming at 275 ms, and tries again (at most 8 settings). 230 ms keeps a failed round clearly above the INP "good" limit of 200 ms (CLAIMS L5). If more work breaks round 2, it goes back to the passing setting closest to 275 ms and says so.
   - It stops at the first setting where round 2 is S in ≥ 4/5 **and** round 1 is C in ≥ 4/5 **and** round 1's worst key (median of 5) is 230–320 ms.
   - One setting for all three rounds, so the comparison stays fair.
4. When it's done, the chosen setting is shown big, for example **3,600 × 12 µs** (what it chose in a headless test at 4× CPU throttle), with a table of every run and the measured split of round 2's worst frame.
5. Reuse it: open the deck as `index.html?work=12&cells=3600#/1/0` (your values). Bookmark that URL. The top bar of the boss slide shows "same work: 3,600 fibers × 12 µs".

If the panel says **"No setting works on this machine"**, it shows the reason:
- *"round 1 is C in only N/5 even at 80 µs"*: this machine is so fast that round 1 doesn't jank clearly even with the most work.
- *"Round 1's worst key stays outside 230–320 ms … using …"*: not a failure. Round 1 is C and round 2 is S, but round 1's worst key is outside the band. Check the result card: a failed round whose worst key is ≤ 200 ms shows "INP: good" in grey, never green. That means the work is still too light: press **]** a few times and calibrate again.
- *"even with 3,036 cells × N µs, round 2 is S in only N/5"*: the machine (or its screen setup) is too slow for a clean round 2. Check the list above (power, battery saver, other apps), then try again. If it still fails, use the recorded fallback video for that part.

**K** or **Esc** cancels a running calibration. **Esc** closes the panel when it's done.

### Keys and the search box
- **Esc** always takes the keyboard away from the search box (and cancels or closes calibration).
- The search box lets go of the keyboard by itself when a round or replay step opens and when a round ends, so **A**, **R** and the clicker work.
- **A** before the first key starts auto-type even if the search box has focus; it never types the letter "a". So when typing by hand, don't start the round with the letter "a".
- **A** right after a round (or right after the 12th key) waits for the result, then starts a new round and auto-types it.

### By hand

- **[** / **]**: less / more work per cell (2 µs steps). The value is in the top bar.
- **A**: auto-type one round (12 keys). **R**: restart the round (with a warm-up render). **↑**: jump (shows the input delay when it's over 50 ms).
- **Typing by hand:** a round is **12 keys** ("keys 3 / 12" in the arena). A pause never ends a round. **Enter** (or the **clicker**) ends it early after at least 3 keys; with fewer it says "type more".

### What the numbers mean

- A **goblin** is one keystroke. Its latency is measured from the input event's `timeStamp` to the first animation frame after the commit that shows its text. Over 50 ms, it bites.
- The **dragon** is the list: one fiber (and one DOM node) per cell. Its HP is the number of keystrokes of this round the list hasn't rendered yet. Each real list commit is a hit; the final commit (the one that shows the last keystroke) kills it.
- The castle (your UI) falls when, after 3 keys, at least **50%** of the keys bite → **QUEST FAILED**. Ranks: **S** 0 bites · **A** at most 1 bite (or 10% of the keys, if more) and worst key ≤ 100 ms · **B** fewer than 50% bite · **C** = QUEST FAILED. The dragon's HP is the round's key count; it goes down when the list shows the last key (in a lost round it only kneels).
