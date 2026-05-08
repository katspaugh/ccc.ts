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
