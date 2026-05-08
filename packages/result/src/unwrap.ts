import type { Result } from './types'

/**
 * Thrown by `unwrap` when the input is an Err whose error is not an `Error`.
 * `cause` holds the original Err.error.
 */
export class UnwrapError extends Error {
  readonly cause: unknown

  constructor(cause: unknown) {
    super(`Result.unwrap on Err: ${formatCause(cause)}`)
    this.name = 'UnwrapError'
    this.cause = cause
  }
}

function formatCause(value: unknown): string {
  if (typeof value === 'string') return value
  if (value !== null && (typeof value === 'object' || Array.isArray(value))) {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export function unwrap<T, E>(r: Result<T, E>): T {
  if (r.ok) return r.value
  if (r.error instanceof Error) throw r.error
  throw new UnwrapError(r.error)
}

export function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T {
  return r.ok ? r.value : fallback
}

export function unwrapOrElse<T, E>(r: Result<T, E>, fn: (error: E) => T): T {
  return r.ok ? r.value : fn(r.error)
}
