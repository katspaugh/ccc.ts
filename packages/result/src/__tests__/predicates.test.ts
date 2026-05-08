import { describe, it, expect } from 'vitest'
import { ok, err } from '../constructors'
import { isOk, isErr } from '../predicates'
import type { Result } from '../types'

describe('isOk', () => {
  it('returns true for Ok', () => {
    expect(isOk(ok(1))).toBe(true)
  })

  it('returns false for Err', () => {
    expect(isOk(err('x'))).toBe(false)
  })

  it('narrows the type', () => {
    const r: Result<number, string> = ok(1)
    if (isOk(r)) {
      const v: number = r.value
      expect(v).toBe(1)
    } else {
      throw new Error('unreachable')
    }
  })
})

describe('isErr', () => {
  it('returns true for Err', () => {
    expect(isErr(err('x'))).toBe(true)
  })

  it('returns false for Ok', () => {
    expect(isErr(ok(1))).toBe(false)
  })

  it('narrows the type', () => {
    const r: Result<number, string> = err('boom')
    if (isErr(r)) {
      const e: string = r.error
      expect(e).toBe('boom')
    } else {
      throw new Error('unreachable')
    }
  })
})
