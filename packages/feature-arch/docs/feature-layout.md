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
