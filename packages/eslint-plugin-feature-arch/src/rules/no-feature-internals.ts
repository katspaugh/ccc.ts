import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils'

export type Options = [
  {
    featuresDir?: string
  }?,
]

export type MessageIds = 'noInternals'

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/ccc-ts/ccc/tree/main/packages/eslint-plugin-feature-arch#${name}`,
)

const INTERNAL_TAILS = new Set([
  'components',
  'hooks',
  'services',
  'store',
  'contract',
  'feature',
])

/**
 * Inspects a path string and returns the segments after the first occurrence
 * of `featuresDir`. Returns `undefined` if no such segment exists.
 *
 * Examples (featuresDir = 'features'):
 *   '@/features/walletconnect/components/Widget' → ['walletconnect', 'components', 'Widget']
 *   '../../features/swap'                        → ['swap']
 *   '@/lib/features-helper'                      → undefined
 */
function segmentsAfterFeaturesDir(
  path: string,
  featuresDir: string,
): string[] | undefined {
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
      description:
        'Forbid importing feature internals — only the feature index barrel is allowed.',
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
    const importerFeature =
      importerSegs && importerSegs.length > 0 ? importerSegs[0] : undefined

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
