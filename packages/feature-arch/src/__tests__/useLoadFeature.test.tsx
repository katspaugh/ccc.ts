import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createFeatureHandle } from '../createFeatureHandle'
import { useLoadFeature, _resetFeatureRegistry } from '../useLoadFeature'

interface TestImpl {
  TestWidget: () => null
  testService: () => string
}

beforeEach(() => {
  _resetFeatureRegistry()
})

describe('useLoadFeature — disabled', () => {
  it('returns stub proxy when useIsEnabled returns false', () => {
    const load = vi.fn(async () => ({ default: { TestWidget: () => null, testService: () => 'x' } }))
    const handle = createFeatureHandle<TestImpl>({
      name: 'disabled-test',
      useIsEnabled: () => false,
      load,
    })

    const { result } = renderHook(() => useLoadFeature(handle))

    expect(result.current.$isDisabled).toBe(true)
    expect(result.current.$isReady).toBe(false)
    expect(result.current.$error).toBeUndefined()
    expect(load).not.toHaveBeenCalled()
  })
})

describe('useLoadFeature — loading flag', () => {
  it('returns stub proxy when useIsEnabled returns undefined', () => {
    const load = vi.fn(async () => ({ default: { TestWidget: () => null, testService: () => 'x' } }))
    const handle = createFeatureHandle<TestImpl>({
      name: 'loading-test',
      useIsEnabled: () => undefined,
      load,
    })

    const { result } = renderHook(() => useLoadFeature(handle))

    expect(result.current.$isDisabled).toBe(false)
    expect(result.current.$isReady).toBe(false)
    expect(load).not.toHaveBeenCalled()
  })
})
