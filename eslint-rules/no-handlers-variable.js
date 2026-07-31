"use strict"

// Handlers hooks (those whose name ends with "Handlers", e.g. useApplicationsHandlers per the
// useXxxHandlers convention documented in hook-naming-convention and dev_readme-eslint.md)
// MUST be destructured on use. Never capture the whole return value in a variable.
// Bad:
//   const handlers = useApplicationsHandlers()
// Good:
//   const { handleAccept, handleReject } = useApplicationsHandlers()
// This rule only looks at the callee name (no import tracking needed, since the suffix is the
// convention marker). Test-like usage example in comments above.

module.exports = {
  "no-handlers-variable": {
    meta: {
      type: "suggestion",
      docs: {
        description: 'disallow assigning useXxxHandlers() calls to a variable - handlers hooks must be destructured',
      },
      schema: [],
      messages: {
        noHandlersVariable:
          '"{{name}}" is a *Handlers hook - must destructure it when called, never assign to a variable. Bad: const handlers = {{name}}(). Good: const { handleXxx } = {{name}}().',
      },
    },
    create(context) {
      return {
        CallExpression(node) {
          if (node.callee.type !== "Identifier") return
          const name = node.callee.name
          if (!/^use\w+Handlers$/.test(name)) return

          // Check if this CallExpression is the initializer of a VariableDeclarator
          // that is NOT using object destructuring on the left.
          const parent = node.parent
          if (
            parent &&
            parent.type === "VariableDeclarator" &&
            parent.init === node &&
            parent.id.type !== "ObjectPattern"
          ) {
            context.report({
              node,
              messageId: "noHandlersVariable",
              data: { name },
            })
          }
          // Note: we do not flag bare calls (no assignment) or assignments inside expressions
          // that are not simple var decls; the primary violation pattern is `const x = use...()`
        },
      }
    },
  },
}
