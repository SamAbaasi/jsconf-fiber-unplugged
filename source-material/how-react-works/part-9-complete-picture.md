# How React Works (Part 9) — The Complete Picture: From a Keystroke to a Pixel

> **Series:** How React Works Under the Hood
> **This is the final article.** If you haven't read Parts 1–8, go back and start there.

---

## Eight Articles. One Question.

In Part 1, Dan Abramov stood in front of a room in Iceland and asked:

> **"With vast differences in computing power and network speed, how do we deliver the best user experience for everyone?"**

We've spent eight articles building the answer. This article puts them all together — not as a summary, but as a story. One user. One interaction. Every layer of React underneath it.

---

## The User

She opens a product search page on a mid-range Android phone. Her connection is decent but not fast. She's looking for headphones.

She types. She clicks. She adds something to her cart.

From her perspective: the page loads, she types, results appear, she clicks a button, the cart updates. Four seconds of her life.

Underneath those four seconds, every system in this series ran.

---

## The Page Loads

The request hits the server. This is Part 8's world.

Server Components run — async, directly querying the database. The product catalog, the navigation, the page layout. None of this code ships to her phone. It renders on the server and becomes the RSC payload — a JSON description of the UI that streams to the client in chunks. Her phone gets real HTML almost immediately, not a white screen waiting for JavaScript.

While the HTML is visible, React starts hydration in the background. It walks the server-rendered DOM and matches each node to its Fiber counterpart — attaching event listeners, storing references, making the page interactive. Because React 18 uses the same Lane priority system from Part 3, if she taps something before hydration finishes, React jumps to that boundary first. Her tap doesn't go ignored.

---

## She Types "h"

This is where Parts 2, 3, and 6 all meet.

A change event fires. React calls `setQuery('h')`. Calling `setQuery` doesn't immediately update anything — it creates an update object, drops it into a global buffer, and marks a trail called `childLanes` on every ancestor of the search input fiber, all the way to the root.

The Scheduler sees the update. Because this is a user interaction, it's `SyncLane` — the highest priority. It runs synchronously.

React walks the Fiber tree following the trail of `childLanes`. Every branch with `childLanes === 0` is skipped instantly — the footer, the recommendations panel, the filters sidebar. React touches only what needs to change. The input updates. The character appears on screen.

That took a few milliseconds. She doesn't notice. She keeps typing.

---

## The Results Need to Update

Filtering 10,000 products on every keystroke is expensive. If React treated the results update with the same urgency as the input update, every character she types would block until the filtering finished.

The fix is `startTransition`:

```javascript
setQuery(e.target.value);                          // urgent — runs now
startTransition(() => setResults(filter(query)));  // deferrable — runs when free
```

`startTransition` tells React: this update is real but not urgent. Internally, React assigns it a `TransitionLane` instead of `SyncLane`.

The results render begins using the concurrent work loop — the one that checks `shouldYield()` after every fiber. She types another character. A new `SyncLane` keystroke arrives. React **abandons the results render mid-tree**, handles the keystroke — she sees it immediately — then starts the results render again with the new query.

`isPending` tells you the transition is in progress, so you can show a spinner or dim the old results while new ones load. The old results stay visible until the render completes.

This is the Git metaphor from Part 1 made real: the keystroke is always the hotfix on main. The results render is always the feature branch.

---

## React Finds What Changed

She paused typing. The results render runs to completion. This is Part 3.

React walks the `ResultList` fiber, runs the component function, gets new JSX. The Reconciler compares old to new. Each product has a `key` prop — its ID. React builds a map of old fibers keyed by product ID. For each new product, it looks up the existing fiber. Found: reuse it, update only what changed. Not found: create it. Products no longer in results: mark for deletion.

React doesn't touch the DOM during any of this. It marks fibers with flags — insert this, update that, delete this. By the time it reaches the root, every decision about what needs to change is recorded.

---

## The DOM Updates

The Commit phase runs — synchronous, uninterruptible. The two Fiber trees swap. The workInProgress tree becomes current.

DOM operations execute in order: deletions first, then insertions, then updates. Products that disappeared are removed. New products are inserted. Changed cards get their props updated directly on the existing DOM node.

The browser paints. She sees the filtered results.

---

## She Clicks "Add to Cart"

The click fires. `setCartCount(c => c + 1)` is called. Same machinery as the keystroke — `SyncLane`, update queued, trail marked up to the root, Scheduler fires synchronously.

React walks the trail. Everything outside the `Header` subtree has `childLanes === 0` — the results list, the filters, the footer — all skipped in one check each. React touches only the `Header` and its `CartIcon` child.

The render runs. The commit runs. Now Part 5 takes over.

`useLayoutEffect` fires synchronously — the DOM is updated, the browser hasn't painted yet. If `CartIcon` needs to measure its width for an animation, this is the only safe moment. Then the browser paints. She sees the cart count increment.

In the next macro task — after paint, via `MessageChannel` — `useEffect` runs. The analytics event fires. localStorage syncs. None of this blocked the paint.

---

## What Didn't Run

Of the entire component tree — dozens of components, hundreds of fibers — exactly three ran their render functions for the cart click:

- The root — has `childLanes > 0`
- `Header` — has `childLanes > 0`
- `CartIcon` — the state changed here

Everything else: `ResultList`, `SearchInput`, `Filters`, `Footer`, `Recommendations`, every `ProductCard` — skipped. Not because of `React.memo`. Not because of `useCallback`. Because `childLanes` was zero on every other subtree.

---

## The Complete Map

**Fiber** is the foundation. React replaced the opaque JavaScript call stack with its own — plain objects it controls completely. Without Fiber, nothing else in this series exists.

**The Scheduler** decides what runs and when. Keystrokes get `SyncLane` — they always run first. Results renders get `TransitionLane` — they run in the background, interruptibly.

**The Reconciler** finds the minimum set of DOM changes. It follows the `childLanes` trail, skips everything with clean subtrees, diffs lists by key, and marks flags on fibers — never touching the DOM until the entire decision is made.

**Algebraic Effects** is the mental model that connects Suspense, ErrorBoundary, and hooks. Components signal what they need by throwing. React catches it, decides what to do, and resumes when the data arrives.

**Lifecycle** is when effects run relative to the Commit phase. `useLayoutEffect` fires synchronously before paint. `useEffect` fires after paint in the next macro task.

**State** is a hook object on a Fiber's linked list. Calling `setState` drops a note in a queue. React reads that queue during the next render, on its own schedule.

**Performance** is mostly free. The `childLanes` bailout skips entire subtrees in one check. Structural patterns like children-as-props prevent unnecessary re-renders without memoization overhead.

**Server Components** moved the question from "how do we render faster on the client" to "how do we send less to the client in the first place."

---

## The One-Sentence Answer

React delivers the best user experience for everyone by giving developers a declarative component model while handling — invisibly — the complexity of prioritizing work, interrupting expensive renders, deferring non-urgent updates, minimizing DOM changes, and progressively delivering content from server to client, through the Fiber and Scheduler machinery built for exactly this purpose.

---

## What You Actually Have Now

Before this series, React was a tool you used. After it, React is a system you understand.

The next time an input lags, you know it's a `SyncLane` update blocked by a lower-priority render — and you know `startTransition` is the right fix, not `useCallback`. The next time a component re-renders unexpectedly, you know to check the reference equality of its props and the `childLanes` trail. The next time a page loads slowly, you know the difference between a bundle size problem (Server Components), a data waterfall problem (streaming and Suspense), and a render performance problem (Fiber and Reconciler).

Write something. Ship it. Now you'll know why it works.

---

## Thank You

- **Dan Abramov** — for Beyond React 16, RSC from Scratch, and Algebraic Effects for the Rest of Us
- **Andrew Clark** — for the react-fiber-architecture document
- **Sebastian Markbåge** — for the algebraic effects mental model
- **Matheus Albuquerque** — for the clearest explanation of FiberNode internals at React Summit 2022
- **Sam Galson** — for connecting React to the wider computer science of fibers, coroutines, and continuations
- **[JSer (jser.dev)](https://jser.dev)** — for the deepest source-level analysis of React internals anywhere on the internet
- **Sophie Alpert, Joe Savona, Luna Wei** — for the React team's continued work
- **Lydia Hallie** — for JavaScript visualizations that shaped this series' style
- **Lachlan Davidson** — for responsibly disclosing CVE-2025-55182
