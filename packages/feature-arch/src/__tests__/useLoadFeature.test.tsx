import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
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

describe('useLoadFeature — enabled and successful', () => {
  it('loads the feature and exposes the implementation', async () => {
    const TestWidget = () => null
    const testService = () => 'hello'
    const handle = createFeatureHandle<TestImpl>({
      name: 'success-test',
      useIsEnabled: () => true,
      load: async () => ({ default: { TestWidget, testService } }),
    })

    const { result } = renderHook(() => useLoadFeature(handle))

    expect(result.current.$isReady).toBe(false)

    await waitFor(() => expect(result.current.$isReady).toBe(true))

    expect(result.current.$isDisabled).toBe(false)
    expect(result.current.$error).toBeUndefined()
    expect(result.current.TestWidget).toBe(TestWidget)
    expect(result.current.testService()).toBe('hello')
    expect(result.current.name).toBe('success-test')
  })
})

describe('useLoadFeature — stub proxy', () => {
  it('returns () => null for PascalCase props', () => {
    const handle = createFeatureHandle<TestImpl>({
      name: 'stub-pascal',
      useIsEnabled: () => false,
      load: async () => ({ default: { TestWidget: () => null, testService: () => 'x' } }),
    })

    const { result } = renderHook(() => useLoadFeature(handle))

    expect(typeof result.current.TestWidget).toBe('function')
    expect(result.current.TestWidget()).toBeNull()
  })

  it('returns undefined for camelCase props', () => {
    const handle = createFeatureHandle<TestImpl>({
      name: 'stub-camel',
      useIsEnabled: () => false,
      load: async () => ({ default: { TestWidget: () => null, testService: () => 'x' } }),
    })

    const { result } = renderHook(() => useLoadFeature(handle))

    expect(result.current.testService).toBeUndefined()
  })

  it('reads meta props from the ref so values stay current', () => {
    let isEnabled: boolean | undefined = false
    const handle = createFeatureHandle<TestImpl>({
      name: 'stub-meta',
      useIsEnabled: () => isEnabled,
      load: async () => ({ default: { TestWidget: () => null, testService: () => 'x' } }),
    })

    const { result, rerender } = renderHook(() => useLoadFeature(handle))

    expect(result.current.$isDisabled).toBe(true)
    expect(result.current.$isReady).toBe(false)

    isEnabled = undefined
    rerender()

    expect(result.current.$isDisabled).toBe(false)
    expect(result.current.$isReady).toBe(false)
  })
})

describe('useLoadFeature — stable proxy reference', () => {
  it('returns the same proxy reference across re-renders while not ready', () => {
    const handle = createFeatureHandle<TestImpl>({
      name: 'stable-ref',
      useIsEnabled: () => false,
      load: async () => ({ default: { TestWidget: () => null, testService: () => 'x' } }),
    })

    const { result, rerender } = renderHook(() => useLoadFeature(handle))

    const first = result.current
    rerender()
    const second = result.current

    expect(second).toBe(first)
  })
})
