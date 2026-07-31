"use strict"

// handleSelect/handleInsert/handleUpdate/handleDelete are reserved names for functions that read
// or write state + DB/redis together, and should only be defined inside useSetSomething.ts,
// useSomethingHandlers.ts, or useAutoUpdateSomething.ts hook files (per this codebase's hook
// architecture). Flags a function declared with one of these exact names outside those files.
const RESERVED_HANDLE_NAMES = new Set(["handleSelect", "handleInsert", "handleUpdate", "handleDelete"])

function isAllowedFile(basename) {
  return /^useSet[A-Z]/.test(basename) || /Handlers$/.test(basename) || /^useAutoUpdate[A-Z]/.test(basename)
}

module.exports = {
  "handle-prefix-location": {
    meta: {
      type: "suggestion",
      docs: {
        description: "restrict handleSelect/handleInsert/handleUpdate/handleDelete to useSetSomething/useSomethingHandlers/useAutoUpdateSomething files",
      },
      schema: [],
      messages: {
        wrongFile:
          '"{{name}}" is a reserved name for useSetSomething/useSomethingHandlers/useAutoUpdateSomething hook files only - rename it here, or move this logic into one of those hook files.',
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename()
      const basename = filename.split("/").pop().replace(/\.tsx?$/, "")
      if (isAllowedFile(basename)) return {}

      function checkName(node, name) {
        if (RESERVED_HANDLE_NAMES.has(name)) {
          context.report({ node, messageId: "wrongFile", data: { name } })
        }
      }

      return {
        FunctionDeclaration(node) {
          if (node.id) checkName(node.id, node.id.name)
        },
        VariableDeclarator(node) {
          if (
            node.id.type === "Identifier" &&
            node.init &&
            (node.init.type === "ArrowFunctionExpression" || node.init.type === "FunctionExpression")
          ) {
            checkName(node.id, node.id.name)
          }
        },
      }
    },
  },
}
