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
