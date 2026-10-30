# How React Works (Part 4) — The Idea That Makes Suspense Possible

> **Series:** How React Works Under the Hood
> **Prerequisites:** Read Parts 1–3 first.

---

## A Question Before We Start

Think about how you fetch data in a React component today:

```javascript
function UserProfile({ id }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(id).then(data => {
      setUser(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <Spinner />;
  return <div>{user.name}</div>;
}
```

It works. But look at what you had to do: manage two pieces of state, write an effect, handle the loading condition manually, repeat this pattern in every component that fetches data.

Now look at what Suspense lets you write instead:

```javascript
function UserProfile({ id }) {
  const user = fetchUser(id); // just... read the data
  return <div>{user.name}</div>;
}

<Suspense fallback={<Spinner />}>
  <UserProfile id={1} />
</Suspense>
```

No loading state. No effect. No condition. The component just reads data as if it's already there. If it isn't, React handles the waiting — including showing the spinner — automatically.

How is this possible? How can a component just "pause" mid-render and resume when data arrives?

The answer involves a concept called **algebraic effects**.

---

## Start With Something You Already Know: `throw`

Algebraic effects sound academic. But Dan Abramov started with something every JavaScript developer already knows: `try / catch`.

```javascript
function getName(user) {
  if (user.name === null) {
    throw new Error('no name');
  }
  return user.name;
}

try {
  getName(user);
} catch (err) {
  console.log('handled:', err.message);
}
```

Notice what `throw` actually does. It doesn't decide what happens when the error occurs. It just *signals* that something happened. The `catch` block somewhere up the call stack is what decides the behavior.

This separation — *signaling* something vs *handling* it — is the core idea.

---

## The Problem With `try / catch`: No Coming Back

`try / catch` has one limitation that matters a lot.

When you `throw`, execution stops at that point. The `catch` block runs. And that's it — you can never go back to the line that threw and continue from there.

```javascript
function getName(user) {
  if (user.name === null) {
    throw new Error('no name');
    // ← once you throw, you can NEVER resume here
  }
  return user.name;
}
```

For errors, this makes sense. But what if you wanted to *ask* the surrounding context a question and then *continue* based on the answer?

That's what algebraic effects enable. Dan Abramov described it as a "resumable `try / catch`."

---

## Algebraic Effects: A Resumable `try / catch`

Algebraic effects don't exist in JavaScript yet. They're a research concept. But Dan Abramov explained them using a hypothetical JavaScript dialect.

Imagine JavaScript had two new keywords: `perform` and `resume with`.

`perform` works like `throw` — it signals something to the surrounding context and finds the nearest handler up the call stack. The crucial difference: it doesn't stop execution. The handler can call `resume with` to jump *back* to exactly where `perform` was called and continue from there.

```javascript
// Hypothetical JavaScript — this doesn't exist yet
function getName(user) {
  if (user.name === null) {
    // 1. Signal: "I need a name" — but don't stop
    const name = perform 'ask_name';
    // 4. Resume here — name is now 'Arya Stark'
  }
  return user.name;
}

try {
  makeFriends(arya, gendry);
} handle (effect) {
  if (effect === 'ask_name') {
    // 2. Handler catches it — like catch
    // 3. Resume with a value — unlike catch
    resume with 'Arya Stark';
  }
}
```

Notice what this doesn't require. `makeFriends` — the function between `getName` and the handler — doesn't know anything about this. It didn't have to be modified. The effect just bypassed it entirely, exactly like `throw` bypasses intermediate functions on its way to `catch`.

This is what Dan calls **"a function has no color."** With `async/await`, making one function async infects every function above it. With algebraic effects, a deeply nested function can perform an effect without any of the layers above it caring.

---

## Suspense Is React's Implementation of This Idea

JavaScript doesn't actually have `perform` and `resume with`. But React simulates this pattern using the tools JavaScript does have: `throw` and Fiber.

Here's what actually happens when a component suspends:

**The component throws a Promise.**

```javascript
// Inside the data fetching library
function fetchUser(id) {
  const cached = cache.get(id);

  if (cached === 'pending') {
    throw promise; // ← this is the "perform"
  }
  if (cached === 'resolved') {
    return cache.get(id); // ← data is ready, return normally
  }

  const promise = fetch(`/users/${id}`).then(data => cache.set(id, data));
  cache.set(id, 'pending');
  throw promise;
}
```

**React catches the thrown Promise.**

Because React's render loop runs inside a `try / catch`, it catches the thrown Promise. React itself acts as the effect handler.

**React shows the fallback.**

React walks up the Fiber tree to find the nearest `<Suspense>` boundary and shows its fallback — the `<Spinner />` — while waiting.

**When the Promise resolves, React retries.**

When the data arrives, React re-renders the component from the `<Suspense>` boundary downward. This time, the cache has the data. `fetchUser` returns normally instead of throwing. The component renders successfully.

---

## Why This Only Works Because of Fiber

Here's the critical question: when a component throws mid-render, wouldn't all the work React did to reach that point be lost?

With the old synchronous call stack — yes. Throwing would unwind the entire stack, destroying every local variable and stack frame on the way up.

But React uses Fiber, not the native call stack, to track rendering work. Fibers are plain JavaScript objects — they survive the `throw`. They sit in memory exactly as they were.

When React catches the thrown Promise and shows the fallback, all the Fiber work up to that point is preserved. When the data arrives and React retries, it resumes from the Suspense boundary without re-doing all the ancestor work.

Fiber made algebraic-effect-style control flow possible in JavaScript. Without Fiber, throwing a Promise would be catastrophic. With Fiber, it's just a pause.

---

## ErrorBoundary Is the Same Pattern

Once you understand Suspense through this lens, ErrorBoundary becomes obvious — it's the same mechanism, just for actual errors instead of Promises.

When a component throws an error during rendering, React walks up the Fiber tree looking for the nearest class component that implements `getDerivedStateFromError`. When it finds one, it re-renders that component with error state, showing the fallback UI instead of the crashed subtree.

```javascript
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) {
    return { hasError: true }; // ← this is the "handle"
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

The key difference from Suspense: ErrorBoundary doesn't resume. Once a component threw an error, that render is abandoned. Suspense, by contrast, genuinely retries the original render when the data arrives.

---

## The Bigger Picture

Hooks follow the same idea too. When you call `useState` inside a component, that component doesn't know or care where its state is actually stored. It just performs a "request for state" and React — the handler — provides it from the Fiber's hook linked list.

This separation — components declaring *what they need*, React deciding *how to provide it* — is algebraic effects thinking applied to a UI library. And it's why React's API feels declarative even when the underlying behavior is complex.

---

## Sources & Thanks

- **Dan Abramov** — Algebraic Effects for the Rest of Us (overreacted.io)
- **Sam Galson** — Magic in the web of it (talk) and Continuations, coroutines, fibers, effects (article)
- **Sebastian Markbåge** — for the original "Poor man's algebraic effects" gist
- **[jser.dev](https://jser.dev)** — source verification of how `throwException`, the Suspense retry mechanism, and ErrorBoundary recovery actually work
