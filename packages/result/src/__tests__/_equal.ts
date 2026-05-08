/**
 * True iff `X` and `Y` are mutually assignable. Use as a compile-time test:
 *
 *   const _: Equal<typeof actual, ExpectedType> = true
 */
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false
