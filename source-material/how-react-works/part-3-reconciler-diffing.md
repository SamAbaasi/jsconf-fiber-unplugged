# How React Works (Part 3) — How React Finds What Actually Changed

> **Series:** How React Works Under the Hood
> **Prerequisites:** Read Parts 1 and 2 first.

---

## Where We Left Off

In Part 2 we understood the engine — Fiber gives React a custom call stack it controls, and the Scheduler decides what to run and when.

Now the question is: what does React actually *do* with that engine?

Every time state changes, React has a problem. It knows the *old* version of your UI and the *new* version. But it's working with a tree of potentially thousands of components. Re-creating or re-rendering all of them on every update would be catastrophically slow.

React needs to answer one question as efficiently as possible:

> **"Of everything that could have changed, what actually did?"**

The algorithm that answers that question is called the **Reconciler**.

---

## The Problem: Re-rendering Everything Is Too Slow

You have an app with 500 components. A user clicks a button that changes one counter inside one component. Naively, React would need to re-run every component function, create new JSX, and compare it to the old DOM — 500 times — to figure out that exactly one `<span>` needs its text updated.

React's insight was: **most of the tree didn't change.** If React can quickly identify which parts of the tree could possibly have changed, it can skip everything else.

The Reconciler is that skip logic.

---

## The First Skip: Following the Trail

When you call `setState` inside a component, React doesn't just mark that one component for update. It marks a trail — like breadcrumbs from that component all the way back to the root of the tree.

Every ancestor gets a small flag saying: *"one of your descendants has work to do."*

Then when React walks the tree to find what needs re-rendering, it uses those flags like a GPS. At every node it asks: *"Does this node have work? No? Do any of its children have work? Also no?"* If both answers are no, React skips that entire subtree in one step.

This is how a click inside one deeply nested component avoids touching the 490 components that had nothing to do with it.

---

## The Second Skip: Props Haven't Changed

React made it to the component that has work. But before actually re-running it, React checks one more thing: did this component's *inputs* (props) change?

React compares the old props to the new props. If they're the same object reference — same pointer in memory — React skips re-rendering that component entirely.

This is reference equality, not deep equality. React doesn't compare every field inside the props object. It just checks: *is this the exact same object we had before?*

**This is also exactly how `React.memo` works.** `React.memo` wraps a component and adds one step: when React would normally re-render because the props reference changed, `React.memo` does a shallow comparison of each prop value.

This is why passing a new object as a prop breaks memoization:

```javascript
// This breaks React.memo — new object created every render
<Button style={{ color: 'red' }} />

// This works — same reference if color hasn't changed
const style = useMemo(() => ({ color: 'red' }), []);
<Button style={style} />
```

---

## When React Does Need to Re-render: Type vs Content

React made it to a component that needs updating. It runs the component function, gets new JSX back, and now needs to figure out what changed.

The first thing React checks is the **type** of each element. Not the content — the type.

If you had a `<div>` and now you have a `<span>`, React doesn't try to figure out how to transform one into the other. It destroys the `<div>` completely and creates a fresh `<span>` from scratch.

**Same type means update in place, different type means destroy and recreate.**

```javascript
// Every time isLoggedIn changes, the entire form loses its state
{isLoggedIn ? <UserForm /> : <GuestForm />}

// UserForm and GuestForm are different types — React destroys one and creates the other
// Any input values typed into the form are gone
```

---

## The List Problem: Why `key` Exists

Single elements are straightforward to diff. Lists are where it gets genuinely hard.

Imagine you have a list of 5 items. Now you add a new item at the top. From React's perspective, looking position by position: position 1 changed, position 2 changed, position 3 changed... It looks like every single item changed — even though you just prepended one.

This is what `key` solves. A `key` is a stable identifier that tells React: *"this item is this item, regardless of where it appears in the list."*

With keys, React builds a lookup table of all existing items keyed by their identifier. Then for each new item in the list, it looks up: *"do I already have a fiber for this key?"* If yes, reuse it. If no, create it fresh.

The practical result: prepend one item to a list of 1000, and React creates exactly one new fiber. The other 999 are reused instantly.

**Why index as key breaks things:**

```javascript
// Dangerous — index as key
items.map((item, i) => <Row key={i} data={item} />)
```

When you prepend a new item, every index shifts. The new item gets `key=0`, which used to belong to the old first item. React thinks it's reusing the old component — but it's actually showing different data through the same fiber. State from the old item leaks into the new item.

The fix: use something stable and unique as the key — an ID from your data, a slug, anything that doesn't change when the list is reordered.

---

## After Finding the Changes: Marking, Not Doing

During the Reconciler's walk of the tree, React does **not** touch the real DOM. It only *marks* fibers with notes about what needs to happen:

- This fiber needs a new DOM node inserted
- This fiber's props changed and the DOM needs updating
- This fiber was removed and its DOM node should be deleted

Only after the entire tree has been walked and all decisions are made does React move to the Commit phase — where it reads those marks and makes the actual DOM changes, all at once, in a single synchronous pass.

This separation is what makes React's updates feel atomic. You never see a half-updated UI.

---

## The Full Picture in One Paragraph

Every state change triggers a tree walk. React follows a trail of flags to find what might have changed, skips every clean subtree instantly, checks whether props actually changed before re-running anything, compares old and new output by type first and content second, uses `key` props to track list items regardless of position, and marks everything that needs updating — without touching the DOM. Then, in one final pass, it applies all the marks at once.

---

## Sources & Thanks

- **[jser.dev](https://jser.dev)** — the bailout mechanics, re-render algorithm, and key/list diffing
- **Andrew Clark** — react-fiber-architecture
- **Lydia Hallie** — for JavaScript visualizations that shaped this series' style
