# Feature Architecture Library — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@ccc-ts/feature-arch` (runtime) and `@ccc-ts/eslint-plugin-feature-arch` (lint rule) as the first two libraries of the ccc.ts suite, ported from `safe-wallet-monorepo/apps/web/src/features/__core__` with Safe-specific couplings replaced by injectable APIs.

**Architecture:** pnpm workspace monorepo. Two independently versioned packages under `@ccc-ts` scope. Runtime preserves the `__core__` semantics 1:1 (FeatureHandle, stub proxy, shared registry, single-transition state). ESLint plugin enforces the per-feature folder convention.

**Tech Stack:** TypeScript 5.x · pnpm workspaces · tsup (dual ESM/CJS + .d.ts) · vitest · React 18/19 (peer) · ESLint 8/9 (peer) · changesets · GitHub Actions.

**Reference spec:** `docs/superpowers/specs/2026-05-08-feature-architecture-design.md`

---

## File map

**Repo root:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.npmrc`
- Create: `.changeset/config.json`
- Create: `.changeset/README.md`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Modify: `README.md` (link to packages)

**`packages/feature-arch/`:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/index.ts`
- Create: `src/types.ts`
- Create: `src/createFeatureHandle.ts`
- Create: `src/useLoadFeature.ts`
- Create: `src/__tests__/createFeatureHandle.test.ts`
- Create: `src/__tests__/useLoadFeature.test.tsx`
- Create: `docs/feature-layout.md`
- Create: `README.md`

**`packages/eslint-plugin-feature-arch/`:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `src/index.ts`
- Create: `src/rules/no-feature-internals.ts`
- Create: `src/__tests__/no-feature-internals.test.ts`
- Create: `README.md`

---

## Task 1: Initialize git repo and ignore artifacts

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Initialize git**

```bash
cd /Users/ivan/Sites/ccc
git init -b main
```

- [ ] **Step 2: Write `.gitignore`**

```gitignore
# Dependencies
node_modules/

# Build output
dist/
*.tsbuildinfo

# Test output
coverage/

# Editor / OS
.DS_Store
*.log
.idea/
.vscode/

# Environment
.env
.env.local

# Turbo / cache
.turbo/
.cache/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: init git repo with .gitignore"
```

---

## Task 2: Root package.json, pnpm workspaces, base tsconfig, npmrc

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.npmrc`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "ccc-ts",
  "version": "0.0.0",
  "private": true,
  "description": "Complexity Control Center — libraries for minimizing and controlling complexity in large TypeScript applications.",
  "license": "MIT",
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm build && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.9",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 2: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Write `.npmrc`**

```
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 4: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "jsx": "react-jsx"
  }
}
```

- [ ] **Step 5: Install root devDependencies**

Run: `pnpm install`
Expected: creates `pnpm-lock.yaml`, no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml .npmrc tsconfig.base.json pnpm-lock.yaml
git commit -m "chore: set up pnpm workspace and base TS config"
```

---

## Task 3: Commit existing design spec

**Files:**
- Modify: (none — files already exist)

- [ ] **Step 1: Stage and commit the existing spec + plan**

```bash
git add README.md docs/superpowers/specs/2026-05-08-feature-architecture-design.md docs/superpowers/plans/2026-05-08-feature-architecture.md
git commit -m "docs: add feature-arch design spec and implementation plan"
```

---

## Task 4: Scaffold `@ccc-ts/feature-arch` package configs

**Files:**
- Create: `packages/feature-arch/package.json`
- Create: `packages/feature-arch/tsconfig.json`
- Create: `packages/feature-arch/tsup.config.ts`
- Create: `packages/feature-arch/vitest.config.ts`
- Create: `packages/feature-arch/vitest.setup.ts`
- Create: `packages/feature-arch/src/index.ts` (placeholder)

- [ ] **Step 1: Write `packages/feature-arch/package.json`**

```json
{
  "name": "@ccc-ts/feature-arch",
  "version": "0.0.0",
  "description": "Feature Architecture runtime: lazy-loaded, feature-flagged, isolated feature modules for React apps.",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.1.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "happy-dom": "^15.11.6",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tsup": "^8.3.5",
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Write `packages/feature-arch/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Write `packages/feature-arch/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: ['react', 'react-dom'],
  banner: {
    js: '"use client";',
  },
})
```

- [ ] **Step 4: Write `packages/feature-arch/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

- [ ] **Step 5: Write `packages/feature-arch/vitest.setup.ts`**

```ts
import '@testing-library/react'
```

- [ ] **Step 6: Write placeholder `packages/feature-arch/src/index.ts`**

```ts
export {}
```

- [ ] **Step 7: Install package deps**

Run from repo root: `pnpm install`
Expected: installs feature-arch devDeps, no errors.

- [ ] **Step 8: Verify build runs (empty bundle is fine)**

Run: `pnpm --filter @ccc-ts/feature-arch build`
Expected: tsup completes, `packages/feature-arch/dist/` contains `index.js`, `index.cjs`, `index.d.ts`.

- [ ] **Step 9: Commit**

```bash
git add packages/feature-arch/ pnpm-lock.yaml
git commit -m "chore(feature-arch): scaffold package configs and build"
```

---

## Task 5: Define types

**Files:**
- Modify: `packages/feature-arch/src/types.ts` (create)

- [ ] **Step 1: Write `packages/feature-arch/src/types.ts`**

```ts
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
```

- [ ] **Step 2: Update `packages/feature-arch/src/index.ts` to re-export types**

```ts
export type { FeatureHandle, FeatureImplementation, FeatureMeta, LoadedFeature } from './types'
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @ccc-ts/feature-arch typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/feature-arch/src/types.ts packages/feature-arch/src/index.ts
git commit -m "feat(feature-arch): define core types"
```

---

## Task 6: `createFeatureHandle` (TDD)

**Files:**
- Create: `packages/feature-arch/src/createFeatureHandle.ts`
- Create: `packages/feature-arch/src/__tests__/createFeatureHandle.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/feature-arch/src/__tests__/createFeatureHandle.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `pnpm --filter @ccc-ts/feature-arch test`
Expected: FAIL — `Cannot find module '../createFeatureHandle'`.

- [ ] **Step 3: Write `packages/feature-arch/src/createFeatureHandle.ts`**

```ts
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
```

- [ ] **Step 4: Re-run test — verify it passes**

Run: `pnpm --filter @ccc-ts/feature-arch test`
Expected: PASS, 2 tests.

- [ ] **Step 5: Update `src/index.ts`**

```ts
export type { FeatureHandle, FeatureImplementation, FeatureMeta, LoadedFeature } from './types'
export { createFeatureHandle } from './createFeatureHandle'
export type { CreateFeatureHandleOptions } from './createFeatureHandle'
```

- [ ] **Step 6: Commit**

```bash
git add packages/feature-arch/src/createFeatureHandle.ts packages/feature-arch/src/__tests__/createFeatureHandle.test.ts packages/feature-arch/src/index.ts
git commit -m "feat(feature-arch): add createFeatureHandle"
```

---

## Task 7: `useLoadFeature` — disabled and loading states (TDD)

**Files:**
- Create: `packages/feature-arch/src/useLoadFeature.ts`
- Create: `packages/feature-arch/src/__tests__/useLoadFeature.test.tsx`

- [ ] **Step 1: Write the failing tests**

`packages/feature-arch/src/__tests__/useLoadFeature.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run the tests — verify they fail**

Run: `pnpm --filter @ccc-ts/feature-arch test`
Expected: FAIL — `Cannot find module '../useLoadFeature'`.

- [ ] **Step 3: Write the initial `packages/feature-arch/src/useLoadFeature.ts`**

This first version handles disabled / loading only. It will be extended in subsequent tasks for the loaded path. Code is written with all later state machinery already in place to keep the diff focused on tests in later tasks.

```ts
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FeatureHandle, FeatureImplementation, FeatureMeta } from './types'

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
      const stub = name[0] >= 'A' && name[0] <= 'Z' ? () => null : undefined
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
): T & { name: string; useIsEnabled: () => boolean | undefined } & FeatureMeta {
  type LoadedFeatureT = T & { name: string; useIsEnabled: () => boolean | undefined }

  const isEnabled = handle.useIsEnabled()

  const [loaded, setLoaded] = useState<LoadResult<LoadedFeatureT>>(
    () => (isEnabled === true ? getCachedResult(handle.name) : undefined) as unknown as LoadResult<LoadedFeatureT>,
  )

  useEffect(() => {
    if (isEnabled !== true) return

    const cached = getCachedResult(handle.name)
    if (cached) {
      setLoaded(cached as unknown as LoadResult<LoadedFeatureT>)
      return
    }

    let cancelled = false

    getOrCreateLoadPromise(handle).then(
      (result) => {
        if (cancelled) return
        setLoaded(result as unknown as LoadResult<LoadedFeatureT>)
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
  const meta: FeatureMeta = {
    $isDisabled: isEnabled === false,
    $isReady: !!feature,
    $error: getError(loaded),
  }

  const metaRef = useRef<FeatureMeta>(meta)
  metaRef.current = meta

  const stubProxy = useMemo(() => createStableStubProxy<T>(metaRef), [])

  return useMemo(() => {
    if (feature) {
      return { ...feature, ...meta } as LoadedFeatureT & FeatureMeta
    }
    return stubProxy as unknown as LoadedFeatureT & FeatureMeta
  }, [feature, stubProxy, meta])
}
```

- [ ] **Step 4: Re-run tests — verify they pass**

Run: `pnpm --filter @ccc-ts/feature-arch test`
Expected: PASS, 4 tests total (2 createFeatureHandle + 2 useLoadFeature).

- [ ] **Step 5: Update `src/index.ts`**

```ts
export type { FeatureHandle, FeatureImplementation, FeatureMeta, LoadedFeature } from './types'
export { createFeatureHandle } from './createFeatureHandle'
export type { CreateFeatureHandleOptions } from './createFeatureHandle'
export { useLoadFeature, _resetFeatureRegistry } from './useLoadFeature'
```

- [ ] **Step 6: Commit**

```bash
git add packages/feature-arch/src/useLoadFeature.ts packages/feature-arch/src/__tests__/useLoadFeature.test.tsx packages/feature-arch/src/index.ts
git commit -m "feat(feature-arch): add useLoadFeature with disabled/loading paths"
```

---

## Task 8: Test the enabled-success path

**Files:**
- Modify: `packages/feature-arch/src/__tests__/useLoadFeature.test.tsx`

- [ ] **Step 1: Add the test (append to the existing file)**

```tsx
import { waitFor } from '@testing-library/react'

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
```

- [ ] **Step 2: Run tests — verify they pass**

Run: `pnpm --filter @ccc-ts/feature-arch test`
Expected: PASS, 5 tests.

- [ ] **Step 3: Commit**

```bash
git add packages/feature-arch/src/__tests__/useLoadFeature.test.tsx
git commit -m "test(feature-arch): cover useLoadFeature enabled-success path"
```

---

## Task 9: Test the stub proxy naming convention

**Files:**
- Modify: `packages/feature-arch/src/__tests__/useLoadFeature.test.tsx`

- [ ] **Step 1: Append to the test file**

```tsx
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
```

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @ccc-ts/feature-arch test`
Expected: PASS, 8 tests.

- [ ] **Step 3: Commit**

```bash
git add packages/feature-arch/src/__tests__/useLoadFeature.test.tsx
git commit -m "test(feature-arch): cover stub proxy naming convention"
```

---

## Task 10: Test stub proxy stable reference

**Files:**
- Modify: `packages/feature-arch/src/__tests__/useLoadFeature.test.tsx`

- [ ] **Step 1: Append to the test file**

```tsx
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
```

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @ccc-ts/feature-arch test`
Expected: PASS, 9 tests.

- [ ] **Step 3: Commit**

```bash
git add packages/feature-arch/src/__tests__/useLoadFeature.test.tsx
git commit -m "test(feature-arch): cover stable stub proxy reference"
```

---

## Task 11: Test shared registry deduplication

**Files:**
- Modify: `packages/feature-arch/src/__tests__/useLoadFeature.test.tsx`

- [ ] **Step 1: Append to the test file**

```tsx
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
```

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @ccc-ts/feature-arch test`
Expected: PASS, 11 tests.

- [ ] **Step 3: Commit**

```bash
git add packages/feature-arch/src/__tests__/useLoadFeature.test.tsx
git commit -m "test(feature-arch): cover shared registry dedupe and sync cache hit"
```

---

## Task 12: Test error path and `_resetFeatureRegistry`

**Files:**
- Modify: `packages/feature-arch/src/__tests__/useLoadFeature.test.tsx`

- [ ] **Step 1: Append to the test file**

```tsx
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
```

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @ccc-ts/feature-arch test`
Expected: PASS, 14 tests.

- [ ] **Step 3: Commit**

```bash
git add packages/feature-arch/src/__tests__/useLoadFeature.test.tsx
git commit -m "test(feature-arch): cover error paths and registry reset"
```

---

## Task 13: Test cancellation on unmount mid-load

**Files:**
- Modify: `packages/feature-arch/src/__tests__/useLoadFeature.test.tsx`

- [ ] **Step 1: Append to the test file**

```tsx
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
```

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @ccc-ts/feature-arch test`
Expected: PASS, 15 tests.

- [ ] **Step 3: Commit**

```bash
git add packages/feature-arch/src/__tests__/useLoadFeature.test.tsx
git commit -m "test(feature-arch): cover cancellation on unmount mid-load"
```

---

## Task 14: Verify build emits `'use client'` and run typecheck

**Files:** (verification only)

- [ ] **Step 1: Build the package**

Run: `pnpm --filter @ccc-ts/feature-arch build`
Expected: success, `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` produced.

- [ ] **Step 2: Verify `'use client'` directive is present in both ESM and CJS bundles**

Run:
```bash
head -1 packages/feature-arch/dist/index.js
head -1 packages/feature-arch/dist/index.cjs
```
Expected: each file's first line is `"use client";`.

If either is missing the directive, adjust `tsup.config.ts` `banner.js` to `'"use client";\n'` and rebuild.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @ccc-ts/feature-arch typecheck`
Expected: no errors.

- [ ] **Step 4: Commit if any config tweak was made**

```bash
git add packages/feature-arch/tsup.config.ts
git commit -m "chore(feature-arch): ensure 'use client' directive in build output"
```

(If no change was needed, skip the commit.)

---

## Task 15: Write feature-arch package docs

**Files:**
- Create: `packages/feature-arch/docs/feature-layout.md`
- Create: `packages/feature-arch/README.md`

- [ ] **Step 1: Write `packages/feature-arch/docs/feature-layout.md`**

```markdown
# Feature Layout Convention

`@ccc-ts/feature-arch` is most useful when each feature in your app follows
this folder structure. The companion ESLint plugin `@ccc-ts/eslint-plugin-feature-arch`
enforces it.

## Folder structure

```
src/features/{kebab-name}/
├── index.ts        # PUBLIC: FeatureHandle + types/constants only. Always bundled — keep tiny.
├── contract.ts     # PUBLIC type: the FeatureImplementation interface.
├── feature.ts      # LAZY: default-exports the implementation.
├── components/     # internal — PascalCase folders
├── hooks/          # internal
├── services/       # internal
└── store/          # internal (optional)
```

## The three files

### `index.ts` — public, always bundled

```ts
import { createFeatureHandle } from '@ccc-ts/feature-arch'
import { useFlag } from '@/lib/flags'
import type { WalletConnectImplementation } from './contract'

export const WalletConnectFeature = createFeatureHandle<WalletConnectImplementation>({
  name: 'walletconnect',
  useIsEnabled: () => useFlag('walletconnect'),
  load: () => import('./feature'),
})

export type { WalletConnectImplementation } from './contract'
```

### `contract.ts` — public type only, always bundled

```ts
import type WalletConnectWidget from './components/WalletConnectWidget'
import type { wcStore } from './store/wcStore'

export interface WalletConnectImplementation {
  WalletConnectWidget: typeof WalletConnectWidget   // PascalCase → component
  wcStore: typeof wcStore                            // camelCase  → service
}
```

### `feature.ts` — lazy, full implementation

```ts
import WalletConnectWidget from './components/WalletConnectWidget'
import { wcStore } from './store/wcStore'
import type { WalletConnectImplementation } from './contract'

const feature: WalletConnectImplementation = { WalletConnectWidget, wcStore }
export default feature
```

## Naming convention

The naming style of each property in the `FeatureImplementation` interface
controls the stub the proxy returns when the feature is not ready:

| Style       | Meaning              | Stub                                                                          |
| ----------- | -------------------- | ----------------------------------------------------------------------------- |
| PascalCase  | React component      | `() => null`                                                                  |
| camelCase   | Service / value      | `undefined` — throws if called, catching missing `$isReady` checks            |
| `useXxx`    | Hook                 | Must be exported from `index.ts`, never `feature.ts` (Rules of Hooks)         |

## Consuming a feature

```tsx
import { useLoadFeature } from '@ccc-ts/feature-arch'
import { WalletConnectFeature } from '@/features/walletconnect'

export function Header() {
  const wc = useLoadFeature(WalletConnectFeature)

  // Component renders null while not ready — no manual gating needed.
  return <wc.WalletConnectWidget />
}

export function ServiceUser() {
  const wc = useLoadFeature(WalletConnectFeature)

  // Services need explicit gating — calling an undefined stub throws.
  if (!wc.$isReady) return null
  wc.wcStore.doSomething()
}
```

Errors from `handle.load()` surface on `wc.$error`. Reporting is the consumer's
responsibility — the library never logs.
```

- [ ] **Step 2: Write `packages/feature-arch/README.md`**

```markdown
# @ccc-ts/feature-arch

Lazy-loaded, feature-flagged, isolated feature modules for React apps.

## Install

```bash
pnpm add @ccc-ts/feature-arch
```

Peer dependency: `react ^18 || ^19`.

## API

### `createFeatureHandle(options)`

```ts
createFeatureHandle<TImpl>({
  name: string,
  useIsEnabled: () => boolean | undefined,
  load: () => Promise<{ default: TImpl }>,
})
```

Returns a `FeatureHandle<TImpl>` — an always-bundled, ~100-byte object that
knows the feature's name, whether it's enabled, and how to load its
implementation.

### `useLoadFeature(handle)`

```ts
const feature = useLoadFeature(handle)
```

Returns an object that is **always non-null**. While the feature is not ready
or disabled, it is a stub proxy:

- PascalCase props → `() => null` (so JSX `<feature.Widget />` is safe)
- camelCase props → `undefined` (calling will throw, catching missing checks)

Once loaded, the implementation is mixed in alongside meta:

- `$isReady: boolean`
- `$isDisabled: boolean`
- `$error: Error | undefined`

The hook resolves cached features synchronously on first render and
deduplicates concurrent loads across consumers.

See `docs/feature-layout.md` for the recommended folder convention.

## License

MIT
```

- [ ] **Step 3: Commit**

```bash
git add packages/feature-arch/docs/feature-layout.md packages/feature-arch/README.md
git commit -m "docs(feature-arch): add README and feature-layout guide"
```

---

## Task 16: Scaffold `@ccc-ts/eslint-plugin-feature-arch` package

**Files:**
- Create: `packages/eslint-plugin-feature-arch/package.json`
- Create: `packages/eslint-plugin-feature-arch/tsconfig.json`
- Create: `packages/eslint-plugin-feature-arch/tsup.config.ts`
- Create: `packages/eslint-plugin-feature-arch/vitest.config.ts`
- Create: `packages/eslint-plugin-feature-arch/src/index.ts` (placeholder)

- [ ] **Step 1: Write `packages/eslint-plugin-feature-arch/package.json`**

```json
{
  "name": "@ccc-ts/eslint-plugin-feature-arch",
  "version": "0.0.0",
  "description": "ESLint rule that forbids importing feature internals — only the feature's index barrel is allowed.",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "eslint": "^8.0.0 || ^9.0.0"
  },
  "devDependencies": {
    "@types/eslint": "^9.6.1",
    "@typescript-eslint/rule-tester": "^8.15.0",
    "eslint": "^9.15.0",
    "tsup": "^8.3.5",
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  },
  "dependencies": {
    "@typescript-eslint/utils": "^8.15.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Write `packages/eslint-plugin-feature-arch/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["vitest/globals", "node"]
  },
  "include": ["src"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Write `packages/eslint-plugin-feature-arch/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: ['eslint'],
})
```

- [ ] **Step 4: Write `packages/eslint-plugin-feature-arch/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 5: Write placeholder `packages/eslint-plugin-feature-arch/src/index.ts`**

```ts
export {}
```

- [ ] **Step 6: Install**

Run from repo root: `pnpm install`

- [ ] **Step 7: Build and typecheck**

```bash
pnpm --filter @ccc-ts/eslint-plugin-feature-arch build
pnpm --filter @ccc-ts/eslint-plugin-feature-arch typecheck
```
Expected: both succeed.

- [ ] **Step 8: Commit**

```bash
git add packages/eslint-plugin-feature-arch/ pnpm-lock.yaml
git commit -m "chore(eslint-plugin-feature-arch): scaffold package configs"
```

---

## Task 17: Implement `no-feature-internals` rule (TDD)

**Files:**
- Create: `packages/eslint-plugin-feature-arch/src/rules/no-feature-internals.ts`
- Create: `packages/eslint-plugin-feature-arch/src/__tests__/no-feature-internals.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/eslint-plugin-feature-arch/src/__tests__/no-feature-internals.test.ts`:

```ts
import { RuleTester } from '@typescript-eslint/rule-tester'
import { afterAll, describe, it } from 'vitest'
import { rule } from '../rules/no-feature-internals'

RuleTester.afterAll = afterAll
RuleTester.it = it
RuleTester.itOnly = it.only
RuleTester.describe = describe

const ruleTester = new RuleTester()

ruleTester.run('no-feature-internals', rule, {
  valid: [
    // Importing the feature barrel is always allowed
    { code: "import x from '@/features/walletconnect'", filename: '/proj/src/app/page.tsx' },
    { code: "import x from '../../features/walletconnect'", filename: '/proj/src/app/page.tsx' },
    { code: "import x from '@/features/walletconnect/index'", filename: '/proj/src/app/page.tsx' },

    // Intra-feature relative imports are allowed
    {
      code: "import x from './components/Widget'",
      filename: '/proj/src/features/walletconnect/feature.ts',
    },
    {
      code: "import x from './contract'",
      filename: '/proj/src/features/walletconnect/index.ts',
    },

    // Importing a different module that happens to contain "features" is fine
    { code: "import x from '@/lib/features-helper'", filename: '/proj/src/app/page.tsx' },
  ],
  invalid: [
    {
      code: "import x from '@/features/walletconnect/components/Widget'",
      filename: '/proj/src/app/page.tsx',
      errors: [{ messageId: 'noInternals' }],
    },
    {
      code: "import x from '@/features/walletconnect/feature'",
      filename: '/proj/src/app/page.tsx',
      errors: [{ messageId: 'noInternals' }],
    },
    {
      code: "import x from '@/features/walletconnect/contract'",
      filename: '/proj/src/app/page.tsx',
      errors: [{ messageId: 'noInternals' }],
    },
    {
      code: "import x from '@/features/walletconnect/hooks/useWc'",
      filename: '/proj/src/app/page.tsx',
      errors: [{ messageId: 'noInternals' }],
    },
    {
      code: "import x from '@/features/walletconnect/services/WcWallet'",
      filename: '/proj/src/app/page.tsx',
      errors: [{ messageId: 'noInternals' }],
    },
    {
      code: "import x from '@/features/walletconnect/store/wcStore'",
      filename: '/proj/src/app/page.tsx',
      errors: [{ messageId: 'noInternals' }],
    },
    // Cross-feature import: feature A reaching into feature B's internals
    {
      code: "import x from '@/features/walletconnect/components/Widget'",
      filename: '/proj/src/features/swap/feature.ts',
      errors: [{ messageId: 'noInternals' }],
    },
  ],
})
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm --filter @ccc-ts/eslint-plugin-feature-arch test`
Expected: FAIL — `Cannot find module '../rules/no-feature-internals'`.

- [ ] **Step 3: Write `packages/eslint-plugin-feature-arch/src/rules/no-feature-internals.ts`**

```ts
import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils'

export type Options = [
  {
    featuresDir?: string
  }?,
]

export type MessageIds = 'noInternals'

const createRule = ESLintUtils.RuleCreator((name) => `https://github.com/ccc-ts/ccc/tree/main/packages/eslint-plugin-feature-arch#${name}`)

const INTERNAL_TAILS = new Set(['components', 'hooks', 'services', 'store', 'contract', 'feature'])

/**
 * Inspects a path string and returns the segments after the first occurrence
 * of `featuresDir`. Returns `undefined` if no such segment exists.
 *
 * Examples (featuresDir = 'features'):
 *   '@/features/walletconnect/components/Widget' → ['walletconnect', 'components', 'Widget']
 *   '../../features/swap'                        → ['swap']
 *   '@/lib/features-helper'                      → undefined
 */
function segmentsAfterFeaturesDir(path: string, featuresDir: string): string[] | undefined {
  const segments = path.split('/')
  const idx = segments.indexOf(featuresDir)
  if (idx === -1) return undefined
  return segments.slice(idx + 1)
}

/** Strips a trailing `.ts` / `.tsx` / `.js` / `.jsx` extension. */
function stripExt(s: string): string {
  return s.replace(/\.(t|j)sx?$/, '')
}

export const rule = createRule<Options, MessageIds>({
  name: 'no-feature-internals',
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid importing feature internals — only the feature index barrel is allowed.',
    },
    messages: {
      noInternals:
        "Import from the feature index only (e.g. '@/features/{name}'). Internal paths (components/, hooks/, services/, store/, contract, feature) are not allowed across feature boundaries.",
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          featuresDir: { type: 'string' },
        },
      },
    ],
  },
  defaultOptions: [{ featuresDir: 'features' }],
  create(context, [opts]) {
    const featuresDir = opts?.featuresDir ?? 'features'
    const filename = context.filename ?? context.getFilename()

    const importerSegs = segmentsAfterFeaturesDir(filename, featuresDir)
    const importerFeature = importerSegs && importerSegs.length > 0 ? importerSegs[0] : undefined

    function check(node: TSESTree.Node, sourceValue: string) {
      const segs = segmentsAfterFeaturesDir(sourceValue, featuresDir)
      if (!segs || segs.length === 0) return

      const targetFeature = segs[0]
      if (!targetFeature) return

      // Same feature: allowed
      if (importerFeature && importerFeature === targetFeature) return

      // Just the feature root, or explicit /index — allowed
      const tail = segs.slice(1)
      if (tail.length === 0) return
      if (tail.length === 1 && stripExt(tail[0]!) === 'index') return

      const head = stripExt(tail[0]!)
      if (INTERNAL_TAILS.has(head)) {
        context.report({ node, messageId: 'noInternals' })
      }
    }

    return {
      ImportDeclaration(node) {
        check(node, node.source.value)
      },
      ExportAllDeclaration(node) {
        if (node.source) check(node, node.source.value)
      },
      ExportNamedDeclaration(node) {
        if (node.source) check(node, node.source.value)
      },
    }
  },
})
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `pnpm --filter @ccc-ts/eslint-plugin-feature-arch test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/eslint-plugin-feature-arch/src/rules/no-feature-internals.ts packages/eslint-plugin-feature-arch/src/__tests__/no-feature-internals.test.ts
git commit -m "feat(eslint-plugin-feature-arch): implement no-feature-internals rule"
```

---

## Task 18: Test custom `featuresDir` option

**Files:**
- Modify: `packages/eslint-plugin-feature-arch/src/__tests__/no-feature-internals.test.ts`

- [ ] **Step 1: Append a second `ruleTester.run` block at the bottom of the test file**

```ts
ruleTester.run('no-feature-internals (custom featuresDir)', rule, {
  valid: [
    {
      code: "import x from '@/modules/walletconnect'",
      filename: '/proj/src/app/page.tsx',
      options: [{ featuresDir: 'modules' }],
    },
    // 'features' segment in path is no longer special
    {
      code: "import x from '@/features/walletconnect/components/Widget'",
      filename: '/proj/src/app/page.tsx',
      options: [{ featuresDir: 'modules' }],
    },
  ],
  invalid: [
    {
      code: "import x from '@/modules/walletconnect/components/Widget'",
      filename: '/proj/src/app/page.tsx',
      options: [{ featuresDir: 'modules' }],
      errors: [{ messageId: 'noInternals' }],
    },
  ],
})
```

- [ ] **Step 2: Run tests — verify they pass**

Run: `pnpm --filter @ccc-ts/eslint-plugin-feature-arch test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/eslint-plugin-feature-arch/src/__tests__/no-feature-internals.test.ts
git commit -m "test(eslint-plugin-feature-arch): cover custom featuresDir option"
```

---

## Task 19: Plugin entry, recommended config, and README

**Files:**
- Modify: `packages/eslint-plugin-feature-arch/src/index.ts`
- Create: `packages/eslint-plugin-feature-arch/README.md`

- [ ] **Step 1: Replace `packages/eslint-plugin-feature-arch/src/index.ts`**

```ts
import { rule as noFeatureInternals } from './rules/no-feature-internals'

const plugin = {
  meta: { name: '@ccc-ts/eslint-plugin-feature-arch' },
  rules: {
    'no-feature-internals': noFeatureInternals,
  },
  configs: {} as Record<string, unknown>,
}

plugin.configs = {
  // ESLint 8 (legacy)
  recommended: {
    plugins: ['@ccc-ts/feature-arch'],
    rules: {
      '@ccc-ts/feature-arch/no-feature-internals': 'error',
    },
  },
  // ESLint 9 (flat config)
  'flat/recommended': {
    plugins: { '@ccc-ts/feature-arch': plugin },
    rules: {
      '@ccc-ts/feature-arch/no-feature-internals': 'error',
    },
  },
}

export default plugin
export const rules = plugin.rules
```

- [ ] **Step 2: Write `packages/eslint-plugin-feature-arch/README.md`**

```markdown
# @ccc-ts/eslint-plugin-feature-arch

ESLint rule for the `@ccc-ts/feature-arch` folder convention.

## Install

```bash
pnpm add -D @ccc-ts/eslint-plugin-feature-arch
```

Peer dependency: `eslint ^8 || ^9`.

## Usage (flat config, ESLint 9)

```js
import featureArch from '@ccc-ts/eslint-plugin-feature-arch'

export default [
  featureArch.configs['flat/recommended'],
]
```

## Usage (legacy, ESLint 8)

```json
{
  "plugins": ["@ccc-ts/feature-arch"],
  "extends": ["plugin:@ccc-ts/feature-arch/recommended"]
}
```

## Rule: `no-feature-internals`

Forbids importing internals of a feature folder from outside that feature.
Only the feature's index barrel is a valid public import.

### Forbidden (across feature boundaries)
- `**/features/*/components/**`
- `**/features/*/hooks/**`
- `**/features/*/services/**`
- `**/features/*/store/**`
- `**/features/*/contract`
- `**/features/*/feature`

### Allowed
- `**/features/*` (resolves to `index.ts`)
- Anything inside the same feature folder.

### Options

```jsonc
{
  "rules": {
    "@ccc-ts/feature-arch/no-feature-internals": [
      "error",
      { "featuresDir": "features" }
    ]
  }
}
```

- `featuresDir` (default `"features"`): the directory name used for features
  in your project. Use `"modules"`, `"domains"`, etc., as needed.

## License

MIT
```

- [ ] **Step 3: Build, typecheck, and run tests**

```bash
pnpm --filter @ccc-ts/eslint-plugin-feature-arch build
pnpm --filter @ccc-ts/eslint-plugin-feature-arch typecheck
pnpm --filter @ccc-ts/eslint-plugin-feature-arch test
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add packages/eslint-plugin-feature-arch/src/index.ts packages/eslint-plugin-feature-arch/README.md
git commit -m "feat(eslint-plugin-feature-arch): plugin entry and README"
```

---

## Task 20: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm -r typecheck
      - run: pnpm -r build
      - run: pnpm -r test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add build/test workflow"
```

---

## Task 21: Changesets and release workflow

**Files:**
- Create: `.changeset/config.json`
- Create: `.changeset/README.md`
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Initialize changesets**

Run: `pnpm changeset init`
Expected: creates `.changeset/config.json` and `.changeset/README.md`. If the files already exist from this command, skip to Step 2.

- [ ] **Step 2: Edit `.changeset/config.json`**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.5/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 3: Write `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile
      - run: pnpm -r build

      - name: Create release PR or publish
        uses: changesets/action@v1
        with:
          publish: pnpm release
          version: pnpm version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 4: Add an initial changeset for both packages**

Create `.changeset/initial-release.md`:

```markdown
---
"@ccc-ts/feature-arch": minor
"@ccc-ts/eslint-plugin-feature-arch": minor
---

Initial release. Feature Architecture runtime (`createFeatureHandle`,
`useLoadFeature`) and the companion ESLint rule `no-feature-internals`.
```

- [ ] **Step 5: Commit**

```bash
git add .changeset/ .github/workflows/release.yml
git commit -m "ci: add changesets and release workflow"
```

---

## Task 22: Update root README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md`**

```markdown
# Complexity Control Center (ccc.ts)

A set of libraries for minimizing and controlling complexity in large
TypeScript applications.

## Packages

| Package                                         | Description                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| [`@ccc-ts/feature-arch`](packages/feature-arch) | Lazy-loaded, feature-flagged, isolated feature modules for React apps.               |
| [`@ccc-ts/eslint-plugin-feature-arch`](packages/eslint-plugin-feature-arch) | ESLint rule enforcing the feature-arch folder convention. |

Planned:

- `@ccc-ts/result` — `Result<T, E>` type.
- `@ccc-ts/statecharts` — state-chart implementation.

## Development

```bash
pnpm install
pnpm -r build
pnpm -r test
```

## License

MIT
```

- [ ] **Step 2: Final verification — run everything**

```bash
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm -r build
pnpm -r test
```
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update root README with package overview"
```

---

## Summary

22 tasks total. After Task 22 the repo has:

- A working pnpm workspace with two publishable packages.
- Full TDD coverage of the runtime (15+ tests) and ESLint rule (10+ test cases).
- Verified `'use client'` build output for Next.js compatibility.
- CI on push/PR and changesets-driven release.
- Documentation: per-feature folder convention, package READMEs, root README.

Subsequent libraries (`@ccc-ts/result`, `@ccc-ts/statecharts`) drop into `packages/` next to the existing two and reuse the same tooling.
