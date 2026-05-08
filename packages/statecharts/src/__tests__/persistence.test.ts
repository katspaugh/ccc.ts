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
