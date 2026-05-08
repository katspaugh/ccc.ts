# @ccc-ts/result

A tiny, dependency-free `Result<T, E>` with tree-shakeable operators.

## Install

```bash
pnpm add @ccc-ts/result
```

No peer dependencies. Works in any TypeScript ≥ 5 project (Node, browsers, workers, edge runtimes).

## At a glance

```ts
import { ok, err, map, andThen, match, fromPromise } from '@ccc-ts/result'

const parsed = map(parseAge('42'), (n) => n * 2)
//   ^? Result<number, ParseError>

const fetched = await fromPromise(fetch('/api'), (e) => ({ kind: 'network', cause: e }))
//   ^? Result<Response, { kind: 'network', cause: unknown }>

const message = match(parsed, {
  ok:  (n) => `got ${n}`,
  err: (e) => `oops: ${e.code}`,
})
```

## API

### Types

- `Ok<T> = { readonly ok: true; readonly value: T }`
- `Err<E> = { readonly ok: false; readonly error: E }`
- `Result<T, E = unknown> = Ok<T> | Err<E>`

### Constructors

- `ok(value)` — returns `Ok<T>`
- `err(error)` — returns `Err<E>`

### Predicates (type guards)

- `isOk(r)` — narrows to `Ok<T>`
- `isErr(r)` — narrows to `Err<E>`

### Transformations

- `map(r, fn)` — apply `fn` to the value if Ok
- `mapErr(r, fn)` — apply `fn` to the error if Err
- `andThen(r, fn)` — chain `fn: T → Result`; errors accumulate as `E | F`
- `orElse(r, fn)` — recover via `fn: E → Result`; values accumulate as `T | U`

When the input is the wrong arm, the input reference is returned unchanged.

### Unwrapping

- `unwrap(r)` — return `T`, or throw. If `E` is an `Error`, throws it directly (preserves stack); otherwise throws `UnwrapError` with the original on `.cause`.
- `unwrapOr(r, fallback)` — return `T` or `fallback`
- `unwrapOrElse(r, fn)` — return `T` or `fn(error)`

### Pattern match

- `match(r, { ok, err })` — exhaustive case analysis

### From

- `fromThrowable(fn, mapErr?)` — turn a throwing fn into a `Result`
- `fromPromise(promise, mapErr?)` — turn a Promise into `Promise<Result>`

## License

MIT
