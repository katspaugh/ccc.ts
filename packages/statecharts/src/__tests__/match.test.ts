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
