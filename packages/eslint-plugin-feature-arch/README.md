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
