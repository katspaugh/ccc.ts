/// <reference lib="dom" />
import { act, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
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

  it('send after unmount is a no-op (no error)', async () => {
    let captured: ((e: unknown) => void) | null = null
    function Probe() {
      const [, send] = useMachine(baseMachine)
      captured = send as (e: unknown) => void
      return null
    }
    const { unmount } = render(<Probe />)
    unmount()
    await Promise.resolve() // wait for deferred dispose microtask
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
