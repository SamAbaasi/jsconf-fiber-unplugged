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
import { makePlaceholder } from './Placeholder.jsx';
import { BossFight } from './BossFight.jsx';
import { PatchNotes } from './PatchNotes.jsx';
import { Bestiary } from './Bestiary.jsx';
import { Ending } from './Ending.jsx';
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
    claims: ['L1', 'L2', 'L3', 'C4'],
    notes: [
      'DRAFT: Inside the Gate there is only one corridor. JavaScript, layout, paint and your click all walk through it. One at a time.',
      '[CLICK] DRAFT: If a monster gets stuck here, nobody else can pass. Not your click. Not the next frame.',
      '[CLICK] DRAFT: Every task is a Gate. We give them ranks. Only S is official: 50 milliseconds is a long task. The truck was S rank. (The truck time is the one measured in the cold open.)',
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
    title: 'Floor 3 · Lv3 Quest board (placeholder)',
    time: '9:30',
    steps: 0,
    Component: makePlaceholder({
      floor: 'FLOOR 3 · Lv3',
      title: 'Guild quest board',
      real: 'Quest board = lanes (31-bit mask)',
      rows: [
        ['31 slots = 31 lanes. Lower bit, more urgent.', 'D1'],
        ['The event picks the lane: click → Sync, scroll → InputContinuous, timer → Default.', 'D2'],
        ['Emergency quest = SyncLane: never on the board, runs in a microtask.', 'C2'],
        ['Expeditions (Transition lanes) rest: 5 ms, or when the browser needs to paint.', 'A4 C5 C6'],
        ['LEVEL UP → Respawn', 'B2'],
      ],
    }),
    claims: ['D1', 'D2', 'C2', 'A4', 'C5', 'C6', 'B2'],
    notes: 'Placeholder: built in a later phase. See STORYBOARD.md.',
  },
  {
    id: 'floor4',
    title: 'Floor 4 · Lv4 Respawn (placeholder)',
    time: '12:30',
    steps: 0,
    Component: makePlaceholder({
      floor: 'FLOOR 4 · Lv4',
      title: 'Respawn',
      real: 'Respawn = interrupt · prepareFreshStack',
      rows: [
        ['A keystroke arrives in the middle of a transition render.', 'B2'],
        ['RESPAWN AT ROOT: the half-built tree is thrown away; the keystroke commits first; the transition restarts from the root.', 'B2 B1 B6'],
        ['A Default update does not interrupt a transition. It waits.', 'B3'],
      ],
    }),
    claims: ['B1', 'B2', 'B3', 'B6'],
    notes: 'Placeholder: built in a later phase. See STORYBOARD.md.',
  },
  {
    id: 'floor5',
    title: 'Floor 5 · Lv5 Expeditions (placeholder)',
    time: '14:30',
    steps: 0,
    Component: makePlaceholder({
      floor: 'FLOOR 5 · Lv5',
      title: 'Expeditions',
      real: 'Expedition = Transition lane',
      rows: [
        ['startTransition runs the callback now. Only the render it schedules waits.', 'E1 E2'],
        ['useDeferredValue: old value first (urgent), new value later (deferred). Inside a transition it does not defer again.', 'F1 F2'],
        ['After 5 s a waiting transition expires and stops yielding.', 'A5'],
      ],
    }),
    claims: ['E1', 'E2', 'F1', 'F2', 'A5'],
    notes: 'Placeholder: built in a later phase. See STORYBOARD.md.',
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
    steps: 5,
    Component: PatchNotes,
    claims: ['E1', 'E2', 'G2', 'H2', 'H3', 'C5', 'C10', 'A4', 'B1', 'B2', 'B6'],
    notes: [
      '(Saman) When I wrote Part 9, I got this wrong. Here is what the source actually does.',
      '[CLICK] DRAFT: startTransition runs the callback now. Only the render waits.',
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
    claims: ['L1', 'L2', 'L3', 'A8', 'A2', 'B1', 'C4', 'D1', 'C2', 'A4', 'E4', 'B2', 'D2', 'F1'],
    notes: 'DRAFT: This is the whole talk on one page. Take a photo.',
  },
  {
    id: 'ending',
    title: '仲間募集 (DRAFT)',
    time: '25:00',
    steps: 0,
    Component: Ending,
    claims: [],
    notes: 'DRAFT slide: Saman decides whether to use it. Links and QR are placeholders.',
  },
];
