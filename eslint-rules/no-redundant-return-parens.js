"use strict"

// Parens around a returned object/array literal only ever disambiguate an ARROW FUNCTION's
// implicit-return body from its block body - () => ({ a: 1 }) needs them, because () => { a: 1 }
// would parse "{ a: 1 }" as a block statement with a label, not an object literal. After an
// explicit `return` keyword, that ambiguity doesn't exist - `return { a: 1 }` is already
// unambiguous, so wrapping it as `return ({ a: 1 })` is redundant.
// Wrong:   return ({ a: 1 })
// Correct: return { a: 1 }
// Not flagged: () => ({ a: 1 })   (arrow implicit return - parens are load-bearing here)
module.exports = {
  "no-redundant-return-parens": {
    meta: {
      type: "suggestion",
      fixable: "code",
      docs: {
        description: "disallow redundant parens around a returned object/array literal (return ({...}) -> return {...})",
      },
      schema: [],
      messages: {
        redundantParens:
          "Redundant parens around the returned {{kind}} - parens are only needed for an arrow function's implicit return (() => ({...})), not after an explicit \"return\" keyword.",
      },
    },
    create(context) {
      const sourceCode = context.sourceCode ?? context.getSourceCode()

      return {
        ReturnStatement(node) {
          if (!node.argument) return
          if (node.argument.type !== "ObjectExpression" && node.argument.type !== "ArrayExpression") return

          const returnToken = sourceCode.getFirstToken(node)
          const tokenAfterReturn = sourceCode.getTokenAfter(returnToken)
          if (!tokenAfterReturn || tokenAfterReturn.value !== "(") return

          // Confirm this "(" actually wraps the argument (its matching ")" sits right after the
          // argument, before the statement's own closing/semicolon) - not some other unrelated
          // paren construct.
          const tokenAfterArgument = sourceCode.getTokenAfter(node.argument)
          if (!tokenAfterArgument || tokenAfterArgument.value !== ")") return
          if (tokenAfterArgument.range[0] !== node.argument.range[1]) return
          if (tokenAfterReturn.range[1] !== node.argument.range[0]) return

          const kind = node.argument.type === "ObjectExpression" ? "object literal" : "array literal"

          context.report({
            node: tokenAfterReturn,
            messageId: "redundantParens",
            data: {
              kind,
              sample: kind === "object literal" ? "{ ... }" : "[ ... ]",
              sampleNoParens: kind === "object literal" ? "{ ... }" : "[ ... ]",
            },
            fix(fixer) {
              return [fixer.remove(tokenAfterReturn), fixer.remove(tokenAfterArgument)]
            },
          })
        },
      }
    },
  },
}
