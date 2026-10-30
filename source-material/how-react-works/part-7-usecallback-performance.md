# How React Works (Part 7) — The Trap of Vibe Coding `useCallback`

> **Series:** How React Works Under the Hood
> **Prerequisites:** Read Parts 1–6 first — especially Parts 3 and 6.

---

## Where We Left Off

In Part 6 we saw how `useState` works — state stored on the Fiber as a hook object, updates queued and processed on the next render, the component function running fresh from the top every time.

That last part is what this article is about. Because every render from the top means every value inside the component is recreated. And that single fact is the root cause of most React performance problems.

---

## You Wrapped Everything in `useCallback`. You Added `React.memo` to Every Component. Your App Is Still Slow.

This is the scene:

```javascript
function SearchPage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});

  const handleSearch = useCallback(() => search(query), [query]);
  const handleFilter = useCallback((key, val) => setFilters(f => ({...f, [key]: val})), []);
  const handleReset = useCallback(() => setFilters({}), []);
  const handleExport = useCallback(() => exportResults(query, filters), [query, filters]);

  const activeFilters = useMemo(
    () => Object.entries(filters).filter(([_, v]) => v),
    [filters]
  );

  return (
    <ResultList
      onSearch={handleSearch}
      onFilter={handleFilter}
      onReset={handleReset}
      onExport={handleExport}
      activeFilters={activeFilters}
    />
  );
}

const ResultList = React.memo(({ onSearch, onFilter, onReset, onExport, activeFilters }) => {
  // ...
});
```

You deploy. `ResultList` is still re-rendering. Some interactions are slower than before. What went wrong?

---

## React's Default: Re-render Everything, Skip What It Can

React's built-in bailout system: when React walks down to a child, it checks one thing before running it:

> **Are the props the same object reference as last render?**

If yes — same reference, not just same values — React skips that component entirely. The child doesn't run. Its children don't run. The entire subtree is skipped in one check.

The problem: in practice, props almost always get new references on every render — even when the values inside them are identical.

---

## Every Render Creates New References Without You Noticing

```javascript
function SearchPage() {
  const [query, setQuery] = useState('');

  // ❌ New function object on every render
  const handleSearch = () => search(query);

  // ❌ New object on every render
  const style = { color: 'red', padding: '8px' };

  // ❌ New array on every render
  const results = data.filter(item => item.active);

  return <ResultList onSearch={handleSearch} style={style} results={results} />;
}
```

Every render, `handleSearch` is a brand new function. `style` is a brand new object. `results` is a brand new array. They look identical but they're different objects in memory. React's bailout uses `===` reference equality — it can't bail out, and `ResultList` re-renders on every keystroke.

---

## The Part Nobody Tells You: Children Re-render Even With No Props

Given this structure:

```javascript
function SearchPage() {
  const [query, setQuery] = useState('');

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ResultList />  {/* no props at all */}
    </div>
  );
}
```

When the user types and `SearchPage` re-renders, `ResultList` re-renders too — even though it receives zero props.

Why? Because when `SearchPage`'s function runs, it creates a **new React element** for `<ResultList />`. That element object is new. When React's reconciler compares the old `pendingProps` to the new `pendingProps` on the `ResultList` fiber, they're different objects. So React re-renders `ResultList`.

This means `React.memo` on `ResultList` alone doesn't help here at all.

---

## The Free Fix: Children as Props

```javascript
// ❌ Before — ResultList re-renders whenever SearchPage re-renders
function SearchPage() {
  const [query, setQuery] = useState('');
  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ResultList />
    </div>
  );
}

// ✅ After — ResultList never re-renders when query changes
function App() {
  return (
    <SearchPage>
      <ResultList />
    </SearchPage>
  );
}

function SearchPage({ children }) {
  const [query, setQuery] = useState('');
  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {children}
    </div>
  );
}
```

Why does this work? The `<ResultList />` element is now created inside `App`, not inside `SearchPage`. When `SearchPage`'s state changes, `App` doesn't re-render. The `children` prop that `SearchPage` receives is the same object reference as before. React's built-in bailout kicks in.

No `React.memo`. No `useCallback`. No overhead. Just structure.

**Always try structural fixes before reaching for memoization tools. They're free and they don't break.**

---

## When You Actually Need `React.memo`

Sometimes the structural fix isn't possible. That's when `React.memo` enters.

`React.memo` wraps your component and instead of checking reference equality on the whole props object, React runs `shallowEqual` — comparing each individual prop value.

**But `React.memo` alone almost never works.** If any prop is a function or object created inline during render, `shallowEqual` fails on that prop — new reference every time. `React.memo` bails out on nothing.

This is why in the opening example, `ResultList` still re-renders. `handleSearch`, `handleFilter`, `handleReset`, `handleExport` — all new references every render. `React.memo` sees four changed props and re-renders anyway.

---

## What `useCallback` and `useMemo` Actually Do

`useCallback` and `useMemo` exist for one reason: to stabilize references so `React.memo` can do its job.

```javascript
// From React source — every re-render
function updateMemo(nextCreate, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  const prevState = hook.memoizedState;

  if (prevState !== null && nextDeps !== null) {
    const prevDeps = prevState[1];
    if (areHookInputsEqual(nextDeps, prevDeps)) {
      return prevState[0]; // deps unchanged → return cached value
    }
  }

  const nextValue = nextCreate(); // deps changed → recompute
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}
```

The dependency comparison runs through `areHookInputsEqual`:

```javascript
function areHookInputsEqual(nextDeps, prevDeps) {
  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}
```

This loop runs on **every render, for every hook, for every dependency**.

---

## The Hidden Cost: What Happens on Every Render

Even when dependencies haven't changed and `useCallback`/`useMemo` return the cached value, React still does this on every render:

1. **Walks to this hook in the linked list**
2. **Reads `hook.memoizedState`**
3. **Runs `areHookInputsEqual`** — loops through every dependency with `Object.is`
4. **Allocates a new function** (for `useCallback`) — JavaScript creates the arrow function before calling `useCallback`, React receives it, checks deps, then discards it if deps unchanged

So `useCallback(fn, [a, b, c])` with unchanged deps on every render means: one function allocation (discarded), three `Object.is` comparisons, one linked list traversal.

---

## The Vibe Coding Trap

Here's what actually happens in most codebases:

```javascript
// Real pattern from real codebases
function ProfileCard({ userId }) {
  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);
  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);
  const containerClass = useMemo(
    () => `card ${hovered ? 'card--hovered' : ''} ${focused ? 'card--focused' : ''}`,
    [hovered, focused]
  );
  // ...
}
```

This card component renders in under 0.1ms. Nothing inside it is expensive. Every single `useCallback` and `useMemo` here adds overhead for zero performance benefit.

---

## The Right Order

**1. Measure first.** Open React DevTools Profiler. Find the component that's actually slow.

**2. Fix the structure.** Can the slow child's element be created in a parent that doesn't re-render? Use the children-as-props pattern.

**3. Memoize if structure can't fix it.** If structural fixes aren't possible and the component is genuinely expensive to render and receives props that could be stable — then reach for `React.memo` + `useCallback`/`useMemo` together. All three are needed.

**4. Verify it worked.** Re-run the Profiler.

The rule, in one sentence: **don't add memoization until you have a specific, measured component that re-renders too often, with expensive renders, and props that can be stabilized.**

---

## A Note on the React Compiler

The React Compiler (previously React Forget) is now stable. It automatically applies memoization where it's safe — analyzing your components, inferring dependencies, and inserting optimizations without you writing any of it.

Understanding everything in this article is exactly what you need to write code the Compiler can optimize. The Compiler doesn't replace understanding React's rendering model. It rewards you for having it.

---

## Sources & Thanks

- **[jser.dev](https://jser.dev)** — the bailout mechanics and React.memo internals
- **React source** — `mountMemo`, `updateMemo`, `mountCallback`, `updateCallback`, and `areHookInputsEqual` from `ReactFiberHooks.js`
- **React docs** — react.dev/reference/react/memo
- **Lydia Hallie** — for JavaScript visualizations
