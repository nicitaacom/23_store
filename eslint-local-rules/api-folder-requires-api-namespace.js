"use strict"

// Files under app/api should participate in the API typing contract instead of staying as
// untyped helpers tucked inside the route tree. This rule is intentionally simple: if a TS/TSX
// source file lives under app/api (excluding api.d.ts itself), it must reference the global
// API namespace somewhere in the file. TypeScript then enforces that the referenced API type
// actually exists in app/api/api.d.ts.
function isApiSourceFile(filename) {
  return /\/app\/api\/.+\.(ts|tsx)$/.test(filename) && !/\/app\/api\/api\.d\.ts$/.test(filename)
}

function fileReferencesApiNamespace(sourceText) {
  return /\bAPI\./.test(sourceText)
}

module.exports = {
  "api-folder-requires-api-namespace": {
    meta: {
      type: "suggestion",
      docs: {
        description: "require TS/TSX files under app/api to reference the API namespace so their contract lives in app/api/api.d.ts",
      },
      schema: [],
      messages: {
        missingApiNamespace:
          'This file lives under "app/api/" and must reference at least one `API.*` type so its contract is defined in `app/api/api.d.ts`.',
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename()
      if (!isApiSourceFile(filename)) return {}

      return {
        Program(node) {
          const sourceCode = context.sourceCode ?? context.getSourceCode()
          if (fileReferencesApiNamespace(sourceCode.getText())) return

          context.report({ node, messageId: "missingApiNamespace" })
        },
      }
    },
  },
}
