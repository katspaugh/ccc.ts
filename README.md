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

## Releases

Versioning is handled by [changesets](https://github.com/changesets/changesets).
After a PR with a changeset is merged to `main`, the release workflow opens (or
updates) a "Version Packages" PR. Merging that PR publishes to npm.

The release workflow requires an `NPM_TOKEN` secret with publish access to the
`@ccc-ts` scope, configured in the repo's GitHub settings.

## License

MIT
