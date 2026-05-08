import { describe, it, expect } from 'vitest'
import { ok, err } from '../constructors'
import { match } from '../match'
import type { Result } from '../types'
import type { Equal } from './_equal'

describe('match', () => {
  it('runs the ok handler on Ok', () => {
    const v = match(ok(2), {
      ok: (x) => x + 1,
      err: () => 0,
    })
    expect(v).toBe(3)
  })

  it('runs the err handler on Err', () => {
    const v = match(err('x'), {
      ok: () => '!',
      err: (e) => e.toUpperCase(),
    })
    expect(v).toBe('X')
  })

  it('handler return types unify into U', () => {
    const r: Result<number, string> = ok(1)
    const v = match<number, string, number | string>(r, {
      ok: () => 1,
      err: () => 'no',
    })
    const _: Equal<typeof v, number | string> = true
    void _
    expect(v).toBe(1)
  })
})
