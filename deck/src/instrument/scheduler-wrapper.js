// Instrumented `scheduler`. vite.config.js aliases the bare import "scheduler" to this
// file, so react-dom gets these functions. Everything forwards to the real package
// (imported by its file path, which the alias does not touch). Only two functions
// are wrapped, and only to record what happens:
//   - unstable_scheduleCallback: records schedule / start / yield / end for each task
//   - unstable_cancelCallback:   records cancel
// shouldYield, now, requestPaint and the priorities are the real ones, unchanged.
import * as Real from 'scheduler/index.js';
import { record } from './eventLog.js';

let nextId = 0;
const taskIds = new WeakMap();

// React's render task is `performWorkOnRootViaSchedulerTask.bind(null, root)`.
// The passive-effects flush after a commit is an anonymous function.
function kindOf(callback) {
  const name = callback.name || '';
  if (name.includes('performWorkOnRootViaSchedulerTask')) return 'render';
  if (name.includes('processRootSchedule')) return 'schedule';
  return 'effects';
}

export function unstable_scheduleCallback(priorityLevel, callback, options) {
  const id = ++nextId;
  const kind = kindOf(callback);
  record('task:schedule', { id, pri: priorityLevel, kind });
  let current = callback;
  const run = (didTimeout) => {
    record('task:start', { id, pri: priorityLevel, kind });
    // Lets the demo tell whether a render ran inside a Scheduler task or not
    // (sync renders run in a microtask, outside any task).
    const outer = globalThis.__fiberCurrentTask;
    globalThis.__fiberCurrentTask = id;
    let next;
    try {
      next = current(didTimeout);
    } finally {
      globalThis.__fiberCurrentTask = outer ?? null;
    }
    if (typeof next === 'function') {
      current = next;
      record('task:yield', { id, pri: priorityLevel, kind });
      return run;
    }
    record('task:end', { id, pri: priorityLevel, kind });
    return next;
  };
  const task = Real.unstable_scheduleCallback(priorityLevel, run, options);
  taskIds.set(task, id);
  return task;
}


export function unstable_cancelCallback(task) {
  const id = taskIds.get(task);
  if (id !== undefined) record('task:cancel', { id });
  return Real.unstable_cancelCallback(task);
}

export const unstable_shouldYield = Real.unstable_shouldYield;
export const unstable_requestPaint = Real.unstable_requestPaint;
export const unstable_now = Real.unstable_now;
export const unstable_getCurrentPriorityLevel = Real.unstable_getCurrentPriorityLevel;
export const unstable_runWithPriority = Real.unstable_runWithPriority;
export const unstable_next = Real.unstable_next;
export const unstable_wrapCallback = Real.unstable_wrapCallback;
export const unstable_forceFrameRate = Real.unstable_forceFrameRate;
export const unstable_getFirstCallbackNode = Real.unstable_getFirstCallbackNode;
export const unstable_pauseExecution = Real.unstable_pauseExecution;
export const unstable_continueExecution = Real.unstable_continueExecution;
export const unstable_Profiling = Real.unstable_Profiling;
export const unstable_ImmediatePriority = Real.unstable_ImmediatePriority;
export const unstable_UserBlockingPriority = Real.unstable_UserBlockingPriority;
export const unstable_NormalPriority = Real.unstable_NormalPriority;
export const unstable_LowPriority = Real.unstable_LowPriority;
export const unstable_IdlePriority = Real.unstable_IdlePriority;
// Only the test-only mock build has these; react-dom checks `typeof log === "function"`.
export const log = Real.log;
export const unstable_setDisableYieldValue = Real.unstable_setDisableYieldValue;
