import type { Machine } from './defineMachine'
import type { StoreState } from './createMachine'
import type { EventsMap, StatesMap, StateToken } from './types'

export const SNAPSHOT_VERSION = 1

export type Snapshot<S extends StatesMap> = {
  readonly v: typeof SNAPSHOT_VERSION
  readonly name: keyof S & string
  readonly context: S[keyof S & string]
}

export type HydrateOptions<S extends StatesMap> = {
  parse?: { [K in keyof S & string]?: (raw: unknown) => S[K] | null }
}

export type HydratedInitial<S extends StatesMap> = {
  [K in keyof S & string]: {
    state: StateToken<K, S[K]>
    context: S[K]
  }
}[keyof S & string]

export function serialize<S extends StatesMap>(state: StoreState<S>): Snapshot<S> {
  return {
    v: SNAPSHOT_VERSION,
    name: state.name,
    context: state.context,
  }
}

export function hydrate<S extends StatesMap, E extends EventsMap>(
  machine: Machine<S, E>,
  raw: unknown,
  options: HydrateOptions<S> = {}
): HydratedInitial<S> | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as { v?: unknown; name?: unknown; context?: unknown }
  if (obj.v !== SNAPSHOT_VERSION) return null
  if (typeof obj.name !== 'string') return null
  const states = machine.states as Record<string, StateToken<string, unknown> | undefined>
  const token = states[obj.name]
  if (!token) return null
  const parse = options.parse?.[obj.name as keyof S & string]
  let context: unknown = obj.context
  if (parse) {
    context = parse(obj.context)
    if (context === null) return null
  }
  return {
    state: token as never,
    context: context as never,
  }
}
