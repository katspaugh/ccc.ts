import type { Store, StoreEvent } from '../createMachine'

type AnyStore = Store<Record<string, object>, Record<string, object>>

export type RegisteredMachine = {
  id: string
  name: string
  store: AnyStore
}

let counter = 0
const registry = new Map<string, RegisteredMachine>()
const listeners = new Set<() => void>()
const eventLog = new Map<string, StoreEvent[]>()
const LOG_LIMIT = 100

export function registerMachine(name: string, store: AnyStore): string {
  const id = `m${++counter}`
  registry.set(id, { id, name, store })
  eventLog.set(id, [])
  const unsub = store.subscribe((e) => {
    const log = eventLog.get(id)
    if (!log) return
    log.push(e)
    if (log.length > LOG_LIMIT) log.splice(0, log.length - LOG_LIMIT)
    notify()
  })
  // Wrap dispose so we deregister and unsubscribe on dispose.
  const originalDispose = store.dispose.bind(store)
  store.dispose = () => {
    unsub()
    deregisterMachine(id)
    originalDispose()
  }
  notify()
  return id
}

export function deregisterMachine(id: string): void {
  registry.delete(id)
  eventLog.delete(id)
  notify()
}

export function listMachines(): ReadonlyArray<RegisteredMachine> {
  return Array.from(registry.values())
}

export function getEventLog(id: string): ReadonlyArray<StoreEvent> {
  return eventLog.get(id) ?? []
}

export function subscribeRegistry(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notify(): void {
  for (const l of listeners) l()
}

export function _resetRegistry(): void {
  registry.clear()
  eventLog.clear()
  listeners.clear()
  // Reset counter so IDs are deterministic across tests
  counter = 0
}
