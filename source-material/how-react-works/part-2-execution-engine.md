# How React Works (Part 2) — Why React Had to Build Its Own Execution Engine

> **Series:** How React Works Under the Hood
> **Prerequisites:** Read Part 1 first.

---

## Where We Left Off

In Part 1 we landed on one sentence that explains why React had to be completely rewritten:

> **React needs to be able to interrupt what it's doing and resume it later.**

Time Slicing needs it — to yield within the browser's 16ms frame budget.
Suspense needs it — to pause and wait for async data.

Simple enough requirement. But here's the problem: **JavaScript itself won't let you do it.**

---

## The Problem: JavaScript Runs to Completion

When JavaScript starts executing a function, it finishes it. There is no external API to say "pause here, do something else, come back." There is no way to freeze a running program mid-execution, hand control back to the browser, and resume from the exact same spot.

This is because JavaScript manages execution with something called the **call stack** — a data structure that tracks what the program is doing at any moment.

Every time a function is called, JavaScript creates a **stack frame** — a small record of that function's parameters, local variables, and where to return to when it finishes. These frames stack up as functions call other functions, and pop off as they return.

Here's the critical property of this stack: **it's managed entirely by the JavaScript engine.** You — the developer — cannot read it, pause it, or jump around in it. It's a black box.

For old React, this was fine. React rendered your whole tree in one big chain of function calls. But for Time Slicing, this model is a hard wall.

```javascript
// Old — no way out until every component is done
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

// New — checks after every single component
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```

One extra condition: `!shouldYield()`. After every component, React asks: *"Is the browser waiting?"* If yes, the loop breaks. But for this to be safe — for breaking mid-loop to not lose work — React needed somewhere to store what it was doing. That storage is Fiber.

---

## The Insight: What If React Had Its Own Stack?

Here's the idea that changed everything.

The native JavaScript call stack is a constraint because React doesn't control it. But what if React built its own version — one that it *does* control?

Not a replacement for JavaScript's stack. JavaScript still runs normally. But React would track its own rendering work in a data structure it manages itself. One it can pause, inspect, prioritize, and resume at any moment.

This is what React Fiber is. It is React's own custom execution model, built in plain JavaScript objects, sitting on top of JavaScript's normal execution.

> *"A fiber is just a generic way to model program execution in a way where each individual unit of work works together cooperatively. No single fiber attempts to dominate the program."*
> — Sam Galson

---

## What a Fiber Actually Is

In JavaScript's call stack, a **stack frame** holds:
- What function is running
- What parameters it was called with
- What local variables it has
- Where to return to when done

A **Fiber** holds the exact same information — but for a React component:

| Stack frame | Fiber equivalent |
|-------------|-----------------|
| The function | Your component (`App`, `Button`, etc.) |
| Parameters | Props being passed in |
| Local variables | State and hooks |
| Return address | The parent component |

The difference that makes everything possible: stack frames live inside the JavaScript engine where you can't touch them. **Fibers are just plain JavaScript objects.**

```javascript
{
  type: Button,
  pendingProps: { label: "click me" },
  memoizedState: { count: 0 },
  return: ParentFiber,       // parent — like a return address
  child: null,               // first child component
  sibling: null,             // next sibling component
  alternate: null,           // the other version of this fiber
}
```

That's it. A regular JavaScript object. The fact that it's *just an object* is what makes pausing safe — React can stop at any point, and the fiber is still sitting in memory exactly as it was.

Because fibers are objects, they can hold more than stack frames can. Each fiber knows not just its parent but also its **first child** and its **next sibling**. React can navigate the entire component tree from any point — forward, backward, sideways — without losing track of where it is.

---

## Two Trees, Always

React always keeps **two versions** of your component tree in memory at the same time:

- The **current tree** — what's actually showing on screen right now
- The **work-in-progress tree** — what React is building for the next render

All rendering work happens on the work-in-progress tree. The current tree is never touched during rendering. So if React gets interrupted mid-render, the screen doesn't flicker or break — the current tree is still intact and showing correctly.

When the new tree is fully built and ready, React swaps them in one atomic operation. What was work-in-progress becomes current. What was current becomes the next work-in-progress.

This pattern — keeping two versions and building the new one safely before switching — is called **double buffering**. It's the same technique video games use to prevent screen tearing.

---

## How the Scheduler Uses This

Now the Scheduler — the module that decides *when* and *in what order* work runs — can do things that were completely impossible before.

**Pause and resume.** When `shouldYield()` returns true, the work loop simply stops. The `workInProgress` pointer stays exactly where it is. Next time the Scheduler gets control, the loop continues from that fiber. No work is lost.

**Prioritize.** Because fibers are objects React controls, it can look at any fiber's priority (`lanes`) and decide to work on a different part of the tree first.

**Abort.** If a newer update makes the current work-in-progress tree obsolete, React can throw it away entirely and start fresh with updated data. The current tree on screen is unaffected.

None of these were possible when rendering was one continuous chain of JavaScript function calls.

---

## The Full Picture in One Paragraph

React saw that JavaScript's call stack — fast, simple, but completely opaque — was incompatible with the kind of interruptible, prioritized rendering that modern apps need. So it built a replacement: a tree of plain JavaScript objects (fibers) where each object is a stack frame React controls. It keeps two copies of this tree so it can always build the next version safely without disturbing what's on screen. And it has a Scheduler that decides what to work on next, how long to work before yielding, and how to resume exactly where it stopped.

That system — Fiber + Scheduler — is the engine underneath every `useState`, every `useTransition`, every `<Suspense>` boundary.

---

## Sources & Thanks

- **Sam Galson** — Magic in the web of it (talk) and Continuations, coroutines, fibers, effects (article)
- **Andrew Clark** — react-fiber-architecture
- **[jser.dev](https://jser.dev)** — source-level verification of how the two-tree system, `workInProgress`, and the Scheduler work loop actually behave
