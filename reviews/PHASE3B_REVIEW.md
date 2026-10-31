# Phase 3b: independent review (raw report)

Reviewer: a separate agent that did not build anything. It was given only `/tmp/review-pack` (59 screenshots, LINEUP.png, the cold-open / boss-rounds / ending recordings with frames extracted, the frame strip) and the checklist from the Phase 3b brief, including the new question: "can a viewer tell a lost round from a won round with the sound off and without reading?". The report below is unedited. What was fixed is in `PROGRESS.md` (Phase 3b).

---

# Strict review: React Fiber Unplugged deck (review pack only)

I checked all 59 screenshots, LINEUP.png, frame-strip.png and every 1 fps frame of the 3 videos. I measured sprites with PIL (`python3 -I`) and made 25% downscales. Zoom crops are in `/tmp/review-pack/zoom/` and the 480×270 contact sheets are in `/tmp/review-pack/small/`.

## 0. Can a viewer tell a lost round from a won round (sound off, no text)?

**BLOCKER: In all three rounds the strongest images say "we beat the dragon". The loss signal is small and off to the side.**

- **Round 1 (lost)** in `slide-09-step-0-result.png` and video frames 009–012:
  - The whole arena turns grey/brown and the right panel turns grey.
  - The dragon is tilted about 25° with its head up and to the left, in the same pose as in the won rounds. It reads as rearing up, not dead.
  - Fiber-kun stands in the centre with his eyes shut as lines and his sword lowered. That reads as asleep or calm, not beaten.
  - The only loss-specific image is 3 houses with flames on the roofs and 3 goblins floating above them. It sits in the far-left corner (x 35–290 of a 1150 px arena, about 20%).
  - At 25% size the goblins look like a green hedge. The burning houses (two windows plus a door, with flames on top) read as little faces with spiky red hair.
  - In motion it is worse. Video frame 008 shows the same "FINISH!" slash on the dragon that rounds 2 and 3 get (frames 023, 038). The lost round climaxes exactly like a win, then fades to grey.
  - The cause is a design choice: dragon HP = "keys not on screen" (24 keys). The dragon therefore dies in every round no matter how badly the UI did.
- **Round 2 (won)** in `slide-09-step-2-result.png`:
  - Full colour, houses intact, Fiber-kun smiling with his sword raised, a small firework ring, gold panel border.
  - It reads as a win. But the dragon is again tilted upright, so "dragon down" is not visible.
  - Fiber-kun's face (closed eyes) is nearly the same as in round 1 at a distance.
- **Round 3 (won)** in `slide-09-step-4-result.png`: identical to round 2 except the dragon is purple. It reads as a win.
- **Verdict:**
  - The grey palette is the only strong cue. Someone glancing at the dragon plus "FINISH!" will read round 1 as a win.
  - Someone who notices only the grey may read it as "the dragon got back up".
  - The "village fell" message, which is the point of the whole demo, is not readable without text.
- **During the fight the rounds are distinguishable, which is good.** In round 1 goblins pile onto the houses and fire appears. In rounds 2 and 3 goblins get slashed before they reach the houses.
  - However, the dragon changes skin each round (red, FROST blue, NIGHT purple). That suggests a different enemy each time and works against the "same work" message. MINOR.
- **MAJOR: the replay colour coding contradicts itself.**
  - The legend gives red three meanings: "long frame / bite / thrown away".
  - The round 2 and 3 replays (`slide-09-step-3.png`, `-step-5.png`) are covered in red boxes (thrown-away work). At 25% they look as "red" as the round 1 failure.
- **MINOR:** the failed round still gets "RANK C". A C reads as a pass. Use F or no rank.

## 1. Proportions (measured)

**World scenes, scale ×8**
- Fiber-kun: antenna tip 16 px = 2 cells. Body is 120 px visible inside a 128 px box (`slide-01-step-2` y 580–700). OK.
- Truck: 303×615 px. That is 2.37× Fiber-kun's height and 4.8× in length. OK.
- Torii: 464 px = 3.6×. OK.

**Title close-up:** ×12 (antenna 24 px). OK.

**Boss arena**
- H is about 750 px inside the frame (white frame at y 110–114 and 865–869). LINEUP claims 760; minor mismatch.
- Dragon: y 325–804 = 480 px = 64%. OK.
- Fiber-kun: 192 px box (180 visible) = 24–25.6%. OK.
- Goblins: 96 px = 12.8%. OK.

**Arena pixel grid breaks (MAJOR)**
- Static frames are on ×12: the dragon bbox is 744 px = 62 cells and its colour runs are multiples of 12.
- Sword: a thin, smooth, rotated line with 4–8 px detail.
- Slash arcs are smooth vector shapes.
- Dragon hit/frost states use 4–6 px dither and noise (`zoom/r1fight.png`).
- The fallen dragon is a rotated bitmap with about 6 px stair-steps (`zoom/fallen.png`).
- In the cold open, Fiber-kun is drawn rotated while flying (cold-open frame 006).

**Scale changes between screens:** level-up screens ×8, Floor 2/3 trees ×6, Yield and ending ×12. MINOR.

## 2. Readability at 25% (480×270)

**MAJOR: boss fight view**
- The right column is not "two big numbers". It is a code panel plus FPS plus worst key.
- The code text is unreadable at 25% and overflows the panel (see 8).
- Also unreadable or noisy at 25%: "same work: 10,000 fibers x 12 µs", "HP 12/24", "pending…", "BITE! 112 ms late" (also clipped at the left edge).

**MAJOR: replays (`slide-09-step-1/3/5`)**
- Unreadable: legend, "whole round · 4.7 s", "124 ms / 135 ms" labels, keys/React/frames row labels.
- Only the yellow caption survives. Red in rounds 2 and 3 looks like failure (see 0).

**MAJOR: dense text slides**
- `slide-05-step-7`: the grey sub-lines ("decide WHAT to render…", "never enters the Scheduler queue") become unreadable.
- `slide-08-step-1`: "inside a transition: one render, no second step" is unreadable.
- `slide-08-step-2`: the didTimeout quote is unreadable.

**MINOR, also unreadable**
- `slide-10-*`: red struck-through "old" lines.
- `slide-11`: right-hand column of the bestiary is borderline.
- `slide-12`: translation line and URLs are borderline.
- `slide-05-step-2..5`: "paint" and "other tasks" chips.
- `slide-07-step-0`: keyboard glyph.
- `slide-03`: "sources" line.

## 3. Things that read wrong

**MAJOR: the dragon reads as a winged unicorn.** It has a single straight cream spiral horn on the forehead, a horse body with a long neck, two straight legs and no claws (`slide-09-step-2.png`). In blue it is very "pony/alicorn".

**MAJOR: the previous-life sprite** (`slide-01-step-0`, `zoom/prevlife.png`).
- The laptop (cyan triangle plus grey bar) reads as a fish tail, so the character reads as a whale or fish lying on the road.
- The curled yellow antenna reads as a "?" or a halo.
- There is no visible change between the previous life and the reborn sprite, so "you have been reborn" shows nothing new.

**MAJOR: leftover in the Japan scene.** A diagonal grey headlight cone, a dark band and a pole sit at x 1600–1920, y 600–630 in `slide-01-step-2/3/4` (`zoom/rightglitch.png`).

**MAJOR: burning houses** (`zoom/r1village.png`). Window-window-door houses with flame "hair" read as faces or burning people. The goblins float above the roofs instead of standing on them.

**MINOR**
- Fiber-kun's antenna (orange square on a bent stalk on a round outlined body) still reads partly as a lit bomb fuse, especially at ×12 on the title, boss and ending screens.
- Round 1 fight (`slide-09-step-0-fight`): the sword is drawn across Fiber-kun's own face, so he looks stabbed. His head also overlaps the dragon's horn.
- Mt Fuji's snow line is a row of evenly spaced white bars that looks like teeth or a comb.
- Bestiary icons: "Dragon" looks like a dog or goat. The "RESPAWN AT ROOT" icon looks like a tombstone, pawn or hydrant. "Twin" uses the normal Fiber-kun instead of the dim work-in-progress twin.
- The tilted "dragon down" pose reads as rearing up in all results (see 0).
- In the frame strip, the dragon loses HP (-3) and flashes white while Fiber-kun is slashing a goblin about 300 px away. The hit and the damage are not visibly connected, and HP drops at +125 ms rather than at contact.
- `slide-01-step-2`: the portrait is asleep (zZ) while the sprite in the scene is awake.

## 4. Story clarity for non-native English speakers

**MAJOR: "Gate" is inconsistent.**
- `slide-03` says "each task = one Gate" but shows one red GATE bar at the entrance with four tasks inside it.
- The bestiary pairs "Dungeon · Gate" with a torii icon. In the cold open the torii was the dungeon entrance.
- After slide 3, "Gate" is never used again.

**MAJOR: Quest board contradicts itself.**
- `slide-06-step-0` shows Sync as a slot on the board.
- `slide-06-step-2` then says "An emergency quest never goes on the board" and blanks the Sync slot.
- Lanes (the board) are being confused with the Scheduler queue.

**MAJOR: terms are used before they are "learned".**
- Each level-up rewards the topic of the *next* floor, so the reward never matches what was just learned (Floor 1 FiberNode fields earn Yield; Floor 5 earns "BOSS ROOM" as a "skill").
- lanes/SyncLane appear on Floor 1 (`slide-04-step-3`) and Floor 2 (`slide-05-step-7`) before the "Quest board" skill.
- "Expedition" is used on Floor 3 (`slide-06-step-3`) and Floor 4 (`slide-07-step-3`) before it is awarded at Lv 4→5.
- "Quest board" and "BOSS ROOM" are objects, not skills.

**MAJOR: two metaphors for keystrokes in the boss room.** Goblins are keystrokes, but dragon "HP = keys not on screen" while "DRAGON = the big list".

**MAJOR: jargon-heavy slides.**
- `slide-05-step-7`: reconciler, Scheduler, SyncLane, microtask, "sliced"; plus "dud".
- `slide-08-step-2`: "expires", "Scheduler task alive too long times out", and the truncated quote "We only check `didTimeout` defensively…", which means nothing to this audience.
- `slide-08-step-1`: "no second step".
- `slide-09-step-5`: "I don't own the setter".

**MINOR**
- The demo app (Header / CartIcon / Badge) is never introduced before `slide-04` ("type CartIcon").
- The Floor 4 list (App, Header, Results, Rows) silently drops Logo/Nav/CartIcon/Badge from the Floor 2 tree.
- Floor 1 tree: no sibling arrows between Logo, Nav and CartIcon.
- Patch notes: "Part 9 / Part 1" refer to articles the audience has not read. "runs now" is vague.
- "Respawn" as a skill is odd, since an interrupt happens *to* you.
- Naming varies: "the big list" vs "the heavy list render"; "Fiber" vs "FiberNode" vs "Fiber-kun".
- Good: one idea per floor, mostly. F1 node, F2 yield, F3 lanes, F4 interrupt/restart, F5 transitions.

## 5. Cultural accuracy

**Tehran is fine.**
- The sign spells تهران correctly and the letters join properly.
- The Milad Tower silhouette (pod plus mast) is right.
- Snowy Alborz mountains to the north are plausible. The blue road sign is plausible.
- No stereotypes.

**MINOR: Japan imagery is a cliché.** Fuji, sakura and torii are a postcard trio for a Tokyo audience. Using a Shinto torii as a dungeon portal is common in games, but a few people may find it flippant. The torii itself (myōjin style, black base sleeves, plaque) is accurate.

**Japanese text is correct.**
- 目が覚めたら… is correct. 「転生したらReactのFiberだった件」 is a correct parody.
- 外れスキル is fine, though the light-novel norm is ハズレスキル.
- Small typography issues:
  - こんにちは! uses a half-width "!" while the ending uses a full-width "！".
  - The ending puts narration in 「」, which marks it as speech.
- The ending lines 「Fiber-kunが 仲間に なりたそうに こちらを見ている！」, 仲間にしますか？ and はい/いいえ are natural, with DQ-style spacing.

Nothing offensive found.

## 6. Copyright resemblance

**MINOR to MAJOR: Tensura.** The Japanese title pattern and the English subtitle "That Time I Got Reincarnated as…" copy the 転生したらスライムだった件 pattern exactly, and the hero is a teal blob. Together, people will read it as Tensura (Rimuru) fan art. Parody titles are common, but consider stripping the slime look.

**MINOR: ending slide.** Apart from the meme text, nothing copies Dragon Quest specifically. The navy box with a square white border and ▶ cursor is generic, not DQ's black rounded double border. However, a blue blob plus the DQ recruit line will make people think of the DQ slime.

**MINOR: dialogue boxes.** The blue-gradient boxes with name tags in the cold open and Floor 2 look like classic Final Fantasy blue windows. This is a generic style.

**MINOR: Solo Leveling.** [SYSTEM] windows, "A dungeon has opened", "Gate", "QUEST FAILED" and S/C ranks are genre vocabulary. The visual style (purple/gold, not blue holographic) is not copied.

**Not resembled:** Sonic, One Punch Man, Re:Zero. No logos seen. Pixel fonts look like open fonts (DotGothic16/PixelMplus-like); confirm the licence.

## 7. Numbers on screen

| Number | Kind | Notes |
|---|---|---|
| 60 fps (last 1 s) | Live | **MAJOR:** video frame 001 shows **17 fps in red at the very start** of the cold open, before the truck. The deck itself janks on stage. |
| FROZEN FRAME 783 ms, truck 783 ms, lowest 14 fps | Live | Consistent: 217 ms left in the second gives about 14 frames. The video shows 900 ms / 5 fps; exactly 900 looks staged. If the `slide-03-step-2` value is not filled in live, it will not match. |
| "≥ 50 ms (spec)" vs bestiary "50 ms or more" | Fact | The W3C Long Tasks spec says *exceeds* 50 ms. MINOR. |
| React 19.3.1 | Fact | Verify this version exists on talk day. |
| 5 ms slices; 31 lanes, bit 0..30, Transition ×14, Idle bit 28; 5000 ms ×2 | Facts | Plausible; I could not verify against source as instructed. |
| 10,000 fibers × 12 µs = 120 ms | Rule/fact | Consistent with 124/135 ms frames. Good. |
| late > 50 ms → bite | Game rule | **MAJOR (credibility):** borrows the long-task threshold for input latency. "You beat the dragon. The user already left." at a 131 ms worst key is overstated, since INP "good" is ≤ 200 ms. Experts in the room will object. |
| HP 24 | Game rule | Unexplained; it is the key count. |
| Timers vs replays | Live | Result timers 4.6 / 4.7 / 4.6 s vs replay "whole round" 4.7 / 4.8 / 4.7 s. MINOR inconsistency. |
| FPS 32/60/60 and worst key | Live | Worst key per round 129→131, 17→17, 21→26 (screens); video 153, 19→34, 29. Never decreases. |
| FPS in video round 2 | Live | 38–43 during a "PERFECT" round; 42 shown in yellow. Mixed message. MINOR. |
| hits 4198 / 0 / 1591 | Live | "hits 0 pending…" in round 2 looks like zero results. MINOR. |
| Replay zoom bars | Live | The 124 ms bar is clipped to about 65 ms at the window edge while still labelled 124 ms. MINOR. |
| Lv 1–6, Part 9 / Part 1, v1.1, 2026.11.22, Track A | Decoration / meta | Fine. |

## 8. Other on-stage embarrassments

**MAJOR**
- `slide-03-step-0/1`: the GATE bar clips the first letter, so "One corridor" reads "une corridor" and "A long task" loses its "A". The rotated "GATE" label is hard to read.
- `slide-04-step-0..3`: the "FLOOR 1 · Lv 1" badge covers the "STATUS" tab; only the bottom half of its letters shows.
- `slide-04-step-1`: "sibli" and "nul" are cut off at the right edge.
- `slide-09-step-4`, `-fight`, `-result`: code text overflows the panel and the screen ("// Sync", "// Transi"). Stray "nc" and "si" glyphs sit at x≈1895 next to the round 3 intro and result panels.
- `slide-01-step-2..4`: leftover headlight beam (see 3).
- `slide-07-step-1`: the "thrown away" cards overlap the RESPAWN AT ROOT box and look like a layout bug.

**MINOR**
- "QUEST FAILED" and "PERFECT" banners overlap the dragon's head.
- `slide-01-step-4`: the SYSTEM box covers Fiber-kun's sword and antenna, and breaks "MAIN / THREAD".
- Dangling separators at line ends: "interrupt · / prepareFreshStack", "startTransition · / useDeferredValue". Orphan "bites your / UI".
- The pixel font renders "CartIcon" as "Cartlcon" in dialogues and patch notes. The monospace font shows CartIcon.
- `=>` becomes a "⇒" ligature in `slide-08-step-0` but not in the boss code.
- Ghost "BITE! … ms late" text stays on the round 1 result (video frame 009).
- Bestiary: the truck icon touches its label.
- Large empty lower halves: `slide-04-step-0` right side, `06-1`, `06-3`, `07-*`, `08-*`, `10-0..2`.
- The red/white chromatic offset on the title kanji looks like a print error from a distance.
- No DRAFT, PLACEHOLDER or claim-ID text found.
- Not verified:
  - The QR could not be decoded (no decoder installed).
  - Confirm the handle "samabaasi" vs the name "Saman Abbasi".

## Top 10 fixes

1. **Make a lost round look lost without text.** Do not kill the dragon in round 1, or make the dragon stand over the ruined village. Make the burning village large and central (no faces on houses). Give Fiber-kun a clearly defeated pose. Never play "FINISH!" in a lost round.
2. **Make "dragon down" read as dead.** Use a lying-flat ×12 sprite instead of a rotated bitmap. Remove the unicorn horn and horse body.
3. **Use one colour per meaning in the replays.** Red only for long frames and bites; a different colour or hatch for thrown-away work. Enlarge the legend and labels.
4. **Fix clipping and overflow.** GATE bar vs "One/A"; FLOOR badge vs STATUS; "sibli/nul"; round 3 code overflow and stray glyphs; the overlap on `slide-07-step-1`.
5. **Remove the headlight/sign leftover** from the Japan scene. Fix the 17 fps red HUD at cold-open start, by warming up or hiding the HUD until it is stable.
6. **Strip the boss fight right column to just FPS and worst key.** Move the code to the round intro card.
7. **Make level-ups reward the floor just completed,** or introduce Quest board and Expedition before using them. Fix "emergency quest never goes on the board" against the Sync slot shown on the board.
8. **Drop "Gate"**, or use it consistently (torii = Gate = one task) throughout.
9. **Simplify the jargon slides** (`05-step-7`, `08-step-1`, `08-step-2`, replay 3 caption). Reconsider the 50 ms "bite" rule and the "user already left" line for a 131 ms worst key.
10. **Fix the previous-life sprite** so it reads as a tired developer (laptop/desk, not a fish tail) and differs visibly from the reborn form. Reduce the bomb-fuse look of the antenna. Make the art less Tensura-slime-like if IP-cautious.
