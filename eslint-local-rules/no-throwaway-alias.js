"use strict"

// Best-effort: no throwaway const alias.
// Bad:  const activeSettingId = domainResponse
//       const activeSetting = settingsResponse.find(setting => setting.id === activeSettingId) ?? null
// Good: const activeSetting = settingsResponse.find(setting => setting.id === domainResponse) ?? null
//
// Flags `const x = y` where `y` is a plain identifier (not a call/member expression result) and `x`
// is read exactly once afterward in the same block - a rebind that adds a name without adding
// information. Does not flag when `y` is a function call/member access (that's normal work being
// named), only a bare identifier-to-identifier rebind.
module.exports = {
  "no-throwaway-alias": {
    meta: {
      type: "suggestion",
      docs: {
        description: "disallow rebinding a variable under a new name when it's only read once",
      },
      schema: [],
      messages: {
        throwawayAlias:
          '"{{name}}" just rebinds "{{source}}" and is only used once - use "{{source}}" directly instead of creating an alias.',
      },
    },
    create(context) {
      return {
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier" || !node.init || node.init.type !== "Identifier") return

          const sourceCode = context.sourceCode ?? context.getSourceCode()
          const scope = sourceCode.getScope ? sourceCode.getScope(node) : context.getScope()
          const variable = scope.variables.find(item => item.name === node.id.name)
          if (!variable) return

          // references[0] is the declaration itself; anything beyond one further reference means
          // it's genuinely reused, so only flag the exactly-one-read case
          const readReferences = variable.references.filter(reference => !reference.init)
          if (readReferences.length !== 1) return

          context.report({
            node: node.id,
            messageId: "throwawayAlias",
            data: { name: node.id.name, source: node.init.name },
          })
        },
      }
    },
  },
}
