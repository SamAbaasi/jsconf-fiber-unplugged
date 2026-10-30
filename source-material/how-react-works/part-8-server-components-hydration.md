# How React Works (Part 8) — Server Components & Hydration: The Real Story

> **Series:** How React Works Under the Hood
> **Prerequisites:** Read Parts 1–7 first.

---

## Where We Left Off

Through Parts 1–7, every problem we solved lived on the client. Part 8 changes that. Because there's a whole category of problem that no client-side optimization can fix.

---

## The Problem Nobody Talks About

You've shipped a React app. You've done everything right. Then you open Chrome on a mid-range Android phone with a throttled 3G connection and watch the screen stay white for four seconds before anything appears.

You look at the Network tab. Before your user sees a single pixel of your app, their phone downloaded, parsed, and executed 380kb of JavaScript. Half of that JavaScript is components that render completely static content — a product description that never changes, a nav with hardcoded links, a footer. None of them use state. None of them handle events. They just render text and markup.

But they ship to every client. On every load. On every device.

---

## The Problem: The Two-Trip Lie

To understand why Server Components exist, you need to go back to how server rendering worked before them.

React brought rich interactivity but also a cost: everything runs in the browser. Large bundles. Slow initial loads. So the industry added server rendering back — render HTML on the server first, send it to the client, then download JavaScript and "hydrate" the page to make it interactive.

This solved the blank screen problem. But it created the **two-trip problem**.

The server renders HTML — fast, visible immediately. Then the browser downloads all the JavaScript anyway. React runs again on the client. Re-does the work. Any data fetched on the server to render the HTML? Fetched again on the client. Bundle size? Unchanged — every component that ran on the server also ships to the client. Server work didn't reduce client work.

---

## What Hydration Actually Is — and What's Wrong With It

The server renders HTML and sends it. The user sees a complete-looking page — the nav, the content, the buttons. They try to click something. Nothing happens. The page looks interactive but it isn't — because React hasn't attached any event listeners yet.

This is the **hydration gap**.

From jser.dev: hydration is not re-rendering. React does not recreate the DOM. Instead, React walks the existing server-rendered DOM tree in parallel with the Fiber tree it's building, matching each fiber to its corresponding DOM node — storing a reference in `fiber.stateNode`. Event listeners are attached. The DOM is reused.

But the entire tree must hydrate before any part becomes interactive. One slow component at the top of the tree blocks the click handlers on a button at the bottom.

React 18 fixed this with **selective hydration**. Using the same Lanes priority system from Part 3, React can now interrupt hydration to handle a user interaction first. If a user clicks a button before hydration reaches it, React jumps to that boundary using `SyncLane` — hydrates just enough to handle the interaction — then resumes the rest of the tree.

**Streaming** takes this further still. Instead of waiting for all data before sending any HTML, the server sends the shell immediately and streams each Suspense boundary as its data resolves.

---

## What Server Components Actually Are

From the React Labs March 2023 blog post:

> *"We are introducing a new kind of component — Server Components — that run ahead of time and are excluded from your JavaScript bundle. Server Components can run during the build, letting you read from the filesystem or fetch static content. They can also run on the server, letting you access your data layer without having to build an API."*

Server Components run only on the server. Their code never ships to the client. Client Components — marked explicitly with `'use client'` — run on the client as before.

The critical constraint: **functions cannot cross from Server to Client.** Functions aren't serializable. Only plain serializable values can cross — strings, numbers, objects, arrays, React elements.

What the server sends is not HTML and not JavaScript. It's the **RSC payload** — a JSON-like description of the rendered UI tree:

```
J0:["$","div",null,{"className":"post"}]
J1:["$","h1",null,{"children":"Hello World"}]
J2:["$","p",null,{"children":"Content here"}]
```

Each line is a serialized React element — type, key, ref, props. React on the client reads this and builds or updates its Fiber tree from it.

---

## The Security Reality: React2Shell

On November 29th, 2025, security researcher Lachlan Davidson reported a vulnerability to Meta's Bug Bounty program. Four days later, the React team disclosed it publicly.

From the official React blog post:

> *"There is an unauthenticated remote code execution vulnerability in React Server Components."*

**CVE-2025-55182 — CVSS 10.0.**

The root cause: React Server Functions (Server Actions) allow a client to call a function on the server. The deserialization process did not properly validate inputs. An attacker could craft a malicious HTTP request that achieved remote code execution on the server — **with no authentication required**.

Two follow-on CVEs were disclosed days later: source code exposure (CVE-2025-55183) and denial of service (CVE-2025-55184). A fourth vulnerability was disclosed in January 2026 (CVE-2026-23864).

**What this means for you as a developer:**

Every Server Action (`'use server'` function) is a public HTTP endpoint. Anyone on the internet can send a POST request to it — not just your frontend. You must validate and sanitize every argument exactly as you would validate input to an Express route handler or an API endpoint.

---

## A Concrete Trace: What Actually Happens on Navigation

When a user clicks a link in a Next.js App Router app:

1. React intercepts the navigation. Instead of a full page reload, it fetches the RSC payload for the new route from the server.
2. Server Components for the new route run — async, querying databases, reading files. They render to the RSC payload format.
3. The response arrives in chunks. React starts processing chunks as they arrive.
4. React merges the payload into the Fiber tree. For unchanged parts (shared layout, nav), React skips re-rendering entirely. For new content, React creates or updates fibers.
5. No full reload. No loss of client-side state.

---

## The Vibe Coding RSC Trap

```javascript
// Every component gets 'use client' — even ones that don't need it
'use client';
export function Header() { ... }

'use client';
export function Footer() { ... } // doesn't even use state
```

Every component is a Client Component. Every component ships JavaScript to the client. The RSC architecture is in place but the actual benefit (JavaScript that never ships) is zero.

The principle: **a component should only be a Client Component if it genuinely needs the client** — state, effects, browser APIs, event handlers. Everything else can be a Server Component.

---

## When You Don't Need Server Components

If your app is mostly interactive — drawing tools, real-time editors, complex forms — it consists almost entirely of Client Components anyway. RSC adds architectural complexity for minimal gain.

The more important consideration is team understanding. The React2Shell vulnerability was possible because the boundary between trusted server code and untrusted client input was blurry in the mental model.

**The One-Sentence Rule:** Use Server Components when you have a measured loading problem caused by JavaScript bundle size or data waterfalls — and your team treats every Server Action as a public HTTP endpoint that requires the same validation discipline as any API route.

---

## Sources & Thanks

- **Dan Abramov** — RSC from Scratch (GitHub Discussion)
- **The React Team** — React Labs March 2023 blog post and Critical Security Vulnerability disclosure
- **Lachlan Davidson** — for discovering and responsibly reporting CVE-2025-55182
- **[jser.dev](https://jser.dev)** — hydration mechanics and RSC internals analysis
- **Unit 42 / Palo Alto Networks** — for post-exploitation analysis
