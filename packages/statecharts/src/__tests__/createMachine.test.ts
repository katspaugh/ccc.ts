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
