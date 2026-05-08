import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import {
  getEventLog,
  listMachines,
  subscribeRegistry,
  type RegisteredMachine,
} from './registry'
import type { StoreEvent } from '../createMachine'

export function Panel(): ReactElement {
  const [, force] = useState(0)
  useEffect(() => subscribeRegistry(() => force((n) => n + 1)), [])
  const machines = listMachines()
  return (
    <div
      data-statecharts-inspector=""
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 2147483647,
        maxWidth: 360,
        maxHeight: '50vh',
        overflow: 'auto',
        background: '#111',
        color: '#eee',
        font: '12px ui-monospace, SFMono-Regular, monospace',
        padding: 8,
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>statecharts</div>
      {machines.length === 0 ? (
        <div style={{ opacity: 0.6 }}>no machines mounted</div>
      ) : (
        machines.map((m) => <MachineView key={m.id} machine={m} />)
      )}
    </div>
  )
}

function MachineView({ machine }: { machine: RegisteredMachine }): ReactElement {
  const state = machine.store.getState()
  const log = getEventLog(machine.id)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: '#9cf' }}>
        {machine.name} <span style={{ opacity: 0.6 }}>· {state.name}</span>
      </div>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(state.context, null, 2)}
      </pre>
      <details>
        <summary style={{ cursor: 'pointer', opacity: 0.7 }}>
          log ({log.length})
        </summary>
        <ol style={{ paddingLeft: 16, margin: 0 }}>
          {log.slice(-20).map((e, i) => (
            <li key={i}>{summarizeEvent(e)}</li>
          ))}
        </ol>
      </details>
    </div>
  )
}

function summarizeEvent(e: StoreEvent): string {
  switch (e.kind) {
    case 'transition':
      return `→ ${e.from} → ${e.to} (${e.event.type})`
    case 'effect-start':
      return `effect start: ${e.state}`
    case 'effect-end':
      return `effect end: ${e.state}${e.aborted ? ' [aborted]' : ''}`
    case 'event-dropped':
      return `dropped: ${e.event.type} (${e.reason})`
  }
}
