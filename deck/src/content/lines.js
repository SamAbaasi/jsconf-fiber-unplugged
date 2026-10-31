// Every line of on-screen dialogue lives here, so it is easy to edit in one place.
//
//   by: 'saman'  → Saman's own words, from the brief. Do not change without Saman.
//   by: 'draft'  → Claude's draft. Saman will edit these.
//
// Each line also lists the CLAIMS.md rows its facts depend on (empty = no technical claim).
// Japanese strings must also be listed in JP_REVIEW.md.

export const LINES = {
  coldWake: {
    by: 'saman',
    speaker: '???',
    face: 'sleeping', // now plays when Fiber-kun wakes up in the other world
    lang: 'ja',
    text: '目が覚めたら…',
    sub: '(When I woke up…)',
    claims: [],
  },
  tehran: {
    by: 'saman',
    speaker: 'Saman', // speaker label is a draft
    face: null,
    text: 'I was a frontend engineer in Tehran…',
    claims: [],
  },
  truckAfter: {
    by: 'draft',
    speaker: 'SYSTEM',
    face: null,
    text: 'One long task. Everything stops. No frames. No input.',
    claims: ['A1'],
  },
  // [SYSTEM] window at the end of the cold open (DRAFT).
  sysReborn: { by: 'draft', text: 'You have been reborn as a FiberNode.', claims: ['A8'] },
  sysLevel: { by: 'draft', text: 'Lv 1 · skills: none', claims: [] },
  sysGate: { by: 'draft', text: 'A dungeon has opened: MAIN THREAD', claims: ['L2'] },
  wakeUp: {
    by: 'saman',
    speaker: 'Fiber-kun',
    face: 'shocked',
    text: 'Wait… I’m a plain JavaScript object?',
    claims: ['A8'],
  },

  // The Gate = the main thread (DRAFT).
  gateOne: { by: 'draft', text: 'One corridor. JS, layout, paint and your click. One at a time.', claims: ['L2'] },
  gateStuck: { by: 'draft', text: 'A long task is stuck. Your click and the next frame must wait.', claims: ['L1', 'L2'] },

  // Floor 2: why is Yield a "dud"? (DRAFT)
  dudTitle: { by: 'draft', text: 'Why a dud skill?', claims: [] },
  dudLine: { by: 'draft', text: 'A click never meets the Scheduler. No yield for it.', claims: ['C2', 'A4'] },

  // Ending (text approved by Saman in the Phase 3b brief; Japanese pending native check)
  endJoin: {
    by: 'saman',
    lang: 'ja',
    text: '「Fiber-kunが 仲間に なりたそうに こちらを見ている！」',
    sub: '(Fiber-kun is looking at you, wanting to join your party!)',
    claims: [],
  },
  endAsk: { by: 'saman', lang: 'ja', text: '仲間にしますか？', claims: [] },
  endYes: { by: 'saman', lang: 'ja', text: 'はい', claims: [] },
  endNo: { by: 'saman', lang: 'ja', text: 'いいえ', claims: [] },

  // STATUS window
  statusTwin: { by: 'draft', text: 'My twin: the copy being built.', claims: ['A8'] },
  statusSkillEffect: { by: 'saman', text: 'Effect: pause work.', claims: ['B1'] }, // Saman approved the change from "stop working" (Phase 3b)
  statusSkillWhen: { by: 'draft', text: 'Only for: Transition · Retry · Idle', claims: ['A4'] },
  statusSkillNot: { by: 'draft', text: 'Not for clicks, scroll, timers.', claims: ['A4', 'D2'] },

  // Yield slide, step 0 and summary
  yCardReally: { by: 'draft', text: '…really?', claims: [] },
  ySummary: { by: 'draft', text: 'Same fiber. Same tree. Nothing lost.', claims: ['B1'] },
  ySummaryCatch: { by: 'draft', text: 'But only for work React may pause.', claims: ['A4'] },

  // Patch notes (slide "patch"). Title and subtitle are Saman's; the entries are drafts.
  patchTitle: { by: 'saman', text: 'PATCH NOTES v1.1', claims: [] },
  patchSub: { by: 'saman', text: 'bugs in my own articles', claims: [] },
  patch1Old: { by: 'draft', text: 'startTransition(() => setResults(filter(query)))', claims: ['E1', 'E2'] },
  patch1New: { by: 'draft', text: 'runs now', claims: ['E1'] },
  patch2Old: { by: 'draft', text: 'useEffect: always after paint', claims: ['G2'] },
  patch2New: { by: 'draft', text: 'after a click: before paint', claims: ['G2'] },
  patch3Old: { by: 'draft', text: 'Header re-renders', claims: ['H3'] },
  patch3New: { by: 'draft', text: 'only CartIcon', claims: ['H2', 'H3'] },
  patch4Old: { by: 'draft', text: '5 ms per React task, for all work', claims: ['C10'] },
  patch5Old: { by: 'draft', text: 'keystroke: pause, then resume', claims: ['B6'] },
  patch5New: { by: 'draft', text: 'restart from root', claims: ['B1', 'B2', 'B6'] },
  patch4New: { by: 'draft', text: '5 ms per browser task, non-urgent only', claims: ['C5', 'C10', 'A4'] },

  // Boss fight result screen. Shown only when the real result matches.
  resultWinYield: { by: 'draft', text: '外れスキル? No. 《Yield》 won.', lang: 'ja-mixed', claims: ['A2', 'A4', 'B1'] },
  resultLoseSync: { by: 'draft', text: 'No yield here. Each key = one long render.', claims: ['A1', 'A4'] },

  // Boss room REPLAY step: one takeaway line per round (DRAFT).
  replaySync: { by: 'draft', text: 'One key = one long sync render. Every key waits.', claims: ['A1', 'A4', 'C2'] },
  replayTransition: { by: 'draft', text: 'The list renders in 5 ms slices. Keys cut in between.', claims: ['A2', 'A4', 'C4', 'B2'] },
  replayDeferred: { by: 'draft', text: 'Same slices. I don’t own the setter, so I defer the value.', claims: ['F1', 'F4', 'A4'] },
  questFailedLine: { by: 'draft', text: 'You beat the dragon. The user already left.', claims: ['A1', 'A4'] },

  // Yield walk (slide "yield", steps 2–5). {wip} is filled from the real walk order.
  yWalk: { by: 'draft', speaker: 'Fiber-kun', face: 'normal', text: 'One fiber at a time. This bar is my 5 ms.', claims: ['A2', 'A7', 'C4'] },
  yStop: { by: 'draft', speaker: 'Fiber-kun', face: 'sleeping', text: '5 ms gone. shouldYield() says true. I stop at {wip}.', claims: ['A2', 'B1', 'C5'] },
  yBrowser: { by: 'draft', speaker: 'Fiber-kun', face: 'sleeping', text: 'The browser’s turn. It paints. I wait.', claims: ['C6', 'C7'] },
  yResume: { by: 'draft', speaker: 'Fiber-kun', face: 'smug', text: 'New task. Same fiber: {wip}. Nothing lost.', claims: ['B1', 'C7'] },
  yCommit: { by: 'draft', speaker: 'Fiber-kun', face: 'shocked', text: 'Done. Now commit. Commit can’t pause.', claims: ['G1'] },
};
