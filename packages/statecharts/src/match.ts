import type { StatesMap, StateValue } from './types'

/**
 * Extracts the context type for a given state name from a StateValue union.
 * E.g. CtxFor<StateValue<S>, 'Loading'> = S['Loading']
 */
type CtxFor<SV, K extends string> = SV extends { readonly name: K; readonly context: infer C }
  ? C
  : never

/**
 * Extracts all state name keys from a StateValue union.
 */
type StateNames<SV> = SV extends { readonly name: infer N extends string } ? N : never

export type MatchHandlers<S extends StatesMap, R> =
  | { [K in keyof S & string]: (ctx: S[K]) => R }
  | ({ [K in keyof S & string]?: (ctx: S[K]) => R } & {
      _: (state: StateValue<S>) => R
    })

type SVFullHandlers<SV, R> = {
  [K in StateNames<SV>]: (ctx: CtxFor<SV, K>) => R
}

type SVPartialHandlers<SV, R> = {
  [K in StateNames<SV>]?: (ctx: CtxFor<SV, K>) => R
} & { _: (state: SV) => R }

export function match<
  SV extends { readonly name: string; readonly context: unknown },
  const H extends SVFullHandlers<SV, unknown> | SVPartialHandlers<SV, unknown>,
>(
  state: SV,
  handlers: H
): H extends SVFullHandlers<SV, infer R>
  ? R
  : H extends SVPartialHandlers<SV, infer R>
    ? R
    : never {
  const handler = (handlers as Record<string, ((ctx: unknown) => unknown) | undefined>)[state.name]
  if (handler) return handler(state.context) as never
  const fallback = (handlers as { _?: (state: SV) => unknown })._
  if (fallback) return fallback(state) as never
  throw new Error(
    `[statecharts] match: no handler for state "${state.name}" and no fallback provided.`
  )
}
