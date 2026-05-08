import type { Result } from './types'
import { ok, err } from './constructors'

export function fromThrowable<T, E = unknown>(
  fn: () => T,
  mapErr?: (caught: unknown) => E,
): Result<T, E> {
  try {
    return ok(fn())
  } catch (e) {
    return err(mapErr ? mapErr(e) : (e as E))
  }
}

export function fromPromise<T, E = unknown>(
  promise: PromiseLike<T>,
  mapErr?: (caught: unknown) => E,
): Promise<Result<T, E>> {
  return Promise.resolve(promise).then(
    (value) => ok(value),
    (e) => err(mapErr ? mapErr(e) : (e as E)),
  )
}
