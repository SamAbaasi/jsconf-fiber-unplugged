// The deck. `steps` = number of clicks inside the slide (states 0 … steps).
// `time` = planned start time (mm:ss) for the presenter's pacing display.
// `live` = runs real React work; the presenter window shows a placeholder for it.
// `claims` = CLAIMS.md rows this slide depends on (checked by scripts/check-claims.mjs).
// Notes: lines starting with "DRAFT:" are Claude's drafts for Saman to edit.
import { ColdOpen } from './ColdOpen.jsx';
import { Title } from './Title.jsx';
import { Gate } from './Gate.jsx';
import { Status } from './Status.jsx';
import { YieldSkill } from './YieldSkill.jsx';
import { Floor3, Floor4, Floor5 } from './Floors.jsx';
import { BossFight } from './BossFight.jsx';
import { PatchNotes } from './PatchNotes.jsx';
import { Bestiary } from './Bestiary.jsx';
import { Ending } from './Ending.jsx';
import { makeAppendix } from './Appendix.jsx';
import { RULES, RANK_RULE } from '../demo/game.js';

// Story spine and minute budget: see STORYBOARD.md.
export const slides = [
  {
    id: 'cold',
    title: 'Cold open: Tehran → truck → Japan',
    time: '0:00',
    steps: 4,
    live: true,
    Component: ColdOpen,
    claims: ['A1', 'A4', 'I4', 'L1', 'A8', 'L2'],
    notes: [
      '(Saman) I was a frontend engineer in Tehran…',
      '[CLICK] Horn. The LONG TASK truck. REAL long task: flushSync renders 4,200 components (~240 µs each, ~1.0 s of work; measured 1.1–1.5 s with React overhead). Everything freezes; then the measured number and its Gate rank (S = ≥ 50 ms, L1); the fps counter honestly drops to ~1.',
      'DRAFT: One long task. Everything stops. No frames. No input.',
      '[CLICK] White flash → a fantasy Japan. (Saman) 目が覚めたら…',
      '[CLICK] (Saman) Wait… I’m a plain JavaScript object?',
      '[CLICK] [SYSTEM] window. DRAFT: And then a Gate opened.',
    ].join('\n'),
  },
  {
    id: 'title',
    title: 'Title',
    time: '1:45',
    steps: 1,
    Component: Title,
    claims: [],
    notes: ['Title card.', '[CLICK] (Saman) こんにちは! I’m Saman. DRAFT: I really came from Tehran to Tokyo for this talk.'].join('\n'),
  },
  {
    id: 'gate',
    title: 'The Gate = the main thread',
    time: '2:15',
    steps: 2,
    Component: Gate,
    claims: ['L1', 'L2'],
    notes: [
      'DRAFT: Inside the Gate there is only one corridor. JavaScript, layout, paint and your click all walk through it. One at a time.',
      '[CLICK] DRAFT: If a monster gets stuck here, nobody else can pass. Not your click. Not the next frame.',
      '[CLICK] DRAFT: Every task is a Gate. A Gate shows how long it took. 50 milliseconds or more is a long task: the Gate turns red. The truck was a long task. (The truck time is the one measured in the cold open.)',
    ].join('\n'),
  },
  {
    id: 'status',
    title: 'Floor 1 · Lv1 STATUS',
    floor: 'FLOOR 1 · Lv 1',
    time: '3:30',
    steps: 4,
    Component: Status,
    claims: ['A8', 'A7', 'H1', 'A2', 'B1'],
    notes: [
      'DRAFT: SYSTEM: you are a fiber now. Here is my status window.',
      '[CLICK] DRAFT: return = parent. child = first child. sibling = next one.',
      '[CLICK] DRAFT: alternate. My twin: one copy on screen, one being built.',
      '[CLICK] DRAFT: lanes = work waiting here. childLanes = work waiting below.',
      '[CLICK] LEVEL UP Lv1 → Lv2 (fanfare). (Saman) Effect: stop working. DRAFT: My only skill… stop working. A useless skill?',
    ].join('\n'),
  },
  {
    id: 'yield',
    title: 'Floor 2 · Lv2 《Yield》',
    floor: 'FLOOR 2 · Lv 2',
    time: '6:00',
    steps: 8,
    Component: YieldSkill,
    claims: ['A1', 'A2', 'A7', 'B1', 'C1', 'C2', 'C4', 'C5', 'C6', 'C7', 'G1', 'A4', 'D1'],
    notes: [
      'DRAFT: My skill: stop working. …Really?',
      '[CLICK] DRAFT: Old loop: no exit. New loop: one check before every fiber.',
      '[CLICK] Walk, slice 1. The dialogue box narrates. Let it play (~4 s).',
      '[CLICK] Browser’s turn, then a MessageChannel message.',
      '[CLICK] Slice 2 starts at CartIcon. Same fiber.',
      '[CLICK] Last slice, then commit (~7 s).',
      '[CLICK] DRAFT: Yield = pause. Same fiber, same tree. But only for work React may pause.',
      '[CLICK] Why a dud? DRAFT: A click never meets the Scheduler. It runs in a microtask, with no yield.',
      '[CLICK] LEVEL UP Lv2 → Lv3 (fanfare). DRAFT: To use my skill, I need to know which quests are urgent.',
    ].join('\n'),
  },
  {
    id: 'floor3',
    title: 'Floor 3 · Lv3 Quest board',
    floor: 'FLOOR 3 · Lv 3',
    time: '9:30',
    steps: 4,
    Component: Floor3,
    claims: ['D1', 'D2', 'C2', 'A4', 'C5', 'C6', 'B2'],
    notes: [
      'D1: 31-bit lane mask; Sync = bit 1, InputContinuous = bit 3, Default = bit 5, Transition = bits 8–21, Idle = bit 28. DRAFT: 31 slots. One bit each. Lower bit, more urgent.',
      '[CLICK] D2: click/keydown/input → Sync, scroll/mousemove → Continuous, setTimeout/fetch → Default. DRAFT: The event decides the lane. A click is urgent. A timer is not.',
      '[CLICK] C2: SyncLane never enters the Scheduler queue; it runs in a microtask. DRAFT: An emergency quest never goes on the board. It runs right now, in a microtask.',
      '[CLICK] A4, C5, C6: only non-blocking lanes are sliced; 5 ms per browser task (or needsPaint), then yield. DRAFT: Expeditions can rest. Emergency quests cannot.',
      '[CLICK] LEVEL UP Lv3 → Lv4: Respawn (B2).',
    ].join('\n'),
  },
  {
    id: 'floor4',
    title: 'Floor 4 · Lv4 Respawn',
    floor: 'FLOOR 4 · Lv 4',
    time: '12:30',
    steps: 4,
    Component: Floor4,
    claims: ['B1', 'B2', 'B3', 'B6'],
    notes: [
      'B2: a SyncLane keystroke arrives while a transition render is half done. DRAFT: Halfway through the list, a key arrives.',
      '[CLICK] B2, B6: prepareFreshStack; the keystroke commits first, then the transition starts again from the root. DRAFT: The key wins. My half-built tree is thrown away. I start again from the root.',
      '[CLICK] B1 vs B2: yield continues from the same fiber; interrupt restarts from the root. DRAFT: Yield is a pause. Interrupt is a restart.',
      '[CLICK] B3: a Default update (timer) does not interrupt a transition. DRAFT: A timer cannot stop an expedition. It waits.',
      '[CLICK] LEVEL UP Lv4 → Lv5: Expedition.',
    ].join('\n'),
  },
  {
    id: 'floor5',
    title: 'Floor 5 · Lv5 Expeditions',
    floor: 'FLOOR 5 · Lv 5',
    time: '14:30',
    steps: 3,
    Component: Floor5,
    claims: ['E1', 'E2', 'F1', 'F2', 'A5', 'C9', 'C11'],
    notes: [
      'E1, E2: the startTransition callback runs synchronously; only the updates it schedules get a Transition lane. DRAFT: startTransition runs the callback now. Only the render waits.',
      '[CLICK] F1, F2: useDeferredValue renders the old value first (urgent), then the new value in a deferred render; inside a transition it does not defer again. DRAFT: First the old value, fast. Then the new value, later.',
      '[CLICK] A5: Transition lanes expire after 5000 ms and then render without slicing. C11 (say carefully): a Scheduler task alive past its 5 s timeout gets didTimeout, and React renders it with forceSync; React’s own comment calls this check defensive. That is why the boss rounds are under 4.5 s. DRAFT: An expedition cannot wait forever.',
      '[CLICK] LEVEL UP: the boss room door.',
    ].join('\n'),
  },
  {
    id: 'boss',
    title: 'Boss room (live)',
    time: '17:00',
    steps: 5,
    live: true,
    Component: BossFight,
    claims: ['A1', 'A2', 'A4', 'A6', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'C11', 'D2', 'E1', 'E3', 'E4', 'F1', 'F4'],
    notes: [
      `RULES: GOBLIN = one keystroke (SyncLane, D2). Resolved on the first frame after its text commits; latency > ${RULES.jankMs} ms → it runs into the village (your UI) and one window goes dark. ${RULES.questFailBites + 1} windows = more than ${RULES.questFailBites} bites → the village burns: QUEST FAILED. DRAGON = the list (one fiber per cell); HP = keystrokes not rendered yet; each list commit is a hit; the final commit kills it.`,
      `RANKS (notes only): ${RANK_RULE}. The result screen shows only the worst key; the worst frame gap and the Long Animation Frame split are in data-result (and in the replay).`,
      'Keys: A auto-type (4.48 s: kept under the 5 s Scheduler timeout, C11) · ↑ jump (input delay when > 50 ms) · I focus input · C clear · R restart round · [ ] work per cell · K calibration (RUNBOOK).',
      'Round 1 (sync): press A, then ↑ during the fight. Goblins reach the village; it burns. DRAFT: You beat the dragon. The user already left.',
      '[CLICK] REPLAY round 1: whole round + 300 ms zoom. Yellow = one sync render per key. DRAFT: One key = one long sync render. Every key waits.',
      '[CLICK] Round 2 (useTransition): press A. Fiber-kun cuts goblins between slices; RESPAWN AT ROOT = a real thrown-away render (B2).',
      '[CLICK] REPLAY round 2: green 5 ms slices, keys between them, red boxes = thrown away. DRAFT: The list renders in 5 ms slices. Keys cut in between.',
      '[CLICK] Round 3 (useDeferredValue): press A.',
      '[CLICK] REPLAY round 3. DRAFT: Same slices. I don’t own the setter, so I defer the value.',
      'DRAFT: If round 2 or 3 shows A instead of S: "A, not S. One key was late. These numbers are real, so the game does not lie for me."',
    ].join('\n'),
  },
  {
    id: 'patch',
    title: 'Patch notes',
    time: '22:00',
    steps: 4,
    Component: PatchNotes,
    claims: ['E1', 'E2', 'G2', 'H2', 'H3', 'C5', 'C10', 'A4', 'B1', 'B2', 'B6'],
    notes: [
      '(Saman) When I wrote Part 9, I got this wrong. Here is what the source actually does.',
      '(row 1 is already on screen) DRAFT: startTransition runs the callback now. Only the render waits.',
      '[CLICK] DRAFT: After a click, useEffect runs before paint.',
      '[CLICK] DRAFT: On the cart click, only CartIcon runs.',
      '[CLICK] DRAFT: 5 ms is per browser task. And only for non-urgent work.',
      '[CLICK] DRAFT: And a keystroke does not pause and resume my render. It throws it away and restarts from the root. That is the RESPAWN you saw.',
    ].join('\n'),
  },
  {
    id: 'bestiary',
    title: '図鑑 bestiary',
    time: '23:45',
    steps: 0,
    Component: Bestiary,
    claims: ['L1', 'L2', 'A8', 'A2', 'B1', 'C4', 'D1', 'C2', 'A4', 'E4', 'B2', 'D2', 'F1'],
    notes: [
      'DRAFT: This is the whole talk on one page. Take a photo.',
      'IDs (not on screen): LONG TASK L1 · Dungeon/Gate L2 L1 · Fiber-kun A8 · Twin A8 · Yield A2 B1 C4 · Quest board D1 · Emergency quest C2 · Expedition A4 E4 · Respawn B2 · Goblin D2 · Dragon A4 E4 F1.',
    ].join('\n'),
  },
  {
    id: 'ending',
    title: '仲間にしますか？',
    time: '25:00',
    steps: 1,
    Component: Ending,
    claims: [],
    notes: [
      'Fiber-kun wants to join your party. The ▶ cursor blinks on はい. QR = linkedin.com/in/samabaasi (generated at build time, offline).',
      '[CLICK] はい: Fiber-kun jumps, jingle. Thank you!',
    ].join('\n'),
  },
];

// Appendix with every slide's CLAIMS IDs: hidden by default, shown with ?appendix in the URL.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('appendix')) {
  slides.push({ id: 'appendix', title: 'Appendix · sources', time: '—', steps: 0, Component: makeAppendix(() => slides), claims: [], notes: 'Hidden by default (open with ?appendix). For Q&A.' });
}
