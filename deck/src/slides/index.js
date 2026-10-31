// The deck. `steps` = number of clicks inside the slide (states 0 … steps).
// `time` = planned start time (mm:ss) for the presenter's pacing display.
// `live` = runs real React work; the presenter window shows a placeholder for it.
import { Title } from './Title.jsx';
import { Status } from './Status.jsx';
import { YieldSkill } from './YieldSkill.jsx';
import { BossFight } from './BossFight.jsx';

export const slides = [
  {
    id: 'title',
    title: 'Title',
    time: '0:00',
    steps: 1,
    Component: Title,
    notes: [
      'Walk to center. Wait for quiet.',
      '[CLICK] Fiber-kun says hello.',
      'こんにちは。I’m Saman. Today: a light novel about React’s scheduler.',
    ].join('\n'),
  },
  {
    id: 'status',
    title: 'STATUS window',
    time: '6:00',
    steps: 5,
    Component: Status,
    notes: [
      'SYSTEM: you have become a fiber. Here is my status window.',
      '[CLICK] IDENTITY: tag 0 is a function component. type is CartIcon.',
      '[CLICK] LINKS: return is the parent. child is the first child. sibling is the next one. That is how React walks the tree.',
      '[CLICK] TWIN: alternate. One copy is on screen. One copy is being built.',
      '[CLICK] WORK: lanes = work waiting here. childLanes = work waiting below.',
      '[CLICK] A stack frame that React controls. Just a plain object, so React can stop and come back.',
    ].join('\n'),
  },
  {
    id: 'yield',
    title: 'Skill unlocked: Yield',
    time: '8:00',
    steps: 6,
    Component: YieldSkill,
    notes: [
      'NEW SKILL UNLOCKED: Yield.',
      '[CLICK] Old loop: no exit. New loop: one extra check, shouldYield, before every fiber.',
      '[CLICK] Watch. One fiber at a time. The bar is a 5 ms slice. Empty → shouldYield is true → stop.',
      '[CLICK] The browser’s turn: paint, other tasks. Then a MessageChannel message starts the next slice.',
      '[CLICK] Next slice starts at CartIcon. The same fiber. Nothing is lost.',
      '[CLICK] Last slice. Then commit. Commit never yields.',
      '[CLICK] Yield = pause. But only for work React is allowed to pause. Which work? That is the next chapter.',
    ].join('\n'),
  },
  {
    id: 'boss',
    title: 'Boss fight (live)',
    time: '17:00',
    steps: 2,
    live: true,
    Component: BossFight,
    notes: [
      'LIVE. Press I to focus the input, or A for auto-type. C clears.',
      'Round 1: no transition. Type. The world freezes. Timeline: one gold block, no Scheduler task.',
      '[CLICK] Round 2: useTransition. Type. Green 5 ms slices. Each key cuts in; red X = thrown away, restarted.',
      '[CLICK] Round 3: useDeferredValue. Same feeling, but we do not own the setter.',
      'If the laptop is too fast or slow: [ and ] change the work per cell.',
    ].join('\n'),
  },
];
