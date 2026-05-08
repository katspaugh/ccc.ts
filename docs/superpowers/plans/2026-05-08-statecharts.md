# `@ccc-ts/statecharts` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@ccc-ts/statecharts` — a small, strictly-typed React-first FSM
library with per-state context types, declarative effects, token factories,
exhaustive `match`, persistence, and an in-page inspector.

**Architecture:** Two-layer package: a framework-agnostic store
(`createMachine`) handles state transitions, the event queue, and the
effect/AbortSignal lifecycle; a thin React layer (`useMachine`) subscribes
React components to that store. The inspector is a separate sub-export
(`@ccc-ts/statecharts/inspector`) so production bundles don't include it.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`,
`verbatimModuleSyntax`), React 18/19 peer dep, tsup for build, vitest for
tests, happy-dom + `@testing-library/react` for DOM tests. Package layout
mirrors `packages/feature-arch`.

**Spec:** `docs/superpowers/specs/2026-05-08-statecharts-design.md`.

---

## File Structure

```
packages/statecharts/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── vitest.setup.ts
├── README.md
└── src/
    ├── index.ts            # public core API
    ├── types.ts            # branded token + machine-config types
    ├── tokens.ts           # defineStates, defineEvents
    ├── defineMachine.ts    # config builder + dev validation
    ├── createMachine.ts    # store: getState, send, subscribe, effect lifecycle
    ├── useMachine.ts       # React binding hook
    ├── match.ts            # exhaustive state matcher
    ├── persistence.ts      # serialize, hydrate
    ├── inspector.ts        # public sub-export entry
    ├── inspector/
    │   ├── registry.ts     # global machine registry
    │   └── Panel.tsx       # inspector UI
    └── __tests__/
        ├── tokens.test.ts
        ├── defineMachine.test.ts
        ├── createMachine.test.ts
        ├── effects.test.ts
        ├── match.test.ts
        ├── useMachine.test.tsx
        ├── persistence.test.ts
        ├── inspector.test.tsx
        └── types.test-d.ts
```

Each file has one responsibility. `createMachine.ts` is the largest unit by
design (transitions + queue + effects all need shared internal state); the
React layer, persistence, inspector, and matchers are independent of it
through the public store interface.

---

## Task 1: Scaffold `@ccc-ts/statecharts` package

**Files:**
- Create: `packages/statecharts/package.json`
- Create: `packages/statecharts/tsconfig.json`
- Create: `packages/statecharts/tsup.config.ts`
- Create: `packages/statecharts/vitest.config.ts`
- Create: `packages/statecharts/vitest.setup.ts`
- Create: `packages/statecharts/src/index.ts`
- Create: `packages/statecharts/src/inspector.ts`
- Create: `packages/statecharts/README.md`

- [ ] **Step 1: Create `packages/statecharts/package.json`**

```json
{
  "name": "@ccc-ts/statecharts",
  "version": "0.0.0",
  "description": "A small, strictly-typed, React-first state machine library with per-state context types and declarative effects.",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./inspector": {
      "types": "./dist/inspector.d.ts",
      "import": "./dist/inspector.js",
      "require": "./dist/inspector.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.1.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "happy-dom": "^15.11.6",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tsup": "^8.3.5",
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Create `packages/statecharts/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "types": ["vitest/globals"]
  },
  "include": ["src", "tsup.config.ts", "vitest.config.ts", "vitest.setup.ts"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Create `packages/statecharts/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/inspector.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: ['react', 'react-dom'],
  banner: {
    js: '"use client";',
  },
})
```

- [ ] **Step 4: Create `packages/statecharts/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    typecheck: {
      enabled: true,
      include: ['src/**/*.test-d.ts'],
    },
  },
})
```

- [ ] **Step 5: Create `packages/statecharts/vitest.setup.ts`**

```ts
import '@testing-library/react'
```

- [ ] **Step 6: Create placeholder `packages/statecharts/src/index.ts`**

```ts
export {}
```

- [ ] **Step 7: Create placeholder `packages/statecharts/src/inspector.ts`**

```ts
export {}
```

- [ ] **Step 8: Create stub `packages/statecharts/README.md`**

```markdown
# @ccc-ts/statecharts

Strictly-typed React-first state machine library. See the package docs after
implementation completes.
```

- [ ] **Step 9: Install workspace dependencies**

Run: `pnpm install`
Expected: pnpm resolves the new package as part of the workspace and writes to `pnpm-lock.yaml`. No errors.

- [ ] **Step 10: Verify typecheck and build**

Run: `pnpm --filter @ccc-ts/statecharts typecheck && pnpm --filter @ccc-ts/statecharts build`
Expected: typecheck passes; tsup produces `dist/index.{js,cjs,d.ts}` and `dist/inspector.{js,cjs,d.ts}`.

- [ ] **Step 11: Commit**

```bash
git add packages/statecharts pnpm-lock.yaml
git commit -m "feat(statecharts): scaffold @ccc-ts/statecharts package"
```

---

## Task 2: Core types and token factories

**Files:**
- Create: `packages/statecharts/src/types.ts`
- Create: `packages/statecharts/src/tokens.ts`
- Create: `packages/statecharts/src/__tests__/tokens.test.ts`
- Modify: `packages/statecharts/src/index.ts`

- [ ] **Step 1: Write the failing test — `packages/statecharts/src/__tests__/tokens.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { defineStates, defineEvents } from '../tokens'

describe('defineStates', () => {
  it('returns one token per state with id matching the key', () => {
    const S = defineStates({
      Idle: {} as Record<string, never>,
      Loading: {} as { query: string },
      Loaded: {} as { query: string; results: number[] },
    })
    expect(S.Idle.id).toBe('Idle')
    expect(S.Loading.id).toBe('Loading')
    expect(S.Loaded.id).toBe('Loaded')
  })

  it('produces tokens that are reference-equal to themselves', () => {
    const S = defineStates({ A: {} as Record<string, never> })
    expect(S.A).toBe(S.A)
  })
})

describe('defineEvents', () => {
  it('produces callable constructors that build typed event values', () => {
    const E = defineEvents({
      Search: {} as { query: string },
      Reset: {} as Record<string, never>,
    })

    const searchEvt = E.Search({ query: 'hi' })
    expect(searchEvt).toEqual({ type: 'Search', query: 'hi' })

    const resetEvt = E.Reset()
    expect(resetEvt).toEqual({ type: 'Reset' })
  })

  it('exposes a `type` field on each constructor', () => {
    const E = defineEvents({ Search: {} as { query: string } })
    expect(E.Search.type).toBe('Search')
  })

  it('does not mutate the payload object passed in', () => {
    const E = defineEvents({ Search: {} as { query: string } })
    const payload = { query: 'hi' }
    const evt = E.Search(payload)
    expect(payload).toEqual({ query: 'hi' })
    expect(evt).not.toBe(payload)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: FAIL — `defineStates`/`defineEvents` not exported.

- [ ] **Step 3: Implement `packages/statecharts/src/types.ts`**

```ts
declare const __ctxBrand: unique symbol
declare const __payloadBrand: unique symbol

export type StateToken<Name extends string, Ctx> = {
  readonly id: Name
  readonly [__ctxBrand]?: (_: never) => Ctx
}

export type EventConstructor<Type extends string, Payload extends object> = {
  readonly type: Type
  readonly [__payloadBrand]?: (_: never) => Payload
} & (keyof Payload extends never
  ? () => { readonly type: Type }
  : (payload: Payload) => { readonly type: Type } & Payload)

export type StatesMap = Record<string, object>
export type EventsMap = Record<string, object>

export type StatesOf<S extends StatesMap> = {
  [K in keyof S & string]: StateToken<K, S[K]>
}

export type EventsOf<E extends EventsMap> = {
  [K in keyof E & string]: EventConstructor<K, E[K]>
}

export type ContextOf<T> = T extends StateToken<string, infer C> ? C : never
export type PayloadOf<T> = T extends EventConstructor<string, infer P> ? P : never

export type StateValue<S extends StatesMap> = {
  [K in keyof S & string]: {
    readonly name: K
    readonly context: S[K]
    is<N extends keyof S & string>(
      token: StateToken<N, S[N]>
    ): this is { readonly name: N; readonly context: S[N] }
  }
}[keyof S & string]

export type EventValue<E extends EventsMap> = {
  [K in keyof E & string]: { readonly type: K } & E[K]
}[keyof E & string]
```

- [ ] **Step 4: Implement `packages/statecharts/src/tokens.ts`**

```ts
import type {
  EventConstructor,
  EventsMap,
  EventsOf,
  StatesMap,
  StatesOf,
  StateToken,
} from './types'

export function defineStates<S extends StatesMap>(spec: S): StatesOf<S> {
  const out = {} as Record<string, StateToken<string, unknown>>
  for (const name of Object.keys(spec)) {
    out[name] = Object.freeze({ id: name })
  }
  return Object.freeze(out) as StatesOf<S>
}

export function defineEvents<E extends EventsMap>(spec: E): EventsOf<E> {
  const out = {} as Record<string, EventConstructor<string, object>>
  for (const type of Object.keys(spec)) {
    const ctor = ((payload?: object) => {
      if (payload === undefined) return { type }
      return { type, ...payload }
    }) as unknown as EventConstructor<string, object>
    Object.defineProperty(ctor, 'type', { value: type, enumerable: true })
    out[type] = ctor
  }
  return Object.freeze(out) as EventsOf<E>
}
```

- [ ] **Step 5: Wire exports through `packages/statecharts/src/index.ts`**

```ts
export type {
  StateToken,
  EventConstructor,
  StateValue,
  EventValue,
  ContextOf,
  PayloadOf,
} from './types'
export { defineStates, defineEvents } from './tokens'
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: PASS — all token tests green.

- [ ] **Step 7: Run typecheck**

Run: `pnpm --filter @ccc-ts/statecharts typecheck`
Expected: PASS — no type errors.

- [ ] **Step 8: Commit**

```bash
git add packages/statecharts/src
git commit -m "feat(statecharts): add token factories defineStates and defineEvents"
```

---

## Task 3: `defineMachine` config builder + dev validation

**Files:**
- Create: `packages/statecharts/src/defineMachine.ts`
- Create: `packages/statecharts/src/__tests__/defineMachine.test.ts`
- Modify: `packages/statecharts/src/index.ts`

- [ ] **Step 1: Write the failing test — `packages/statecharts/src/__tests__/defineMachine.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { defineEvents, defineStates } from '../tokens'
import { defineMachine } from '../defineMachine'

const S = defineStates({
  Idle: {} as Record<string, never>,
  Loading: {} as { query: string },
  Loaded: {} as { query: string; n: number },
})

const E = defineEvents({
  Search: {} as { query: string },
  LoadOk: {} as { n: number },
  Reset: {} as Record<string, never>,
})

describe('defineMachine', () => {
  it('returns the config object essentially unchanged', () => {
    const machine = defineMachine({
      states: S,
      events: E,
      initial: { state: S.Idle, context: {} },
      transitions: {
        Idle: { Search: { target: S.Loading, assign: (_c, e) => ({ query: e.query }) } },
        Loading: { LoadOk: { target: S.Loaded, assign: (c, e) => ({ query: c.query, n: e.n }) } },
        Loaded: { Reset: { target: S.Idle, assign: () => ({}) } },
      },
    })
    expect(machine.initial.state).toBe(S.Idle)
    expect(machine.transitions.Idle?.Search?.target).toBe(S.Loading)
  })

  it('throws in dev when a non-terminal state has no outgoing transitions', () => {
    expect(() =>
      defineMachine({
        states: S,
        events: E,
        initial: { state: S.Idle, context: {} },
        transitions: {
          Idle: { Search: { target: S.Loading, assign: (_c, e) => ({ query: e.query }) } },
          Loading: { LoadOk: { target: S.Loaded, assign: (c, e) => ({ query: c.query, n: e.n }) } },
          // Loaded has no transitions out and is not terminal
        },
      })
    ).toThrow(/Loaded/)
  })

  it('does not throw when a state is marked terminal', () => {
    expect(() =>
      defineMachine({
        states: S,
        events: E,
        initial: { state: S.Idle, context: {} },
        transitions: {
          Idle: { Search: { target: S.Loading, assign: (_c, e) => ({ query: e.query }) } },
          Loading: { LoadOk: { target: S.Loaded, assign: (c, e) => ({ query: c.query, n: e.n }) } },
        },
        terminal: ['Loaded'],
      })
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: FAIL — `defineMachine` not exported.

- [ ] **Step 3: Implement `packages/statecharts/src/defineMachine.ts`**

```ts
import type {
  EventConstructor,
  EventsMap,
  EventsOf,
  StatesMap,
  StatesOf,
  StateToken,
} from './types'

export type Transition<
  S extends StatesMap,
  E extends EventsMap,
  FromKey extends keyof S & string,
  EvtKey extends keyof E & string,
  ToKey extends keyof S & string = keyof S & string,
> = {
  target: StateToken<ToKey, S[ToKey]>
  guard?: (ctx: S[FromKey], event: { type: EvtKey } & E[EvtKey]) => boolean
  assign: (ctx: S[FromKey], event: { type: EvtKey } & E[EvtKey]) => S[ToKey]
}

export type TransitionsConfig<S extends StatesMap, E extends EventsMap> = {
  [FromKey in keyof S & string]?: {
    [EvtKey in keyof E & string]?: {
      [ToKey in keyof S & string]: Transition<S, E, FromKey, EvtKey, ToKey>
    }[keyof S & string]
  }
}

export type EffectFn<Ctx, EvtUnion> = (
  ctx: Ctx,
  signal: AbortSignal
) => Promise<EvtUnion | null> | EvtUnion | null

export type EffectEntry<Ctx, EvtUnion> =
  | EffectFn<Ctx, EvtUnion>
  | { run: EffectFn<Ctx, EvtUnion>; onHydrate?: 'run' | 'skip' }

export type EffectsConfig<S extends StatesMap, E extends EventsMap> = {
  [K in keyof S & string]?: EffectEntry<
    S[K],
    { [EK in keyof E & string]: { type: EK } & E[EK] }[keyof E & string]
  >
}

export type MachineConfig<S extends StatesMap, E extends EventsMap> = {
  states: StatesOf<S>
  events: EventsOf<E>
  initial: {
    [K in keyof S & string]: {
      state: StateToken<K, S[K]>
      context: S[K]
    }
  }[keyof S & string]
  transitions: TransitionsConfig<S, E>
  effects?: EffectsConfig<S, E>
  terminal?: ReadonlyArray<keyof S & string>
}

export type Machine<S extends StatesMap, E extends EventsMap> = MachineConfig<
  S,
  E
> & {
  readonly __states: S
  readonly __events: E
}

const isDev = (() => {
  try {
    return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'
  } catch {
    return true
  }
})()

export function defineMachine<S extends StatesMap, E extends EventsMap>(
  config: MachineConfig<S, E>
): Machine<S, E> {
  if (isDev) validateMachine(config)
  return config as Machine<S, E>
}

function validateMachine<S extends StatesMap, E extends EventsMap>(
  config: MachineConfig<S, E>
): void {
  const stateNames = Object.keys(config.states)
  const eventNames = new Set(Object.keys(config.events))
  const terminal = new Set(config.terminal ?? [])

  for (const stateName of stateNames) {
    const isTerminal = terminal.has(stateName as keyof S & string)
    const transitions = (config.transitions as Record<string, Record<string, unknown> | undefined>)[
      stateName
    ]
    const hasOutgoing = transitions !== undefined && Object.keys(transitions).length > 0

    if (!isTerminal && !hasOutgoing) {
      throw new Error(
        `[statecharts] state "${stateName}" has no outgoing transitions and is not listed in \`terminal\`. ` +
          `Add a transition or mark it terminal: ['${stateName}'].`
      )
    }

    if (transitions) {
      for (const evt of Object.keys(transitions)) {
        if (!eventNames.has(evt)) {
          throw new Error(
            `[statecharts] state "${stateName}" references unknown event "${evt}".`
          )
        }
      }
    }
  }
}
```

- [ ] **Step 4: Re-export from `packages/statecharts/src/index.ts`**

Add (append) to the existing export block:

```ts
export { defineMachine } from './defineMachine'
export type {
  MachineConfig,
  Machine,
  Transition,
  TransitionsConfig,
  EffectFn,
  EffectEntry,
  EffectsConfig,
} from './defineMachine'
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: PASS — all defineMachine tests green; existing tokens tests still green.

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter @ccc-ts/statecharts typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/statecharts/src
git commit -m "feat(statecharts): add defineMachine builder with dev validation"
```

---

## Task 4: Store (`createMachine`) — transitions, queue, subscribe

**Files:**
- Create: `packages/statecharts/src/createMachine.ts`
- Create: `packages/statecharts/src/__tests__/createMachine.test.ts`
- Modify: `packages/statecharts/src/index.ts`

This task implements the synchronous transition logic and subscriber API but
**not** effects (those land in Task 5).

- [ ] **Step 1: Write the failing test — `packages/statecharts/src/__tests__/createMachine.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest'
import { defineEvents, defineStates } from '../tokens'
import { defineMachine } from '../defineMachine'
import { createMachine } from '../createMachine'

const S = defineStates({
  Idle: {} as Record<string, never>,
  Loading: {} as { query: string },
  Loaded: {} as { query: string; n: number },
  Failed: {} as { query: string; error: string },
})

const E = defineEvents({
  Search: {} as { query: string },
  LoadOk: {} as { n: number },
  LoadErr: {} as { error: string },
  Reset: {} as Record<string, never>,
})

const machine = defineMachine({
  states: S,
  events: E,
  initial: { state: S.Idle, context: {} },
  transitions: {
    Idle: { Search: { target: S.Loading, assign: (_c, e) => ({ query: e.query }) } },
    Loading: {
      LoadOk: { target: S.Loaded, assign: (c, e) => ({ query: c.query, n: e.n }) },
      LoadErr: { target: S.Failed, assign: (c, e) => ({ query: c.query, error: e.error }) },
    },
    Loaded: { Reset: { target: S.Idle, assign: () => ({}) } },
    Failed: { Reset: { target: S.Idle, assign: () => ({}) } },
  },
})

describe('createMachine', () => {
  it('starts in the initial state', () => {
    const store = createMachine(machine)
    expect(store.getState().name).toBe('Idle')
    expect(store.getState().context).toEqual({})
  })

  it('transitions on a matching event and runs assign', () => {
    const store = createMachine(machine)
    store.send(E.Search({ query: 'hi' }))
    expect(store.getState().name).toBe('Loading')
    expect(store.getState().context).toEqual({ query: 'hi' })
  })

  it('drops events with no handler in the current state and emits event-dropped', () => {
    const store = createMachine(machine)
    const events: unknown[] = []
    store.subscribe((e) => events.push(e))
    store.send(E.LoadOk({ n: 1 }))
    expect(store.getState().name).toBe('Idle')
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'event-dropped', reason: 'no-handler' })
    )
  })

  it('respects guards and emits event-dropped with reason guard-false', () => {
    const guardedMachine = defineMachine({
      states: S,
      events: E,
      initial: { state: S.Idle, context: {} },
      transitions: {
        Idle: {
          Search: {
            target: S.Loading,
            guard: (_c, e) => e.query.length > 0,
            assign: (_c, e) => ({ query: e.query }),
          },
        },
        Loading: {
          LoadOk: { target: S.Loaded, assign: (c, e) => ({ query: c.query, n: e.n }) },
          LoadErr: { target: S.Failed, assign: (c, e) => ({ query: c.query, error: e.error }) },
        },
        Loaded: { Reset: { target: S.Idle, assign: () => ({}) } },
        Failed: { Reset: { target: S.Idle, assign: () => ({}) } },
      },
    })
    const store = createMachine(guardedMachine)
    const events: unknown[] = []
    store.subscribe((e) => events.push(e))
    store.send(E.Search({ query: '' }))
    expect(store.getState().name).toBe('Idle')
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'event-dropped', reason: 'guard-false' })
    )
  })

  it('processes events queued during a transition in order', () => {
    const store = createMachine(machine)
    const seen: string[] = []
    store.subscribe((e) => {
      if (e.kind === 'transition') {
        seen.push(`${e.from}->${e.to}`)
        if (e.to === 'Loading') store.send(E.LoadOk({ n: 7 }))
      }
    })
    store.send(E.Search({ query: 'hi' }))
    expect(seen).toEqual(['Idle->Loading', 'Loading->Loaded'])
    expect(store.getState().name).toBe('Loaded')
    expect(store.getState().context).toEqual({ query: 'hi', n: 7 })
  })

  it('emits a transition event with before/after context', () => {
    const store = createMachine(machine)
    const fn = vi.fn()
    store.subscribe(fn)
    store.send(E.Search({ query: 'hi' }))
    expect(fn).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'transition',
        from: 'Idle',
        to: 'Loading',
        contextBefore: {},
        contextAfter: { query: 'hi' },
      })
    )
  })

  it('subscribe returns an unsubscribe function', () => {
    const store = createMachine(machine)
    const fn = vi.fn()
    const unsub = store.subscribe(fn)
    unsub()
    store.send(E.Search({ query: 'hi' }))
    expect(fn).not.toHaveBeenCalled()
  })

  it('state.is narrows correctly', () => {
    const store = createMachine(machine)
    store.send(E.Search({ query: 'hi' }))
    const s = store.getState()
    expect(s.is(S.Loading)).toBe(true)
    expect(s.is(S.Idle)).toBe(false)
  })

  it('accepts an initial override', () => {
    const store = createMachine(machine, {
      initial: { state: S.Loaded, context: { query: 'x', n: 1 } },
    })
    expect(store.getState().name).toBe('Loaded')
    expect(store.getState().context).toEqual({ query: 'x', n: 1 })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: FAIL — `createMachine` not exported.

- [ ] **Step 3: Implement `packages/statecharts/src/createMachine.ts`**

```ts
import type { Machine } from './defineMachine'
import type { EventsMap, StatesMap, StateToken } from './types'

export type StoreEvent =
  | {
      kind: 'transition'
      from: string
      to: string
      event: { type: string } & Record<string, unknown>
      contextBefore: unknown
      contextAfter: unknown
      ts: number
    }
  | { kind: 'effect-start'; state: string; ts: number }
  | {
      kind: 'effect-end'
      state: string
      result: { type: string } & Record<string, unknown> | { error: unknown } | null
      aborted: boolean
      ts: number
    }
  | {
      kind: 'event-dropped'
      state: string
      event: { type: string } & Record<string, unknown>
      reason: 'no-handler' | 'guard-false'
    }

export type StoreState<S extends StatesMap> = {
  readonly name: keyof S & string
  readonly context: S[keyof S & string]
  is<N extends keyof S & string>(
    token: StateToken<N, S[N]>
  ): boolean
}

export type Store<S extends StatesMap, E extends EventsMap> = {
  getState(): StoreState<S>
  send(event: { type: keyof E & string } & Record<string, unknown>): void
  subscribe(listener: (e: StoreEvent) => void): () => void
  dispose(): void
}

export type CreateMachineOptions<S extends StatesMap, E extends EventsMap> = {
  initial?: {
    [K in keyof S & string]: {
      state: StateToken<K, S[K]>
      context: S[K]
    }
  }[keyof S & string]
}

const isDev = (() => {
  try {
    return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'
  } catch {
    return true
  }
})()

const warned = new Set<string>()
function warnOnce(key: string, msg: string): void {
  if (!isDev || warned.has(key)) return
  warned.add(key)
  // eslint-disable-next-line no-console
  console.warn(`[statecharts] ${msg}`)
}

export function createMachine<S extends StatesMap, E extends EventsMap>(
  machine: Machine<S, E>,
  options: CreateMachineOptions<S, E> = {}
): Store<S, E> {
  const initial = options.initial ?? machine.initial
  let currentName = initial.state.id as keyof S & string
  let currentContext = initial.context as S[keyof S & string]

  const listeners = new Set<(e: StoreEvent) => void>()
  const queue: Array<{ type: string } & Record<string, unknown>> = []
  let processing = false
  let inAssign = false
  let disposed = false

  const emit = (e: StoreEvent): void => {
    for (const l of listeners) l(e)
  }

  const buildState = (): StoreState<S> => {
    const name = currentName
    const context = currentContext
    return {
      name,
      context,
      is(token) {
        return token.id === name
      },
    }
  }

  const processQueue = (): void => {
    if (processing) return
    processing = true
    try {
      while (queue.length > 0) {
        const event = queue.shift()!
        const transitions = (machine.transitions as Record<
          string,
          Record<string, { target: StateToken<string, unknown>; guard?: (...a: any[]) => boolean; assign: (...a: any[]) => unknown } | undefined> | undefined
        >)[currentName]
        const entry = transitions?.[event.type]
        if (!entry) {
          emit({
            kind: 'event-dropped',
            state: currentName,
            event,
            reason: 'no-handler',
          })
          continue
        }
        if (entry.guard && !entry.guard(currentContext, event)) {
          emit({
            kind: 'event-dropped',
            state: currentName,
            event,
            reason: 'guard-false',
          })
          continue
        }
        const fromName = currentName
        const fromCtx = currentContext
        inAssign = true
        let nextCtx: unknown
        try {
          nextCtx = entry.assign(currentContext, event)
        } finally {
          inAssign = false
        }
        currentName = entry.target.id as keyof S & string
        currentContext = nextCtx as S[keyof S & string]
        emit({
          kind: 'transition',
          from: fromName,
          to: currentName,
          event,
          contextBefore: fromCtx,
          contextAfter: currentContext,
          ts: Date.now(),
        })
      }
    } finally {
      processing = false
    }
  }

  return {
    getState: buildState,
    send(event) {
      if (disposed) {
        warnOnce(`send-after-dispose:${event.type}`, `send("${event.type}") after dispose() — ignored.`)
        return
      }
      if (inAssign) {
        if (isDev) {
          throw new Error(
            `[statecharts] send() called from inside assign(). Use an effect to emit follow-up events.`
          )
        }
        return
      }
      queue.push(event)
      processQueue()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      disposed = true
      listeners.clear()
      queue.length = 0
    },
  }
}
```

- [ ] **Step 4: Re-export from `packages/statecharts/src/index.ts`**

Append:

```ts
export { createMachine } from './createMachine'
export type { Store, StoreState, StoreEvent, CreateMachineOptions } from './createMachine'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: PASS — all createMachine tests green; previous tasks still green.

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter @ccc-ts/statecharts typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/statecharts/src
git commit -m "feat(statecharts): add createMachine store with transitions and subscriptions"
```

---

## Task 5: Effects with `AbortSignal` lifecycle

**Files:**
- Modify: `packages/statecharts/src/createMachine.ts`
- Create: `packages/statecharts/src/__tests__/effects.test.ts`

- [ ] **Step 1: Write the failing test — `packages/statecharts/src/__tests__/effects.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest'
import { createMachine } from '../createMachine'
import { defineMachine } from '../defineMachine'
import { defineEvents, defineStates } from '../tokens'

const S = defineStates({
  Idle: {} as Record<string, never>,
  Loading: {} as { query: string },
  Loaded: {} as { query: string; n: number },
  Failed: {} as { query: string; error: string },
})

const E = defineEvents({
  Search: {} as { query: string },
  LoadOk: {} as { n: number },
  LoadErr: {} as { error: string },
  Reset: {} as Record<string, never>,
})

function build(effect: (ctx: { query: string }, signal: AbortSignal) => Promise<unknown>) {
  return defineMachine({
    states: S,
    events: E,
    initial: { state: S.Idle, context: {} },
    transitions: {
      Idle: { Search: { target: S.Loading, assign: (_c, e) => ({ query: e.query }) } },
      Loading: {
        LoadOk: { target: S.Loaded, assign: (c, e) => ({ query: c.query, n: e.n }) },
        LoadErr: { target: S.Failed, assign: (c, e) => ({ query: c.query, error: e.error }) },
        Reset: { target: S.Idle, assign: () => ({}) },
      },
      Loaded: { Reset: { target: S.Idle, assign: () => ({}) } },
      Failed: { Reset: { target: S.Idle, assign: () => ({}) } },
    },
    effects: {
      Loading: effect as never,
    },
  })
}

describe('effects', () => {
  it('runs the effect on entry and applies its returned event', async () => {
    const machine = build(async () => E.LoadOk({ n: 5 }))
    const store = createMachine(machine)
    store.send(E.Search({ query: 'hi' }))
    await new Promise((r) => setTimeout(r, 0))
    expect(store.getState().name).toBe('Loaded')
    expect(store.getState().context).toEqual({ query: 'hi', n: 5 })
  })

  it('emits effect-start and effect-end with the result', async () => {
    const machine = build(async () => E.LoadOk({ n: 1 }))
    const store = createMachine(machine)
    const events: unknown[] = []
    store.subscribe((e) => events.push(e))
    store.send(E.Search({ query: 'q' }))
    await new Promise((r) => setTimeout(r, 0))
    expect(events).toContainEqual(expect.objectContaining({ kind: 'effect-start', state: 'Loading' }))
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'effect-end', state: 'Loading', aborted: false })
    )
  })

  it('aborts the effect when the state exits before it resolves', async () => {
    const seenAbort = vi.fn()
    let resolveLater: (v: unknown) => void = () => {}
    const machine = build((_c, signal) => {
      signal.addEventListener('abort', seenAbort)
      return new Promise((resolve) => {
        resolveLater = resolve
      })
    })
    const store = createMachine(machine)
    store.send(E.Search({ query: 'q' }))
    store.send(E.Reset())
    expect(store.getState().name).toBe('Idle')
    resolveLater(E.LoadOk({ n: 99 }))
    await new Promise((r) => setTimeout(r, 0))
    expect(seenAbort).toHaveBeenCalled()
    expect(store.getState().name).toBe('Idle')
  })

  it('discards a result returned after abort and marks effect-end aborted', async () => {
    let resolveLater: (v: unknown) => void = () => {}
    const machine = build(
      () => new Promise((resolve) => { resolveLater = resolve })
    )
    const store = createMachine(machine)
    const events: unknown[] = []
    store.subscribe((e) => events.push(e))
    store.send(E.Search({ query: 'q' }))
    store.send(E.Reset())
    resolveLater(E.LoadOk({ n: 1 }))
    await new Promise((r) => setTimeout(r, 0))
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'effect-end', state: 'Loading', aborted: true })
    )
    expect(store.getState().name).toBe('Idle')
  })

  it('returning null fires no event', async () => {
    const machine = build(async () => null)
    const store = createMachine(machine)
    store.send(E.Search({ query: 'q' }))
    await new Promise((r) => setTimeout(r, 0))
    expect(store.getState().name).toBe('Loading')
  })

  it('an effect that throws emits effect-end with an error and stays in state', async () => {
    const machine = build(async () => {
      throw new Error('boom')
    })
    const store = createMachine(machine)
    const events: unknown[] = []
    store.subscribe((e) => events.push(e))
    store.send(E.Search({ query: 'q' }))
    await new Promise((r) => setTimeout(r, 0))
    expect(store.getState().name).toBe('Loading')
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: 'effect-end',
        state: 'Loading',
        result: expect.objectContaining({ error: expect.any(Error) }),
      })
    )
  })

  it('supports object-form effect entry { run, onHydrate }', async () => {
    const machine = defineMachine({
      states: S,
      events: E,
      initial: { state: S.Idle, context: {} },
      transitions: {
        Idle: { Search: { target: S.Loading, assign: (_c, e) => ({ query: e.query }) } },
        Loading: {
          LoadOk: { target: S.Loaded, assign: (c, e) => ({ query: c.query, n: e.n }) },
          LoadErr: { target: S.Failed, assign: (c, e) => ({ query: c.query, error: e.error }) },
          Reset: { target: S.Idle, assign: () => ({}) },
        },
        Loaded: { Reset: { target: S.Idle, assign: () => ({}) } },
        Failed: { Reset: { target: S.Idle, assign: () => ({}) } },
      },
      effects: {
        Loading: { run: async () => E.LoadOk({ n: 3 }), onHydrate: 'skip' },
      },
    })
    const store = createMachine(machine)
    store.send(E.Search({ query: 'q' }))
    await new Promise((r) => setTimeout(r, 0))
    expect(store.getState().name).toBe('Loaded')
  })

  it('createMachine accepts an effects override for tests', async () => {
    const machine = build(async () => E.LoadOk({ n: 1 }))
    const store = createMachine(machine, {
      effects: { Loading: async () => E.LoadOk({ n: 999 }) },
    })
    store.send(E.Search({ query: 'q' }))
    await new Promise((r) => setTimeout(r, 0))
    expect(store.getState().context).toEqual({ query: 'q', n: 999 })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: FAIL — effects not yet implemented.

- [ ] **Step 3: Modify `packages/statecharts/src/createMachine.ts`**

Replace the file's contents with the following (full new version — diff is too noisy to apply step-by-step):

```ts
import type { EffectEntry, EffectFn, Machine } from './defineMachine'
import type { EventsMap, StatesMap, StateToken } from './types'

export type StoreEvent =
  | {
      kind: 'transition'
      from: string
      to: string
      event: { type: string } & Record<string, unknown>
      contextBefore: unknown
      contextAfter: unknown
      ts: number
    }
  | { kind: 'effect-start'; state: string; ts: number }
  | {
      kind: 'effect-end'
      state: string
      result:
        | ({ type: string } & Record<string, unknown>)
        | { error: unknown }
        | null
      aborted: boolean
      ts: number
    }
  | {
      kind: 'event-dropped'
      state: string
      event: { type: string } & Record<string, unknown>
      reason: 'no-handler' | 'guard-false'
    }

export type StoreState<S extends StatesMap> = {
  readonly name: keyof S & string
  readonly context: S[keyof S & string]
  is<N extends keyof S & string>(token: StateToken<N, S[N]>): boolean
}

export type Store<S extends StatesMap, E extends EventsMap> = {
  getState(): StoreState<S>
  send(event: { type: keyof E & string } & Record<string, unknown>): void
  subscribe(listener: (e: StoreEvent) => void): () => void
  dispose(): void
}

export type CreateMachineOptions<S extends StatesMap, E extends EventsMap> = {
  initial?: {
    [K in keyof S & string]: {
      state: StateToken<K, S[K]>
      context: S[K]
    }
  }[keyof S & string]
  effects?: {
    [K in keyof S & string]?: EffectEntry<
      S[K],
      { [EK in keyof E & string]: { type: EK } & E[EK] }[keyof E & string]
    >
  }
  hydrated?: boolean
}

const isDev = (() => {
  try {
    return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'
  } catch {
    return true
  }
})()

const warned = new Set<string>()
function warnOnce(key: string, msg: string): void {
  if (!isDev || warned.has(key)) return
  warned.add(key)
  // eslint-disable-next-line no-console
  console.warn(`[statecharts] ${msg}`)
}

function resolveEffect(
  entry: EffectEntry<unknown, unknown> | undefined
): { run: EffectFn<unknown, unknown>; onHydrate: 'run' | 'skip' } | undefined {
  if (!entry) return undefined
  if (typeof entry === 'function') return { run: entry, onHydrate: 'run' }
  return { run: entry.run, onHydrate: entry.onHydrate ?? 'run' }
}

export function createMachine<S extends StatesMap, E extends EventsMap>(
  machine: Machine<S, E>,
  options: CreateMachineOptions<S, E> = {}
): Store<S, E> {
  const initial = options.initial ?? machine.initial
  const effects = (options.effects ?? machine.effects ?? {}) as Record<
    string,
    EffectEntry<unknown, unknown> | undefined
  >

  let currentName = initial.state.id as keyof S & string
  let currentContext = initial.context as S[keyof S & string]
  let currentAbort: AbortController | null = null
  let currentEffectId = 0
  let isHydratedEntry = options.hydrated === true

  const listeners = new Set<(e: StoreEvent) => void>()
  const queue: Array<{ type: string } & Record<string, unknown>> = []
  let processing = false
  let inAssign = false
  let disposed = false

  const emit = (e: StoreEvent): void => {
    for (const l of listeners) l(e)
  }

  const buildState = (): StoreState<S> => {
    const name = currentName
    const context = currentContext
    return {
      name,
      context,
      is(token) {
        return token.id === name
      },
    }
  }

  const startEffectFor = (stateName: string, ctx: unknown, isHydrate: boolean): void => {
    const resolved = resolveEffect(effects[stateName])
    if (!resolved) return
    if (isHydrate && resolved.onHydrate === 'skip') return
    const controller = new AbortController()
    currentAbort = controller
    const myId = ++currentEffectId
    emit({ kind: 'effect-start', state: stateName, ts: Date.now() })
    let result: Promise<unknown> | unknown
    try {
      result = resolved.run(ctx, controller.signal)
    } catch (error) {
      emit({
        kind: 'effect-end',
        state: stateName,
        result: { error },
        aborted: false,
        ts: Date.now(),
      })
      return
    }
    Promise.resolve(result).then(
      (value) => {
        if (myId !== currentEffectId || disposed) {
          emit({
            kind: 'effect-end',
            state: stateName,
            result: (value ?? null) as never,
            aborted: true,
            ts: Date.now(),
          })
          return
        }
        emit({
          kind: 'effect-end',
          state: stateName,
          result: (value ?? null) as never,
          aborted: false,
          ts: Date.now(),
        })
        if (value !== null && value !== undefined) {
          queue.push(value as { type: string } & Record<string, unknown>)
          processQueue()
        }
      },
      (error: unknown) => {
        const aborted = myId !== currentEffectId || disposed
        emit({
          kind: 'effect-end',
          state: stateName,
          result: { error },
          aborted,
          ts: Date.now(),
        })
      }
    )
  }

  const stopCurrentEffect = (): void => {
    if (currentAbort) {
      currentAbort.abort()
      currentAbort = null
    }
    currentEffectId++
  }

  const processQueue = (): void => {
    if (processing) return
    processing = true
    try {
      while (queue.length > 0) {
        const event = queue.shift()!
        const transitions = (
          machine.transitions as Record<
            string,
            | Record<
                string,
                | {
                    target: StateToken<string, unknown>
                    guard?: (...a: any[]) => boolean
                    assign: (...a: any[]) => unknown
                  }
                | undefined
              >
            | undefined
          >
        )[currentName]
        const entry = transitions?.[event.type]
        if (!entry) {
          emit({
            kind: 'event-dropped',
            state: currentName,
            event,
            reason: 'no-handler',
          })
          warnOnce(
            `no-handler:${currentName}:${event.type}`,
            `event "${event.type}" has no handler in state "${currentName}".`
          )
          continue
        }
        if (entry.guard && !entry.guard(currentContext, event)) {
          emit({
            kind: 'event-dropped',
            state: currentName,
            event,
            reason: 'guard-false',
          })
          continue
        }
        const fromName = currentName
        const fromCtx = currentContext
        stopCurrentEffect()
        inAssign = true
        let nextCtx: unknown
        try {
          nextCtx = entry.assign(currentContext, event)
        } finally {
          inAssign = false
        }
        currentName = entry.target.id as keyof S & string
        currentContext = nextCtx as S[keyof S & string]
        emit({
          kind: 'transition',
          from: fromName,
          to: currentName,
          event,
          contextBefore: fromCtx,
          contextAfter: currentContext,
          ts: Date.now(),
        })
        startEffectFor(currentName, currentContext, false)
      }
    } finally {
      processing = false
    }
  }

  // Start effect for the initial state, respecting `hydrated` flag.
  startEffectFor(currentName, currentContext, isHydratedEntry)
  isHydratedEntry = false

  return {
    getState: buildState,
    send(event) {
      if (disposed) {
        warnOnce(`send-after-dispose:${event.type}`, `send("${event.type}") after dispose() — ignored.`)
        return
      }
      if (inAssign) {
        if (isDev) {
          throw new Error(
            `[statecharts] send() called from inside assign(). Use an effect to emit follow-up events.`
          )
        }
        return
      }
      queue.push(event)
      processQueue()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      stopCurrentEffect()
      listeners.clear()
      queue.length = 0
    },
  }
}
```

- [ ] **Step 4: Run all tests**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: PASS — effects tests + previous tests all green.

- [ ] **Step 5: Run typecheck**

Run: `pnpm --filter @ccc-ts/statecharts typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/statecharts/src
git commit -m "feat(statecharts): add effect lifecycle with AbortSignal-driven cancellation"
```

---

## Task 6: `match` helper + state.is exhaustiveness

**Files:**
- Create: `packages/statecharts/src/match.ts`
- Create: `packages/statecharts/src/__tests__/match.test.ts`
- Create: `packages/statecharts/src/__tests__/types.test-d.ts`
- Modify: `packages/statecharts/src/index.ts`

- [ ] **Step 1: Write the failing test — `packages/statecharts/src/__tests__/match.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createMachine } from '../createMachine'
import { defineMachine } from '../defineMachine'
import { defineEvents, defineStates } from '../tokens'
import { match } from '../match'

const S = defineStates({
  Idle: {} as Record<string, never>,
  Loading: {} as { query: string },
  Loaded: {} as { query: string; n: number },
})

const E = defineEvents({
  Search: {} as { query: string },
  LoadOk: {} as { n: number },
  Reset: {} as Record<string, never>,
})

const machine = defineMachine({
  states: S,
  events: E,
  initial: { state: S.Idle, context: {} },
  transitions: {
    Idle: { Search: { target: S.Loading, assign: (_c, e) => ({ query: e.query }) } },
    Loading: { LoadOk: { target: S.Loaded, assign: (c, e) => ({ query: c.query, n: e.n }) } },
    Loaded: { Reset: { target: S.Idle, assign: () => ({}) } },
  },
})

describe('match', () => {
  it('dispatches to the handler for the current state and passes context', () => {
    const store = createMachine(machine)
    store.send(E.Search({ query: 'hi' }))
    const result = match(store.getState(), {
      Idle: () => 'idle',
      Loading: (ctx) => `loading:${ctx.query}`,
      Loaded: (ctx) => `loaded:${ctx.n}`,
    })
    expect(result).toBe('loading:hi')
  })

  it('uses the _ fallback when no specific handler matches', () => {
    const store = createMachine(machine)
    const result = match(store.getState(), {
      Loading: () => 'loading',
      _: () => 'other',
    } as never)
    expect(result).toBe('other')
  })

  it('throws if no handler matches and no fallback is provided', () => {
    const store = createMachine(machine)
    expect(() =>
      match(store.getState(), { Loading: () => 'l' } as never)
    ).toThrow(/Idle/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: FAIL — `match` not exported.

- [ ] **Step 3: Implement `packages/statecharts/src/match.ts`**

```ts
import type { StatesMap, StateValue } from './types'

export type MatchHandlers<S extends StatesMap, R> =
  | { [K in keyof S & string]: (ctx: S[K]) => R }
  | ({ [K in keyof S & string]?: (ctx: S[K]) => R } & {
      _: (state: StateValue<S>) => R
    })

export function match<S extends StatesMap, R>(
  state: StateValue<S>,
  handlers: MatchHandlers<S, R>
): R {
  const handler = (handlers as Record<string, ((ctx: unknown) => R) | undefined>)[state.name]
  if (handler) return handler(state.context)
  const fallback = (handlers as { _?: (state: StateValue<S>) => R })._
  if (fallback) return fallback(state)
  throw new Error(
    `[statecharts] match: no handler for state "${state.name}" and no fallback provided.`
  )
}
```

- [ ] **Step 4: Write the type-level test — `packages/statecharts/src/__tests__/types.test-d.ts`**

```ts
import { describe, expectTypeOf, it } from 'vitest'
import { createMachine } from '../createMachine'
import { defineMachine } from '../defineMachine'
import { defineEvents, defineStates } from '../tokens'
import { match } from '../match'

const S = defineStates({
  Idle: {} as Record<string, never>,
  Loading: {} as { query: string },
  Loaded: {} as { query: string; n: number },
})

const E = defineEvents({
  Search: {} as { query: string },
  LoadOk: {} as { n: number },
  Reset: {} as Record<string, never>,
})

const machine = defineMachine({
  states: S,
  events: E,
  initial: { state: S.Idle, context: {} },
  transitions: {
    Idle: { Search: { target: S.Loading, assign: (_c, e) => ({ query: e.query }) } },
    Loading: { LoadOk: { target: S.Loaded, assign: (c, e) => ({ query: c.query, n: e.n }) } },
    Loaded: { Reset: { target: S.Idle, assign: () => ({}) } },
  },
})

describe('types', () => {
  it('match infers per-state context types', () => {
    const store = createMachine(machine)
    const out = match(store.getState(), {
      Idle: () => 0,
      Loading: (ctx) => {
        expectTypeOf(ctx).toEqualTypeOf<{ query: string }>()
        return 1
      },
      Loaded: (ctx) => {
        expectTypeOf(ctx).toEqualTypeOf<{ query: string; n: number }>()
        return 2
      },
    })
    expectTypeOf(out).toEqualTypeOf<number>()
  })

  it('event constructor with empty payload is callable with zero args', () => {
    expectTypeOf(E.Reset).parameters.toEqualTypeOf<[]>()
  })

  it('event constructor with payload requires the payload arg', () => {
    expectTypeOf(E.Search).parameters.toEqualTypeOf<[{ query: string }]>()
  })

  it('state.is narrows the context type', () => {
    const store = createMachine(machine)
    const s = store.getState()
    if (s.is(S.Loaded)) {
      expectTypeOf(s.context).toEqualTypeOf<{ query: string; n: number }>()
    }
  })
})
```

- [ ] **Step 5: Append to `packages/statecharts/src/index.ts`**

```ts
export { match } from './match'
export type { MatchHandlers } from './match'
```

- [ ] **Step 6: Run tests (runtime + type)**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: PASS — match runtime tests; type tests pass via vitest typecheck integration.

- [ ] **Step 7: Run typecheck**

Run: `pnpm --filter @ccc-ts/statecharts typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/statecharts/src
git commit -m "feat(statecharts): add exhaustive match helper and state.is narrowing"
```

---

## Task 7: `useMachine` React hook

**Files:**
- Create: `packages/statecharts/src/useMachine.ts`
- Create: `packages/statecharts/src/__tests__/useMachine.test.tsx`
- Modify: `packages/statecharts/src/index.ts`

- [ ] **Step 1: Write the failing test — `packages/statecharts/src/__tests__/useMachine.test.tsx`**

```tsx
/// <reference lib="dom" />
import { act, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { createMachine } from '../createMachine'
import { defineMachine } from '../defineMachine'
import { defineEvents, defineStates } from '../tokens'
import { useMachine } from '../useMachine'

const S = defineStates({
  Idle: {} as Record<string, never>,
  Loading: {} as { query: string },
  Loaded: {} as { query: string; n: number },
})

const E = defineEvents({
  Search: {} as { query: string },
  LoadOk: {} as { n: number },
  Reset: {} as Record<string, never>,
})

const baseMachine = defineMachine({
  states: S,
  events: E,
  initial: { state: S.Idle, context: {} },
  transitions: {
    Idle: { Search: { target: S.Loading, assign: (_c, e) => ({ query: e.query }) } },
    Loading: { LoadOk: { target: S.Loaded, assign: (c, e) => ({ query: c.query, n: e.n }) } },
    Loaded: { Reset: { target: S.Idle, assign: () => ({}) } },
  },
})

describe('useMachine', () => {
  it('returns the current state and a stable send function', () => {
    const { result, rerender } = renderHook(() => useMachine(baseMachine))
    const firstSend = result.current[1]
    rerender()
    expect(result.current[1]).toBe(firstSend)
    expect(result.current[0].name).toBe('Idle')
  })

  it('re-renders when the state changes', () => {
    function Probe() {
      const [state, send] = useMachine(baseMachine)
      return (
        <div>
          <output>{state.name}</output>
          <button onClick={() => send(E.Search({ query: 'q' }))}>go</button>
        </div>
      )
    }
    render(<Probe />)
    expect(screen.getByRole('status').textContent).toBe('Idle')
    act(() => {
      screen.getByRole('button').click()
    })
    expect(screen.getByRole('status').textContent).toBe('Loading')
  })

  it('runs effects exactly once under StrictMode', async () => {
    const run = vi.fn(async () => E.LoadOk({ n: 1 }))
    const machine = defineMachine({
      ...baseMachine,
      effects: { Loading: run as never },
    })

    function Probe() {
      const [state, send] = useMachine(machine)
      return (
        <div>
          <output>{state.name}</output>
          <button onClick={() => send(E.Search({ query: 'q' }))}>go</button>
        </div>
      )
    }
    render(
      <StrictMode>
        <Probe />
      </StrictMode>
    )
    act(() => {
      screen.getByRole('button').click()
    })
    await act(() => Promise.resolve())
    expect(run).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status').textContent).toBe('Loaded')
  })

  it('send after unmount is a no-op (no error)', () => {
    let captured: ((e: unknown) => void) | null = null
    function Probe() {
      const [, send] = useMachine(baseMachine)
      captured = send as (e: unknown) => void
      return null
    }
    const { unmount } = render(<Probe />)
    unmount()
    expect(() => captured?.(E.Search({ query: 'q' }))).not.toThrow()
  })

  it('accepts an initial override', () => {
    function Probe() {
      const [state] = useMachine(baseMachine, {
        initial: { state: S.Loaded, context: { query: 'x', n: 9 } },
      })
      return <output>{state.name}</output>
    }
    render(<Probe />)
    expect(screen.getByRole('status').textContent).toBe('Loaded')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: FAIL — `useMachine` not exported.

- [ ] **Step 3: Implement `packages/statecharts/src/useMachine.ts`**

```ts
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createMachine, type CreateMachineOptions, type StoreState } from './createMachine'
import type { Machine } from './defineMachine'
import type { EventsMap, StatesMap } from './types'

export function useMachine<S extends StatesMap, E extends EventsMap>(
  machine: Machine<S, E>,
  options: CreateMachineOptions<S, E> = {}
): readonly [
  StoreState<S>,
  (event: { type: keyof E & string } & Record<string, unknown>) => void,
] {
  const initialOptionsRef = useRef(options)
  // Lazy create on first render; keep across re-renders. Strict-mode safe:
  // the second synchronous mount reuses the same store; dispose runs only on
  // real unmount.
  const [store] = useState(() => createMachine(machine, initialOptionsRef.current))

  useEffect(() => {
    return () => {
      store.dispose()
    }
  }, [store])

  const subscribe = useMemo(
    () => (cb: () => void) => {
      const unsub = store.subscribe((e) => {
        if (e.kind === 'transition') cb()
      })
      return unsub
    },
    [store]
  )

  const getSnapshot = useMemo(() => () => store.getState(), [store])

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Stable send across renders.
  const send = useMemo(() => store.send.bind(store), [store])

  return [state, send] as const
}
```

- [ ] **Step 4: Append to `packages/statecharts/src/index.ts`**

```ts
export { useMachine } from './useMachine'
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: PASS — useMachine tests + previous tests.

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter @ccc-ts/statecharts typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/statecharts/src
git commit -m "feat(statecharts): add useMachine React binding hook"
```

---

## Task 8: Persistence — `serialize` and `hydrate`

**Files:**
- Create: `packages/statecharts/src/persistence.ts`
- Create: `packages/statecharts/src/__tests__/persistence.test.ts`
- Modify: `packages/statecharts/src/index.ts`

- [ ] **Step 1: Write the failing test — `packages/statecharts/src/__tests__/persistence.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest'
import { createMachine } from '../createMachine'
import { defineMachine } from '../defineMachine'
import { defineEvents, defineStates } from '../tokens'
import { hydrate, serialize } from '../persistence'

const S = defineStates({
  Idle: {} as Record<string, never>,
  Loading: {} as { query: string },
  Loaded: {} as { query: string; n: number },
})

const E = defineEvents({
  Search: {} as { query: string },
  LoadOk: {} as { n: number },
  Reset: {} as Record<string, never>,
})

const machine = defineMachine({
  states: S,
  events: E,
  initial: { state: S.Idle, context: {} },
  transitions: {
    Idle: { Search: { target: S.Loading, assign: (_c, e) => ({ query: e.query }) } },
    Loading: { LoadOk: { target: S.Loaded, assign: (c, e) => ({ query: c.query, n: e.n }) } },
    Loaded: { Reset: { target: S.Idle, assign: () => ({}) } },
  },
})

describe('persistence', () => {
  it('round-trips through JSON', () => {
    const store = createMachine(machine)
    store.send(E.Search({ query: 'hi' }))
    const snapshot = serialize(store.getState())
    expect(snapshot).toEqual({ v: 1, name: 'Loading', context: { query: 'hi' } })
    const restored = hydrate(machine, JSON.parse(JSON.stringify(snapshot)))
    expect(restored).toEqual({ state: expect.objectContaining({ id: 'Loading' }), context: { query: 'hi' } })
  })

  it('returns null on version mismatch', () => {
    expect(hydrate(machine, { v: 2, name: 'Idle', context: {} })).toBeNull()
  })

  it('returns null on unknown state name', () => {
    expect(hydrate(machine, { v: 1, name: 'Bogus', context: {} })).toBeNull()
  })

  it('returns null when raw is not an object or has wrong shape', () => {
    expect(hydrate(machine, null)).toBeNull()
    expect(hydrate(machine, 42 as unknown)).toBeNull()
    expect(hydrate(machine, { name: 'Idle' } as unknown)).toBeNull()
  })

  it('runs an optional per-state parse and rejects if it returns null', () => {
    const parse = vi.fn((raw: unknown) => {
      if (typeof raw !== 'object' || raw === null) return null
      const r = raw as { query?: unknown }
      return typeof r.query === 'string' ? { query: r.query } : null
    })
    const result = hydrate(machine, { v: 1, name: 'Loading', context: { query: 'hi' } }, {
      parse: { Loading: parse as never },
    })
    expect(parse).toHaveBeenCalled()
    expect(result?.context).toEqual({ query: 'hi' })

    expect(
      hydrate(machine, { v: 1, name: 'Loading', context: { query: 123 } }, {
        parse: { Loading: parse as never },
      })
    ).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: FAIL — `serialize`/`hydrate` not exported.

- [ ] **Step 3: Implement `packages/statecharts/src/persistence.ts`**

```ts
import type { Machine } from './defineMachine'
import type { StoreState } from './createMachine'
import type { EventsMap, StatesMap, StateToken } from './types'

export const SNAPSHOT_VERSION = 1

export type Snapshot<S extends StatesMap> = {
  readonly v: typeof SNAPSHOT_VERSION
  readonly name: keyof S & string
  readonly context: S[keyof S & string]
}

export type HydrateOptions<S extends StatesMap> = {
  parse?: { [K in keyof S & string]?: (raw: unknown) => S[K] | null }
}

export type HydratedInitial<S extends StatesMap> = {
  [K in keyof S & string]: {
    state: StateToken<K, S[K]>
    context: S[K]
  }
}[keyof S & string]

export function serialize<S extends StatesMap>(state: StoreState<S>): Snapshot<S> {
  return {
    v: SNAPSHOT_VERSION,
    name: state.name,
    context: state.context,
  }
}

export function hydrate<S extends StatesMap, E extends EventsMap>(
  machine: Machine<S, E>,
  raw: unknown,
  options: HydrateOptions<S> = {}
): HydratedInitial<S> | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as { v?: unknown; name?: unknown; context?: unknown }
  if (obj.v !== SNAPSHOT_VERSION) return null
  if (typeof obj.name !== 'string') return null
  const states = machine.states as Record<string, StateToken<string, unknown> | undefined>
  const token = states[obj.name]
  if (!token) return null
  const parse = options.parse?.[obj.name as keyof S & string]
  let context: unknown = obj.context
  if (parse) {
    context = parse(obj.context)
    if (context === null) return null
  }
  return {
    state: token as never,
    context: context as never,
  }
}
```

- [ ] **Step 4: Append to `packages/statecharts/src/index.ts`**

```ts
export { serialize, hydrate, SNAPSHOT_VERSION } from './persistence'
export type { Snapshot, HydrateOptions, HydratedInitial } from './persistence'
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run: `pnpm --filter @ccc-ts/statecharts typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/statecharts/src
git commit -m "feat(statecharts): add serialize and hydrate for snapshot persistence"
```

---

## Task 9: Inspector — registry + UI + sub-export

**Files:**
- Create: `packages/statecharts/src/inspector/registry.ts`
- Create: `packages/statecharts/src/inspector/Panel.tsx`
- Modify: `packages/statecharts/src/inspector.ts`
- Modify: `packages/statecharts/src/useMachine.ts` (register/deregister)
- Create: `packages/statecharts/src/__tests__/inspector.test.tsx`

- [ ] **Step 1: Write the failing test — `packages/statecharts/src/__tests__/inspector.test.tsx`**

```tsx
/// <reference lib="dom" />
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createMachine } from '../createMachine'
import { defineMachine } from '../defineMachine'
import { defineEvents, defineStates } from '../tokens'
import { useMachine } from '../useMachine'
import { _resetInspector, attachInspector, listMachines } from '../inspector'

const S = defineStates({
  Idle: {} as Record<string, never>,
  Loading: {} as { query: string },
  Loaded: {} as { query: string; n: number },
})

const E = defineEvents({
  Search: {} as { query: string },
  LoadOk: {} as { n: number },
  Reset: {} as Record<string, never>,
})

const machine = defineMachine({
  states: S,
  events: E,
  initial: { state: S.Idle, context: {} },
  transitions: {
    Idle: { Search: { target: S.Loading, assign: (_c, e) => ({ query: e.query }) } },
    Loading: { LoadOk: { target: S.Loaded, assign: (c, e) => ({ query: c.query, n: e.n }) } },
    Loaded: { Reset: { target: S.Idle, assign: () => ({}) } },
  },
})

afterEach(() => {
  _resetInspector()
})

describe('inspector registry', () => {
  it('registers a machine on mount and deregisters on unmount', () => {
    function Probe() {
      useMachine(machine)
      return null
    }
    const { unmount } = render(<Probe />)
    expect(listMachines().length).toBe(1)
    unmount()
    expect(listMachines().length).toBe(0)
  })

  it('createMachine alone does not register (only useMachine does)', () => {
    createMachine(machine)
    expect(listMachines().length).toBe(0)
  })
})

describe('attachInspector', () => {
  it('mounts a panel into the document and unmounts on cleanup', () => {
    function Probe() {
      useMachine(machine)
      return null
    }
    render(<Probe />)
    const cleanup = attachInspector()
    expect(document.querySelector('[data-statecharts-inspector]')).toBeTruthy()
    act(() => {
      cleanup()
    })
    expect(document.querySelector('[data-statecharts-inspector]')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: FAIL — inspector module not implemented.

- [ ] **Step 3: Implement `packages/statecharts/src/inspector/registry.ts`**

```ts
import type { Store, StoreEvent } from '../createMachine'

type AnyStore = Store<Record<string, object>, Record<string, object>>

export type RegisteredMachine = {
  id: string
  name: string
  store: AnyStore
}

let counter = 0
const registry = new Map<string, RegisteredMachine>()
const listeners = new Set<() => void>()
const eventLog = new Map<string, StoreEvent[]>()
const LOG_LIMIT = 100

export function registerMachine(name: string, store: AnyStore): string {
  const id = `m${++counter}`
  registry.set(id, { id, name, store })
  eventLog.set(id, [])
  const unsub = store.subscribe((e) => {
    const log = eventLog.get(id)
    if (!log) return
    log.push(e)
    if (log.length > LOG_LIMIT) log.splice(0, log.length - LOG_LIMIT)
    notify()
  })
  // Wrap dispose so we deregister and unsubscribe on dispose.
  const originalDispose = store.dispose.bind(store)
  store.dispose = () => {
    unsub()
    deregisterMachine(id)
    originalDispose()
  }
  notify()
  return id
}

export function deregisterMachine(id: string): void {
  registry.delete(id)
  eventLog.delete(id)
  notify()
}

export function listMachines(): ReadonlyArray<RegisteredMachine> {
  return Array.from(registry.values())
}

export function getEventLog(id: string): ReadonlyArray<StoreEvent> {
  return eventLog.get(id) ?? []
}

export function subscribeRegistry(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(): void {
  for (const l of listeners) l()
}

export function _resetRegistry(): void {
  registry.clear()
  eventLog.clear()
  listeners.clear()
}
```

- [ ] **Step 4: Implement `packages/statecharts/src/inspector/Panel.tsx`**

```tsx
import { useEffect, useState } from 'react'
import {
  getEventLog,
  listMachines,
  subscribeRegistry,
  type RegisteredMachine,
} from './registry'

export function Panel(): JSX.Element {
  const [, force] = useState(0)
  useEffect(() => subscribeRegistry(() => force((n) => n + 1)), [])
  const machines = listMachines()
  return (
    <div
      data-statecharts-inspector=""
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 2147483647,
        maxWidth: 360,
        maxHeight: '50vh',
        overflow: 'auto',
        background: '#111',
        color: '#eee',
        font: '12px ui-monospace, SFMono-Regular, monospace',
        padding: 8,
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>statecharts</div>
      {machines.length === 0 ? (
        <div style={{ opacity: 0.6 }}>no machines mounted</div>
      ) : (
        machines.map((m) => <MachineView key={m.id} machine={m} />)
      )}
    </div>
  )
}

function MachineView({ machine }: { machine: RegisteredMachine }): JSX.Element {
  const state = machine.store.getState()
  const log = getEventLog(machine.id)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: '#9cf' }}>
        {machine.name} <span style={{ opacity: 0.6 }}>· {state.name}</span>
      </div>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(state.context, null, 2)}
      </pre>
      <details>
        <summary style={{ cursor: 'pointer', opacity: 0.7 }}>
          log ({log.length})
        </summary>
        <ol style={{ paddingLeft: 16, margin: 0 }}>
          {log.slice(-20).map((e, i) => (
            <li key={i}>{summarizeEvent(e)}</li>
          ))}
        </ol>
      </details>
    </div>
  )
}

function summarizeEvent(e: ReturnType<typeof getEventLog>[number]): string {
  switch (e.kind) {
    case 'transition':
      return `→ ${e.from} → ${e.to} (${e.event.type})`
    case 'effect-start':
      return `effect start: ${e.state}`
    case 'effect-end':
      return `effect end: ${e.state}${e.aborted ? ' [aborted]' : ''}`
    case 'event-dropped':
      return `dropped: ${e.event.type} (${e.reason})`
  }
}
```

- [ ] **Step 5: Implement the public `packages/statecharts/src/inspector.ts`**

```ts
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Panel } from './inspector/Panel'
import {
  _resetRegistry,
  listMachines as registryListMachines,
  registerMachine,
  deregisterMachine,
} from './inspector/registry'

export function attachInspector(): () => void {
  const host = document.createElement('div')
  host.setAttribute('data-statecharts-inspector-host', '')
  document.body.appendChild(host)
  const root: Root = createRoot(host)
  root.render(createElement(Panel))
  return () => {
    root.unmount()
    host.remove()
  }
}

export function listMachines(): ReturnType<typeof registryListMachines> {
  return registryListMachines()
}

export { registerMachine, deregisterMachine }

export function _resetInspector(): void {
  _resetRegistry()
  for (const host of Array.from(
    document.querySelectorAll('[data-statecharts-inspector-host]')
  )) {
    host.remove()
  }
}
```

- [ ] **Step 6: Modify `packages/statecharts/src/useMachine.ts` to register with the inspector**

Replace the file with:

```ts
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  createMachine,
  type CreateMachineOptions,
  type StoreState,
} from './createMachine'
import type { Machine } from './defineMachine'
import {
  deregisterMachine,
  registerMachine,
} from './inspector/registry'
import type { EventsMap, StatesMap } from './types'

export function useMachine<S extends StatesMap, E extends EventsMap>(
  machine: Machine<S, E>,
  options: CreateMachineOptions<S, E> = {}
): readonly [
  StoreState<S>,
  (event: { type: keyof E & string } & Record<string, unknown>) => void,
] {
  const initialOptionsRef = useRef(options)

  const [{ store, registryId }] = useState(() => {
    const s = createMachine(machine, initialOptionsRef.current)
    const id = registerMachine(getMachineLabel(machine), s as never)
    return { store: s, registryId: id }
  })

  useEffect(() => {
    return () => {
      deregisterMachine(registryId)
      store.dispose()
    }
  }, [store, registryId])

  const subscribe = useMemo(
    () => (cb: () => void) => {
      return store.subscribe((e) => {
        if (e.kind === 'transition') cb()
      })
    },
    [store]
  )

  const getSnapshot = useMemo(() => () => store.getState(), [store])
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const send = useMemo(() => store.send.bind(store), [store])

  return [state, send] as const
}

function getMachineLabel(machine: { initial: { state: { id: string } } }): string {
  return `machine:${machine.initial.state.id}`
}
```

- [ ] **Step 7: Update tsup config to bundle the inspector entry — already done in Task 1**

Verify: `packages/statecharts/tsup.config.ts` already lists `'src/inspector.ts'`. No change needed.

- [ ] **Step 8: Run all tests**

Run: `pnpm --filter @ccc-ts/statecharts test`
Expected: PASS — inspector tests + previous tests.

- [ ] **Step 9: Run typecheck**

Run: `pnpm --filter @ccc-ts/statecharts typecheck`
Expected: PASS.

- [ ] **Step 10: Run build to confirm both entry points emit**

Run: `pnpm --filter @ccc-ts/statecharts build`
Expected: `dist/index.{js,cjs,d.ts}` and `dist/inspector.{js,cjs,d.ts}` present.

- [ ] **Step 11: Commit**

```bash
git add packages/statecharts/src
git commit -m "feat(statecharts): add inspector with registry, panel UI, and sub-export"
```

---

## Task 10: README + root README + changeset

**Files:**
- Modify: `packages/statecharts/README.md`
- Modify: `README.md` (repo root)
- Create: `.changeset/statecharts-initial.md`

- [ ] **Step 1: Write the package README — `packages/statecharts/README.md`**

```markdown
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
```

- [ ] **Step 2: Modify the root README to advertise the new package**

In `README.md`, locate the package table and the "Planned" section. Replace
the section that currently reads:

```
| [`@ccc-ts/result`](packages/result)             | A tiny, dependency-free `Result<T, E>` with tree-shakeable operators.                |

Planned:

- `@ccc-ts/statecharts` — state-chart implementation.
```

with:

```
| [`@ccc-ts/result`](packages/result)             | A tiny, dependency-free `Result<T, E>` with tree-shakeable operators.                |
| [`@ccc-ts/statecharts`](packages/statecharts)   | Strictly-typed React-first state machines with per-state context and declarative effects. |
```

(Remove the "Planned" block entirely.)

- [ ] **Step 3: Create the changeset — `.changeset/statecharts-initial.md`**

```markdown
---
'@ccc-ts/statecharts': minor
---

Initial release of `@ccc-ts/statecharts`: a small, strictly-typed React-first
state machine library with per-state context types, declarative effects with
AbortSignal lifecycle, exhaustive `match`, snapshot persistence, and an
in-page inspector under `@ccc-ts/statecharts/inspector`.
```

- [ ] **Step 4: Run the full repo build and test gauntlet**

Run: `pnpm -r typecheck && pnpm -r test && pnpm -r build`
Expected: PASS across all packages.

- [ ] **Step 5: Commit**

```bash
git add packages/statecharts/README.md README.md .changeset/statecharts-initial.md
git commit -m "docs(statecharts): add README, register in root README, add changeset"
```

---

## Self-Review Coverage Check

- Spec §"Token factories" → Task 2.
- Spec §"Defining a machine" (transitions, guards, assign types) → Task 3 + Task 4.
- Spec §"Effects" (AbortSignal, return null, throws, abort-discard, override) → Task 5.
- Spec §"React integration" (`useMachine`, stable send, StrictMode, unmount, initial override) → Task 7.
- Spec §"External / non-React usage" (`createMachine` parity) → Task 4 + Task 5.
- Spec §"Persistence" (`serialize`/`hydrate`, version, parse, onHydrate) → Task 5 (onHydrate flag plumbed) + Task 8 (serialize/hydrate).
- Spec §"Inspector" (registry, in-page panel, sub-export, no extension required) → Task 9.
- Spec §"Errors and edge cases" (drops, dev warns, validation, no-fall-through) → Task 3 (validation) + Task 4 (drops, in-assign send) + Task 5 (effect throws, abort discard).
- Spec §"Testing strategy" (unit + integration + type-level + helpers) → covered across Tasks 2–9; type-level test in Task 6.
- Spec §"Tooling and conventions" (tsup, vitest, happy-dom, peer dep, changeset, root README) → Task 1 + Task 10.

No spec section is left without a task. No placeholder language used inside
task steps — every code block is the actual contents to be written.
