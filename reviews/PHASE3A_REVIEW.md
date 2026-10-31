# Phase 3a: independent review (raw report)

Reviewer: a separate agent that did not build anything. It was given only `/tmp/review-pack` (45 screenshots, LINEUP.png, the two recordings and frames extracted from them, the frame strip) and the checklist from section 10 of the brief. The report below is unedited. What was fixed is in `PROGRESS.md` (Phase 3a, "Review fixes").

---

# Independent review: "React Fiber Unplugged" deck (review-pack only)

I measured with PIL. H = boss arena frame height. "FK" = Fiber-kun.

---

## 1. Proportions vs scale bible

**Measured (bounding boxes):**

| Item | File | Measured | Bible | Verdict |
|---|---|---|---|---|
| FK world (reborn) | slide-01-step-2 | y580–699 = **120 px** visible (box 128, ×8) | 128 | OK |
| FK Tehran | slide-01-step-0 | y572–699 = **128 px** (incl. laptop+cup, 110 px wide) | 128 | OK |
| FK title | slide-02-step-0 | y652–831 = **180 px** (×12) | ≤192 | OK |
| Truck | slide-01-step-1 | 600×320 px → **2.5–2.67×** FK height, **4.7–5.0×** length | 2.2–2.8×, ~5× | OK |
| Torii | slide-01-step-2 | y250–699 = **450 px** → **3.5–3.75×** | 3–4× | OK |
| Arena H | slide-09-* | border y110–869 = **~760 px** | — | — |
| Dragon | slide-09-step-0 | y349–~805 = **~456 px = 60% H** | 55–65% | OK |
| FK arena | slide-09-step-0 / -1 / -2 | **180–192 px = 23.7–25.3% H** (antenna bob changes it by 12 px) | 22–26% | OK |
| Goblin | slide-09-step-0-fight | y708/714–803 = **90–96 px = 11.8–12.6% H** | 10–13% | OK |

All the size ratios pass. The scale and pixel-density problems:

- **MAJOR – Mixed pixel scales inside one scene.** The bible says "same scale within a scene":
  - Cold open: FK ×8, truck ×20, torii ×15.
  - Boss arena: FK ×12, goblin ×6, dragon is a fine ~6 px grid with no stated scale (LINEUP.png only says "dragon 456 px").
  - The result is chunky 20 px truck blocks next to a fine 8 px character, and an arena with three pixel densities. This is the clearest art-direction flaw in the deck.
- **MINOR – Dragon is drawn as a gridded mesh.** Visible lines between cells (rv crop of slide-09-step-2). It looks like a different art style from the other sprites, more like a net or fabric than pixel art.
- **MINOR – Dragon tail and wing tip are clipped** by the right arena border at x≈1168–1176 (slide-09-step-0, slide-09-step-1, slide-09-step-2).
- **MINOR – Dragon legs sink into the grass** on round intros: feet at y≈860 against ground at y805 (slide-09-step-1.png, slide-09-step-2.png; boss-rounds-014/015).
- **MINOR – FK's sword blade goes through the ground** at rest on every boss intro (slide-09-step-0/1/2, blade tip y≈830 against ground 805). It reads as leaning on a cane.

## 2. Readability at 25% (480×270)

The cold-open dialogue lines, the title, LEVEL UP cards, YIELD = PAUSE, ROUND/PERFECT/QUEST FAILED, the rank letter and the FPS number survive. Everything below does not:

- **MAJOR – Boss room (all slide-09 files):**
  - Unreadable: tab labels, "same work: 10,000 fibers x 12 µs", the HUD sub-lines ("village: 6 bites left", "goblins n · bites n", "HP 19 / 30 keys"), the whole LIVE scheduler panel (row labels, legend, "zoom 120ms", "▲ = frame"), the CODE panel, the S/A/B/C rule text, and the result table numbers.
  - Effect: the evidence for the talk's main claim (frame times) cannot be read from the back of the room.
- **MAJOR – slide-01-step-1 / -after:** "[SYSTEM] Gate rank S · ≥ 50 ms · LONG TASK (spec)" and "61 fps (last 1 s)" become noise.
- **MAJOR – Patch notes (slide-10-step-1…5):** the red struck-through "before" lines are illegible. Only the "after" halves ("runs now", "click → before paint", …) survive, so they lose their meaning.
- **MAJOR – Bestiary (slide-11):** the whole table is about 9 px cap height and the claim-ID column disappears. Readable only as rows of colour.
- **MAJOR – Placeholders (slide-06/07/08):** body lists unreadable.
- **MINOR – Other unreadable text:**
  - slide-01-step-2 "(When I woke up…)" subtitle; this is the only English for non-Japanese readers.
  - slide-02 date/speaker line.
  - slide-03-* source/CLAIMS footer.
  - slide-04-* "Lv 1 · React 19.3.1", "current / work-in-progress" labels, tree labels.
  - slide-05-step-1 "one check, before every fiber" (grey on navy).
  - slide-05-step-2…5 timeline labels ("React / paint / other tasks / commit") and the "5 ms" bar.
  - slide-05-step-7 sub-lines ("decide WHAT…", "never enters the Scheduler queue").
- **MINOR – Low-contrast art at 25%:**
  - Round 3 "SHADOW" dragon (≈(60,50,110) on (35,29,102)) almost vanishes (slide-09-step-2*).
  - Fiber-kun at the slide-04-step-4 / slide-05-step-8 level-up screens is a small blob.

## 3. Things that read wrong

- **MAJOR (cultural risk, see §5) – The antenna reads as a lit bomb fuse.** FK is a round body with a stalk and an orange tip. In Tehran (slide-01-step-0, crop rv/prev.png) yellow window pixels sit right at the tip and read as **sparks of a lit fuse**. He also holds a grey horizontal slab (the laptop) at face height that reads as a gun barrel or brick, not a laptop. Together, on a Tehran skyline, a first-time viewer can read "bomb-person with a weapon". Fix: make the laptop read unmistakably (open lid, screen glow), move the antenna off window pixels, or make the antenna clearly a sprout or flag.
- **MAJOR – The dragon is white for most of round 1.** The hit flash stays on for long stretches: about 75% of frames in t=3–9 s are white (boss-rounds-004…009; my 20 fps sample). The audience sees a white ghost dragon, not the red "JANK DRAGON". It strobes about 1.5–2 cycles/s over a large area: under the WCAG 3/s limit but close, and unpleasant on a projector.
- **MAJOR – Hurt FK reads as a different character.** He turns into a solid red blob (slide-09-step-0-fight, boss-rounds-004…009) that reads as a red slime, apple or tomato, and he stays red for most of round 1.
- **MAJOR – "BITE!" damage text sits on the dragon.** "−123ms BITE!" appears over the dragon's neck (slide-09-step-0-fight, boss-rounds-006). It reads as the dragon biting or being bitten, but the rules say goblins bite the village. The red text on the red dragon is also nearly unreadable.
- **MINOR – Teal striped glitch bars** over "ms" in the bite text (slide-09-step-0-fight, crop rv/bite.png; boss-rounds-006). They look like a rendering bug.
- **MINOR – Dead pose.** FK lies rotated 90° with vertical-bar eyes (slide-09-step-0-result). It reads as a dropped can or battery more than a knocked-out hero.
- **MINOR – Crown floats off the Shadow dragon's head** (slide-09-step-2: crown at x515–570/y395–420, head lower and right). It reads as a separate pickup item.
- **MINOR – Fuji's snow cap peeks out on both sides of the torii** as white blocks (slide-01-step-2, crop rv/toriitop.png). They read as white teeth, flags or shide on the gate, not snow.
- **MINOR – The work-in-progress twin looks sick or ghostly.** Darkened palette and brown antenna (slide-04-step-2). Combined with "My twin in the other world" it suggests a dead twin.
- **MINOR – Hit effects:** a goblin kill is a white "poof" cloud (boss-rounds-016, -021) that reads as smoke or a sheep. The "RESPAWN AT ROOT" light column (slide-09-step-1-fight) reads as a UFO tractor beam.
- **MINOR – A blue "sibling" arrow points right to nothing** while the row says `sibling null` (slide-04-step-1). It reads as "there is a sibling to the right". Logo→Nav→CartIcon sibling links are also not drawn.

## 4. Story clarity for non-native English speakers

- **MAJOR – "Gate" means four things:**
  1. the torii portal;
  2. "A Gate has opened: MAIN THREAD" (slide-01-step-4);
  3. "Gate = one task" (slide-03-*, slide-11);
  4. "Gate rank S" = a task duration (slide-01-step-1, slide-03-step-2).

  Is the main thread the gate or the dungeon? The viewer cannot tell.
- **MAJOR – "S" means three opposite things:**
  - Gate rank S = worst (≥50 ms long task, "S = spec");
  - result rank S = best (PERFECT, slide-09-step-1/2-result);
  - code comment `// S` = SyncLane (slide-09-*-fight).

  Plus `// D` (slide-09-step-1/2-fight) collides with Gate rank "D ≤ 10 ms". This guarantees confusion.
- **MAJOR – The rebirth shows no change.** The Tehran "previous life" is already Fiber-kun (same teal blob, slide-01-step-0), so "You have been reborn as a FiberNode" shows almost nothing new (headband and sword only). The human developer is never shown, so the isekai beat does not land visually.
- **MAJOR – No floor labels on the built floors.** Slides 4–5 never say FLOOR 1 / FLOOR 2; only placeholders say FLOOR 3–5. After slide 1 the fantasy world disappears into diagrams (no character entering the gate or the dungeon), so "levels up floor by floor" is not visible.
- **MAJOR – Boss-room metaphor stack:**
  - "DRAGON = the 10,000-fiber list. Each commit is a hit; the final commit wins."
  - "HP = keys not rendered."
  - "GOBLIN = one keystroke… Its text must show within 50 ms, or it bites."
  - The village, ranks with three thresholds (50/100/150 ms).

  That is too many rules to read in 10 seconds in a second language. "JANK", "bites", "commit wins" are jargon.
- **MAJOR – Ambiguous English one-liners:**
  - "Effect: stop working." (slide-04-step-4, slide-05-step-0) reads as "it breaks". Say "pause work".
  - "Commit never stops." (slide-05-step-5) reads as an infinite loop. Say "Commit cannot pause".
  - "A monster is stuck." (slide-03-step-1): no monster is drawn, only a red LONG TASK box.
- **MINOR – Confusing labels:**
  - "OLD WORLD" on the sync loop (slide-05-step-1). Old world = Tehran in the story, and the sync loop still exists in React today.
  - "My twin in the other world" (slide-04-step-2) clashes with "other world" = isekai.
- **MINOR – Naming drift:**
  - "Guild card" (slide-05-step-8) vs "Guild quest board" (slide-06) vs "Quest board" (slide-11).
  - "Expeditions" / "Respawn" mix game vocabularies.
  - "dud skill" is slang.
- **MINOR – The 5 ms bar is unexplained.** It shows full = budget left and empty = used up (slide-05-step-2 empty, step-3 full, step-4/5 empty), with no legend. The tree colours (green / blue / yellow) also have no legend.
- **MINOR – Three titles on one slide** (slide-02): the JP parody title, the English parody subtitle, and the official "React Fiber Unplugged: How the Internal Scheduler Shapes React" in the footer. The official title is the least visible.
- **MINOR – The patch-notes slide assumes an article series** ("bugs in my own articles", "Part 9", "Part 1") that the audience has not seen.
  - Striking out the whole `startTransition(() => setResults(filter(query)))` line reads as "don't write this code", not "this callback runs immediately".
  - The 2nd and 3rd rows have no Part tag.
- **MINOR – Round 1 keeps going after "village: FALLEN"** at 2.2 s (slide-09-step-0-fight). The result then says "DRAGON DOWN… but the village fell", which is a mixed message.

## 5. Cultural accuracy

- **MAJOR – Bomb read in Tehran.** The bomb-fuse antenna plus the gun-like slab in a Tehran scene (see §3) risks the "Middle East = bomb" stereotype in front of a Japanese audience. It is unintended, but the speaker is Iranian and this is the very first image. Fix before anything else in §5.
- **MAJOR – TEHRAN sign looks broken.** It is set in a Times-like serif (slide-01-*). It is the only non-pixel font in the deck and looks like a font-loading fallback bug. Real Iranian signs are bilingual, Persian on top (تهران) and Latin below. An English-only sign feels like a foreign film set and misses a respectful, easy detail.
- **MINOR – Tehran skyline:**
  - Milad Tower is recognisable (shaft, pod, spire with red light), but the pod is undersized.
  - The snowy Alborz is good.
  - The skyline is generic boxes.
  - The crescent moon is neutral, but next to "TEHRAN" some may read it as a religious symbol. Consider a different moon phase.
  - No flags or political symbols: good.
- **MINOR – A truck killing a Tehran pedestrian** is dark (real road-death issue in Iran). It is fine as the well-known 転生トラック trope, but the speaker should frame it lightly.
- **MINOR – Japan scene:**
  - Mt Fuji's summit is completely hidden behind the torii (slide-01-step-2/3/4), so the mountain is not recognisable as Fuji. Shift the torii or lower the kasagi so the snow cap shows.
  - The torii shape is acceptable (myōjin-like, nuki protrudes, blank gaku).
  - Cherry trees are generic but fine.
- **MAJOR (JP text) – 仲間募集 says the opposite of the English.** 仲間募集 (slide-12) means "I am recruiting companions", i.e. *he* is hiring. The English says "Looking for my next guild", i.e. he wants a job. Japanese readers will get the opposite message. Use something like 「次のギルド募集中」 or 「転職先ギルド募集中」.
- **OK – Other Japanese text is correct:** 目が覚めたら…, 転生したらReactのFiberだった件, こんにちは!, 外れスキル?, 図鑑. 図鑑 for "bestiary" is acceptable (魔物図鑑 is more precise).

## 6. Copyright / brand resemblance

- **MAJOR – Solo Leveling (combined effect):**
  - "[SYSTEM]" notification boxes (slide-01-step-1/4);
  - "Gate", "Dungeon", Gate ranks **E-D-C-B-A-S** (slide-03-step-2, exactly Solo Leveling's hunter/gate ladder);
  - "LEVEL UP!" + NEW SKILL cards;
  - the blue STATUS window with a "STATUS" tab (slide-04-*);
  - a **"SHADOW" dragon wearing a crown** (slide-09-step-2*), which evokes the Shadow Monarch.

  Individually these are generic; together, strong. The system box is purple/gold rather than the glowing-blue window, which helps. The STATUS panel is the closest visual match. Drop the crown on the Shadow form, and/or rename the ranks.
- **MAJOR – Tensura:** the title and subtitle (slide-02) directly mirror 転生したらスライムだった件 / "That Time I Got Reincarnated as a Slime", and the hero is a round teal blob (Rimuru-like). The 転生したら〇〇だった件 parody is a widespread meme and low legal risk, but resemblance is strong. Keep it only if the speaker accepts that.
- **MINOR – Dragon Quest / generic JRPG:** the dialogue box (blue gradient, white border, name tab, ▼ advance cursor) is moderate-low. FK as a teal blob is a low-moderate echo of DQ slime. The dragon (western, gridded) and goblins are generic. No DQ window font.
- **OK:** Truck has no logo or brand shape. Nothing resembling Sonic, Final Fantasy, One Punch Man or Re:Zero ("RESPAWN AT ROOT" is not a Re:Zero term). Torii and Fuji are public domain.

## 7. Numbers on screen

| Number | Where | Type | Issue |
|---|---|---|---|
| 61 / 60 fps (last 1 s) | slide-01-step-0, -1, -1-after | live | **MAJOR**: "61 fps" next to "FROZEN FRAME 1,467 ms" contradicts itself on the static slide. >60 on a 60 Hz projector looks like a bug. Video shows 21 fps at load (cold-open-001) and 1 fps after the freeze (cold-open-006), so it is live but misleading when the slide is held. |
| 1,467 ms | slide-01-step-1, truck side, slide-03-step-2 | live (measured) | Consistent across screens. It is printed on the truck itself, so if the live value differs on stage the truck label must update too. Verify. |
| ≥ 50 ms long task | slide-01-step-1, slide-03-step-2; bestiary "50 ms or more" | fact | **MINOR inaccuracy**: spec/MDN say a long task *exceeds* 50 ms (> 50). |
| Gate ranks 5 / 10 / 16.7 / 33 / <50 / ≥50 ms | slide-03-step-2 | game rule + facts | 5 ms (Scheduler slice), 16.7 and 33 (frames) are facts. "10 ms" (rank D) has no basis. "33 ms" is really 33.3. |
| Lv 1→2→3, Lv3/4/5 | slide-01-step-4, slide-04-*, slide-05-step-8, slide-06/07/08 | decoration | Consistent. |
| React 19.3.1 | slide-04-* | fact | **Verify** that this exact version exists and matches the demo build. |
| 5 ms (bar, slices, Yield) | slide-05-*, slide-05-step-7, slide-11 | fact | **MAJOR inconsistency**: slide-10-step-4/5 Patch Notes strikes out "5 ms per task" while slides 3/5/11 assert 5 ms slices. The audience will think the deck contradicts itself. |
| 31-bit mask / 31 lanes | slide-05-step-8, slide-06, slide-11 | fact | Correct. |
| 5 s transition expiry | slide-08 | fact | Correct (5000 ms). |
| 10,000 fibers × 12 µs | slide-09-* | game parameter | Implies 120 ms. The breakdown says render 150 ms (slide-09-step-0-result), so a sharp viewer will ask. Minor. |
| 30 keys, HP n/30, goblins n, bites n, 6 bites left, >5 bites | slide-09-* | live + rule | Internally consistent (11 + 19 = 30). The input box shows "fiber" while 30 keys were typed (scripted), so it is unclear where 30 comes from. |
| 50 ms (bite) / 100 ms (S) / 150 ms (A) | slide-09-* rules | game rule | Three thresholds, none matches a stated fact except 50. Confusing. |
| FPS 29 / 60 / 60, worst frame 177 / 36 / 33 | slide-09-*-fight | live | Video rounds 2/3 show **39–48 fps**, not 60 (boss-rounds-016…034), which undercuts the "smooth" message. Make sure the stage machine shows 60. |
| Round 1 result: worst frame **177** ms vs breakdown "worst frame **176** ms = 150+12+3+10+2" (= 177) | slide-09-step-0-result | live | **MAJOR**: two different values for the same quantity on one panel. |
| Round 2: fight "worst frame **36** ms" at 0.4 s vs result "worst frame **32** ms" | slide-09-step-1-fight vs -result | live | **MAJOR**: a worst-so-far value cannot go down. Round 3 (33 → 39) is consistent. |
| worst key 163 / 15 / 18 ms; thrown away 0 / 22 / 21; commits 30 / 8 / 9 | results | live | Consistent (sums to 30). |
| −123ms, −117ms BITE!; −5 | fight, frame-strip | live | The minus sign on latency reads as negative time. In frame-strip.png the HP drop and "−5" appear **+250 ms after "contact"**, and the game clock shows 0.9 s at 0 ms and +125 ms, then jumps to 1.2 s at +250 ms. Hit feedback is not tied to the sword contact, and the recording clock and game clock disagree. |
| hits 55 / 1584 / 4274 / 59 | slide-09, video | live search results | Fine. |
| Timers 0.0 → 6.1 / 6.2 / 6.3 s | slide-09-* | live | Fine. |
| JSConf JP 2026 · Track A · 2026.11.22 | slide-02 | fact | Verify the date and track against the official schedule. |
| Patch notes v1.1, Part 9, Part 1 | slide-10 | decoration | Refers to an un-introduced series. |
| Claim IDs L1–L3, A2, A4, A5, A8, B1–B6, C1–C6, D1, D2, E1, E2, E4, F1, F2 | slide-03, slide-04-step-4, slide-05-step-7/8, slide-06/07/08, slide-11 | internal | Meaningless to the audience (see §8). |

## 8. Other on-stage embarrassments

- **BLOCKER (if shown as-is) – Draft and placeholder banners:**
  - "PLACEHOLDER · storyboard only · built in a later phase" (slide-06/07/08);
  - "DRAFT · Saman decides whether to use this slide", "LINK 1 · (placeholder)", "QR placeholder", "slides + CLAIMS.md · (placeholder)" (slide-12).
- **MAJOR – Internal claim IDs printed on slides** (slide-03-*, slide-04-step-4, slide-05-step-7/8, slide-06/07/08, and a whole column on slide-11). They look like debug output.
- **MAJOR – Empty slide:** slide-10-step-0 is a title-only Patch Notes screen.
- **MAJOR – Clipped "FPS" tab** peeks above the right panel on every boss intro and result screen (slide-09-step-0/1/2 and *-result, crop rv/fpstab.png). It looks like a z-index bug.
- **MINOR – Overlaps:**
  - "FROZEN FRAME" and the [SYSTEM] line run over the Milad Tower and its lights (slide-01-step-1).
  - The SYSTEM box covers the left cherry tree and touches FK's antenna (slide-01-step-4).
  - The red GATE bar touches the "THE" heading (slide-03-*).
  - "sibling" label overlaps the CartIcon box border (slide-04-step-1).
  - FK sprite sits over the Results box and edges (slide-05-step-4).
  - The 外れスキル? stamp covers the 》 bracket (slide-05-step-0).
  - "RESPAWN AT ROOT" sits over the dragon's mouth (slide-09-step-1-fight).
  - Flying FK crosses the fps counter (cold-open 5.9–6.4 s).
- **MINOR – Bad line breaks:**
  - "MAIN / THREAD" (slide-01-step-4);
  - "…with no / yield." (slide-05-step-7);
  - "won this / fight." (slide-09-step-1/2-result);
  - orphan "C6" (slide-06);
  - "ROUND 3 · / useDeferredValue" (slide-09-step-2; rounds 1 and 2 keep the label on one line).
- **MINOR – Crowded footer:** the truck line nearly touches the source footer (slide-03-step-2).
- **MINOR – Bestiary runs to y≈1063 of 1080** with no bottom margin.
- **MINOR – Bestiary icon gaps:** icons are missing for Yield, Quest board, Emergency quest, Expedition, Respawn and **Dragon**. The Twin uses the normal FK icon, not the WIP twin.
- **MINOR – Bestiary "Dragon = … (transition)"** is wrong for Round 1, which has no transition.
- **MINOR – Patch-note accuracy:** "useEffect: after paint" struck → "click → before paint" (slide-10-step-2+) over-generalises. It only applies to effects from discrete input; as written it says useEffect never runs after paint.
- **MINOR – Dialogue box missing during the freeze.** It disappears for about 1.5 s while the truck freezes (cold-open 4.1–5.4 s). Intended, but it reads as a dead screen if the projector lags.
- **MINOR – Inconsistent level-up framing:** slide-04 STATUS already shows `lanes SyncLane` at Lv 1, but Lanes is "learned" at Lv 2→3 (slide-05-step-8).

---

## Top 10 fixes

1. **Remove all draft/placeholder/claim-ID text from projected slides:**
   - PLACEHOLDER banners (slide-06/07/08);
   - DRAFT / LINK / QR placeholders (slide-12);
   - CLAIMS IDs (slide-03, slide-04-step-4, slide-05-step-7/8, slide-11).

   Move claim IDs to speaker notes or an appendix.
2. **Redesign FK's Tehran look so it cannot read as bomb + weapon.** Clearly open laptop, antenna not sparking or not fuse-like. Also show a visible human→blob change so "reborn" lands.
3. **Give "S" and "Gate" one meaning each:**
   - rename Gate ranks (or drop E–S, which also cuts the Solo Leveling echo);
   - use "Sync" / "Transition" instead of `// S` / `// D`;
   - fix "Gate = one task" vs "Gate opened: MAIN THREAD".
4. **Fix the contradictory numbers:**
   - worst frame 177 vs 176 (slide-09-step-0-result);
   - Round-2 worst frame 36 → 32 (slide-09-step-1);
   - "61 fps" next to "FROZEN FRAME" (slide-01-step-1);
   - Patch Notes striking "5 ms per task" while the deck teaches 5 ms slices;
   - "≥ 50 ms" → "> 50 ms".
5. **Fix 仲間募集 vs "Looking for my next guild"** (opposite meanings) and the TEHRAN sign (pixel font, bilingual Persian + Latin).
6. **Boss room legibility:** at least double the HUD, rules, timeline legend and code font sizes, or cut the text. Show the LIVE panel with one big takeaway number per round.
7. **Fix boss-room art glitches:**
   - long-lasting white hit-flash on the dragon (shorten to 1–2 frames);
   - red "BITE!" text on the red dragon plus the teal stripe artifact;
   - all-red hurt FK;
   - clipped FPS tab;
   - dragon tail clipped;
   - legs sinking into the grass;
   - floating crown;
   - sword through the ground;
   - sync the damage pop to sword contact.
8. **Unify pixel scale per scene** as the bible requires: FK, truck and torii at one scale in the cold open; FK, goblin and dragon at one scale in the arena. Remove the grid lines from the dragon.
9. **Rewrite ambiguous English:**
   - "stop working" → "pause work";
   - "Commit never stops" → "Commit can't pause";
   - "A monster is stuck" (draw it or reword);
   - "OLD WORLD" → "sync loop";
   - "other world" twin → "draft copy";
   - one name for "Guild card / quest board";
   - simplify the boss rules to 2 lines.
10. **Add FLOOR 1 / FLOOR 2 labels and a gate→dungeon transition shot** so the floor-by-floor journey is visible. Make the Shadow-dragon crown, the STATUS window styling and the rank ladder less Solo-Leveling-like. Show Fuji's snow cap above the torii.

Working crops and contact sheets I made are in `/tmp/review-pack/rv/`.
