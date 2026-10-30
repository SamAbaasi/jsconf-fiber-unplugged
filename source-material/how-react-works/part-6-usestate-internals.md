# How React Works (Part 6) — How State Actually Works: useState from the Inside

> **Series:** How React Works Under the Hood
> **Prerequisites:** Read Parts 1–5 first.

---

## Three Things That Confuse Almost Everyone

```javascript
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
    // You might expect count to become 3
    // It becomes 1
  }

  function handleLog() {
    setCount(count + 1);
    console.log(count);
    // You might expect to see the new value
    // You see the old value
  }

  function handleSame() {
    setCount(count); // setting same value
    // You might expect no re-render
    // Sometimes React still re-renders once
  }
}
```

All three behaviors make complete sense once you understand how `useState` actually works under the hood.

---

## Where State Lives

When you call `useState(0)`, where does that `0` actually live?

Not in the component function. Component functions are just regular JavaScript functions — they have no persistent memory between calls. Every time React re-renders your component, it calls the function fresh from the top.

State lives on the **Fiber**. Specifically, on a hook object stored in the fiber's `memoizedState` field.

Every hook call creates a new hook object and appends it to a linked list hanging off the fiber:

```
Counter fiber
  └─ memoizedState → hook (useState count)
                       └─ next → hook (useEffect)
                                   └─ next → hook (useRef)
                                               └─ next → null
```

This is why the rules of hooks exist — specifically why you can't call hooks conditionally. React doesn't track hooks by name. It tracks them by position in the linked list. If you skip a hook call with an `if` statement, every subsequent hook gets the wrong state from the wrong position.

---

## What Happens When You Call `setState`

Here's what most developers picture when they call `setCount(count + 1)`:
> React updates the count, then re-renders the component.

Here's what actually happens:
> React creates a small update object and adds it to a queue. Then it schedules a re-render for later. The component function does not run again right now.

The actual sequence:

**Step 1 — Create an update object.** React packages your new value into a small object that also carries the current priority lane.

**Step 2 — Stash it in a queue.** The update goes into a global buffer (`concurrentQueues`). It's not attached to the fiber yet.

**Step 3 — Schedule a re-render.** React calls `scheduleUpdateOnFiber`, which walks up to the root, marks the trail of `childLanes`, and registers a task with the Scheduler.

**Step 4 — At the start of the next render, attach updates.** Before the render begins, `finishQueueingConcurrentUpdates` runs and attaches all stashed updates from the global buffer to their respective fibers' queues.

**Step 5 — During render, process the queue.** When React processes the Counter fiber, it reads `hook.queue`, processes the pending updates in order, and the result becomes the new `hook.memoizedState`.

---

## Why You See the Old Value After `setState`

```javascript
setCount(count + 1);
console.log(count); // still the old value
```

Calling `setCount` didn't change `count`. It created an update object and scheduled a re-render. The variable `count` is a local variable in the current function call — it was captured when the component rendered and it will never change during this render.

This is a fundamental property of React's model: **state values are snapshots.** Every render captures its own version of state, and that snapshot is frozen for the duration of that render.

---

## Why Three `setCount` Calls Only Increment Once

```javascript
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);
// count goes from 0 to 1, not 0 to 3
```

Each of these three calls captures the same `count` — the snapshot from the current render, which is `0`. So all three are equivalent to `setCount(0 + 1)`. React queues three updates, all with value `1`. When it processes them in the next render, the result is `1`.

The fix is the updater function form:

```javascript
setCount(c => c + 1);
setCount(c => c + 1);
setCount(c => c + 1);
// count goes from 0 to 3
```

When you pass a function, React processes the updates in sequence — each one receives the result of the previous. The queue runs `0 → 1 → 2 → 3`.

---

## Why Multiple `setState` Calls Don't Cause Multiple Re-renders

This is **batching** — one of React's most important performance features.

```javascript
function handleClick() {
  setCount(c => c + 1);  // queued
  setName('Alice');       // queued
  setLoading(false);      // queued
  // → one re-render, not three
}
```

Updates are stashed in the global `concurrentQueues` buffer and only attached to fibers at the beginning of the next render via `finishQueueingConcurrentUpdates`. This means all three `setState` calls during the same event handler land in the queue before any render begins — React processes them all in one pass.

React 18 introduced **automatic batching** — batching now happens everywhere by default, regardless of where the update originates (setTimeout, fetch callbacks, native event handlers).

---

## The Same-Value Optimization (and Its Catch)

```javascript
setCount(count); // count is already 5, setting it to 5 again
```

Before scheduling the re-render, `dispatchSetState` eagerly computes the new state and compares it to the current state using `Object.is`. If they're identical, React calls `enqueueConcurrentHookUpdateAndEagerlyBailout` and returns immediately — no render is scheduled.

But this bailout only happens when the fiber's update queue is currently empty. If there's other pending work on the component, React can't safely apply this optimization and may still re-render once.

The rule in practice: setting state to the same value usually prevents a re-render, but not always. Don't write code that depends on this optimization for correctness.

---

## `useRef`: State Without Re-renders

`useRef` is implemented almost identically to `useState` — it creates a hook object on the fiber's linked list, stores its value in `memoizedState`. The difference: updating a ref doesn't create an update object and doesn't call `scheduleUpdateOnFiber`. It just mutates the `current` property of the ref object directly.

```javascript
const ref = useRef(0);
ref.current = 1; // direct mutation — no queue, no schedule, no re-render
```

Because React never learns about the change, it never re-renders. The new value is available immediately (no snapshot problem), but React won't react to it.

---

## The Full Picture

`useState` is not a magical React primitive. It's a hook object on a linked list on a fiber, with a queue for pending updates and a scheduler that processes them.

State in React is not instant, synchronous, or mutable in the traditional sense. It's a description of what the next render should look like — and React processes that description on its own schedule, using the Fiber and Scheduler machinery from Parts 2 and 3.

---

## Sources & Thanks

- **[jser.dev](https://jser.dev)** — every mechanism in this article comes from JSer's source-level analysis
- **React source** — `ReactFiberHooks.js` (`mountState`, `dispatchSetState`) and `ReactFiberConcurrentUpdates.js`
- **Lydia Hallie** — for JavaScript visualizations
