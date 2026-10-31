// Gate ranks for a measured task duration (CLAIMS L1, L3).
// Only S comes from a spec: a long task is 50 ms or more (L1). The other lines are our
// own convention: E = one 5 ms Scheduler slice (C4), C = one 60 Hz frame (1000 / 60 ms).
export const GATE_RANKS = [
  { rank: 'E', max: 5, rule: '≤ 5 ms · one slice' },
  { rank: 'D', max: 10, rule: '≤ 10 ms' },
  { rank: 'C', max: 1000 / 60, rule: '≤ 16.7 ms · one 60 Hz frame' },
  { rank: 'B', max: 1000 / 30, rule: '≤ 33 ms · two frames' },
  { rank: 'A', max: 50, rule: '< 50 ms', exclusive: true },
  { rank: 'S', max: Infinity, rule: '≥ 50 ms · LONG TASK (spec)' },
];

export function gateRank(ms) {
  for (const r of GATE_RANKS) {
    if (r.exclusive ? ms < r.max : ms <= r.max) return r;
  }
  return GATE_RANKS[GATE_RANKS.length - 1];
}
