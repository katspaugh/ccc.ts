import { describe, it, expect } from 'vitest'
import { ok, err } from '../constructors'
import { fromThrowable, fromPromise } from '../from'

describe('fromThrowable', () => {
  it('returns Ok when fn returns', () => {
    expect(fromThrowable(() => 42)).toEqual(ok(42))
  })

  it('returns Err with the thrown Error reference', () => {
    const original = new Error('x')
    const r = fromThrowable<never, Error>(() => {
      throw original
    })
    expect(r).toEqual(err(original))
    if (!r.ok) expect(r.error).toBe(original)
  })

  it('uses mapErr when provided to coerce non-Error throws', () => {
    const r = fromThrowable(
      () => {
        throw 'boom'
      },
      (e) => String(e),
    )
    expect(r).toEqual(err('boom'))
  })
})

describe('fromPromise', () => {
  it('returns Ok on resolve', async () => {
    expect(await fromPromise(Promise.resolve(42))).toEqual(ok(42))
  })

  it('returns Err with the rejected Error reference', async () => {
    const original = new Error('x')
    const r = await fromPromise<never, Error>(Promise.reject(original))
    expect(r).toEqual(err(original))
    if (!r.ok) expect(r.error).toBe(original)
  })

  it('uses mapErr when provided to coerce non-Error rejections', async () => {
    const r = await fromPromise(Promise.reject('x'), String)
    expect(r).toEqual(err('x'))
  })

  it('accepts a hand-rolled PromiseLike thenable', async () => {
    const thenable: PromiseLike<number> = {
      then(onFulfilled) {
        return Promise.resolve(onFulfilled ? onFulfilled(7) : (7 as never))
      },
    }
    expect(await fromPromise(thenable)).toEqual(ok(7))
  })
})
