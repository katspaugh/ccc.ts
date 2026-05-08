# @ccc-ts/statecharts

A small, strictly-typed React-first state machine library. Designed so that
forgetting a state, mistyping a transition, or accessing the wrong context
field is a compile error, not a runtime bug.

## Install

```bash
pnpm add @ccc-ts/statecharts
```

## Quick start

```ts
import {
  defineStates,
  defineEvents,
  defineMachine,
  useMachine,
  match,
} from '@ccc-ts/statecharts'

const S = defineStates({
  Idle:    {} as Record<string, never>,
  Loading: {} as { query: string },
  Loaded:  {} as { query: string; results: string[] },
  Failed:  {} as { query: string; error: Error },
})

const E = defineEvents({
  Search:  {} as { query: string },
  Retry:   {} as Record<string, never>,
  Reset:   {} as Record<string, never>,
  LoadOk:  {} as { results: string[] },
  LoadErr: {} as { error: Error },
})

const machine = defineMachine({
  states: S,
  events: E,
  initial: { state: S.Idle, context: {} },
  transitions: {
    Idle:    { Search: { target: S.Loading, assign: (_c, e) => ({ query: e.query }) } },
    Loading: {
      LoadOk:  { target: S.Loaded, assign: (c, e) => ({ query: c.query, results: e.results }) },
      LoadErr: { target: S.Failed, assign: (c, e) => ({ query: c.query, error: e.error }) },
    },
    Loaded: { Reset:  { target: S.Idle,    assign: () => ({}) } },
    Failed: { Retry:  { target: S.Loading, assign: (c) => ({ query: c.query }) } },
  },
  effects: {
    Loading: async (ctx, signal) => {
      try {
        const results = await fetch(`/api/search?q=${ctx.query}`, { signal })
          .then((r) => r.json())
        return E.LoadOk({ results })
      } catch (error) {
        if (signal.aborted) return null
        return E.LoadErr({ error: error as Error })
      }
    },
  },
})

function Search() {
  const [state, send] = useMachine(machine)
  return match(state, {
    Idle:    ()    => <button onClick={() => send(E.Search({ query: 'hi' }))}>Search</button>,
    Loading: (ctx) => <p>Loading {ctx.query}…</p>,
    Loaded:  (ctx) => <ul>{ctx.results.map((r) => <li key={r}>{r}</li>)}</ul>,
    Failed:  ()    => <button onClick={() => send(E.Retry())}>Retry</button>,
  })
}
```

## Why

Most React state-management bugs are not state-management bugs — they're
"impossible state" bugs. `useState` lets `data` be defined while `loading`
is true. `useEffect` chains race each other. `@ccc-ts/statecharts` makes
these unrepresentable: each state has its own context shape; effects start
on entry and abort on exit; `match` is exhaustive at the type level.

## API

- `defineStates(spec)` — declare states with per-state context types.
- `defineEvents(spec)` — declare events with payload types.
- `defineMachine(config)` — build the machine; validates in dev.
- `createMachine(machine, options?)` — framework-agnostic store.
- `useMachine(machine, options?)` — React hook returning `[state, send]`.
- `match(state, handlers)` — exhaustive state matcher.
- `state.is(token)` — type-narrowing escape hatch.
- `serialize(state)` / `hydrate(machine, raw)` — snapshot persistence.

### Inspector

```ts
import { attachInspector } from '@ccc-ts/statecharts/inspector'
if (import.meta.env.DEV) attachInspector()
```

In-page panel showing live machines, current state, context, and event
log. No browser extension required.

## License

MIT
