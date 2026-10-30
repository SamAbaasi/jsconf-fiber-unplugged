# How React Works (Part 1) — Motivation Behind React Fiber: Time Slicing & Suspense

> **Series:** How React Works Under the Hood
> **Level:** Intermediate to Advanced
> **Prerequisites:** Basic React knowledge.

---

## Introduction

You've used React. You've felt that lag — the input that stutters, the page that freezes for half a second, the animation that just doesn't feel right. But have you ever wondered **why React had to completely rewrite its entire internal engine just to fix it?**

In 2017, the React team announced **React Fiber** — a ground-up rewrite of React's internals. Not the API. Your JSX and components stayed the same. But the engine underneath, the thing that actually decides *how* and *when* work gets done, was thrown out and rebuilt from scratch.

To understand *why* Fiber was necessary — not just useful, but *necessary* — we need to start where the React team started. This entire article is grounded in Dan Abramov's talk at JSConf Iceland 2018.

> 🎬 **[Dan Abramov — Beyond React 16 | JSConf Iceland 2018](https://www.youtube.com/watch?v=nLF0n9SACd4)**

---

## The Core Question

> **"With vast differences in computing power and network speed, how do we deliver the best user experience for everyone?"**

This isn't a warm-up. It's the exact design challenge the React team was solving. Think about who uses your app:

- A developer on a MacBook Pro with fiber internet
- A user in rural Southeast Asia on a 3-year-old Android phone with a 3G connection
- Someone on a mid-range laptop on a crowded café WiFi

React runs on all of these. And in 2017, it was doing a poor job of adapting to any of them. The problems fell into two distinct categories.

---

## CPU Problems — The Cost of Rendering

These are problems caused by **expensive computation**. When React updates your UI, it has to do real work: creating DOM nodes, calling render functions, reconciling old and new trees, applying changes to the DOM. On a powerful machine, this might take 5ms. On a low-powered mobile device, the exact same work might take 50ms or more.

**CPU problems look like:**
- A complex chart re-rendering while you're typing
- Mounting a large component tree on initial load
- Re-rendering a long list when one item changes

---

## IO Problems — The Cost of Waiting

These are problems caused by **time spent waiting for things to arrive** — data from an API, a JavaScript bundle from a CDN, an image.

**IO problems look like:**
- Data-fetching waterfalls — fetch A, then B, then C, each blocking the next
- Code splitting — loading a bundle before a page can render
- Showing wrong loading states because data arrived faster or slower than expected

---

## The Demo That Changed Everything

The app: an input field at the top, a detailed chart below. The rule: **the more characters you type, the more detailed the chart gets.** Both updates — the input and the chart — happen at the same time.

Watch the input. There's a clear delay between pressing a key and seeing the character appear. The browser is so busy computing the chart that **it can't process keystrokes fast enough**. The thread is blocked for the entire duration of the render — which might be 50, 80, even 100ms — and the user feels every millisecond of it.

Dan put the root problem precisely:

> *"The underlying problem is that the update is big and synchronous — once React starts rendering, it cannot stop."*

This is visible directly in the React source code. In synchronous mode, the work loop looks like this:

```javascript
// From React source — synchronous mode
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}
```

It's a plain `while` loop with no exit condition other than finishing everything. Once React starts, it runs to completion. There is no way to pause it from the outside.

---

## The Attempted Fix: Debouncing

The most natural workaround: instead of updating the chart on every keystroke, wait until the user pauses typing, then do one big update.

Better? A little. But it has three real problems:

**1. It's not adaptive to the device.** Debouncing uses a fixed delay — say 300ms. If the user's machine is powerful enough to render instantly, they still wait 300ms.

**2. It still locks up when it fires.** Even with debouncing, the moment the update fires, the browser locks up completely. You've moved the jank — not eliminated it.

**3. It doesn't help with mounting.** Debouncing can delay an *update*, but when you first *mount* a large component tree, there's nothing to debounce.

The problem isn't *when* the update fires. It's that the update is **synchronous and uninterruptible** when it does.

---

## What If React Could Pause?

What if React could start rendering the chart update, notice that a keystroke arrived, **pause the render**, handle the keystroke immediately, then **resume** from exactly where it stopped?

The total amount of work is identical. But the *experience* is completely different — because users get immediate feedback on their input while the expensive work finishes quietly in the background.

---

## The 16ms Frame Budget

Browsers aim to run at **60 frames per second**. The math:

```
1000ms ÷ 60 frames ≈ 16.67ms per frame
```

Every ~16ms, the browser needs to execute JavaScript, recalculate styles, lay out the page, and paint pixels to the screen. If JavaScript takes more than ~16ms in a continuous burst, the browser **misses that frame**. You see jank.

Old React had no awareness of this budget at all. A single render could take 100ms and React would march through it, never yielding control, never letting the browser breathe.

---

## Time Slicing

**Time Slicing** is React's solution to the CPU problem.

The core idea: instead of doing all rendering in one continuous chunk, React **slices that work into small pieces** and checks between each piece whether something more urgent has arrived.

```javascript
// From React source — concurrent mode
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```

Spot the difference from `workLoopSync`: `!shouldYield()`. After every single unit of work, React asks the Scheduler: *"Is it time to yield?"*

```javascript
function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed < frameInterval) {
    return false; // still have budget — keep working
  }
  return true; // time's up — yield to the browser
}
```

Each task is given about 5ms. When that time is up, React pauses. The browser gets a chance to handle user input and paint. Then React resumes from exactly where it left off.

Dan described the properties precisely:

> *"We've built a generic way to ensure that high-priority updates don't get blocked by a low-priority update, called time slicing. If my device is fast enough, it feels almost like it's synchronous; if my device is slow, the app still feels responsive."*

Three properties:
- **Feels synchronous on fast devices**
- **Feels responsive on slow devices**
- **Only the final state is shown**

### The Git Metaphor

Without time slicing, React is like working directly on `main`. An urgent bug comes in mid-feature — you can't fix it. You have to finish the feature first.

With time slicing, React works like a proper branching workflow. You start on a feature branch — the low-priority chart render. An urgent task arrives — a keystroke. You handle it on `main` first, then rebase your feature branch on top when you're done.

---

## Suspense

If Time Slicing solves the CPU side, **Suspense** solves the IO side.

Dan introduced it:

> *"We've built a generic way for components to suspend rendering while they load async data, which we call suspense. You can pause any state update until the data is ready, and you can add async loading to any component deep in the tree without plumbing all the props and state through your app."*

```javascript
function MovieDetails({ id }) {
  // If data isn't cached yet, this suspends — throws a Promise
  const movie = movieCache.read(id);
  return <div>{movie.title}</div>;
}

<Suspense fallback={<Spinner />}>
  <MovieDetails id={42} />
</Suspense>
```

Internally, when a component suspends, it throws a `Promise`. React catches it at the nearest `<Suspense>` boundary, shows the fallback, and retries the render when the Promise resolves.

---

## The Common Thread: Interrupting

Time Slicing and Suspense look completely different — one is about CPU, one is about IO. But they share **one fundamental requirement:**

> **React needs to be able to interrupt what it's doing and resume it later.**

- Time Slicing: interrupt to yield within the 16ms frame budget
- Suspense: interrupt to wait for async data

This is exactly why React needed Fiber. The old React engine used JavaScript's native call stack — and the native call stack has a hard limitation: **you cannot pause it from the outside.**

Fiber is a reimplementation of the stack, specialized for React components. Because Fibers are just plain JavaScript objects, React can create them, inspect them, pause them, delete them, and resume them whenever it wants.

---

## React's Internal Pipeline

- **Trigger** — something changes (setState, event). React registers the work.
- **Schedule** — the Scheduler decides *when* and in what order work happens.
- **Render** — React walks the Fiber tree and figures out what changed. **This phase is interruptible.**
- **Commit** — React applies changes to the real DOM. Synchronous. Cannot be interrupted.

Fiber makes the Render phase interruptible. Everything else follows from that.

---

## What's Coming in This Series

| Part | Title | Core story |
|------|-------|-----------|
| **Part 2** | Why React Had to Build Its Own Execution Engine | JS call stack can't pause → React builds Fiber + Scheduler |
| **Part 3** | How React Finds What Actually Changed | Re-rendering everything is too slow → the Reconciler + keys |
| **Part 4** | The Idea That Makes Suspense Possible | Algebraic effects → how Suspense and ErrorBoundary actually work |
| **Part 5** | The React Lifecycle From the Inside | When `useEffect` and `useLayoutEffect` fire and why |
| **Part 6** | How State Actually Works | `useState`, `useRef`, dispatch, and the commit state phase |
| **Part 7** | The Trap of Vibe Coding `useCallback` | What causes re-renders — before reaching for `memo` and `useCallback` |
| **Part 8** | Server Components & Hydration: The Real Story | How React moved rendering to the server |
| **Part 9** | The Complete Picture: From a Keystroke to a Pixel | Every layer of React working together as one system |

---

## Sources & Thanks

- **Dan Abramov** — Beyond React 16 | JSConf Iceland 2018
- **Matheus Albuquerque** — Inside Fiber: the In-Depth Overview | React Summit 2022
- **Sam Galson** — Magic in the web: coroutines, continuations, fibers | React Advanced London
- **[jser.dev](https://jser.dev)** — the best source-level analysis of React internals on the internet
- **Sophie Alpert & the React team**
