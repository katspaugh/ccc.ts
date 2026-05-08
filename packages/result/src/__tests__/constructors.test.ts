import { describe, it, expect } from 'vitest'
import { ok, err } from '../constructors'
import type { Ok, Err } from '../types'
import type { Equal } from './_equal'

describe('ok', () => {
  it('returns a tagged Ok object', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 })
  })

  it('preserves identity of the value', () => {
    const obj = { foo: 1 }
    expect(ok(obj).value).toBe(obj)
  })

  it('has type Ok<T>', () => {
    const r = ok('hi')
    const _: Equal<typeof r, Ok<string>> = true
    void _
  })
})

describe('err', () => {
  it('returns a tagged Err object', () => {
    expect(err('boom')).toEqual({ ok: false, error: 'boom' })
  })

  it('preserves identity of the error', () => {
    const e = new Error('x')
    expect(err(e).error).toBe(e)
  })

  it('has type Err<E>', () => {
    const r = err(404 as const)
    const _: Equal<typeof r, Err<404>> = true
    void _
  })
})
