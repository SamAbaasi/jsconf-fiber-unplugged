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
    face: 'sleeping',
    lang: 'ja',
    text: '目が覚めたら…',
    sub: '(When I woke up…)',
    claims: [],
  },
  tehran: {
    by: 'saman',
    speaker: 'previous life', // speaker label is a draft
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
  wakeUp: {
    by: 'saman',
    speaker: 'Fiber-kun',
    face: 'shocked',
    text: 'Wait… I’m a plain JavaScript object?',
    claims: ['A8'],
  },

  // STATUS window
  statusTwin: { by: 'draft', text: 'My twin in the other world.', claims: ['A8'] },
  statusSkillEffect: { by: 'saman', text: 'Effect: stop working.', claims: ['B1'] },
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
  patch2Old: { by: 'draft', text: 'useEffect: after paint', claims: ['G2'] },
  patch2New: { by: 'draft', text: 'click → before paint', claims: ['G2'] },
  patch3Old: { by: 'draft', text: 'Header re-renders', claims: ['H3'] },
  patch3New: { by: 'draft', text: 'only CartIcon', claims: ['H2', 'H3'] },
  patch4Old: { by: 'draft', text: '5 ms per task', claims: ['C10'] },
  patch5Old: { by: 'draft', text: 'keystroke: pause, then resume', claims: ['B6'] },
  patch5New: { by: 'draft', text: 'restart from root', claims: ['B1', 'B2', 'B6'] },
  patch4New: { by: 'draft', text: 'browser task, non-urgent', claims: ['C5', 'C10', 'A4'] },

  // Boss fight result screen. Shown only when the real result matches.
  resultWinYield: { by: 'draft', text: '外れスキル? No. 《Yield》 won this fight.', lang: 'ja-mixed', claims: ['A2', 'A4', 'B1'] },
  resultLoseSync: { by: 'draft', text: 'No yield here. Each key = one long render.', claims: ['A1', 'A4'] },

  // Yield walk (slide "yield", steps 2–5). {wip} is filled from the real walk order.
  yWalk: { by: 'draft', speaker: 'Fiber-kun', face: 'normal', text: 'One fiber at a time. This bar is my 5 ms.', claims: ['A2', 'A7', 'C4'] },
  yStop: { by: 'draft', speaker: 'Fiber-kun', face: 'sleeping', text: '5 ms gone. shouldYield() says true. I stop at {wip}.', claims: ['A2', 'B1', 'C5'] },
  yBrowser: { by: 'draft', speaker: 'Fiber-kun', face: 'sleeping', text: 'The browser’s turn. It paints. I wait.', claims: ['C6', 'C7'] },
  yResume: { by: 'draft', speaker: 'Fiber-kun', face: 'smug', text: 'New task. Same fiber: {wip}. Nothing lost.', claims: ['B1', 'C7'] },
  yCommit: { by: 'draft', speaker: 'Fiber-kun', face: 'shocked', text: 'Done. Now commit. Commit never stops.', claims: ['G1'] },
};
