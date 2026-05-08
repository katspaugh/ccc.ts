import type {
  EventsMap,
  EventsOf,
  StatesMap,
  StatesOf,
  StateToken,
} from './types'

export type Transition<
  S extends StatesMap,
  E extends EventsMap,
  FromKey extends keyof S & string,
  EvtKey extends keyof E & string,
  ToKey extends keyof S & string = keyof S & string,
> = {
  target: StateToken<ToKey, S[ToKey]>
  guard?: (ctx: S[FromKey], event: { type: EvtKey } & E[EvtKey]) => boolean
  assign: (ctx: S[FromKey], event: { type: EvtKey } & E[EvtKey]) => S[ToKey]
}

export type TransitionsConfig<S extends StatesMap, E extends EventsMap> = {
  [FromKey in keyof S & string]?: {
    [EvtKey in keyof E & string]?: {
      [ToKey in keyof S & string]: Transition<S, E, FromKey, EvtKey, ToKey>
    }[keyof S & string]
  }
}

export type EffectFn<Ctx, EvtUnion> = (
  ctx: Ctx,
  signal: AbortSignal
) => Promise<EvtUnion | null> | EvtUnion | null

export type EffectEntry<Ctx, EvtUnion> =
  | EffectFn<Ctx, EvtUnion>
  | { run: EffectFn<Ctx, EvtUnion>; onHydrate?: 'run' | 'skip' }

export type EffectsConfig<S extends StatesMap, E extends EventsMap> = {
  [K in keyof S & string]?: EffectEntry<
    S[K],
    { [EK in keyof E & string]: { type: EK } & E[EK] }[keyof E & string]
  >
}

export type MachineConfig<S extends StatesMap, E extends EventsMap> = {
  states: StatesOf<S>
  events: EventsOf<E>
  initial: {
    [K in keyof S & string]: {
      state: StateToken<K, S[K]>
      context: S[K]
    }
  }[keyof S & string]
  transitions: TransitionsConfig<S, E>
  effects?: EffectsConfig<S, E>
  terminal?: ReadonlyArray<keyof S & string>
}

export type Machine<S extends StatesMap, E extends EventsMap> = MachineConfig<
  S,
  E
> & {
  readonly __states: S
  readonly __events: E
}

const isDev = (() => {
  try {
    return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'
  } catch {
    return true
  }
})()

export function defineMachine<S extends StatesMap, E extends EventsMap>(
  config: MachineConfig<S, E>
): Machine<S, E> {
  if (isDev) validateMachine(config)
  return config as Machine<S, E>
}

function validateMachine<S extends StatesMap, E extends EventsMap>(
  config: MachineConfig<S, E>
): void {
  const stateNames = Object.keys(config.states)
  const eventNames = new Set(Object.keys(config.events))
  const terminal = new Set(config.terminal ?? [])

  for (const stateName of stateNames) {
    const isTerminal = terminal.has(stateName as keyof S & string)
    const transitions = (config.transitions as Record<string, Record<string, unknown> | undefined>)[
      stateName
    ]
    const hasOutgoing = transitions !== undefined && Object.keys(transitions).length > 0

    if (!isTerminal && !hasOutgoing) {
      throw new Error(
        `[statecharts] state "${stateName}" has no outgoing transitions and is not listed in \`terminal\`. ` +
          `Add a transition or mark it terminal: ['${stateName}'].`
      )
    }

    if (transitions) {
      for (const evt of Object.keys(transitions)) {
        if (!eventNames.has(evt)) {
          throw new Error(
            `[statecharts] state "${stateName}" references unknown event "${evt}".`
          )
        }
      }
    }
  }
}
