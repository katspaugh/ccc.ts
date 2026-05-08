import { describe, it, expect } from 'vitest'
import { ok, err } from '../constructors'
import { unwrap, unwrapOr, unwrapOrElse, UnwrapError } from '../unwrap'

describe('unwrap', () => {
  it('returns the value on Ok', () => {
    expect(unwrap(ok(42))).toBe(42)
  })

  it('throws the original Error reference on Err of Error', () => {
    const original = new Error('boom')
    let caught: unknown
    try {
      unwrap(err(original))
    } catch (e) {
      caught = e
    }
    expect(caught).toBe(original)
  })

  it('throws UnwrapError for string Err with cause and useful message', () => {
    let caught: unknown
    try {
      unwrap(err('boom'))
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(UnwrapError)
    const u = caught as UnwrapError
    expect(u.cause).toBe('boom')
    expect(u.message).toContain('boom')
  })

  it('throws UnwrapError for object Err with JSON in message', () => {
    let caught: unknown
    try {
      unwrap(err({ code: 'X' }))
    } catch (e) {
      caught = e
    }
    const u = caught as UnwrapError
    expect(u).toBeInstanceOf(UnwrapError)
    expect(u.cause).toEqual({ code: 'X' })
    expect(u.message).toContain('"code"')
    expect(u.message).toContain('"X"')
  })

  it('does not crash on circular Err (falls back to String)', () => {
    type Node = { self?: Node }
    const cycle: Node = {}
    cycle.self = cycle
    let caught: unknown
    try {
      unwrap(err(cycle))
    } catch (e) {
      caught = e
    }
    const u = caught as UnwrapError
    expect(u).toBeInstanceOf(UnwrapError)
    expect(u.cause).toBe(cycle)
    expect(typeof u.message).toBe('string')
  })
})

describe('unwrapOr', () => {
  it('returns the value on Ok', () => {
    expect(unwrapOr(ok(3), 7)).toBe(3)
  })

  it('returns the fallback on Err', () => {
    expect(unwrapOr(err('x'), 7)).toBe(7)
  })
})

describe('unwrapOrElse', () => {
  it('returns the value on Ok and does not call fn', () => {
    let called = false
    const v = unwrapOrElse(ok(3), () => {
      called = true
      return 0
    })
    expect(v).toBe(3)
    expect(called).toBe(false)
  })

  it('returns the fn(error) on Err', () => {
    expect(unwrapOrElse(err('xy'), (e) => e.length)).toBe(2)
  })
})
