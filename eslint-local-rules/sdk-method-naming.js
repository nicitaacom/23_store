"use strict"

// SDK/hook terminology naming (best-effort - only catches the literal bad examples given, not the
// full semantic rule, since "does this function actually select or update" requires reading its
// body and API route, which a syntax-only ESLint rule cannot reliably determine).
//
// Bad:  async fetch(...)  (as an object method, function, or const name doing a read)
//       const saveFn = useCallback(...)
// Good: async select(...)
//       const handleUpdateDB = useCallback(...)
//
// "fetch" is reserved for this codebase's own SDK/DB/Redis read methods, which should be named
// select/get instead - a wrapper around a genuine 3rd-party API call (e.g. weather, geocoding) may
// legitimately be named fetch/fetchXxx; suppress with a reason there:
//   // eslint-disable-next-line local-rules/sdk-method-naming -- calls the 3rd-party weather API, not our own DB
//   async function fetchWeather() { ... }
const BAD_METHOD_NAME_PATTERN = /^fetch([A-Z]\w*)?$/
const BAD_CALLBACK_NAME_PATTERN = /^saveFn$|^save$/

module.exports = {
  "sdk-method-naming": {
    meta: {
      type: "suggestion",
      docs: {
        description: "flag known-bad SDK/hook naming (fetch as a read method, saveFn/save as a callback name)",
      },
      schema: [],
      messages: {
        badMethodName:
          'Do not name a read method "{{name}}" - use "select" (matching this codebase\'s SDK naming convention) if it reads data.',
        badCallbackName:
          'Do not name a callback "{{name}}" - name it for the backend verb (e.g. handleUpdateDB, handleInsertDB) instead of generic "save".',
      },
    },
    create(context) {
      return {
        "Property[key.name][value.type=/FunctionExpression/]"(node) {
          if (BAD_METHOD_NAME_PATTERN.test(node.key.name)) {
            context.report({ node: node.key, messageId: "badMethodName", data: { name: node.key.name } })
          }
        },
        "MethodDefinition[key.name]"(node) {
          if (BAD_METHOD_NAME_PATTERN.test(node.key.name)) {
            context.report({ node: node.key, messageId: "badMethodName", data: { name: node.key.name } })
          }
        },
        FunctionDeclaration(node) {
          if (node.id && BAD_METHOD_NAME_PATTERN.test(node.id.name)) {
            context.report({ node: node.id, messageId: "badMethodName", data: { name: node.id.name } })
          }
        },
        VariableDeclarator(node) {
          if (node.id.type !== "Identifier" || !node.init) return
          const isFunctionValue = node.init.type === "CallExpression" || node.init.type === "ArrowFunctionExpression" || node.init.type === "FunctionExpression"
          if (!isFunctionValue) return

          if (BAD_CALLBACK_NAME_PATTERN.test(node.id.name)) {
            context.report({ node: node.id, messageId: "badCallbackName", data: { name: node.id.name } })
          } else if (BAD_METHOD_NAME_PATTERN.test(node.id.name)) {
            context.report({ node: node.id, messageId: "badMethodName", data: { name: node.id.name } })
          }
        },
      }
    },
  },
}
