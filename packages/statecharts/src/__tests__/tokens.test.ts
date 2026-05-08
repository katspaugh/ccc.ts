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
