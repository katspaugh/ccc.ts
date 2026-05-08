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
