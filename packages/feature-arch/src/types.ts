/**
 * Feature implementation: the lazy-loaded part of a feature.
 *
 * Property naming determines the stub the proxy returns when not ready:
 * - PascalCase  → React component (stub renders null)
 * - useSomething → hook (NOT stubbed; gate the consuming component on $isReady)
 * - camelCase   → service/value (stub is undefined; will throw on call → catches missing $isReady checks)
 */
export interface FeatureImplementation {}

/**
 * Always-bundled handle for a feature. Tiny (~100 bytes after gzip).
 */
export interface FeatureHandle<TImpl extends FeatureImplementation = FeatureImplementation> {
  /** Unique feature identifier used for registry lookup. */
  readonly name: string

  /**
   * Feature flag hook. Caller-supplied; called unconditionally on each render.
   *
   * @returns true if enabled, false if disabled, undefined if still loading.
   */
  useIsEnabled: () => boolean | undefined

  /**
   * Lazy loader for the full implementation. Bundler-agnostic — caller decides
   * the import path and any bundler hints.
   */
  load: () => Promise<{ default: TImpl }>
}

/**
 * Meta properties added to the loaded feature object. Prefixed with `$` to
 * avoid collisions with feature-defined exports.
 */
export interface FeatureMeta {
  /** True if the feature flag is `false`. */
  $isDisabled: boolean
  /** True when the feature is loaded and ready to use. */
  $isReady: boolean
  /** Error if loading failed. */
  $error: Error | undefined
}

/**
 * Type of the object returned by `useLoadFeature`. Includes the implementation,
 * the handle's identity, and meta state.
 */
export type LoadedFeature<TImpl extends FeatureImplementation> = TImpl & {
  name: string
  useIsEnabled: () => boolean | undefined
} & FeatureMeta
