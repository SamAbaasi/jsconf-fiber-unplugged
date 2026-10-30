// Instrumented re-export of the real scheduler package.
import * as S from 'real-scheduler';
export const log = [];
globalThis.__schedLog = log;
const PRI = {1:'Immediate',2:'UserBlocking',3:'Normal',4:'Low',5:'Idle'};
let id = 0;
export function unstable_scheduleCallback(p, cb, opts) {
  const tid = ++id;
  log.push({ev:'schedule', tid, pri: PRI[p], t: S.unstable_now()});
  const wrap = (didTimeout) => {
    log.push({ev:'run', tid, t: S.unstable_now()});
    const next = cb(didTimeout);
    log.push({ev: typeof next === 'function' ? 'yield' : 'end', tid, t: S.unstable_now()});
    if (typeof next === 'function') { cb = next; return wrap; }
    return next;
  };
  return S.unstable_scheduleCallback(p, wrap, opts);
}
export function unstable_shouldYield() {
  const y = S.unstable_shouldYield();
  if (y) log.push({ev:'shouldYield=true', t: S.unstable_now()});
  return y;
}
export const {
  unstable_cancelCallback, unstable_requestPaint, unstable_now, unstable_getCurrentPriorityLevel,
  unstable_ImmediatePriority, unstable_UserBlockingPriority, unstable_NormalPriority,
  unstable_LowPriority, unstable_IdlePriority, unstable_runWithPriority, unstable_next,
  unstable_wrapCallback, unstable_forceFrameRate, unstable_Profiling, unstable_continueExecution,
  unstable_pauseExecution, unstable_getFirstCallbackNode,
} = S;
