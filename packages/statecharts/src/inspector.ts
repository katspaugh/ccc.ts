import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { Panel } from './inspector/Panel'
import {
  _resetRegistry,
  listMachines as registryListMachines,
  registerMachine,
  deregisterMachine,
} from './inspector/registry'

export function attachInspector(): () => void {
  const host = document.createElement('div')
  host.setAttribute('data-statecharts-inspector-host', '')
  document.body.appendChild(host)
  const root: Root = createRoot(host)
  flushSync(() => {
    root.render(createElement(Panel))
  })
  return () => {
    root.unmount()
    host.remove()
  }
}

export function listMachines(): ReturnType<typeof registryListMachines> {
  return registryListMachines()
}

export { registerMachine, deregisterMachine }

export function _resetInspector(): void {
  _resetRegistry()
  for (const host of Array.from(
    document.querySelectorAll('[data-statecharts-inspector-host]')
  )) {
    host.remove()
  }
}
