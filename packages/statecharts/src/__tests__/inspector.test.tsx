/// <reference lib="dom" />
import { act, render } from '@testing-library/react'
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
  it('registers a machine on mount and deregisters on unmount', async () => {
    function Probe() {
      useMachine(machine)
      return null
    }
    const { unmount } = render(<Probe />)
    expect(listMachines().length).toBe(1)
    unmount()
    await Promise.resolve()
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
