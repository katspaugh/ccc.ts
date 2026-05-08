import type { Result } from './types'
import { ok, err } from './constructors'

export function map<T, U, E>(r: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return r.ok ? ok(fn(r.value)) : r
}

export function mapErr<T, E, F>(r: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return r.ok ? r : err(fn(r.error))
}

export function andThen<T, U, E, F>(
  r: Result<T, E>,
  fn: (value: T) => Result<U, F>,
): Result<U, E | F> {
  return r.ok ? fn(r.value) : r
}

export function orElse<T, E, U, F>(
  r: Result<T, E>,
  fn: (error: E) => Result<U, F>,
): Result<T | U, F> {
  return r.ok ? r : fn(r.error)
}
