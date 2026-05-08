# `@ccc-ts/statecharts` — Design

A small, strictly-typed, React-first state machine library inspired by
statecharts and flow-based programming. Goal: replace the common
`useState`/`useEffect` soup that AI coding agents tend to produce, with a
single declarative artifact whose states, transitions, and effects are
checked at compile time.

## Goals

- Make impossible states unrepresentable: each state has its own context type,
  so values that exist only in one state can't be accessed in another.
- Make impossible transitions unrepresentable: transitions are part of the
  type, so a `send(...)` that the current state can't handle either compiles
  to a no-op-by-design or, in misuse cases, fails to type-check.
- Move side effects out of `useEffect`: an effect's lifecycle is owned by the
  state it belongs to, not by component renders. Entering a state starts the
  effect, leaving aborts it. No "useEffects triggering each other".
- Keep the surface small enough that an AI agent reading the README can
  produce correct code on the first try.
- Stay dependency-free at the core; React is a peer dep used only by the
  binding layer.

## Non-goals (v0.1)

- XState compatibility. No actors, no `invoke`, no SCXML, no parallel
  regions, no nested/hierarchical states.
- Flow / wizard DSL (`flow().step(...).next(...)`). Deferred — the flat FSM
  with effects is sufficient for the targeted use cases.
- Browser extension or external DevTools protocol. The inspector is in-page
  only; a `window` hook is reserved for a future extension but no extension
  is shipped.
- Context-shape migrations across versions. `hydrate` rejects mismatched
  snapshots and the caller falls back to the initial state.

## Package shape

- **Name:** `@ccc-ts/statecharts` (slot already reserved in the root README).
- **Layout:** mirrors `@ccc-ts/feature-arch`. tsup build, vitest, happy-dom,
  `@testing-library/react`. React peer dep `^18.0.0 || ^19.0.0`.
- **Entrypoints:**
  - `@ccc-ts/statecharts` — core (`defineStates`, `defineEvents`,
    `defineMachine`, `createMachine`, `useMachine`, `match`, `serialize`,
    `hydrate`).
  - `@ccc-ts/statecharts/inspector` — `attachInspector`. Separate sub-export
    so production bundles ship zero inspector code.

## Core concepts

### Token factories

States and events are declared with factory helpers. User code references
tokens (`S.Loaded`, `E.Search(...)`) — never a string literal.

```ts
import { defineStates, defineEvents } from '@ccc-ts/statecharts'

const S = defineStates({
  Idle:    {} as {},
  Loading: {} as { query: string },
  Loaded:  {} as { query: string; results: User[] },
  Failed:  {} as { query: string; error: Error },
})

const E = defineEvents({
  Search:  {} as { query: string },
  Retry:   {} as {},
  Reset:   {} as {},
  LoadOk:  {} as { results: User[] },
  LoadErr: {} as { error: Error },
})
```

- `S.Loading` is a token: `{ id: 'Loading', __ctx: <type marker> }`. The `id`
  is a string literal under the hood (debuggable, serializable,
  inspector-friendly), but consumers never type it themselves.
- `E.Search({ query: 'hi' })` constructs a typed event value
  `{ type: 'Search', query: 'hi' }`. `E.Reset()` works for empty payloads.
- A machine's state-name union and event union are derived from these
  objects via mapped types — no manual unions to maintain.
- Token equality: by reference (`a === b`) and by `id` after serialization.

### Defining a machine

Per-state transition map, with `assign` functions producing the *next*
state's context. Both `ctx` and event payload are typed per-state-and-event.

```ts
import { defineMachine } from '@ccc-ts/statecharts'

const machine = defineMachine({
  states: S,
  events: E,
  initial: { state: S.Idle, context: {} },

  transitions: {
    Idle: {
      Search: { target: S.Loading, assign: (_, e) => ({ query: e.query }) },
    },
    Loading: {
      LoadOk:  { target: S.Loaded, assign: (ctx, e) => ({ query: ctx.query, results: e.results }) },
      LoadErr: { target: S.Failed, assign: (ctx, e) => ({ query: ctx.query, error: e.error }) },
    },
    Loaded: {
      Reset:  { target: S.Idle,    assign: () => ({}) },
      Search: { target: S.Loading, assign: (_, e) => ({ query: e.query }) },
    },
    Failed: {
      Retry:  { target: S.Loading, assign: (ctx) => ({ query: ctx.query }) },
    },
  },

  effects: {
    Loading: async (ctx, signal) => {
      try {
        const results = await api.search(ctx.query, { signal })
        return E.LoadOk({ results })
      } catch (error) {
        if (signal.aborted) return null
        return E.LoadErr({ error: error as Error })
      }
    },
  },
})
```

Type rules enforced by `defineMachine`:

- Outer keys of `transitions` must exhaust the state names from `S` (TS
  error on missing or extra keys). Inner keys must be valid event names from
  `E`.
- In `Idle.Search.assign`, `ctx` is typed as `S.Idle`'s context (`{}`) and
  `e` as `E.Search`'s payload (`{ query: string }`). The return type is
  checked against `S.Loading`'s context. Bad assigns are compile errors.
- `effects[K]` receives `ctx` typed as `S[K]`'s context plus an
  `AbortSignal`. Return type must be one of the machine's events or `null`.

Guards:

- A transition entry is `{ target, guard?, assign }`. If `guard(ctx, evt)`
  returns `false` the transition is skipped and the event is dropped (see
  §"Errors and edge cases").
- For v0.1 there is at most one transition per `(state, event)` pair. The
  array-form ("first matching guard wins") is deferred — keeps types
  simpler.

`assign` always builds the *next state's full context*, never a patch on
the current one. This matches "per-state context types" — the next context
is a different shape and merging would defeat the type model.

### React integration

One hook. State is a discriminated union; pair with `match` for
exhaustiveness, or use `state.is(token)` for single-branch narrowing.

```ts
import { useMachine, match } from '@ccc-ts/statecharts'

function Search() {
  const [state, send] = useMachine(machine)

  return match(state, {
    Idle:    ()    => <button onClick={() => send(E.Search({ query: 'hi' }))}>Search</button>,
    Loading: (ctx) => <p>Loading {ctx.query}…</p>,
    Loaded:  (ctx) => <ul>{ctx.results.map(/* ... */)}</ul>,
    Failed:  (ctx) => <button onClick={() => send(E.Retry())}>Retry</button>,
  })
}
```

Rules:

- `match` is exhaustive at the type level. Omitting a state is a compile
  error. Adding a state to `defineStates` immediately turns every `match`
  call site into a compile error until the new branch is handled. This is
  the property that makes `match` durable for AI agents — forgetting a
  branch can't compile.
- Each handler receives that state's context typed correctly.
- Optional fallback: `match(state, { ..., _: () => null })` opts that call
  out of exhaustiveness. Off by default.
- `state.is(token)` narrows for one-branch cases:
  `if (state.is(S.Loaded)) return <Big payload={state.context}/>`. Both
  shapes share the same underlying discriminated union.
- `send` is referentially stable across renders (safe in deps arrays).
  Events sent during render are queued and flushed after commit.
- The hook owns one store per mount, created lazily like `useState`.
  Re-running `defineMachine` on every render does not recreate the store.
- Effects run inside the store, *not* in `useEffect`. Entering `Loading`
  starts the effect; exiting (via any transition) aborts its `AbortSignal`.
- StrictMode: store kept warm across the synchronous double-mount, disposed
  on real unmount. Effects fire once.
- `useMachine(machine, { initial: { state, context } })` overrides the
  initial state — used for tests and hydration.

### External / non-React usage

The store is usable outside React for tests and non-UI code.

```ts
import { createMachine } from '@ccc-ts/statecharts'

const store = createMachine(machine)
store.getState()   // { name, context, is(token) }
store.send(event)
const unsub = store.subscribe(listener)
```

`useMachine` is a thin React binding on top of `createMachine`. Same
package layout as `@ccc-ts/feature-arch` (small core + React layer).

### Persistence and hydration

```ts
import { serialize, hydrate } from '@ccc-ts/statecharts'

const snapshot = serialize(state)             // { v: 1, name, context }
localStorage.setItem('search', JSON.stringify(snapshot))

const raw = JSON.parse(localStorage.getItem('search')!)
const initial = hydrate(machine, raw)         // { state, context } | null
const [state, send] = useMachine(machine, { initial: initial ?? undefined })
```

Rules:

- Snapshot envelope: `{ v: 1, name, context }`. Versioned so future format
  changes don't silently corrupt restored state.
- `hydrate` validates: `name` is a known state of *this* machine; an
  optional per-state `parse(raw) => Context | null` is run if provided. On
  any failure (unknown name, parse returns null, version mismatch) `hydrate`
  returns `null`. Bad snapshots never throw.
- Effects re-run on hydration by default. If the snapshot was taken in
  `Loading`, the in-flight fetch was lost when the page unloaded; re-running
  is the correct default. Opt-out per-state via `effects[K]` config:
  `{ run, onHydrate: 'skip' }`.
- Migrations are out of scope for v0.1. If `parse` rejects, the caller
  falls back to initial. Adding migrations later is non-breaking — just a
  new field on the per-state config.
- The library does not persist to storage automatically; `serialize` /
  `hydrate` only convert to and from JSON-safe values.

### Inspector / DevTools

Two layers, both shipped in v0.1.

**Subscription API** — zero-config, always on:

```ts
machine.subscribe((event) => {
  // event:
  //   { kind: 'transition',    from, to, event, contextBefore, contextAfter, ts }
  // | { kind: 'effect-start',  state, ts }
  // | { kind: 'effect-end',    state, result, aborted, ts }
  // | { kind: 'event-dropped', state, event, reason: 'no-handler' | 'guard-false' }
})
```

Used by tests, custom loggers, and the inspector itself.

**In-page inspector UI** — opt-in, dev-only:

```ts
import { attachInspector } from '@ccc-ts/statecharts/inspector'
if (import.meta.env.DEV) attachInspector()
```

Behavior:

- Auto-discovers any machine created via `useMachine` (machines self-register
  on mount, deregister on unmount).
- Renders a fixed-position React tree mounted into a portal under `<body>`.
- Shows: live machines, current state, current context (JSON), recent
  transitions, effect status (running / aborted / done).
- "Send event" form for ad-hoc dispatch, typed via the machine's event
  tokens.
- Time-travel: jump to any past state in the log (replays context, does
  not re-run effects). Marked clearly as "debug rewind".
- No browser extension required and none is shipped. A `__CCC_STATECHARTS__`
  window hook is reserved for a future extension to plug into; the in-page
  inspector does not depend on it.
- Lives behind a separate sub-export so the main entry has zero inspector
  code.

## Errors and edge cases

| Situation | Behavior |
| --- | --- |
| Event in a state with no handler | Dropped. Subscribe emits `event-dropped` with `reason: 'no-handler'`. Dev `console.warn` once per `(state, event)` pair. Never throws. |
| Guard returns `false` | Dropped. Same path with `reason: 'guard-false'`. |
| Multiple `send` in same tick | Processed in order, one at a time. Each transition completes (assign + exit current effect + enter next effect) before the next event is read. |
| `send` from inside `assign` | Dev-mode error. It almost always means an effect was wanted instead. |
| `send` from inside an effect | Allowed — the normal way. The effect's return value is the canonical path; calling `send` *and* returning an event is a dev warning. |
| Effect throws | Caught by the runtime; surfaced as `effect-end` with an `error` field. The machine stays in the current state. Authors are expected to map errors to events (`LoadErr` pattern); throwing is treated as a bug to report. |
| Effect resolves after state has exited | Result discarded. Subscribers see `effect-end` with `aborted: true`. This is the core mechanism that replaces useEffect race conditions. |
| Effect returns `null` | No event fired. Used for "I noticed I was aborted, intentional exit". |
| `send` after unmount | No-op. Dev `console.warn` once. No "can't update unmounted component" errors. |
| StrictMode double-mount | Store kept warm across the synchronous unmount/remount, disposed on real unmount. Effects fire once. |
| Definition validation | `defineMachine` validates in dev: every state has at least one outgoing transition or is marked `terminal: true`. Catches dead-end-state typos. |
| Nondeterminism | Disallowed in v0.1: at most one transition per `(state, event)`. The array form (first matching guard) is deferred. |

## Testing strategy

Unit tests target the store directly — no React, no DOM. A small set of
integration tests covers `useMachine` and the inspector.

**Store unit tests:**

```ts
const store = createMachine(machine)
expect(store.getState().name).toBe('Idle')

store.send(E.Search({ query: 'hi' }))
expect(store.getState().name).toBe('Loading')
expect(store.getState().context).toEqual({ query: 'hi' })
```

- `createMachine` accepts an `effects` override per state, so tests don't
  hit the network: `createMachine(machine, { effects: { Loading: async () => E.LoadOk({ results: [] }) } })`.
- `runUntil(predicate, { timeout })` test helper drains queued events and
  awaits effects until the machine reaches a target state. Replaces ad-hoc
  `await new Promise(setTimeout)` patterns.
- `expectTransition(store, event, expectedState)` runs one event and asserts
  the resulting state name and (optionally) context.

**React integration tests** (happy-dom + `@testing-library/react`, same
setup as `feature-arch`):

- `useMachine` mounts → effect runs → state updates → component re-renders.
- StrictMode double-mount does not double-run effects.
- `send` after unmount is a no-op.
- `attachInspector()` mounts and unmounts cleanly, without leaking global
  listeners.

**Type-level tests** (`tsd` or `expectTypeOf` from vitest):

- `match` is exhaustive — omitting a branch is a compile error.
- `assign` return type is checked against the target state's context.
- `effect` return type must be in the machine's event union.
- `defineMachine` rejects unknown event references in `transitions`.

**Coverage targets:**

- Token factories (id assignment, payload typing, equality).
- All edge-case rows in the table above have at least one test each.
- Hydration round-trip: `serialize → JSON.stringify → JSON.parse → hydrate`
  produces a state value that round-trips equal to the original.

## Tooling and conventions

- Build: tsup (ESM + CJS + d.ts), same config shape as `@ccc-ts/feature-arch`.
- Test: vitest, happy-dom, `@testing-library/react`.
- Lint/format: inherits the repo's existing setup.
- TypeScript settings: inherits `tsconfig.base.json` (`strict`,
  `noUncheckedIndexedAccess`, `verbatimModuleSyntax`).
- React peer dep: `^18.0.0 || ^19.0.0`.
- Changeset added on the introducing PR; package starts at `0.0.0`, same
  as the other packages in the repo.
- README in the package and a row added to the root README's package table.
