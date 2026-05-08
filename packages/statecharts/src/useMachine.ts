import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createMachine } from './createMachine'
import type { CreateMachineOptions, StoreState } from './createMachine'
import type { Machine } from './defineMachine'
import type { EventsMap, StatesMap } from './types'

export function useMachine<S extends StatesMap, E extends EventsMap>(
  machine: Machine<S, E>,
  options: CreateMachineOptions<S, E> = {}
): readonly [
  StoreState<S>,
  (event: { type: keyof E & string } & Record<string, unknown>) => void,
] {
  const initialOptionsRef = useRef(options)
  // Lazy create on first render; kept across re-renders. The same store
  // instance is reused across StrictMode's synchronous double-mount.
  const [store] = useState(() => createMachine(machine, initialOptionsRef.current))

  // Cache the last snapshot so useSyncExternalStore sees a stable reference
  // when the state hasn't actually changed (avoids the infinite-loop warning).
  const snapshotRef = useRef<StoreState<S>>(store.getState())

  // Track whether the component is logically "alive". This ref is set to true
  // on every effect-setup and false on every effect-cleanup. We defer the
  // actual dispose() into a microtask so that StrictMode's synchronous
  // cleanup→setup cycle can flip aliveRef back to true before the microtask
  // fires — preventing a premature dispose.
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      queueMicrotask(() => {
        if (!aliveRef.current) store.dispose()
      })
    }
  }, [store])

  const subscribe = useMemo(
    () => (cb: () => void) => {
      const unsub = store.subscribe((e) => {
        if (e.kind === 'transition') {
          // Eagerly update the cached snapshot so the next getSnapshot call
          // during re-render returns the new state.
          snapshotRef.current = store.getState()
          cb()
        }
      })
      return unsub
    },
    [store]
  )

  const getSnapshot = useMemo(
    () => () => snapshotRef.current,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store]
  )

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  // Stable send across renders.
  const send = useMemo(() => store.send.bind(store), [store])

  return [state, send] as const
}
