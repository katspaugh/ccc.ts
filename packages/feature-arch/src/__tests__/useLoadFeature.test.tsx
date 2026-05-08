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

describe('useLoadFeature — shared registry', () => {
  it('dedupes concurrent loads of the same handle', async () => {
    const TestWidget = () => null
    const testService = () => 'shared'
    const load = vi.fn(async () => ({ default: { TestWidget, testService } }))

    const handle = createFeatureHandle<TestImpl>({
      name: 'shared-dedupe',
      useIsEnabled: () => true,
      load,
    })

    const { result: r1 } = renderHook(() => useLoadFeature(handle))
    const { result: r2 } = renderHook(() => useLoadFeature(handle))

    await waitFor(() => expect(r1.current.$isReady).toBe(true))
    await waitFor(() => expect(r2.current.$isReady).toBe(true))

    expect(load).toHaveBeenCalledTimes(1)
    expect(r1.current.testService()).toBe('shared')
    expect(r2.current.testService()).toBe('shared')
  })

  it('returns cached result synchronously on first render after another consumer resolved', async () => {
    const handle = createFeatureHandle<TestImpl>({
      name: 'sync-cache-hit',
      useIsEnabled: () => true,
      load: async () => ({ default: { TestWidget: () => null, testService: () => 'cached' } }),
    })

    const { result: first } = renderHook(() => useLoadFeature(handle))
    await waitFor(() => expect(first.current.$isReady).toBe(true))

    const { result: second } = renderHook(() => useLoadFeature(handle))
    expect(second.current.$isReady).toBe(true)
    expect(second.current.testService()).toBe('cached')
  })
})

describe('useLoadFeature — errors', () => {
  it('exposes load failures via $error and does not cache the error', async () => {
    let attempts = 0
    const handle = createFeatureHandle<TestImpl>({
      name: 'error-test',
      useIsEnabled: () => true,
      load: async () => {
        attempts++
        throw new Error('boom')
      },
    })

    const { result, unmount } = renderHook(() => useLoadFeature(handle))

    await waitFor(() => expect(result.current.$error).toBeInstanceOf(Error))
    expect(result.current.$error?.message).toBe('boom')
    expect(result.current.$isReady).toBe(false)

    unmount()

    const { result: retry } = renderHook(() => useLoadFeature(handle))
    await waitFor(() => expect(retry.current.$error).toBeInstanceOf(Error))
    expect(attempts).toBe(2)
  })

  it('coerces non-Error rejections to Error', async () => {
    const handle = createFeatureHandle<TestImpl>({
      name: 'non-error-reject',
      useIsEnabled: () => true,
      load: async () => {
        throw 'string-rejection'
      },
    })

    const { result } = renderHook(() => useLoadFeature(handle))
    await waitFor(() => expect(result.current.$error).toBeInstanceOf(Error))
    expect(result.current.$error?.message).toBe('string-rejection')
  })
})

describe('_resetFeatureRegistry', () => {
  it('clears cache so a subsequent mount triggers a fresh load', async () => {
    const load = vi.fn(async () => ({ default: { TestWidget: () => null, testService: () => 'v' } }))
    const handle = createFeatureHandle<TestImpl>({
      name: 'reset-test',
      useIsEnabled: () => true,
      load,
    })

    const { result: first } = renderHook(() => useLoadFeature(handle))
    await waitFor(() => expect(first.current.$isReady).toBe(true))
    expect(load).toHaveBeenCalledTimes(1)

    _resetFeatureRegistry()

    const { result: second } = renderHook(() => useLoadFeature(handle))
    await waitFor(() => expect(second.current.$isReady).toBe(true))
    expect(load).toHaveBeenCalledTimes(2)
  })
})

describe('useLoadFeature — cancellation', () => {
  it('does not setState after unmount mid-load', async () => {
    let resolveLoad: ((v: { default: TestImpl }) => void) | undefined
    const loadPromise = new Promise<{ default: TestImpl }>((resolve) => {
      resolveLoad = resolve
    })

    const handle = createFeatureHandle<TestImpl>({
      name: 'cancel-test',
      useIsEnabled: () => true,
      load: () => loadPromise,
    })

    const { result, unmount } = renderHook(() => useLoadFeature(handle))
    expect(result.current.$isReady).toBe(false)

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    unmount()
    resolveLoad!({ default: { TestWidget: () => null, testService: () => 'late' } })

    // Allow microtasks to flush
    await new Promise((r) => setTimeout(r, 0))

    // No "Can't perform a React state update on an unmounted component" warning
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
