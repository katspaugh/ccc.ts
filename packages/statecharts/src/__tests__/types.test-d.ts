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
