import type { EffectEntry, EffectFn, Machine } from './defineMachine'
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
      result:
        | ({ type: string } & Record<string, unknown>)
        | { error: unknown }
        | null
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
  effects?: {
    [K in keyof S & string]?: EffectEntry<
      S[K],
      { [EK in keyof E & string]: { type: EK } & E[EK] }[keyof E & string]
    >
  }
  hydrated?: boolean
}

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

function resolveEffect(
  entry: EffectEntry<unknown, unknown> | undefined
): { run: EffectFn<unknown, unknown>; onHydrate: 'run' | 'skip' } | undefined {
  if (!entry) return undefined
  if (typeof entry === 'function') return { run: entry, onHydrate: 'run' }
  return { run: entry.run, onHydrate: entry.onHydrate ?? 'run' }
}

export function createMachine<S extends StatesMap, E extends EventsMap>(
  machine: Machine<S, E>,
  options: CreateMachineOptions<S, E> = {}
): Store<S, E> {
  const initial = options.initial ?? machine.initial
  const effects = (options.effects ?? machine.effects ?? {}) as Record<
    string,
    EffectEntry<unknown, unknown> | undefined
  >

  let currentName = initial.state.id as keyof S & string
  let currentContext = initial.context as S[keyof S & string]
  let currentAbort: AbortController | null = null
  let currentEffectId = 0
  let isHydratedEntry = options.hydrated === true

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

  const startEffectFor = (stateName: string, ctx: unknown, isHydrate: boolean): void => {
    const resolved = resolveEffect(effects[stateName])
    if (!resolved) return
    if (isHydrate && resolved.onHydrate === 'skip') return
    const controller = new AbortController()
    currentAbort = controller
    const myId = ++currentEffectId
    emit({ kind: 'effect-start', state: stateName, ts: Date.now() })
    let result: Promise<unknown> | unknown
    try {
      result = resolved.run(ctx, controller.signal)
    } catch (error) {
      emit({
        kind: 'effect-end',
        state: stateName,
        result: { error },
        aborted: false,
        ts: Date.now(),
      })
      return
    }
    Promise.resolve(result).then(
      (value) => {
        if (myId !== currentEffectId || disposed) {
          emit({
            kind: 'effect-end',
            state: stateName,
            result: (value ?? null) as never,
            aborted: true,
            ts: Date.now(),
          })
          return
        }
        emit({
          kind: 'effect-end',
          state: stateName,
          result: (value ?? null) as never,
          aborted: false,
          ts: Date.now(),
        })
        if (value !== null && value !== undefined) {
          queue.push(value as { type: string } & Record<string, unknown>)
          processQueue()
        }
      },
      (error: unknown) => {
        const aborted = myId !== currentEffectId || disposed
        emit({
          kind: 'effect-end',
          state: stateName,
          result: { error },
          aborted,
          ts: Date.now(),
        })
      }
    )
  }

  const stopCurrentEffect = (): void => {
    if (currentAbort) {
      currentAbort.abort()
      currentAbort = null
    }
    currentEffectId++
  }

  const processQueue = (): void => {
    if (processing) return
    processing = true
    try {
      while (queue.length > 0) {
        const event = queue.shift()!
        const transitions = (
          machine.transitions as Record<
            string,
            | Record<
                string,
                | {
                    target: StateToken<string, unknown>
                    guard?: (...a: any[]) => boolean
                    assign: (...a: any[]) => unknown
                  }
                | undefined
              >
            | undefined
          >
        )[currentName]
        const entry = transitions?.[event.type]
        if (!entry) {
          emit({
            kind: 'event-dropped',
            state: currentName,
            event,
            reason: 'no-handler',
          })
          warnOnce(
            `no-handler:${currentName}:${event.type}`,
            `event "${event.type}" has no handler in state "${currentName}".`
          )
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
        stopCurrentEffect()
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
        startEffectFor(currentName, currentContext, false)
      }
    } finally {
      processing = false
    }
  }

  // Start effect for the initial state, respecting `hydrated` flag.
  startEffectFor(currentName, currentContext, isHydratedEntry)
  isHydratedEntry = false

  return {
    getState: buildState,
    send(event) {
      if (disposed) {
        warnOnce(`send-after-dispose:${event.type}`, `send("${event.type}") after dispose() — ignored.`)
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
      if (disposed) return
      disposed = true
      stopCurrentEffect()
      listeners.clear()
      queue.length = 0
    },
  }
}
