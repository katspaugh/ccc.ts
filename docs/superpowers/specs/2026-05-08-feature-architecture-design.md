# Feature Architecture Library — Design

**Date:** 2026-05-08
**Status:** Draft (awaiting user review before implementation planning)
**Suite:** Complexity Control Center (ccc.ts)

## Goal

Extract the "Feature Architecture" pattern from `safe-wallet-monorepo`'s `apps/web/src/features/__core__/` into a reusable, framework-agnostic-where-possible library published from this repo. Drop Safe-specific couplings (`useHasFeature`, `FEATURES` enum, `logError`, webpack magic comments). Preserve the runtime semantics 1:1 so `safe-wallet-monorepo` can later switch to the published package via a thin shim.

This is the first library in the ccc.ts suite. Future libraries (`@ccc-ts/result`, `@ccc-ts/statecharts`) will follow the same monorepo conventions but are out of scope for this design.

## Non-goals

- Codemod / scaffolding CLI for new features.
- Compliance assessor (the `FeatureMigrationAssessment` from the original spec).
- Migrating `safe-wallet-monorepo` to consume the published package — that is a separate downstream task.
- Supporting non-React frameworks. React-only, but not Next.js-coupled at the package level.
- Bundler-specific helpers (no webpack magic, no `next/dynamic` wrappers). The caller controls the dynamic import.

## Repo layout

```
ccc/
├── package.json              # private root, pnpm workspaces
├── pnpm-workspace.yaml       # packages: ["packages/*"]
├── tsconfig.base.json        # strict, ES2022, "moduleResolution": "bundler"
├── .changeset/               # changesets config
├── .github/workflows/
│   ├── ci.yml                # build + test on push/PR
│   └── release.yml           # changesets/action publishing
├── README.md
└── packages/
    ├── feature-arch/                       # @ccc-ts/feature-arch
    └── eslint-plugin-feature-arch/         # @ccc-ts/eslint-plugin-feature-arch
```

**Tooling:** pnpm workspaces, tsup (dual ESM+CJS+`.d.ts` build, preserves `'use client'` directive), vitest, changesets for versioning. Node ≥ 18, TypeScript 5.x.

Two packages are published independently under the `@ccc-ts` scope. The runtime package has `react` as a peer dep (`^18 || ^19`); the ESLint plugin has `eslint` as a peer dep (`^8 || ^9`).

## `@ccc-ts/feature-arch` — public API

### Types

```ts
// packages/feature-arch/src/types.ts

export interface FeatureImplementation {}

export interface FeatureHandle<TImpl extends FeatureImplementation = FeatureImplementation> {
  readonly name: string
  /** Feature flag hook. true = enabled, false = disabled, undefined = loading. */
  useIsEnabled: () => boolean | undefined
  /** Lazy loader — caller controls the import (works with any bundler). */
  load: () => Promise<{ default: TImpl }>
}

export interface FeatureMeta {
  $isDisabled: boolean
  $isReady: boolean
  $error: Error | undefined
}

export type LoadedFeature<TImpl extends FeatureImplementation> =
  TImpl & { name: string; useIsEnabled: () => boolean | undefined } & FeatureMeta
```

### `createFeatureHandle`

```ts
// packages/feature-arch/src/createFeatureHandle.ts

export interface CreateFeatureHandleOptions<TImpl extends FeatureImplementation> {
  name: string
  useIsEnabled: () => boolean | undefined
  load: () => Promise<{ default: TImpl }>
}

export function createFeatureHandle<TImpl extends FeatureImplementation>(
  options: CreateFeatureHandleOptions<TImpl>,
): FeatureHandle<TImpl>
```

The function is a thin pass-through: it returns `{ name, useIsEnabled, load }` exactly as supplied. It exists for type inference and future extensibility (e.g., adding optional fields without a breaking type change).

No string-folder shortcut, no semantic flag mapping, no auto-derivation. This is a deliberate divergence from the upstream `__core__.createFeatureHandle`, removing all Safe-specific coupling.

### `useLoadFeature`

```ts
// packages/feature-arch/src/useLoadFeature.ts

export function useLoadFeature<TImpl extends FeatureImplementation>(
  handle: FeatureHandle<TImpl>,
): LoadedFeature<TImpl>

/** @internal — exported for test cleanup only. */
export function _resetFeatureRegistry(): void
```

Behavior preserved 1:1 from `safe-wallet-monorepo`'s `__core__/useLoadFeature.ts`:

- Single state transition (no intermediate "loading" boolean). Goes from stub proxy directly to loaded feature.
- Stub proxy: `PascalCase` prop returns `() => null`, anything else returns `undefined`. Meta props (`$isReady`, `$isDisabled`, `$error`) read from a ref so the proxy reference stays stable across renders.
- Shared registry (module-level `Map`) caches resolved features by `handle.name`. Multiple components calling `useLoadFeature` on the same handle dedupe to one `handle.load()` call; subsequent mounts get the result synchronously on first render.
- Pending-load `Map` deduplicates concurrent loads in flight.
- Errors are *not* cached — a remount retries the load. `$error` is populated and the stub proxy is still returned so render does not crash.
- Cancellation: a flag set in the effect cleanup prevents `setState` on a resolved promise after unmount.

The file starts with `'use client'` so Next.js App Router consumers can import it from server components without bundler errors.

### Library entry

```ts
// packages/feature-arch/src/index.ts
export type { FeatureHandle, FeatureImplementation, FeatureMeta, LoadedFeature } from './types'
export { createFeatureHandle } from './createFeatureHandle'
export { useLoadFeature, _resetFeatureRegistry } from './useLoadFeature'
```

## Per-feature folder convention (documented + enforced)

Each feature in a consumer app uses this layout. It is documented in `packages/feature-arch/docs/feature-layout.md` and enforced by `@ccc-ts/eslint-plugin-feature-arch`.

```
src/features/{kebab-name}/
├── index.ts        # PUBLIC: FeatureHandle + types/constants only. Always bundled — keep tiny.
├── contract.ts     # PUBLIC type: the FeatureImplementation interface.
├── feature.ts      # LAZY: default-exports the implementation. Imported only via handle.load.
├── components/     # internal — PascalCase folders
├── hooks/          # internal
├── services/       # internal
└── store/          # internal (optional)
```

### Canonical example

```ts
// src/features/walletconnect/index.ts  (always bundled — keep tiny)
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

```ts
// src/features/walletconnect/contract.ts  (always bundled — types only)
import type WalletConnectWidget from './components/WalletConnectWidget'
import type { wcStore } from './store/wcStore'

export interface WalletConnectImplementation {
  WalletConnectWidget: typeof WalletConnectWidget   // PascalCase → component
  wcStore: typeof wcStore                            // camelCase  → service
}
```

```ts
// src/features/walletconnect/feature.ts  (lazy — full implementation)
import WalletConnectWidget from './components/WalletConnectWidget'
import { wcStore } from './store/wcStore'
import type { WalletConnectImplementation } from './contract'

const feature: WalletConnectImplementation = { WalletConnectWidget, wcStore }
export default feature
```

### Naming convention

The naming style of each property in the `FeatureImplementation` interface controls the stub returned by the proxy when the feature is not ready:

| Style | Meaning | Stub |
|---|---|---|
| `PascalCase` | React component | `() => null` |
| `camelCase` | Service / value / store | `undefined` (throws on call → catches missing `$isReady` checks) |
| `useXxx` | Hook | Must be exported from `index.ts` (always bundled), never from `feature.ts` (Rules of Hooks). Not stubbed. |

## `@ccc-ts/eslint-plugin-feature-arch`

A single rule, `no-feature-internals`, plus a `recommended` preset.

**Forbidden** (from outside the same feature folder):
- `**/features/*/components/**`
- `**/features/*/hooks/**`
- `**/features/*/services/**`
- `**/features/*/store/**`
- `**/features/*/contract` (and `.ts`/`.js` variants)
- `**/features/*/feature` (and `.ts`/`.js` variants)

**Allowed** anywhere:
- `**/features/*` (resolves to the feature's `index.ts` barrel)

**Allowed** inside the same feature folder: any of its own internals.

**Options:**
- `featuresDir` (default `"features"`) — directory name where features live, so consumers can use `src/features`, `app/features`, etc.

The plugin exposes:
```ts
// packages/eslint-plugin-feature-arch/src/index.ts
export = {
  rules: { 'no-feature-internals': require('./rules/no-feature-internals') },
  configs: {
    recommended: {
      plugins: ['@ccc-ts/feature-arch'],
      rules: { '@ccc-ts/feature-arch/no-feature-internals': 'error' },
    },
  },
}
```

## Data flow

```
Consumer renders <Comp />
  └─ useLoadFeature(handle)
       ├─ handle.useIsEnabled()  ──► true | false | undefined
       │
       ├─ if isEnabled !== true:
       │    return stub proxy ($isReady=false, $isDisabled=isEnabled===false)
       │
       ├─ if isEnabled === true:
       │    1. sync check shared registry → if cached, return loaded feature on first render
       │    2. else useEffect → getOrCreateLoadPromise(handle)
       │           ├─ pending? reuse same promise (dedupe across components)
       │           └─ start handle.load(), cache result on resolve
       │    3. on resolve → setState → re-render with real feature
       │    4. on reject  → setState({error}) → $error populated, stub proxy returned
       │
       └─ stub proxy ref is stable across renders (created once via useMemo([]))
```

## Error handling

- `handle.load()` rejection → `$error: Error` on the returned object; stub proxy still returned so render does not crash.
- Errors are *not* cached in the registry — remounting the consumer retries the load.
- The library never logs. Consumers that want reporting do `useEffect(() => { if (feature.$error) reportError(feature.$error) }, [feature.$error])`.
- Thrown non-`Error` values are coerced via `new Error(String(err))`.

## Testing

### `@ccc-ts/feature-arch` (vitest + @testing-library/react)

1. `createFeatureHandle` returns the inputs unchanged on the handle object.
2. `useLoadFeature` — disabled (`useIsEnabled` returns `false`) → `$isDisabled: true`, `$isReady: false`, components stub to null, no `handle.load` call.
3. `useLoadFeature` — loading (`useIsEnabled` returns `undefined`) → same as disabled, no `handle.load` call.
4. `useLoadFeature` — enabled, success → re-renders with real impl, `$isReady: true`, `$isDisabled: false`.
5. Stub proxy naming — PascalCase prop returns `() => null`; camelCase returns `undefined`; meta props read from ref.
6. Stub proxy stable ref — same reference across re-renders while not ready.
7. Shared registry dedupe — two components mounting same handle in parallel → `handle.load` called once, both receive the result.
8. Synchronous cache hit — second mount after first resolved → ready on first render (no second render).
9. Error path — `handle.load()` rejects → `$error` populated, no throw, error not cached (remount retries).
10. `_resetFeatureRegistry` clears cache and pending promises.
11. Cancellation — unmount mid-load → no `setState` on resolved promise.

### `@ccc-ts/eslint-plugin-feature-arch` (vitest + `@typescript-eslint/rule-tester`)

12. Valid: `import x from '@/features/foo'`
13. Invalid: `import x from '@/features/foo/components/Bar'` (cross-feature internal)
14. Invalid: `import x from '@/features/foo/feature'` and `'.../contract'`
15. Valid: intra-feature imports (same folder allowed)
16. Configurable `featuresDir` — rule respects custom dir option.

## CI / release

- `ci.yml`: matrix on Node 20, runs `pnpm install --frozen-lockfile && pnpm -r build && pnpm -r test` on push and PR to `main`.
- `release.yml`: triggered on push to `main`, runs `changesets/action` to either open a release PR or publish to npm when the release PR is merged. Requires `NPM_TOKEN` secret.

## Migration path for safe-wallet-monorepo (informational, not in scope)

After this library publishes:

1. Replace `apps/web/src/features/__core__` with re-exports from `@ccc-ts/feature-arch`.
2. Provide a thin `apps/web/src/features/_safe/createSafeFeatureHandle.ts` that wraps `createFeatureHandle`, restores the `useHasFeature(FEATURES.X)` derivation from folder name (Safe-specific behavior), and adds `logError(Errors._906, …)` via a `useEffect` watching `$error` in a wrapper hook.
3. Switch each feature's `index.ts` to import from the local Safe wrapper.
4. Delete `__core__`.

This document does not implement that migration — it just preserves the option by keeping runtime semantics identical.

## Open questions

None at design time. To revisit during implementation: whether tsup correctly emits the `'use client'` directive at the top of the bundled `useLoadFeature` chunk in both ESM and CJS outputs (some versions require explicit config or a banner).
