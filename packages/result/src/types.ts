/**
 * Successful result. The success value lives at `value`.
 */
export type Ok<T> = { readonly ok: true; readonly value: T }

/**
 * Failure result. The error lives at `error`.
 */
export type Err<E> = { readonly ok: false; readonly error: E }

/**
 * Tagged-union result. Discriminate via `r.ok` to narrow.
 *
 * @example
 *   const r: Result<number, string> = ok(42)
 *   if (r.ok) console.log(r.value)
 *   else console.log(r.error)
 */
export type Result<T, E = unknown> = Ok<T> | Err<E>
