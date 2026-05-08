# `@ccc-ts/result` — Design

**Date:** 2026-05-08
**Status:** Draft (awaiting user review before implementation planning)
**Suite:** Complexity Control Center (ccc.ts)

## Goal

Ship `@ccc-ts/result` as the second library in the ccc.ts suite: a tiny, dependency-free `Result<T, E>` type with a small set of tree-shakeable operators. Provides explicit error handling without the ambiguity of throw/catch.

## Non-goals

- Class-based fluent API (`ok(x).map(...).unwrap()`). The runtime is plain tagged-union objects + free functions.
- A separate `AsyncResult` / `ResultAsync` type. Async = `Promise<Result<T, E>>` plus a `fromPromise` helper.
- Side-effect helpers (`tap` / `tapErr`). Trivial to write at the call site; YAGNI for v0.1.0.
- Iteration / collection helpers (`combine`, `partition`, `all`). Defer until real demand surfaces.
- Migrating any existing repo to use this. That's downstream.
- Side-effects (logging, telemetry). The library never `console.error`s; the only thing that throws is `unwrap`.

## Package layout

Drops in alongside `feature-arch` and `eslint-plugin-feature-arch`. Same tooling: pnpm workspace member, tsup (ESM + CJS + .d.ts), vitest (node env), changesets-managed releases.

```
packages/result/                       # @ccc-ts/result
├── src/
│   ├── index.ts                       # public API barrel
│   ├── types.ts                       # Result, Ok, Err
│   ├── constructors.ts                # ok, err
│   ├── predicates.ts                  # isOk, isErr
│   ├── transform.ts                   # map, mapErr, andThen, orElse
│   ├── unwrap.ts                      # unwrap, unwrapOr, unwrapOrElse, UnwrapError
│   ├── match.ts                       # match
│   ├── from.ts                        # fromThrowable, fromPromise
│   └── __tests__/
│       ├── constructors.test.ts
│       ├── predicates.test.ts
│       ├── transform.test.ts
│       ├── unwrap.test.ts
│       ├── match.test.ts
│       └── from.test.ts
├── package.json                       # zero runtime deps, no peer deps
├── tsconfig.json                      # extends base; includes tooling configs
├── tsup.config.ts                     # NO 'use client' banner; target es2022
├── vitest.config.ts                   # environment: 'node'
└── README.md
```

No React peer dep. No DOM.

## Public API

### Types

```ts
export type Ok<T> = { readonly ok: true; readonly value: T }
export type Err<E> = { readonly ok: false; readonly error: E }
export type Result<T, E = unknown> = Ok<T> | Err<E>
```

The success and error keys are deeply readonly. Construction is the only mutation; helpers always return new Results.

### Constructors

```ts
export function ok<T>(value: T): Ok<T>
export function err<E>(error: E): Err<E>
```

### Predicates (type guards)

```ts
export function isOk<T, E>(r: Result<T, E>): r is Ok<T>
export function isErr<T, E>(r: Result<T, E>): r is Err<E>
```

### Transformations

```ts
export function map<T, U, E>(r: Result<T, E>, fn: (value: T) => U): Result<U, E>
export function mapErr<T, E, F>(r: Result<T, E>, fn: (error: E) => F): Result<T, F>
export function andThen<T, U, E, F>(r: Result<T, E>, fn: (value: T) => Result<U, F>): Result<U, E | F>
export function orElse<T, E, U, F>(r: Result<T, E>, fn: (error: E) => Result<U, F>): Result<T | U, F>
```

`andThen` widens the error union (`E | F`); `orElse` widens the value union (`T | U`). Chains accumulate possible errors precisely — that is the point of `Result`.

When the input is the wrong arm (e.g. `map` on an `Err`), the input reference is returned unchanged (no allocation, no copy).

### Unwrapping

```ts
export function unwrap<T, E>(r: Result<T, E>): T              // throws on Err
export function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T
export function unwrapOrElse<T, E>(r: Result<T, E>, fn: (error: E) => T): T
```

### Pattern match

```ts
export function match<T, E, U>(
  r: Result<T, E>,
  handlers: { ok: (value: T) => U; err: (error: E) => U },
): U
```

### Try / from

```ts
export function fromThrowable<T, E = unknown>(
  fn: () => T,
  mapErr?: (caught: unknown) => E,
): Result<T, E>

export function fromPromise<T, E = unknown>(
  promise: PromiseLike<T>,
  mapErr?: (caught: unknown) => E,
): Promise<Result<T, E>>
```

Both default `mapErr` to identity-cast (`(e) => e as E`); pass a real mapper to narrow `unknown` to a known error type.

### `UnwrapError`

```ts
export class UnwrapError extends Error {
  readonly cause: unknown            // the original Err.error
  constructor(cause: unknown)
}
```

Exported so consumers can `instanceof`-check it when they catch.

## `unwrap` semantics

`unwrap` is the only function that throws. It exists as the explicit, ugly escape hatch for "I'm sure this is Ok; if it's not, crash."

```ts
function unwrap<T, E>(r: Result<T, E>): T {
  if (r.ok) return r.value
  if (r.error instanceof Error) throw r.error    // preserve native stack
  throw new UnwrapError(r.error)                 // wrap primitives/objects
}
```

Why throw the original `Error` directly when one is present? Stack traces stay useful. Wrapping a real `Error` would lose its stack and confuse aggregators (Sentry, etc.) that group on the top frame.

`UnwrapError`'s message includes a safe stringification of `cause`:
- string → as-is
- object/array → `JSON.stringify` with a try/catch fallback to `String(value)` for cycles
- everything else → `String(value)`

## Naming

- Bare named exports — `import { ok, err, map, ... } from '@ccc-ts/result'`. No `Result.ok` namespace; the `Result` *type* is exported alongside the helpers.
- The success key is `value`; the error key is `error`. The discriminator is `ok` (boolean).

## Data flow

```
fromThrowable(fn) ────► Result<T, E>
fromPromise(p)    ────► Promise<Result<T, E>>

Result<T, E>
  │
  ├── isOk(r) / isErr(r)        type guards
  │
  ├── map(r, T → U)             T → U on Ok, pass-through Err
  ├── mapErr(r, E → F)          E → F on Err, pass-through Ok
  ├── andThen(r, T → Result)    chain on Ok, short-circuit Err
  ├── orElse(r, E → Result)     recover on Err, pass-through Ok
  │
  ├── unwrap(r)                 T or throw
  ├── unwrapOr(r, T)            T (always)
  ├── unwrapOrElse(r, E → T)    T (always)
  │
  └── match(r, { ok, err })     unified U
```

## Testing

Each source module has a sibling test in `src/__tests__/`. All files use vitest's `describe`/`it`/`expect`. No mocks, no DOM — pure value-in/value-out tests. ~32 test cases total.

### `constructors.test.ts`
1. `ok(42)` returns `{ ok: true, value: 42 }`.
2. `err('boom')` returns `{ ok: false, error: 'boom' }`.
3. Compile-time: `Ok<T>` and `Err<E>` are deeply readonly.

### `predicates.test.ts`
4. `isOk(ok(1))` true; `isOk(err('x'))` false.
5. `isErr(err('x'))` true; `isErr(ok(1))` false.
6. Compile-time: after `if (isOk(r))` the `r.value` is accessible (narrowing test).

### `transform.test.ts`
7. `map(ok(2), x => x * 3)` → `ok(6)`.
8. `map(err('x'), fn)` returns the same `Err` reference; `fn` not called.
9. `mapErr(err('x'), e => e.toUpperCase())` → `err('X')`.
10. `mapErr(ok(1), fn)` returns the same `Ok` reference; `fn` not called.
11. `andThen(ok(2), x => x > 0 ? ok(x) : err('neg'))` → `ok(2)`.
12. `andThen(ok(-1), x => x > 0 ? ok(x) : err('neg'))` → `err('neg')`.
13. `andThen(err('x'), fn)` short-circuits; same `Err` returned; `fn` not called.
14. `orElse` symmetric for the Err side (recovers on Err; pass-through on Ok).
15. Compile-time: `andThen` accumulates errors as `E | F`.

### `unwrap.test.ts`
16. `unwrap(ok(42))` → `42`.
17. `unwrap(err(new Error('boom')))` throws *that* Error (same reference).
18. `unwrap(err('boom'))` throws `UnwrapError` with `.cause === 'boom'` and message containing `'boom'`.
19. `unwrap(err({ code: 'X' }))` throws `UnwrapError` with `.cause === { code: 'X' }` and message containing JSON.
20. `unwrap(err(<circular obj>))` throws `UnwrapError` without crashing on `JSON.stringify`.
21. `unwrapOr(err('x'), 7)` → `7`; `unwrapOr(ok(3), 7)` → `3`.
22. `unwrapOrElse(err('x'), e => e.length)` → `1`.

### `match.test.ts`
23. `match(ok(2), { ok: x => x + 1, err: () => 0 })` → `3`.
24. `match(err('x'), { ok: () => '!', err: e => e.toUpperCase() })` → `'X'`.
25. Compile-time: handler return types unify into `U`.

### `from.test.ts`
26. `fromThrowable(() => 42)` → `ok(42)`.
27. `fromThrowable(() => { throw new Error('x') })` → `err(originalError)` (same reference).
28. `fromThrowable(() => { throw 'x' }, e => String(e))` → `err('x')`.
29. `await fromPromise(Promise.resolve(42))` → `ok(42)`.
30. `await fromPromise(Promise.reject(new Error('x')))` → `err(originalError)` (same reference).
31. `await fromPromise(Promise.reject('x'), String)` → `err('x')`.
32. `fromPromise` accepts a hand-rolled `PromiseLike` thenable.

Compile-time assertions use a small in-test helper:

```ts
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false
const _: Equal<typeof actual, ExpectedType> = true
```

## Build

`tsup.config.ts`:

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
})
```

No external deps to declare; no `'use client'` banner; no React.

## CI / release

Picked up automatically by the existing `.github/workflows/ci.yml` (matrix-runs `pnpm -r typecheck && pnpm -r build && pnpm -r test`). A changeset adding `@ccc-ts/result @ minor` cuts the initial release once the package lands on `main`.
