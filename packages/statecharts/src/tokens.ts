import type {
  EventConstructor,
  EventsMap,
  EventsOf,
  StatesMap,
  StatesOf,
  StateToken,
} from './types'

export function defineStates<S extends StatesMap>(spec: S): StatesOf<S> {
  const out = {} as Record<string, StateToken<string, unknown>>
  for (const name of Object.keys(spec)) {
    out[name] = Object.freeze({ id: name })
  }
  return Object.freeze(out) as StatesOf<S>
}

export function defineEvents<E extends EventsMap>(spec: E): EventsOf<E> {
  const out = {} as Record<string, EventConstructor<string, object>>
  for (const type of Object.keys(spec)) {
    const ctor = ((payload?: object) => {
      if (payload === undefined) return { type }
      return { type, ...payload }
    }) as unknown as EventConstructor<string, object>
    Object.defineProperty(ctor, 'type', { value: type, enumerable: true })
    out[type] = ctor
  }
  return Object.freeze(out) as EventsOf<E>
}
