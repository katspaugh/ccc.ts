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
