# How React Works (Part 5) — The React Lifecycle From the Inside: When Things Actually Run

> **Series:** How React Works Under the Hood
> **Prerequisites:** Read Parts 1–4 first.

---

## A Puzzle Most React Developers Get Wrong

Quick quiz. What order do these log?

```javascript
function App() {
  useLayoutEffect(() => {
    console.log('layout effect');
  });

  useEffect(() => {
    console.log('effect');
  });

  console.log('render');
  return <div />;
}
```

Most people guess: render → effect → layout effect, or render → layout effect → effect.

The answer is: **render → layout effect → effect.**

But more importantly — *why?* Why does `useLayoutEffect` run before `useEffect`? Why does `useEffect` run at all after the component already returned? What does "after the browser paints" actually mean?

---

## The Three Phases of a React Render

Every React update goes through three phases:

**Render** — React runs your component functions, diffs the trees, figures out what changed. Nothing is written to the DOM yet. This is where `console.log('render')` fires.

**Commit** — React takes everything it figured out during Render and applies it to the real DOM. This is synchronous and uninterruptible.

**Effects** — After the DOM is updated, React runs your effects.

The key insight is that effects are *not* part of rendering. They're a separate step that happens after the DOM is already updated.

---

## What `useEffect` Actually Is

Here's the more accurate model: **`useEffect` is a declaration that you have side effects to run after React is done with the DOM.** You're not scheduling a callback — you're telling React about work that needs to happen, and React decides when to run it.

After the Commit phase finishes updating the DOM, React schedules your `useEffect` callbacks as a separate task in the Scheduler's queue. That means effects run in a **new macro task**, after the browser has had a chance to paint the updated screen.

```
1. Render phase — your component functions run
2. Commit phase — DOM is updated
3. Browser paints the screen
4. Scheduler fires — useEffect callbacks run
```

The browser gets step 3 because steps 1-2 are one macro task, and step 4 is a new macro task. Between any two macro tasks, the browser can paint.

---

## The Cleanup: Why It Runs Before the Next Effect

Every `useEffect` can return a cleanup function:

```javascript
useEffect(() => {
  const subscription = subscribe(id);
  return () => subscription.unsubscribe(); // cleanup
}, [id]);
```

When `id` changes and the effect needs to re-run, React runs the *cleanup of the previous effect first*, then runs the new effect. Always in that order.

React never wants two instances of the same effect active at the same time. Before setting up the new subscription, it tears down the old one.

From jser.dev: cleanups run first in `commitPassiveUnmountEffects`, then new effects run in `commitPassiveMountEffects`. Both happen in the same scheduled task, in the same order as the tree (children before parents).

---

## `useLayoutEffect`: The Synchronous Version

Here's the critical difference: `useLayoutEffect` runs **synchronously inside the Commit phase**, before the browser paints.

```
1. Render phase — component functions run
2. Commit phase — DOM is updated
3. useLayoutEffect callbacks run ← here, synchronously, before paint
4. Browser paints
5. useEffect callbacks run ← here, in next macro task
```

This is why `useLayoutEffect` fires before `useEffect` — it's not "earlier in the same phase," it's in a completely different phase.

`useLayoutEffect` exists for when you need to **read the DOM after it's updated but before the user sees it** — for example, measuring an element's size to position a tooltip.

```javascript
// useLayoutEffect — correct for DOM measurements
useLayoutEffect(() => {
  const rect = ref.current.getBoundingClientRect();
  setTooltipPosition({ top: rect.bottom, left: rect.left });
});

// useEffect — would cause a visible flicker for measurements
// because the browser already painted before this runs
useEffect(() => {
  const rect = ref.current.getBoundingClientRect();
  setTooltipPosition({ top: rect.bottom, left: rect.left }); // too late
});
```

---

## The "After Paint" Rule Has an Exception

The docs say `useEffect` always runs after the browser paints. But that's not strictly true.

Sometimes React runs `useEffect` callbacks *before* paint. This happens when React determines it's more important to show the latest UI as quickly as possible — for example, when a re-render is triggered by a user interaction, or when effects are scheduled under layout effects.

> *"I'd explain the timing of running useEffect() callbacks as follows. useEffect() callbacks are run after DOM mutation is done. Most of the time, they are run asynchronously after paint, but React might run them synchronously before paint when it is more important to show the latest UI."*
> — jser.dev

The practical implication: never rely on `useEffect` to run after paint for correctness. If your code requires running after the browser paints, `useLayoutEffect` with its explicit synchronous-before-paint guarantee is actually the more predictable choice.

---

## The Dependency Array: What It Actually Controls

The dependency array in `useEffect` and `useLayoutEffect` doesn't control *whether* the effect runs — it controls *when* it re-runs.

React compares the current values of the dependency array to the previous ones using `Object.is`. If any value changed, React marks the effect with a flag indicating it should run again.

Three cases:

**No dependency array** — re-runs after every render.

**Empty array `[]`** — runs once on mount, cleanup runs on unmount.

**Array with values** — re-runs whenever any listed value changes between renders.

React doesn't track *what* you use inside the effect. It trusts the dependency array you provide. If you use `userId` inside the effect but forget to put it in the array, React won't re-run the effect when `userId` changes — and you get a stale value bug.

---

## When to Use Which

Use `useEffect` for everything by default. Most side effects — data fetching, subscriptions, logging, timers — don't need to happen before the browser paints.

Reach for `useLayoutEffect` only when you need to read or modify the DOM before the user sees it. The practical test: if swapping `useLayoutEffect` for `useEffect` causes a visible jump or flash in the UI, you needed `useLayoutEffect`.

---

## Sources & Thanks

- **[jser.dev](https://jser.dev)** — all timing mechanics in this article
- **React source** — `ReactFiberCommitWork.js` (`commitLayoutEffects`, `commitPassiveMountEffects`, `commitPassiveUnmountEffects`)
- **Lydia Hallie** — for JavaScript visualizations
