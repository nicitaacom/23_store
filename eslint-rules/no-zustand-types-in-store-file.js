"use strict"

// Export types from type.ts instead of useMyStore.ts/myStore.ts - if a server action imports a
// type from a file that also calls zustand's create(), it loads the whole zustand store on the
// server (error). Flags a top-level `export interface`/`export type` in any file that also calls
// zustand's create() (directly or via `import { create } from "zustand"`).
function fileCallsZustandCreate(programNode, sourceCode) {
  const text = sourceCode.getText(programNode)
  return /from\s+["']zustand["']/.test(text) && /\bcreate(<[^>]*>)?\s*\(/.test(text)
}

module.exports = {
  "no-zustand-types-in-store-file": {
    meta: {
      type: "problem",
      docs: {
        description: "disallow exporting types/interfaces from a file that also creates a zustand store",
      },
      schema: [],
      messages: {
        typeInStoreFile:
          'Move "{{name}}" to a separate type.ts file instead of exporting it from this store file - importing a type from a file that calls zustand\'s create() loads the whole store on the server if a server action imports the type.',
      },
    },
    create(context) {
      return {
        Program(node) {
          const sourceCode = context.sourceCode ?? context.getSourceCode()
          if (!fileCallsZustandCreate(node, sourceCode)) return

          for (const statement of node.body) {
            if (statement.type !== "ExportNamedDeclaration" || !statement.declaration) continue
            if (
              statement.declaration.type === "TSTypeAliasDeclaration" ||
              statement.declaration.type === "TSInterfaceDeclaration"
            ) {
              context.report({
                node: statement.declaration,
                messageId: "typeInStoreFile",
                data: { name: statement.declaration.id.name },
              })
            }
          }
        },
      }
    },
  },
}
