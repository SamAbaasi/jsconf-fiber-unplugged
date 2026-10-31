// A Gate = one main-thread task. It shows only its measured duration in ms.
// It turns red at 50 ms or more: a long task (CLAIMS L1, W3C Long Tasks: a task is reported
// unless "end time minus start time is less than the long tasks threshold of 50 ms").
export const LONG_TASK_MS = 50;
export const isLongTask = (ms) => ms >= LONG_TASK_MS;
