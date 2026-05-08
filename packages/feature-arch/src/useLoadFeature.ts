'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FeatureHandle, FeatureImplementation, FeatureMeta, LoadedFeature } from './types'

type LoadResult<T> = { feature: T } | { error: Error } | undefined

function getFeature<T>(result: LoadResult<T>): T | undefined {
  return result && 'feature' in result ? result.feature : undefined
}

function getError<T>(result: LoadResult<T>): Error | undefined {
  return result && 'error' in result ? result.error : undefined
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

/**
 * Stable stub proxy for not-ready features. Naming convention:
 * - PascalCase prop → returns () => null (renders nothing)
 * - anything else   → returns undefined (will throw if called)
 *
 * Meta props read live from the ref, so the proxy reference is stable across
 * re-renders while values can change.
 */
function createStableStubProxy<T extends FeatureImplementation>(
  metaRef: React.RefObject<FeatureMeta>,
): T & FeatureMeta {
  const stubCache = new Map<string | symbol, unknown>()

  return new Proxy({} as T & FeatureMeta, {
    get(_, prop) {
      if (prop === '$isDisabled') return metaRef.current!.$isDisabled
      if (prop === '$isReady') return metaRef.current!.$isReady
      if (prop === '$error') return metaRef.current!.$error

      if (stubCache.has(prop)) return stubCache.get(prop)

      const name = String(prop)
      const first = name[0] ?? ''
      const stub = first >= 'A' && first <= 'Z' ? () => null : undefined
      stubCache.set(prop, stub)
      return stub
    },
  })
}

// ── Shared registry ─────────────────────────────────────────────────
type CachedLoadResult = { feature: unknown }

const featureCache = new Map<string, CachedLoadResult>()
const pendingLoads = new Map<string, Promise<CachedLoadResult>>()

function getCachedResult(name: string): CachedLoadResult | undefined {
  return featureCache.get(name)
}

function getOrCreateLoadPromise<T extends FeatureImplementation>(
  handle: FeatureHandle<T>,
): Promise<CachedLoadResult> {
  const existing = pendingLoads.get(handle.name)
  if (existing) return existing

  const promise = handle
    .load()
    .then((module) => {
      const result: CachedLoadResult = {
        feature: { name: handle.name, useIsEnabled: handle.useIsEnabled, ...module.default },
      }
      featureCache.set(handle.name, result)
      pendingLoads.delete(handle.name)
      return result
    })
    .catch((err) => {
      pendingLoads.delete(handle.name)
      throw err
    })

  pendingLoads.set(handle.name, promise)
  return promise
}

/** @internal Clears the shared registry. Exported for test cleanup only. */
export function _resetFeatureRegistry(): void {
  featureCache.clear()
  pendingLoads.clear()
}

// ── Hook ────────────────────────────────────────────────────────────

/**
 * Loads a feature lazily based on its handle. Always returns an object —
 * never null/undefined. When not ready or disabled, returns a stable stub
 * proxy whose properties resolve to safe no-op values.
 *
 * No intermediate "loading" state — the hook transitions directly from
 * not-ready to ready in a single re-render.
 */
export function useLoadFeature<T extends FeatureImplementation>(
  handle: FeatureHandle<T>,
): LoadedFeature<T> {
  const isEnabled = handle.useIsEnabled()

  const [loaded, setLoaded] = useState<LoadResult<LoadedFeature<T>>>(
    () =>
      (isEnabled === true ? getCachedResult(handle.name) : undefined) as unknown as LoadResult<LoadedFeature<T>>,
  )

  useEffect(() => {
    if (isEnabled !== true) return

    const cached = getCachedResult(handle.name)
    if (cached) {
      setLoaded(cached as unknown as LoadResult<LoadedFeature<T>>)
      return
    }

    let cancelled = false

    getOrCreateLoadPromise(handle).then(
      (result) => {
        if (cancelled) return
        setLoaded(result as unknown as LoadResult<LoadedFeature<T>>)
      },
      (err) => {
        if (cancelled) return
        setLoaded({ error: toError(err) })
      },
    )

    return () => {
      cancelled = true
    }
  }, [isEnabled, handle])

  const feature = getFeature(loaded)
  const $isDisabled = isEnabled === false
  const $isReady = !!feature
  const $error = getError(loaded)

  const metaRef = useRef<FeatureMeta>({ $isDisabled, $isReady, $error })
  metaRef.current = { $isDisabled, $isReady, $error }

  const stubProxy = useMemo(() => createStableStubProxy<T>(metaRef), [])

  return useMemo(() => {
    if (feature) {
      return { ...feature, $isDisabled, $isReady, $error } as LoadedFeature<T>
    }
    return stubProxy as unknown as LoadedFeature<T>
  }, [feature, stubProxy, $isDisabled, $isReady, $error])
}
