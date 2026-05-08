---
"@ccc-ts/result": minor
---

Initial release of `@ccc-ts/result`. Tagged-union `Result<T, E>` with
constructors (`ok`, `err`), predicates (`isOk`, `isErr`), transformations
(`map`, `mapErr`, `andThen`, `orElse`), unwrap helpers (`unwrap`,
`unwrapOr`, `unwrapOrElse`, `UnwrapError`), `match`, and from-throwable /
from-promise interop.
