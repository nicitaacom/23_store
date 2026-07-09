"use strict"

// Rule 10: NEVER use localStorage.setItem/getItem directly - use zustand store persist instead.
module.exports = {
  "no-localstorage-direct": {
    meta: {
      type: "problem",
      docs: {
        description: "disallow direct localStorage.setItem/getItem - use zustand persist instead",
      },
      schema: [],
      messages: {
        noLocalStorage: "Do not use localStorage.{{method}} directly - use a zustand store with persist instead.",
      },
    },
    create(context) {
      return {
        "CallExpression > MemberExpression[object.name='localStorage'][property.name=/^(setItem|getItem)$/]"(node) {
          context.report({ node, messageId: "noLocalStorage", data: { method: node.property.name } })
        },
      }
    },
  },
}
