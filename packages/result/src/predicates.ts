import type { Ok, Err, Result } from './types'

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
  return r.ok === true
}

export function isErr<T, E>(r: Result<T, E>): r is Err<E> {
  return r.ok === false
}
