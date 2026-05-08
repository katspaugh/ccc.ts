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
