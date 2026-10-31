// The deck. `steps` = number of clicks inside the slide (states 0 … steps).
// `time` = planned start time (mm:ss) for the presenter's pacing display.
// `live` = runs real React work; the presenter window shows a placeholder for it.
// `claims` = CLAIMS.md rows this slide depends on (checked by scripts/check-claims.mjs).
// Notes: lines starting with "DRAFT:" are Claude's drafts for Saman to edit.
import { ColdOpen } from './ColdOpen.jsx';
import { Truck } from './Truck.jsx';
import { Title } from './Title.jsx';
import { Status } from './Status.jsx';
import { YieldSkill } from './YieldSkill.jsx';
import { BossFight } from './BossFight.jsx';
import { PatchNotes } from './PatchNotes.jsx';
import { RULES, RANK_RULE } from '../demo/game.js';

export const slides = [
  {
    id: 'cold',
    title: 'Cold open',
    time: '0:00',
    steps: 1,
    Component: ColdOpen,
    claims: [],
    notes: ['Black screen. Wait for quiet.', '[CLICK] 目が覚めたら… (let it sit for a second)'].join('\n'),
  },
  {
    id: 'truck',
    title: 'Truck-kun (live long task)',
    time: '0:15',
    steps: 2,
    live: true,
    Component: Truck,
    claims: ['A1', 'A4', 'I4'],
    notes: [
      '(Saman) I was a frontend engineer in Tehran…',
      '[CLICK] The truck hits. REAL long task: flushSync renders 5,000 components (~300 µs each, ~1.5 s). Everything freezes, then the measured number appears.',
      'DRAFT: One long task. Everything stops. No frames. No input.',
      '[CLICK] White flash. (Saman) Wait… I’m a plain JavaScript object?',
    ].join('\n'),
  },
  {
    id: 'title',
    title: 'Title',
    time: '0:40',
    steps: 1,
    Component: Title,
    claims: [],
    notes: ['Title card.', '[CLICK] こんにちは! I’m Saman.'].join('\n'),
  },
  {
    id: 'status',
    title: 'STATUS window',
    time: '6:00',
    steps: 6,
    Component: Status,
    claims: ['A8', 'A7', 'H1', 'B1', 'A4', 'D2', 'A3'],
    notes: [
      'DRAFT: SYSTEM: you are a fiber now. Here is my status window.',
      '[CLICK] DRAFT: return = parent. child = first child. sibling = next one.',
      '[CLICK] DRAFT: alternate. My twin in the other world: one copy on screen, one being built.',
      '[CLICK] DRAFT: lanes = work waiting here. childLanes = work waiting below.',
      '[CLICK] (skill unlock sound) DRAFT: My only skill… "stop working". A useless skill?',
      '[CLICK] DRAFT: And it only works for Transition, Retry and Idle work. Not for clicks.',
      '[CLICK] DRAFT: There is also a sealed version: yield every 25 ms. The flag is off.',
    ].join('\n'),
  },
  {
    id: 'yield',
    title: 'Skill: Yield',
    time: '8:00',
    steps: 6,
    Component: YieldSkill,
    claims: ['A2', 'A7', 'B1', 'C4', 'C5', 'C6', 'C7', 'G1', 'A4'],
    notes: [
      'DRAFT: My skill: stop working. …Really?',
      '[CLICK] DRAFT: Old loop: no exit. New loop: one check before every fiber.',
      '[CLICK] Walk, slice 1. The dialogue box narrates. Let it play (~4 s).',
      '[CLICK] Browser’s turn, then a MessageChannel message.',
      '[CLICK] Slice 2 starts at CartIcon. Same fiber.',
      '[CLICK] Last slice, then commit (~7 s).',
      '[CLICK] DRAFT: Yield = pause. Same fiber, same tree. But only for work React may pause.',
    ].join('\n'),
  },
  {
    id: 'boss',
    title: 'Boss fight (live)',
    time: '17:00',
    steps: 2,
    live: true,
    Component: BossFight,
    claims: ['A1', 'A4', 'A6', 'B2', 'C2', 'C3', 'C4', 'D2', 'E1', 'E3', 'E4', 'F1'],
    notes: [
      `RULES (on screen): a round lasts up to ${RULES.roundMs / 1000} s from the first key. EVERY frame > ${RULES.jankMs} ms = a HIT for its real ms ("the Hydra strikes whenever you freeze"). Every other frame = 1 damage to the Hydra. Fiber-kun HP ${RULES.fiberHp}, Hydra HP ${RULES.hydraHp}. A K.O. caps the rank at C.`,
      `RANKS: ${RANK_RULE}. Sword: each commit = a slash that lands; each thrown-away render = a cancelled slash + RESPAWN AT ROOT. Same workload every round; only the Hydra's look changes.`,
      'Keys: A auto-type (~6 s) · ↑ jump (shows input delay when > 50 ms) · I focus input · C clear · R restart round · [ ] work per cell.',
      'Round 1 (sync): press A, then press ↑ during the fight: the jump fires late and the screen shows the input delay. Expect GAME OVER (rank C) — but the screen shows the real result.',
      '[CLICK] Round 2 (useTransition): press A. Red X + RESPAWN AT ROOT = a real thrown-away render.',
      '[CLICK] Round 3 (useDeferredValue): press A.',
      'DRAFT: If round 2 or 3 shows A instead of S: "A, not S. One frame was too long. These numbers are real, so the game does not lie for me."',
    ].join('\n'),
  },
  {
    id: 'patch',
    title: 'Patch notes',
    time: '24:00',
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
];
