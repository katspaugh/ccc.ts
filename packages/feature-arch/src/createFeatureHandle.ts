import type { FeatureHandle, FeatureImplementation } from './types'

export interface CreateFeatureHandleOptions<TImpl extends FeatureImplementation> {
  name: string
  useIsEnabled: () => boolean | undefined
  load: () => Promise<{ default: TImpl }>
}

/**
 * Creates a feature handle. The returned object is what consumers pass to
 * `useLoadFeature`. The handle itself is always bundled — the implementation
 * referenced by `load` is not.
 */
export function createFeatureHandle<TImpl extends FeatureImplementation>(
  options: CreateFeatureHandleOptions<TImpl>,
): FeatureHandle<TImpl> {
  return {
    name: options.name,
    useIsEnabled: options.useIsEnabled,
    load: options.load,
  }
}
