import { describe, it, expect, vi } from 'vitest'
import { ok, err } from '../constructors'
import { map, mapErr, andThen, orElse } from '../transform'
import type { Result } from '../types'
import type { Equal } from './_equal'

describe('map', () => {
  it('transforms the value on Ok', () => {
    expect(map(ok(2), (x) => x * 3)).toEqual(ok(6))
  })

  it('returns the same Err reference and does not call fn', () => {
    const fn = vi.fn()
    const e = err('x')
    expect(map(e, fn)).toBe(e)
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('mapErr', () => {
  it('transforms the error on Err', () => {
    expect(mapErr(err('x'), (e) => e.toUpperCase())).toEqual(err('X'))
  })

  it('returns the same Ok reference and does not call fn', () => {
    const fn = vi.fn()
    const o = ok(1)
    expect(mapErr(o, fn)).toBe(o)
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('andThen', () => {
  it('chains on Ok', () => {
    const r = andThen(ok(2), (x) => (x > 0 ? ok(x) : err('neg')))
    expect(r).toEqual(ok(2))
  })

  it('returns Err produced by fn', () => {
    const r = andThen(ok(-1), (x) => (x > 0 ? ok(x) : err('neg')))
    expect(r).toEqual(err('neg'))
  })

  it('short-circuits on Err and returns the same reference', () => {
    const fn = vi.fn()
    const e: Result<number, 'fail'> = err('fail')
    const r = andThen(e, fn)
    expect(r).toBe(e)
    expect(fn).not.toHaveBeenCalled()
  })

  it('accumulates error type as E | F', () => {
    const r1 = ok(1) as Result<number, 'a'>
    const r2 = andThen(
      r1,
      (n): Result<string, 'b'> => (n > 0 ? ok(String(n)) : err('b' as const)),
    )
    const _: Equal<typeof r2, Result<string, 'a' | 'b'>> = true
    void _
  })
})

describe('orElse', () => {
  it('recovers on Err', () => {
    const r = orElse(err('x'), () => ok(7))
    expect(r).toEqual(ok(7))
  })

  it('passes through Ok and does not call fn', () => {
    const fn = vi.fn()
    const o = ok(1)
    expect(orElse(o, fn)).toBe(o)
    expect(fn).not.toHaveBeenCalled()
  })

  it('produces a new Err when fn returns Err', () => {
    const r1: Result<number, 'a'> = err('a')
    const r = orElse(r1, () => err('b' as const))
    expect(r).toEqual(err('b'))
  })
})
