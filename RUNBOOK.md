# RUNBOOK

*Phase 2.7: this file has the calibration section and the basics. The full pre-talk checklist and the fallback switch come in Phase 3.*

## Run the deck

```bash
cd deck
npm install
npm run build
```

Open `deck/dist/index.html` in Chrome (double-click works, no server needed). **F** = fullscreen, **P** = presenter window, **M** = sound.

## Calibration (do this on the presentation laptop, before the talk)

The boss fight compares three rounds with **the same work per cell**. How much work is right depends on the laptop and the screen, so measure it on the real setup once.

### Before you start

1. Laptop **on power** (charger plugged in).
2. **Battery saver / low-power mode OFF.** On macOS: System Settings → Battery → Low Power Mode → Never (at least while on power). On Windows: Settings → System → Power → Power mode → Best performance.
3. **Close other apps** (Slack, Docker, IDE, video calls, other browser windows).
4. **Connect the external monitor**, the same way you'll connect the projector (same resolution if you know it). Move the Chrome window to that monitor.
5. Open `deck/dist/index.html` in **Chrome** and go **fullscreen** (F11 on Windows / ⌃⌘F on macOS, or press **F** in the deck).

### Steps

1. Go to the boss-fight slide: press **End** and then **←** until "BOSS FIGHT", or type `#/6/0` at the end of the URL.
2. Press **K**. A checklist appears on the right. Check every line.
3. Press **K** again. Calibration starts. **Don't touch the keyboard or mouse.**
   - It plays rounds 1, 2, 3 five times (auto-type), about 2–3 minutes per work value.
   - If round 2 is not rank **S** in at least 4 of 5 runs, it lowers the work per cell by 2 µs (the same as the **[** key) and runs again.
   - It stops at the **highest** work value where round 2 is S in ≥ 4/5 **and** round 1 is still C in ≥ 4/5.
   - The same value is used for all three rounds, so the comparison stays fair.
4. When it's done, the chosen value is shown big, for example **8 µs**, with a table of every run.
5. Reuse it: open the deck as `index.html?work=8#/1/0` (put your value after `work=`). Bookmark that URL. The top bar of the boss slide shows "same work: 10,000 fibers × 8 µs".

If the panel says **"No value works on this machine"**, it shows the reason:
- *"round 2 is already S, but round 1 is C in only N/5"*: this machine is so fast that round 1 doesn't jank clearly even at the starting value. Try once more with more work: press **]** a few times (it shows the value in the top bar), then **K**, **K** again.
- *"even at 2 µs round 2 is S in only N/5"*: the machine (or its screen setup) is too slow for a clean round 2. Check the list above (power, battery saver, other apps), then try again. If it still fails, use the recorded fallback video for that part.

**K** or **Esc** cancels a running calibration. **Esc** closes the panel when it's done.

### By hand

- **[** / **]**: less / more work per cell (2 µs steps). The value is in the top bar.
- **A**: auto-type one round. **R**: restart the round. **↑**: jump (shows the input delay when it's over 50 ms).

### What the numbers mean

- A **goblin** is one keystroke. Its latency is measured from the input event's `timeStamp` to the first animation frame after the commit that shows its text. Over 50 ms, it bites.
- The **dragon** is the 10,000-fiber list. Its HP is the number of keystrokes of this round the list hasn't rendered yet. Each real list commit is a hit; the final commit (the one that shows the last keystroke) kills it.
- Rank: **S** 0 bites and no frame over 100 ms · **A** ≤ 2 bites and no frame over 150 ms · **B** ≤ 5 bites · **C** more bites, or K.O.
