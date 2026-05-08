import { describe, it, expect } from 'vitest'
import { createFeatureHandle } from '../createFeatureHandle'

describe('createFeatureHandle', () => {
  it('returns a handle that pass-through name, useIsEnabled, and load', () => {
    const useIsEnabled = () => true
    const load = async () => ({ default: {} })

    const handle = createFeatureHandle({
      name: 'my-feature',
      useIsEnabled,
      load,
    })

    expect(handle.name).toBe('my-feature')
    expect(handle.useIsEnabled).toBe(useIsEnabled)
    expect(handle.load).toBe(load)
  })

  it('preserves the implementation type via generics', () => {
    interface MyImpl {
      MyComponent: () => null
      myService: () => void
    }

    const handle = createFeatureHandle<MyImpl>({
      name: 'typed',
      useIsEnabled: () => true,
      load: async () => ({ default: { MyComponent: () => null, myService: () => {} } }),
    })

    // Type-only check: handle.load resolves to the typed implementation.
    expect(handle.name).toBe('typed')
  })
})
