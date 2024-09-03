import type { TSESTree } from '@typescript-eslint/utils'
import { createEslintRule } from '../utils'

export const RULE_NAME = 'consistent-chaining'
export type MessageIds = 'shouldWrap' | 'shouldNotWrap'
export type Options = []

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'layout',
    docs: {
      description: 'Having line breaks styles to object, array and named imports',
    },
    fixable: 'whitespace',
    schema: [],
    messages: {
      shouldWrap: 'Should have line breaks between items, in node {{name}}',
      shouldNotWrap: 'Should not have line breaks between items, in node {{name}}',
    },
  },
  defaultOptions: [],
  create: (context) => {
    const knownRoot = new WeakSet<any>()
    return {
      MemberExpression(node) {
        let root: TSESTree.Node = node
        while (root.parent && (root.parent.type === 'MemberExpression' || root.parent.type === 'CallExpression'))
          root = root.parent
        if (knownRoot.has(root))
          return
        knownRoot.add(root)

        const members: TSESTree.MemberExpression[] = []
        let current: TSESTree.Node | undefined = root
        while (current) {
          switch (current.type) {
            case 'MemberExpression': {
              if (!current.computed)
                members.unshift(current)
              current = current.object
              break
            }
            case 'CallExpression': {
              current = current.callee
              break
            }
            case 'Identifier': {
              current = undefined
              break
            }
            default: {
              console.warn(`[eslint-plugin-antfu/consistent-chaining] Unexpected token ${current.type}, it's likely a bug of the rule. Please report to https://github.com/antfu/eslint-plugin-antfu.`)
              console.warn('Token', current)
              throw new Error('unknown node')
            }
          }
        }

        let mode: 'single' | 'multi' = 'multi'

        members.forEach((m, idx) => {
          const token = context.sourceCode.getTokenBefore(m.property)!
          const tokenBefore = context.sourceCode.getTokenBefore(token)!
          const currentMode: 'single' | 'multi' = token.loc.start.line === tokenBefore.loc.end.line ? 'single' : 'multi'
          if (idx === 0) {
            mode = currentMode
            return
          }

          if (mode !== currentMode) {
            context.report({
              messageId: mode === 'single' ? 'shouldNotWrap' : 'shouldWrap',
              loc: token.loc,
              fix(fixer) {
                if (mode === 'multi')
                  return fixer.insertTextAfter(tokenBefore, '\n')
                else
                  return fixer.removeRange([tokenBefore.range[1], token.range[0]])
              },
            })
          }
        })
      },
    }
  },
})