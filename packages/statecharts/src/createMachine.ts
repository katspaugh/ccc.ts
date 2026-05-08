import type { Machine } from './defineMachine'
import type { EventsMap, StatesMap, StateToken } from './types'

export type StoreEvent =
  | {
      kind: 'transition'
      from: string
      to: string
      event: { type: string } & Record<string, unknown>
      contextBefore: unknown
      contextAfter: unknown
      ts: number
    }
  | { kind: 'effect-start'; state: string; ts: number }
  | {
      kind: 'effect-end'
      state: string
      result: ({ type: string } & Record<string, unknown>) | { error: unknown } | null
      aborted: boolean
      ts: number
    }
  | {
      kind: 'event-dropped'
      state: string
      event: { type: string } & Record<string, unknown>
      reason: 'no-handler' | 'guard-false'
    }

export type StoreState<S extends StatesMap> = {
  readonly name: keyof S & string
  readonly context: S[keyof S & string]
  is<N extends keyof S & string>(token: StateToken<N, S[N]>): boolean
}

export type Store<S extends StatesMap, E extends EventsMap> = {
  getState(): StoreState<S>
  send(event: { type: keyof E & string } & Record<string, unknown>): void
  subscribe(listener: (e: StoreEvent) => void): () => void
  dispose(): void
}

export type CreateMachineOptions<S extends StatesMap, E extends EventsMap> = {
  initial?: {
    [K in keyof S & string]: {
      state: StateToken<K, S[K]>
      context: S[K]
    }
  }[keyof S & string]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- E is used for type-level constraint only
type _EnsureE<E extends EventsMap> = E

const isDev = (() => {
  try {
    return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'
  } catch {
    return true
  }
})()

const warned = new Set<string>()
function warnOnce(key: string, msg: string): void {
  if (!isDev || warned.has(key)) return
  warned.add(key)
  // eslint-disable-next-line no-console
  console.warn(`[statecharts] ${msg}`)
}

type TransitionEntry = {
  target: StateToken<string, unknown>
  guard?: (...a: unknown[]) => boolean
  assign: (...a: unknown[]) => unknown
}

type TransitionsMap = Record<string, Record<string, TransitionEntry | undefined> | undefined>

export function createMachine<S extends StatesMap, E extends EventsMap>(
  machine: Machine<S, E>,
  options: CreateMachineOptions<S, E> = {}
): Store<S, E> {
  const initial = options.initial ?? machine.initial
  let currentName = initial.state.id as keyof S & string
  let currentContext = initial.context as S[keyof S & string]

  const listeners = new Set<(e: StoreEvent) => void>()
  const queue: Array<{ type: string } & Record<string, unknown>> = []
  let processing = false
  let inAssign = false
  let disposed = false

  const emit = (e: StoreEvent): void => {
    for (const l of listeners) l(e)
  }

  const buildState = (): StoreState<S> => {
    const name = currentName
    const context = currentContext
    return {
      name,
      context,
      is(token) {
        return token.id === name
      },
    }
  }

  const processQueue = (): void => {
    if (processing) return
    processing = true
    try {
      while (queue.length > 0) {
        const event = queue.shift()!
        const transitions = (machine.transitions as TransitionsMap)[currentName]
        const entry = transitions?.[event.type]
        if (!entry) {
          emit({
            kind: 'event-dropped',
            state: currentName,
            event,
            reason: 'no-handler',
          })
          continue
        }
        if (entry.guard && !entry.guard(currentContext, event)) {
          emit({
            kind: 'event-dropped',
            state: currentName,
            event,
            reason: 'guard-false',
          })
          continue
        }
        const fromName = currentName
        const fromCtx = currentContext
        inAssign = true
        let nextCtx: unknown
        try {
          nextCtx = entry.assign(currentContext, event)
        } finally {
          inAssign = false
        }
        currentName = entry.target.id as keyof S & string
        currentContext = nextCtx as S[keyof S & string]
        emit({
          kind: 'transition',
          from: fromName,
          to: currentName,
          event,
          contextBefore: fromCtx,
          contextAfter: currentContext,
          ts: Date.now(),
        })
      }
    } finally {
      processing = false
    }
  }

  return {
    getState: buildState,
    send(event) {
      if (disposed) {
        warnOnce(
          `send-after-dispose:${event.type}`,
          `send("${event.type}") after dispose() — ignored.`
        )
        return
      }
      if (inAssign) {
        if (isDev) {
          throw new Error(
            `[statecharts] send() called from inside assign(). Use an effect to emit follow-up events.`
          )
        }
        return
      }
      queue.push(event)
      processQueue()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      disposed = true
      listeners.clear()
      queue.length = 0
    },
  }
}
