"use strict"

// Arrow function parameters should use `avoid` style under this project's configured
// `arrowParens: "avoid"`. Specifically:
// - A single simple identifier parameter MUST NOT be wrapped in parens.
// - Valid: x => x + 1
// - Bad:   (x) => x + 1
// Allowed:
// - Multi-identifier parameters still need parens: (x, y) => x + y
// - Destructured / default / rest parameters still need parens: ({a}) => a, (x=1) => x, (...x) => x
// - Type annotations / inline JSX typings still need parens
// - A parenthesized expression where the inner token is NOT a simple Identifier is allowed
//   to avoid false positives on advanced syntax we're not specifically linting for
module.exports = {
  "arrow-parens-avoid": {
    meta: {
      type: "suggestion",
      docs: {
        description: "disallow wrapping a single simple identifier arrow parameter in parens under arrowParens: 'avoid'",
      },
      schema: [],
      messages: {
        avoidSingleParens:
          "Remove the parens around the single parameter '{{name}}' - with arrowParens: 'avoid', a bare identifier doesn't need them.",
      },
    },
    create(context) {
      const sourceCode = context.sourceCode ?? context.getSourceCode()

      return {
        ArrowFunctionExpression(node) {
          if (node.params.length !== 1) return
          const param = node.params[0]
          if (
            !param ||
            param.type !== "Identifier" ||
            param.typeAnnotation ||
            /^use[A-Z]/.test(node.parent?.id?.name || "")
          ) {
            return
          }
          if (node.parent && node.parent.type === "MethodDefinition") return

          const tokens = sourceCode.getTokens(node)
          if (tokens.length < 2) return

          const first = tokens[0]
          const last = tokens[tokens.length - 1]

          if (first.value !== "(" || last.value !== ")") return

          // Exclude arrow assertion signatures like (image): image is string => ...
          const tokenAfterLast = sourceCode.getTokenAfter(last)
          if (tokenAfterLast && tokenAfterLast.value === ":") return

          const paramTokens = sourceCode.getTokens(param)
          if (paramTokens.length !== 1) return

          const paramStart = param.range[0]
          const paramEnd = param.range[1]
          if (!(first.range[1] <= paramStart && last.range[0] >= paramEnd)) return
          if (sourceCode.getTokenAfter(first)?.type !== "Identifier") return

          context.report({
            node: first,
            messageId: "avoidSingleParens",
            data: { name: param.name },
          })
        },
      }
    },
  },
}
