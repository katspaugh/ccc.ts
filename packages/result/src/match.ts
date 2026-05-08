import type { Result } from './types'

export function match<T, E, U>(
  r: Result<T, E>,
  handlers: { ok: (value: T) => U; err: (error: E) => U },
): U {
  return r.ok ? handlers.ok(r.value) : handlers.err(r.error)
}
